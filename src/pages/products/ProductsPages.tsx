import {
  ArrowDown,
  ArrowUp,
  Edit2,
  Plus,
  RefreshCw,
  Trash,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterInput } from "@/components/records/FilterInput";
import { FormActions } from "@/components/records/FormActions";
import { Pagination } from "@/components/records/Pagination";
import { SectionCard } from "@/components/records/SectionCard";
import {
  ConfirmAction,
  EmptyState,
  Field,
  InventoryStatus,
  MetricCard,
} from "@/components/records/Shared";
import { usePagination } from "@/components/records/usePagination";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDateLabel, getTodayDateKey } from "@/lib/date";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { notifyPersistedMutation } from "@/lib/persistence-feedback";
import {
  formatVariantAttributes,
  identificationFormatLabel,
  parseVariantAttributesText,
  productLookupText,
  validateIdentificationCode,
} from "@/lib/product-variants";
import { useAppStore } from "@/store/app-store";
import {
  type ProductInput,
  type ProductVariantInput,
  useRetailStore,
} from "@/store/retail-store";
import type {
  ProductIdentificationFormat,
  RetailProduct,
} from "@/types/retail";
import { sileo } from "sileo";

const PAGE_SIZE = 10;

interface ProductVariantFormValue {
  id: string;
  code: string;
  attributesText: string;
  stock: number;
  sku: string;
  barcode: string;
  barcodeFormat: ProductIdentificationFormat;
}

type ProductFormValues = Omit<ProductInput, "variants"> & {
  variants: ProductVariantFormValue[];
  hasVariants: boolean;
  stockReason: string;
};

const emptyProduct: Omit<ProductInput, "variants"> = {
  name: "",
  brand: "",
  sku: "",
  barcode: "",
  barcodeFormat: "linear",
  category: "",
  unit: "عدد",
  purchaseCost: 0,
  sellingPrice: 0,
  stock: 0,
  minimumStock: 5,
  description: "",
};

function productToFormValues(product: RetailProduct): ProductFormValues {
  return {
    name: product.name,
    brand: product.brand,
    sku: product.sku,
    barcode: product.barcode,
    barcodeFormat: product.barcodeFormat ?? "linear",
    category: product.category,
    unit: product.unit,
    purchaseCost: product.purchaseCost,
    sellingPrice: product.sellingPrice,
    stock: product.stock,
    minimumStock: product.minimumStock,
    description: product.description,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      code: variant.code,
      attributesText: formatVariantAttributes(variant.attributes),
      stock: variant.stock,
      sku: variant.sku ?? "",
      barcode: variant.barcode ?? "",
      barcodeFormat: variant.barcodeFormat ?? "linear",
    })),
    hasVariants: product.variants.length > 0,
    stockReason: "",
  };
}

export function ProductsPage() {
  const products = useRetailStore((state) => state.products);
  const sales = useRetailStore((state) => state.sales);
  const purchases = useRetailStore((state) => state.purchases);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [sort, setSort] = useState("name");
  const activeProducts = useMemo(
    () => products.filter((product) => product.active),
    [products],
  );
  const categories = useMemo(
    () =>
      [...new Set(activeProducts.map((product) => product.category))].sort(),
    [activeProducts],
  );
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    const result = activeProducts.filter((product) => {
      const matchesQuery =
        !normalized || productLookupText(product).includes(normalized);
      const matchesCategory =
        category === "all" || product.category === category;
      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "low" && product.stock <= product.minimumStock) ||
        (stockFilter === "available" && product.stock > product.minimumStock);
      return matchesQuery && matchesCategory && matchesStock;
    });
    return result.sort((left, right) => {
      if (sort === "stock") return left.stock - right.stock;
      if (sort === "price") return right.sellingPrice - left.sellingPrice;
      return left.name.localeCompare(right.name, "fa");
    });
  }, [activeProducts, category, query, sort, stockFilter]);
  const {
    page,
    pageCount,
    visible: visibleProducts,
    setPage,
  } = usePagination(filtered, PAGE_SIZE);
  const lowStockCount = activeProducts.filter(
    (product) => product.stock <= product.minimumStock,
  ).length;
  const inventoryValue = activeProducts.reduce(
    (sum, product) => sum + product.stock * product.purchaseCost,
    0,
  );

  return (
    <div className="workspace-page mx-auto grid w-full max-w-[1560px] min-w-0 content-start gap-4 p-4 sm:gap-5 sm:p-5 xl:p-6">
      <PageHeader
        title="کالا و موجودی"
        description="فهرست کالاها، قیمت‌ها و وضعیت موجودی فروشگاه را مدیریت کنید."
        action={
          <Link
            className={buttonVariants({ variant: "primary" })}
            to="/products/new"
          >
            <Plus aria-hidden="true" size={16} /> کالای جدید
          </Link>
        }
      />
      <div className="metric-grid grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
        <MetricCard
          label="کالاهای فعال"
          value={activeProducts.length}
          hint="کالاهای قابل فروش"
        />
        <MetricCard
          label="نیازمند بررسی"
          value={lowStockCount}
          tone={lowStockCount ? "warning" : "positive"}
          hint="موجودی برابر یا کمتر از حداقل"
        />
        <MetricCard
          label="ارزش موجودی"
          value={formatCurrency(inventoryValue)}
          hint="بر پایهٔ بهای خرید فعلی"
        />
        <MetricCard
          label="تراکنش‌های مرتبط"
          value={sales.length + purchases.length}
          hint="فروش و خرید ثبت‌شده"
        />
      </div>
      <SectionCard
        title="فهرست کالاها"
        description={`${formatNumber(filtered.length)} کالا مطابق فیلترها`}
      >
        <div className="list-toolbar flex flex-col min-w-0 gap-3 rounded-2xl border border-border bg-card-raised/50 p-3">
          <FilterInput
            id="products-search"
            label="جست‌وجوی کالا"
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            placeholder="نام، برند، SKU، بارکد/QR، مشخصه یا دسته‌بندی"
            value={query}
          />
          <div className="flex max-lg:flex-col gap-3">
            <Select
              onValueChange={(value) => {
                setCategory(value);
                setPage(1);
              }}
              value={category}
            >
              <SelectTrigger aria-label="فیلتر دسته‌بندی">
                <SelectValue placeholder="همهٔ دسته‌بندی‌ها" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همهٔ دسته‌بندی‌ها</SelectItem>
                {categories.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              onValueChange={(value) => {
                setStockFilter(value);
                setPage(1);
              }}
              value={stockFilter}
            >
              <SelectTrigger aria-label="فیلتر موجودی">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همهٔ موجودی‌ها</SelectItem>
                <SelectItem value="low">کم‌موجود</SelectItem>
                <SelectItem value="available">موجود کافی</SelectItem>
              </SelectContent>
            </Select>
            <Select onValueChange={setSort} value={sort}>
              <SelectTrigger aria-label="مرتب‌سازی کالاها">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">مرتب‌سازی: نام</SelectItem>
                <SelectItem value="stock">مرتب‌سازی: موجودی</SelectItem>
                <SelectItem value="price">مرتب‌سازی: قیمت فروش</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {visibleProducts.length > 0 ? (
          <div className="data-table-scroll min-w-0 overflow-x-auto rounded-2xl border border-border">
            <table className="data-table w-full min-w-[680px] border-collapse text-right text-sm [&_thead]:bg-muted/60 [&_th]:whitespace-nowrap [&_th]:px-3 [&_th]:py-3 [&_th]:text-right [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground [&_tbody_tr]:border-t [&_tbody_tr]:border-border/70 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-muted/30 [&_td]:px-3 [&_td]:py-3 [&_td]:align-middle">
              <thead>
                <tr>
                  <th>کالا</th>
                  <th>SKU / شناسهٔ بارکد یا QR</th>
                  <th>دسته‌بندی</th>
                  <th>بهای خرید</th>
                  <th>قیمت فروش</th>
                  <th>موجودی</th>
                  <th>حداقل</th>
                  <th>وضعیت</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {visibleProducts.map((product) => (
                  <ProductRow key={product.id} product={product} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={
              activeProducts.length
                ? "نتیجه‌ای پیدا نشد"
                : "هنوز کالایی ثبت نشده است"
            }
            description={
              activeProducts.length
                ? "فیلتر جست‌وجو یا دسته‌بندی را تغییر دهید."
                : "برای شروع، کالای نخست را ثبت کنید."
            }
            action={
              !activeProducts.length ? (
                <Link
                  className={buttonVariants({ variant: "primary", size: "sm" })}
                  to="/products/new"
                >
                  ثبت کالا
                </Link>
              ) : undefined
            }
          />
        )}
        <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
      </SectionCard>
    </div>
  );
}

function ProductRow({ product }: { product: RetailProduct }) {
  return (
    <tr>
      <td>
        <Link
          className="table-primary-link font-medium text-primary transition-colors hover:text-primary-hover hover:underline"
          to={`/products/${product.id}`}
        >
          {product.name}
        </Link>
        <span className="table-subline mt-1 block text-[11px] leading-4 text-muted-foreground">
          {product.brand ? `${product.brand} · ` : ""}
          {product.variants.length
            ? `${formatNumber(product.variants.length)} گونه · ${product.unit}`
            : product.unit}
        </span>
      </td>
      <td className="numeric-cell text-start tabular-nums">
        {product.sku ? (
          <span className="block whitespace-nowrap">SKU: {product.sku}</span>
        ) : !product.barcode ? (
          "—"
        ) : null}
        {product.barcode && (
          <span className="table-subline mt-1 block whitespace-pre-wrap break-all text-[11px] leading-4 text-muted-foreground">
            {identificationFormatLabel(product.barcodeFormat)}:{" "}
            {product.barcode}
          </span>
        )}
      </td>
      <td>{product.category}</td>
      <td className="numeric-cell whitespace-nowrap text-start tabular-nums">
        {formatCurrency(product.purchaseCost)}
      </td>
      <td className="numeric-cell whitespace-nowrap text-start tabular-nums">
        {formatCurrency(product.sellingPrice)}
      </td>
      <td className="numeric-cell whitespace-nowrap text-start tabular-nums stock-cell">
        {formatNumber(product.stock)} {product.unit}
      </td>
      <td className="numeric-cell whitespace-nowrap text-start tabular-nums">
        {formatNumber(product.minimumStock)}
      </td>
      <td>
        <InventoryStatus
          minimumStock={product.minimumStock}
          stock={product.stock}
        />
      </td>
      <td>
        <div className="table-row-actions flex flex-wrap items-center gap-1.5">
          <StockAdjustmentDialog product={product} direction="in" />
          <StockAdjustmentDialog product={product} direction="out" />
          <Link
            aria-label={`جزئیات ${product.name}`}
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
            to={`/products/${product.id}`}
          >
            <Edit2 aria-hidden="true" size={14} />
          </Link>
        </div>
      </td>
    </tr>
  );
}

export function ProductFormPage({ mode }: { mode: "create" | "edit" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const product = useRetailStore((state) =>
    state.products.find((item) => item.id === id),
  );
  const minimumStockDefault = useRetailStore(
    (state) => state.settings.minimumStockDefault,
  );
  const sales = useRetailStore((state) => state.sales);
  const purchases = useRetailStore((state) => state.purchases);
  const returns = useRetailStore((state) => state.returns);
  const stockMovements = useRetailStore((state) => state.stockMovements);
  const createProduct = useRetailStore((state) => state.createProduct);
  const updateProduct = useRetailStore((state) => state.updateProduct);
  const calendarMode = useAppStore((state) => state.calendarMode);
  const defaultValues: ProductFormValues = product
    ? productToFormValues(product)
    : {
        ...emptyProduct,
        minimumStock: minimumStockDefault,
        variants: [],
        hasVariants: false,
        stockReason: "",
      };
  const {
    control,
    register,
    handleSubmit,
    reset,
    clearErrors,
    setError,
    setValue,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({ defaultValues });
  const {
    fields: variantFields,
    append: appendVariant,
    remove: removeVariant,
    replace: replaceVariants,
  } = useFieldArray({ control, name: "variants", keyName: "fieldKey" });
  const hasVariants = useWatch({ control, name: "hasVariants" }) ?? false;
  const hasVariantMode = hasVariants || Boolean(product?.variants.length);
  const variants = useWatch({ control, name: "variants" }) ?? [];
  const stock = watch("stock") ?? 0;
  const totalVariantStock = variants.reduce(
    (sum, variant) =>
      sum + (Number.isFinite(variant.stock) ? variant.stock : 0),
    0,
  );
  const hasLegacyTransactions = Boolean(
    product &&
    (sales.some((sale) =>
      sale.items.some((item) => item.productId === product.id),
    ) ||
      purchases.some((purchase) =>
        purchase.items.some((item) => item.productId === product.id),
      ) ||
      returns.some((record) =>
        record.items.some((item) => item.productId === product.id),
      ) ||
      stockMovements.some((movement) => movement.productId === product.id)),
  );
  const canEnableVariants =
    mode === "create" ||
    Boolean(
      product &&
      product.variants.length === 0 &&
      product.stock === 0 &&
      !hasLegacyTransactions,
    );

  useEffect(() => {
    if (product && mode === "edit") reset(productToFormValues(product));
  }, [mode, product, reset]);

  if (mode === "edit" && !product) {
    return (
      <div className="workspace-page mx-auto grid w-full max-w-[1560px] min-w-0 content-start gap-4 p-4 sm:gap-5 sm:p-5 xl:p-6">
        <PageHeader title="ویرایش کالا" description="رکورد در دسترس نیست." />
        <EmptyState
          title="کالا پیدا نشد"
          description="ممکن است کالا حذف یا بایگانی شده باشد."
          action={
            <Link
              className={buttonVariants({ variant: "outline" })}
              to="/products"
            >
              بازگشت به فهرست
            </Link>
          }
        />
      </div>
    );
  }

  const stockChanged = Boolean(
    mode === "edit" &&
    product &&
    (hasVariantMode
      ? product.variants.length === 0
        ? totalVariantStock !== product.stock
        : product.variants.some(
            (oldVariant) =>
              variants.find((variant) => variant.id === oldVariant.id)
                ?.stock !== oldVariant.stock,
          ) ||
          variants.some(
            (variant) =>
              !product.variants.some(
                (oldVariant) => oldVariant.id === variant.id,
              ) && variant.stock > 0,
          )
      : stock !== product.stock),
  );

  const submit = handleSubmit((values) => {
    clearErrors("root");
    const parsedVariants: ProductVariantInput[] = [];
    const shouldSaveVariants =
      values.hasVariants || Boolean(product?.variants.length);
    const submittedVariantValues = Array.isArray(values.variants)
      ? values.variants
      : [];
    const storedVariantValues = getValues("variants");
    const currentVariantValues =
      submittedVariantValues.length > 0
        ? submittedVariantValues
        : storedVariantValues.length > 0
          ? storedVariantValues
          : variants.length > 0
            ? variants
            : product
              ? productToFormValues(product).variants
              : [];
    if (shouldSaveVariants) {
      for (const [index, variant] of currentVariantValues.entries()) {
        const parsed = parseVariantAttributesText(variant.attributesText);
        if (parsed.error) {
          setError(`variants.${index}.attributesText`, {
            type: "validate",
            message: parsed.error,
          });
          return;
        }
        parsedVariants.push({
          id: variant.id || undefined,
          code: variant.code || undefined,
          attributes: parsed.attributes,
          stock: variant.stock,
          sku: variant.sku,
          barcode: variant.barcode,
          barcodeFormat: variant.barcodeFormat,
        });
      }
      if (!parsedVariants.length) {
        setError("root", {
          type: "validate",
          message: "حداقل یک گونه برای کالا ثبت کنید.",
        });
        return;
      }
    }
    const parsedVariantStock = parsedVariants.reduce(
      (sum, variant) => sum + variant.stock,
      0,
    );
    const input: ProductInput = {
      name: values.name,
      brand: values.brand,
      sku: values.sku,
      barcode: values.barcode,
      barcodeFormat: values.barcodeFormat,
      category: values.category,
      unit: values.unit,
      purchaseCost: values.purchaseCost,
      sellingPrice: values.sellingPrice,
      stock: shouldSaveVariants ? parsedVariantStock : values.stock,
      minimumStock: values.minimumStock,
      description: values.description,
      variants: shouldSaveVariants ? parsedVariants : [],
    };
    const result =
      mode === "create"
        ? createProduct(input)
        : product
          ? updateProduct(product.id, input, values.stockReason)
          : null;
    if (!result) {
      setError("root", { type: "business", message: "کالا در دسترس نیست." });
      return;
    }
    if (!result.ok) {
      setError("root", { type: "business", message: result.error });
      return;
    }
    notifyPersistedMutation(
      mode === "create" ? "کالا ثبت شد." : "تغییرات کالا ذخیره شد.",
    );
    navigate(`/products/${result.value.id}`);
  });

  const hasVariantsRegistration = register("hasVariants", {
    onChange: (event) => {
      if (event.target.checked) {
        if (getValues("variants").length === 0) {
          appendVariant({
            id: "",
            code: "",
            attributesText: "",
            stock: Math.max(0, Number(getValues("stock")) || 0),
            sku: "",
            barcode: "",
            barcodeFormat: "linear",
          });
        }
      } else {
        setValue("stock", totalVariantStock, {
          shouldDirty: true,
          shouldValidate: true,
        });
        replaceVariants([]);
      }
    },
  });

  return (
    <div className="workspace-page mx-auto grid w-full max-w-[1560px] min-w-0 content-start gap-4 p-4 sm:gap-5 sm:p-5 xl:p-6">
      <PageHeader
        title={mode === "create" ? "ثبت کالای جدید" : "ویرایش کالا"}
        description="مشخصات، قیمت و آستانهٔ موجودی کالا را وارد کنید."
        breadcrumbs={[
          { label: "کالاها", to: "/products" },
          { label: mode === "create" ? "کالای جدید" : "ویرایش" },
        ]}
      />
      <form
        className="workspace-form grid min-w-0 gap-4"
        noValidate
        onSubmit={submit}
      >
        <SectionCard
          title="اطلاعات کالا"
          description="نام، برند، دسته‌بندی و واحد در سطح محصول نگهداری می‌شوند؛ SKU و شناسهٔ بارکد/QR اختیاری و جدا از هم هستند."
        >
          <div className="form-grid grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              error={errors.name?.message}
              label="نام کالا"
              htmlFor="product-name"
              required
            >
              <Input
                {...register("name", { required: "نام کالا الزامی است." })}
                id="product-name"
                required
              />
            </Field>
            <Field label="برند / سازنده" htmlFor="product-brand">
              <Input {...register("brand")} id="product-brand" />
            </Field>
            <Field
              label="SKU داخلی محصول"
              htmlFor="product-sku"
              hint="اختیاری؛ از شناسهٔ بارکد یا QR جداست."
            >
              <Input {...register("sku")} id="product-sku" autoComplete="off" />
            </Field>
            <div className="form-field-wide grid min-w-0 gap-3 rounded-2xl border border-border bg-card-raised/30 p-3 sm:col-span-2 sm:p-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold">
                  شناسهٔ محصول (اختیاری)
                </h3>
                <p className="text-xs leading-5 text-muted-foreground">
                  بارکد خطی یا QR را دستی وارد کنید؛ بدون شناسه، اسکنر یا چاپگر
                  هم می‌توانید کالا را ثبت و بعداً با انتخاب دستی پیدا کنید.
                </p>
              </div>
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
                <Controller
                  control={control}
                  name="barcodeFormat"
                  render={({ field, fieldState }) => (
                    <Field
                      error={fieldState.error?.message}
                      label="نوع شناسه"
                      htmlFor="product-barcode-format"
                    >
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? "linear"}
                      >
                        <SelectTrigger
                          aria-describedby={
                            fieldState.error
                              ? "product-barcode-format-error"
                              : undefined
                          }
                          aria-invalid={Boolean(fieldState.error)}
                          id="product-barcode-format"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="linear">بارکد خطی</SelectItem>
                          <SelectItem value="qr">کد QR</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
                <Field
                  error={errors.barcode?.message}
                  label="کد شناسایی (اختیاری)"
                  htmlFor="product-barcode"
                  hint="متن و بزرگی/کوچکی حروف حفظ می‌شود؛ QR می‌تواند چندخطی باشد."
                >
                  {watch("barcodeFormat") === "qr" ? (
                    <textarea
                      {...register("barcode", {
                        validate: (value) =>
                          validateIdentificationCode(
                            value,
                            watch("barcodeFormat"),
                          ) ?? true,
                      })}
                      autoComplete="off"
                      autoCapitalize="off"
                      className="workspace-textarea min-h-14 w-full resize-y rounded-xl border border-input bg-control px-3 py-2 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
                      id="product-barcode"
                      maxLength={8192}
                      rows={2}
                      spellCheck={false}
                    />
                  ) : (
                    <Input
                      {...register("barcode", {
                        validate: (value) =>
                          validateIdentificationCode(
                            value,
                            watch("barcodeFormat"),
                          ) ?? true,
                      })}
                      autoComplete="off"
                      autoCapitalize="off"
                      id="product-barcode"
                      maxLength={8192}
                      spellCheck={false}
                    />
                  )}
                </Field>
              </div>
            </div>
            <Field
              error={errors.category?.message}
              label="دسته‌بندی"
              htmlFor="product-category"
              required
            >
              <Input
                {...register("category", {
                  required: "دسته‌بندی کالا را وارد کنید.",
                })}
                id="product-category"
                required
              />
            </Field>
            <Field
              error={errors.unit?.message}
              label="واحد شمارش"
              htmlFor="product-unit"
              required
            >
              <Input
                {...register("unit", { required: "واحد کالا را وارد کنید." })}
                id="product-unit"
                required
              />
            </Field>
            <Field
              error={errors.purchaseCost?.message}
              label="بهای خرید (تومان)"
              htmlFor="purchase-cost"
              required
            >
              <Input
                {...register("purchaseCost", {
                  valueAsNumber: true,
                  required: "بهای خرید معتبر نیست.",
                  min: { value: 0, message: "بهای خرید معتبر نیست." },
                  validate: (value) =>
                    Number.isFinite(value) || "بهای خرید معتبر نیست.",
                })}
                id="purchase-cost"
                required
                type="text"
              />
            </Field>
            <Field
              error={errors.sellingPrice?.message}
              label="قیمت فروش (تومان)"
              htmlFor="selling-price"
              required
            >
              <Input
                {...register("sellingPrice", {
                  valueAsNumber: true,
                  required: "قیمت فروش معتبر نیست.",
                  min: { value: 0, message: "قیمت فروش معتبر نیست." },
                  validate: (value) =>
                    Number.isFinite(value) || "قیمت فروش معتبر نیست.",
                })}
                id="selling-price"
                required
                type="text"
              />
            </Field>
            {!hasVariants ? (
              <Field
                key="product-stock-single"
                error={errors.stock?.message}
                label={mode === "create" ? "موجودی اولیه" : "موجودی فعلی"}
                htmlFor="product-stock"
                required
              >
                <Input
                  {...register("stock", {
                    valueAsNumber: true,
                    required: "موجودی باید عدد صحیح و نامنفی باشد.",
                    min: {
                      value: 0,
                      message: "موجودی باید عدد صحیح و نامنفی باشد.",
                    },
                    validate: (value) =>
                      (Number.isInteger(value) && value >= 0) ||
                      "موجودی باید عدد صحیح و نامنفی باشد.",
                  })}
                  id="product-stock"
                  min="0"
                  required
                  step="1"
                  type="number"
                />
              </Field>
            ) : (
              <Field
                key="product-stock-variant-total"
                label="موجودی کل گونه‌ها"
                htmlFor="product-stock-total"
                hint="جمع موجودی گونه‌ها؛ فقط موجودی هر گونه ویرایش می‌شود."
              >
                <Input
                  aria-readonly="true"
                  id="product-stock-total"
                  readOnly
                  value={formatNumber(totalVariantStock)}
                />
              </Field>
            )}
            <Field
              error={errors.minimumStock?.message}
              label="حداقل موجودی"
              htmlFor="minimum-stock"
              required
            >
              <Input
                {...register("minimumStock", {
                  valueAsNumber: true,
                  required: "حداقل موجودی باید عدد صحیح و نامنفی باشد.",
                  min: {
                    value: 0,
                    message: "حداقل موجودی باید عدد صحیح و نامنفی باشد.",
                  },
                  validate: (value) =>
                    (Number.isInteger(value) && value >= 0) ||
                    "حداقل موجودی باید عدد صحیح و نامنفی باشد.",
                })}
                id="minimum-stock"
                min="0"
                required
                step="1"
                type="number"
              />
            </Field>
            <label className="toggle-row form-field-wide flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border bg-card-raised/60 p-3 text-sm sm:col-span-2">
              <span>
                <strong>این کالا گونه‌های مستقل دارد</strong>
                <small>
                  {product?.variants.length
                    ? "گونه‌های ثبت‌شده قابل خاموش‌کردن نیستند تا سوابق و موجودی هر گونه حفظ شود."
                    : canEnableVariants
                      ? "برای هر گونه مشخصه‌های دلخواه مثل سایز، رنگ یا مدل وارد کنید."
                      : "برای حفظ موجودی و تراکنش‌های قبلی، این کالای بدون گونه را نمی‌توان به گونه‌دار تبدیل کرد؛ کالای جدید ثبت کنید."}
                </small>
              </span>
              <input
                {...hasVariantsRegistration}
                checked={hasVariants}
                disabled={
                  Boolean(product?.variants.length) || !canEnableVariants
                }
                type="checkbox"
              />
            </label>
          </div>
          {hasVariants && (
            <div className="product-variants-editor mt-4 grid min-w-0 gap-3 rounded-2xl border border-border bg-card-raised/30 p-3 sm:p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">
                    گونه‌ها و موجودی مستقل
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    مشخصه‌ها را به صورت «نام: مقدار» جداشده با ویرگول وارد کنید؛
                    مثال: سایز: M، رنگ: مشکی. SKU و شناسهٔ بارکد خطی/QR هر گونه
                    اختیاری‌اند؛ کدهای داخلی با آن‌ها فرق دارند.
                  </p>
                </div>
                <Button
                  disabled={isSubmitting}
                  onClick={() =>
                    appendVariant({
                      id: "",
                      code: "",
                      attributesText: "",
                      stock: 0,
                      sku: "",
                      barcode: "",
                      barcodeFormat: "linear",
                    })
                  }
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Plus aria-hidden="true" size={14} /> افزودن گونه
                </Button>
              </div>
              {variantFields.map((variantField, index) => {
                const variantBarcodeFormat =
                  watch(`variants.${index}.barcodeFormat`) ?? "linear";
                const variantBarcodeRegistration = register(
                  `variants.${index}.barcode`,
                  {
                    validate: (value) =>
                      validateIdentificationCode(value, variantBarcodeFormat) ??
                      true,
                  },
                );
                return (
                  <div
                    className="variant-editor-row grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-border/70 bg-card p-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.35fr)_minmax(110px,0.6fr)_minmax(130px,0.8fr)_minmax(120px,0.7fr)_minmax(150px,0.95fr)_auto]"
                    key={variantField.fieldKey}
                  >
                    <input
                      {...register(`variants.${index}.id`)}
                      type="hidden"
                    />
                    <input
                      {...register(`variants.${index}.code`)}
                      type="hidden"
                    />
                    <Field
                      error={errors.variants?.[index]?.attributesText?.message}
                      label={`مشخصه‌های گونه ${formatNumber(index + 1)}`}
                      htmlFor={`variant-attributes-${index}`}
                      required
                    >
                      <Input
                        {...register(`variants.${index}.attributesText`, {
                          required: "برای هر گونه حداقل یک مشخصه وارد کنید.",
                          validate: (value) =>
                            parseVariantAttributesText(value).error ?? true,
                        })}
                        autoComplete="off"

                        id={`variant-attributes-${index}`}
                        placeholder="سایز: M، رنگ: مشکی؛ مدل: کلاسیک"
                        required
                      />
                    </Field>
                    <Field
                      error={errors.variants?.[index]?.stock?.message}
                      label="موجودی گونه"
                      htmlFor={`variant-stock-${index}`}
                      required
                    >
                      <Input
                        {...register(`variants.${index}.stock`, {
                          valueAsNumber: true,
                          required:
                            "موجودی هر گونه باید عدد صحیح و نامنفی باشد.",
                          min: {
                            value: 0,
                            message:
                              "موجودی هر گونه باید عدد صحیح و نامنفی باشد.",
                          },
                          validate: (value) =>
                            (Number.isInteger(value) && value >= 0) ||
                            "موجودی هر گونه باید عدد صحیح و نامنفی باشد.",
                        })}
                        id={`variant-stock-${index}`}
                        min="0"
                        required
                        step="1"
                        type="number"
                      />
                    </Field>
                    <Field
                      label="SKU گونه (اختیاری)"
                      htmlFor={`variant-sku-${index}`}
                    >
                      <Input
                        {...register(`variants.${index}.sku`)}
                        id={`variant-sku-${index}`}
                        autoComplete="off"
                      />
                    </Field>
                    <Controller
                      control={control}
                      name={`variants.${index}.barcodeFormat`}
                      render={({ field, fieldState }) => (
                        <Field
                          error={fieldState.error?.message}
                          label="نوع شناسه"
                          htmlFor={`variant-barcode-format-${index}`}
                        >
                          <Select
                            onValueChange={field.onChange}
                            value={field.value ?? "linear"}
                          >
                            <SelectTrigger
                              aria-describedby={
                                fieldState.error
                                  ? `variant-barcode-format-${index}-error`
                                  : undefined
                              }
                              aria-invalid={Boolean(fieldState.error)}
                              id={`variant-barcode-format-${index}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="linear">بارکد خطی</SelectItem>
                              <SelectItem value="qr">کد QR</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                      )}
                    />
                    <Field
                      error={errors.variants?.[index]?.barcode?.message}
                      label="کد شناسایی گونه (اختیاری)"
                      htmlFor={`variant-barcode-${index}`}
                    >
                      {variantBarcodeFormat === "qr" ? (
                        <textarea
                          {...variantBarcodeRegistration}
                          autoComplete="off"
                          autoCapitalize="off"
                          className="workspace-textarea min-h-14 w-full resize-y rounded-xl border border-input bg-control px-3 py-2 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"

                          id={`variant-barcode-${index}`}
                          maxLength={8192}
                          rows={2}
                          spellCheck={false}
                        />
                      ) : (
                        <Input
                          {...variantBarcodeRegistration}
                          autoComplete="off"
                          autoCapitalize="off"

                          id={`variant-barcode-${index}`}
                          maxLength={8192}
                          spellCheck={false}
                        />
                      )}
                    </Field>
                    <div className="flex min-w-0 items-center justify-between gap-2 xl:flex-col xl:items-end xl:justify-center">
                      <span className="text-[11px] leading-5 text-muted-foreground">
                        کد داخلی:{" "}
                        {variantField.code || "پس از ذخیره ساخته می‌شود"}
                      </span>
                      <Button
                        aria-label={`حذف گونه ${index + 1}`}
                        disabled={variantFields.length <= 1 || isSubmitting}
                        onClick={() => removeVariant(index)}
                        size="icon-sm"
                        type="button"
                        variant="outline"
                        className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash className="size-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              <p className="rounded-xl border border-info/20 bg-info/5 px-3 py-2 text-xs leading-5 text-muted-foreground">
                موجودی کل: {formatNumber(totalVariantStock)}{" "}
                {watch("unit") || "واحد"} · گونه‌ها کد داخلی پایدار می‌گیرند؛
                بارکد، اسکنر و چاپ برچسب الزامی نیست.
              </p>
            </div>
          )}
          {stockChanged && (
            <Field
              className="mt-4"
              error={errors.stockReason?.message}
              label="علت اصلاح موجودی"
              htmlFor="stock-reason"
              required
            >
              <Input
                {...register("stockReason", {
                  required: "برای تغییر موجودی، دلیل اصلاح را وارد کنید.",
                })}
                id="stock-reason"
                placeholder="برای ثبت سابقه، دلیل تغییر را بنویسید"
                required
              />
            </Field>
          )}
          <Field className="mt-4" label="توضیحات" htmlFor="product-description">
            <textarea
              {...register("description")}
              className="workspace-textarea min-h-24 w-full resize-y rounded-xl border border-input bg-control px-3 py-2 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
              id="product-description"
              rows={3}
            />
          </Field>
          <p className="form-context-note mt-4 rounded-xl border border-info/20 bg-info/5 px-3 py-2 text-xs leading-6 text-muted-foreground">
            تاریخ ثبت: {getDateLabel(getTodayDateKey(), calendarMode, true)} ·
            موجودی منفی مجاز نیست.
          </p>
          {errors.root?.message && (
            <p
              className="form-field-error mt-3 text-xs leading-5 text-destructive"
              role="alert"
            >
              {errors.root.message}
            </p>
          )}
          <FormActions
            cancelTo={
              mode === "edit" && product
                ? `/products/${product.id}`
                : "/products"
            }
            saveLabel={mode === "create" ? "ثبت کالا" : "ذخیرهٔ تغییرات"}
            submitting={isSubmitting}
          />
        </SectionCard>
      </form>
    </div>
  );
}

export function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const product = useRetailStore((state) =>
    state.products.find((item) => item.id === id),
  );
  const allMovements = useRetailStore((state) => state.stockMovements);
  const allSales = useRetailStore((state) => state.sales);
  const allPurchases = useRetailStore((state) => state.purchases);
  const movements = useMemo(
    () => allMovements.filter((item) => item.productId === id),
    [allMovements, id],
  );
  const sales = useMemo(
    () =>
      allSales.filter((sale) =>
        sale.items.some((item) => item.productId === id),
      ),
    [allSales, id],
  );
  const purchases = useMemo(
    () =>
      allPurchases.filter((purchase) =>
        purchase.items.some((item) => item.productId === id),
      ),
    [allPurchases, id],
  );
  const calendarMode = useAppStore((state) => state.calendarMode);
  const setProductActive = useRetailStore((state) => state.setProductActive);
  const [adjustOpen, setAdjustOpen] = useState(false);

  if (!product)
    return (
      <div className="workspace-page mx-auto grid w-full max-w-[1560px] min-w-0 content-start gap-4 p-4 sm:gap-5 sm:p-5 xl:p-6">
        <PageHeader title="جزئیات کالا" description="رکورد در دسترس نیست." />
        <EmptyState
          title="کالا پیدا نشد"
          description="به فهرست کالاها بازگردید و رکورد دیگری را انتخاب کنید."
          action={
            <Link
              className={buttonVariants({ variant: "outline" })}
              to="/products"
            >
              فهرست کالاها
            </Link>
          }
        />
      </div>
    );

  const archiveProduct = () => {
    const result = setProductActive(product.id, false);
    if (!result.ok) sileo.error({ title: result.error, duration: 3000 });
    else {
      notifyPersistedMutation("کالا بایگانی شد؛ سوابق آن حفظ شده است.");
      navigate("/products");
    }
  };

  return (
    <div className="workspace-page mx-auto grid w-full max-w-[1560px] min-w-0 content-start gap-4 p-4 sm:gap-5 sm:p-5 xl:p-6">
      <PageHeader
        title={product.name}
        description={`${product.brand ? `${product.brand} · ` : ""}SKU داخلی: ${product.sku || "—"} · ${product.category}${product.barcode ? ` · ${identificationFormatLabel(product.barcodeFormat)}: ${product.barcode}` : ""}`}
        breadcrumbs={[
          { label: "کالاها", to: "/products" },
          { label: "جزئیات" },
        ]}
        action={
          <>
            <Link
              className={buttonVariants({ variant: "outline" })}
              to={`/products/${product.id}/edit`}
            >
              <Edit2 aria-hidden="true" size={15} /> ویرایش
            </Link>
            <Button onClick={() => setAdjustOpen(true)} variant="secondary">
              <RefreshCw aria-hidden="true" size={15} /> اصلاح موجودی
            </Button>
          </>
        }
      />
      <div className="metric-grid grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
        <MetricCard
          label="موجودی فعلی"
          value={`${formatNumber(product.stock)} ${product.unit}`}
          tone={product.stock <= product.minimumStock ? "warning" : "positive"}
          hint={`حداقل موجودی ${formatNumber(product.minimumStock)} ${product.unit}`}
        />
        <MetricCard
          label="قیمت فروش"
          value={formatCurrency(product.sellingPrice)}
        />
        <MetricCard
          label="بهای خرید میانگین"
          value={formatCurrency(product.purchaseCost)}
          hint="مبنای برآورد بهای تمام‌شدهٔ فروش"
        />
        <MetricCard
          label="وضعیت"
          value={product.active ? "فعال" : "بایگانی‌شده"}
          tone={product.active ? "positive" : "neutral"}
        />
      </div>
      {product.variants.length > 0 && (
        <SectionCard
          title="گونه‌ها و موجودی مستقل"
          description={`موجودی کل محصول ${formatNumber(product.stock)} ${product.unit} است؛ مقادیر گونه‌ها منبع موجودی جزئی هستند.`}
        >
          <div className="data-table-scroll min-w-0 overflow-x-auto rounded-2xl border border-border">
            <table className="data-table w-full min-w-[680px] border-collapse text-right text-sm [&_thead]:bg-muted/60 [&_th]:whitespace-nowrap [&_th]:px-3 [&_th]:py-3 [&_th]:text-right [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground [&_tbody_tr]:border-t [&_tbody_tr]:border-border/70 [&_td]:px-3 [&_td]:py-3 [&_td]:align-middle">
              <thead>
                <tr>
                  <th>مشخصه‌ها</th>
                  <th>کد داخلی گونه</th>
                  <th>SKU داخلی گونه</th>
                  <th>شناسهٔ بارکد یا QR</th>
                  <th>موجودی</th>
                </tr>
              </thead>
              <tbody>
                {product.variants.map((variant) => (
                  <tr key={variant.id}>
                    <td>{formatVariantAttributes(variant.attributes)}</td>
                    <td className="numeric-cell text-start tabular-nums">
                      {variant.code}
                    </td>
                    <td className="numeric-cell text-start tabular-nums">
                      {variant.sku || "—"}
                    </td>
                    <td className="numeric-cell whitespace-pre-wrap break-all text-start tabular-nums">
                      {variant.barcode
                        ? `${identificationFormatLabel(variant.barcodeFormat)}: ${variant.barcode}`
                        : "—"}
                    </td>
                    <td className="numeric-cell whitespace-nowrap text-start tabular-nums">
                      {formatNumber(variant.stock)} {product.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
      {product.description && (
        <SectionCard title="توضیحات">
          <p className="workspace-copy grid min-w-0 gap-2 text-sm leading-6 text-muted-foreground">
            {product.description}
          </p>
        </SectionCard>
      )}
      <div className="workspace-two-column grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <SectionCard
          title="گردش موجودی"
          description="سوابق موجودی افزوده، فروخته یا اصلاح‌شده؛ تاریخچه با عملیات جدید تکمیل می‌شود."
        >
          {movements.length ? (
            <div className="data-table-scroll min-w-0 overflow-x-auto rounded-2xl border border-border">
              <table className="data-table w-full min-w-[680px] border-collapse text-right text-sm [&_thead]:bg-muted/60 [&_th]:whitespace-nowrap [&_th]:px-3 [&_th]:py-3 [&_th]:text-right [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground [&_tbody_tr]:border-t [&_tbody_tr]:border-border/70 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-muted/30 [&_td]:px-3 [&_td]:py-3 [&_td]:align-middle">
                <thead>
                  <tr>
                    <th>تاریخ</th>
                    <th>نوع</th>
                    <th>تغییر</th>
                    <th>مانده</th>
                    <th>دلیل</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.slice(0, 12).map((movement) => (
                    <tr key={movement.id}>
                      <td>{getDateLabel(movement.date, calendarMode, true)}</td>
                      <td>
                        {movementTypeLabel(movement.type)}
                        {movement.variantLabel && (
                          <span className="table-subline mt-1 block text-[11px] leading-4 text-muted-foreground">
                            {movement.variantLabel}
                          </span>
                        )}
                      </td>
                      <td
                        className={
                          movement.quantityChange > 0
                            ? "positive-text font-medium text-success"
                            : movement.quantityChange < 0
                              ? "negative-text font-medium text-destructive"
                              : ""
                        }
                      >
                        {movement.quantityChange > 0 ? "+" : ""}
                        {formatNumber(movement.quantityChange)}
                      </td>
                      <td>
                        {formatNumber(movement.resultingStock)} {product.unit}
                      </td>
                      <td>{movement.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="گردشی ثبت نشده"
              description="هر فروش، خرید دریافتی یا اصلاح موجودی، سابقه‌ای به این فهرست اضافه می‌کند."
            />
          )}
        </SectionCard>
        <SectionCard
          title="فروش‌ها و خریدهای مرتبط"
          description="تراکنش‌های نمونهٔ تاریخی فقط برای مرور گزارش هستند؛ دفتر موجودی از ماندهٔ افتتاحیه آغاز می‌شود."
        >
          <div className="related-records-list grid gap-2">
            {[
              ...sales.slice(0, 5).map((sale) => ({
                id: sale.id,
                to: `/sales/${sale.id}`,
                ref: sale.reference,
                name: sale.customerName,
                amount: sale.amount,
                type: "فروش",
              })),
              ...purchases.slice(0, 5).map((purchase) => ({
                id: purchase.id,
                to: `/purchases/${purchase.id}`,
                ref: purchase.reference,
                name: purchase.supplierName,
                amount: purchase.amount,
                type: "خرید",
              })),
            ].map((record) => (
              <Link
                className="related-record-row flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card-raised/50 p-3"
                key={record.id}
                to={record.to}
              >
                <span>
                  <strong>{record.ref}</strong>
                  <small>
                    {record.type} · {record.name}
                  </small>
                </span>
                <strong>{formatCurrency(record.amount)}</strong>
              </Link>
            ))}
            {sales.length + purchases.length === 0 && (
              <EmptyState
                title="تراکنش مرتبطی نیست"
                description="فروش یا خرید جدید اینجا نمایش داده می‌شود."
              />
            )}
          </div>
          <div className="section-footer flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3 text-xs text-muted-foreground">
            <Link
              className="text-link font-medium text-primary transition-colors hover:text-primary-hover hover:underline"
              to="/stock-movements"
            >
              مشاهدهٔ دفتر گردش کالا
            </Link>
          </div>
        </SectionCard>
      </div>
      {product.active && (
        <div className="danger-zone rounded-2xl border border-destructive/25 bg-destructive/5 p-4">
          <div>
            <strong>بایگانی کالا</strong>
            <p>کالا از فروش‌های جدید خارج می‌شود؛ سوابق قبلی حفظ خواهند شد.</p>
          </div>
          <ConfirmAction
            title="بایگانی کالا؟"
            description={`«${product.name}» از فهرست فعال خارج می‌شود. سوابق فروش و گردش آن حذف نمی‌شوند.`}
            confirmLabel="بایگانی کالا"
            triggerLabel="بایگانی"
            onConfirm={archiveProduct}
            variant="outline"
          />
        </div>
      )}
      <StockAdjustmentDialog
        direction="both"
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        product={product}
      />
    </div>
  );
}

export function StockAdjustmentDialog({
  product,
  direction,
  open: controlledOpen,
  onOpenChange,
}: {
  product: RetailProduct;
  direction: "in" | "out" | "both";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const adjustStock = useRetailStore((state) => state.adjustStock);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (onOpenChange) onOpenChange(next);
    else setUncontrolledOpen(next);
  };
  const initialVariantId = product.variants[0]?.id ?? "";
  const {
    control,
    register,
    handleSubmit,
    reset,
    clearErrors,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<{
    quantity: number;
    reason: string;
    flow: "in" | "out";
    variantId: string;
  }>({
    defaultValues: {
      quantity: 1,
      reason: "",
      flow: direction === "out" ? "out" : "in",
      variantId: initialVariantId,
    },
  });
  const flow = watch("flow");
  const quantity = watch("quantity") ?? 1;
  const variantId = watch("variantId") ?? "";
  const selectedVariant = product.variants.find(
    (variant) => variant.id === variantId,
  );
  const selectedStock = product.variants.length
    ? (selectedVariant?.stock ?? 0)
    : product.stock;
  const canDecrease = selectedStock > 0;
  const canOpenDecrease = product.variants.length
    ? product.variants.some((variant) => variant.stock > 0)
    : product.stock > 0;

  useEffect(() => {
    if (open) {
      reset({
        quantity: 1,
        reason: "",
        flow: direction === "out" ? "out" : "in",
        variantId: initialVariantId,
      });
    }
  }, [direction, initialVariantId, open, reset]);

  const submit = handleSubmit(
    ({
      quantity: submittedQuantity,
      reason,
      flow: submittedFlow,
      variantId: submittedVariantId,
    }) => {
      clearErrors("root");
      const result = adjustStock(
        product.id,
        submittedFlow === "in" ? submittedQuantity : -submittedQuantity,
        reason,
        submittedVariantId || undefined,
      );
      if (!result.ok) {
        setError("root", { type: "business", message: result.error });
        return;
      }
      notifyPersistedMutation("گردش موجودی ثبت شد.");
      reset({
        quantity: 1,
        reason: "",
        flow: direction === "out" ? "out" : "in",
        variantId: initialVariantId,
      });
      setOpen(false);
    },
  );

  return (
    <>
      {controlledOpen === undefined && direction !== "both" && (
        <Button
          aria-label={`${direction === "in" ? "افزایش" : "کاهش"} موجودی ${product.name}`}
          disabled={direction === "out" && !canOpenDecrease}
          onClick={() => setOpen(true)}
          size="sm"
          variant="outline"
        >
          {direction === "in" ? (
            <>
              <ArrowUp aria-hidden="true" size={13} /> افزایش
            </>
          ) : (
            <>
              <ArrowDown aria-hidden="true" size={13} /> کاهش
            </>
          )}
        </Button>
      )}
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent>
          <div className="dialog-heading mb-4 space-y-1 pe-7 text-right">
            <DialogTitle>اصلاح موجودی کالا</DialogTitle>
            <DialogDescription>
              {product.name} · موجودی کل {formatNumber(product.stock)}{" "}
              {product.unit}. این عملیات فروش یا درآمد ایجاد نمی‌کند.
              {selectedVariant
                ? ` گونهٔ انتخاب‌شده: ${formatVariantAttributes(selectedVariant.attributes)} (${formatNumber(selectedVariant.stock)} ${product.unit})`
                : ""}
            </DialogDescription>
          </div>
          <form
            className="dialog-form grid min-w-0 gap-4"
            noValidate
            onSubmit={submit}
          >
            {direction === "both" && (
              <Controller
                control={control}
                name="flow"
                render={({ field, fieldState }) => (
                  <Field
                    error={fieldState.error?.message}
                    label="نوع اصلاح"
                    htmlFor="stock-direction"
                  >
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger
                        aria-describedby={
                          fieldState.error ? "stock-direction-error" : undefined
                        }
                        aria-invalid={Boolean(fieldState.error)}
                        id="stock-direction"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in">افزایش موجودی</SelectItem>
                        <SelectItem value="out">کاهش موجودی</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            )}
            {product.variants.length > 0 && (
              <Controller
                control={control}
                name="variantId"
                rules={{
                  required: "برای اصلاح موجودی، گونهٔ کالا را انتخاب کنید.",
                }}
                render={({ field, fieldState }) => (
                  <Field
                    error={fieldState.error?.message}
                    label="گونهٔ کالا"
                    htmlFor="stock-variant"
                    required
                  >
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <SelectTrigger
                        aria-describedby={
                          fieldState.error ? "stock-variant-error" : undefined
                        }
                        aria-invalid={Boolean(fieldState.error)}
                        id="stock-variant"
                      >
                        <SelectValue placeholder="انتخاب سایز، رنگ یا گونه" />
                      </SelectTrigger>
                      <SelectContent>
                        {product.variants.map((variant) => (
                          <SelectItem key={variant.id} value={variant.id}>
                            {formatVariantAttributes(variant.attributes)} ·{" "}
                            {variant.code} · موجودی{" "}
                            {formatNumber(variant.stock)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            )}
            <Field
              error={errors.quantity?.message}
              label="تعداد"
              htmlFor="stock-quantity"
              required
            >
              <Input
                aria-describedby={
                  flow === "out" && quantity > selectedStock
                    ? "stock-quantity-warning"
                    : undefined
                }
                aria-invalid={flow === "out" && quantity > selectedStock}
                {...register("quantity", {
                  valueAsNumber: true,
                  required: "مقدار تغییر باید عدد صحیح و غیرصفر باشد.",
                  min: {
                    value: 1,
                    message: "مقدار تغییر باید عدد صحیح و غیرصفر باشد.",
                  },
                  validate: (value) =>
                    (Number.isInteger(value) && value > 0) ||
                    "مقدار تغییر باید عدد صحیح و غیرصفر باشد.",
                })}
                id="stock-quantity"
                min="1"
                required
                step="1"
                type="number"
              />
            </Field>
            <Field
              error={errors.reason?.message}
              label="دلیل تغییر"
              htmlFor="stock-reason-dialog"
              required
            >
              <Input
                {...register("reason", {
                  required: "برای تغییر دستی موجودی، ثبت دلیل الزامی است.",
                })}
                id="stock-reason-dialog"
                placeholder="مانند شمارش دوره‌ای یا ضایعات"
                required
              />
            </Field>
            {flow === "out" && quantity > selectedStock && (
              <p
                aria-live="polite"
                className="form-field-error text-xs leading-5 text-destructive"
                id="stock-quantity-warning"
                role="status"
              >
                کاهش درخواستی از موجودی فعلی بیشتر است.
              </p>
            )}
            {errors.root?.message && (
              <p
                className="form-field-error text-xs leading-5 text-destructive"
                role="alert"
              >
                {errors.root.message}
              </p>
            )}
            <div className="dialog-actions flex flex-wrap items-center gap-2 border-t border-border/70 pt-4">
              <Button onClick={() => setOpen(false)} variant="outline">
                انصراف
              </Button>
              <Button
                disabled={
                  isSubmitting ||
                  quantity < 1 ||
                  !Number.isInteger(quantity) ||
                  (flow === "out" && (!canDecrease || quantity > selectedStock))
                }
                type="submit"
                variant="primary"
              >
                ثبت اصلاح
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function movementTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    opening: "موجودی افتتاحیه",
    purchase: "رسید خرید",
    sale: "فروش",
    return: "مرجوعی قابل فروش",
    "adjustment-in": "افزایش دستی",
    "adjustment-out": "کاهش دستی",
    correction: "اصلاح موجودی",
  };
  return labels[type] ?? type;
}
