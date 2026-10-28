import { Ban, Plus, Printer, Trash, Undo2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterInput } from "@/components/records/FilterInput";
import { FormActions } from "@/components/records/FormActions";
import { Pagination } from "@/components/records/Pagination";
import { ProductCombobox } from "@/components/records/ProductCombobox";
import { SectionCard } from "@/components/records/SectionCard";
import {
  DateField,
  EmptyState,
  Field,
  MetricCard,
  PaymentMethodSelect,
  StatusBadge,
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
import { createProductSearchEntries } from "@/lib/product-search";
import {
  findProductCodeMatches,
  formatVariantAttributes,
} from "@/lib/product-variants";
import {
  findRelatedPayment,
  getNetSaleAmount,
  getSaleNetPaidAmount,
  getSaleOutstanding,
  getSaleStatus,
  isSaleVoided,
  paymentMethodLabel,
} from "@/lib/retail-data";
import { useAppStore } from "@/store/app-store";
import { type SaleInput, useRetailStore } from "@/store/retail-store";
import type { PaymentMethod, RetailSale } from "@/types/retail";

const PAGE_SIZE = 10;

export function SalesPage() {
  const sales = useRetailStore((state) => state.sales);
  const returns = useRetailStore((state) => state.returns);
  const calendarMode = useAppStore((state) => state.calendarMode);
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get("search") ?? "");
  const [statusFilter, setStatusFilter] = useState("all");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return sales
      .filter((sale) => {
        const matchesQuery =
          !normalized ||
          `${sale.reference} ${sale.customerName} ${sale.items
            .map(
              (item) =>
                `${item.productName} ${item.variantLabel ?? ""} ${item.variantCode ?? ""}`,
            )
            .join(" ")}`
            .toLocaleLowerCase()
            .includes(normalized);
        const status = getSaleStatus(sale, returns);
        return (
          matchesQuery && (statusFilter === "all" || status === statusFilter)
        );
      })
      .sort(
        (left, right) =>
          right.date.localeCompare(left.date) ||
          right.time.localeCompare(left.time),
      );
  }, [query, returns, sales, statusFilter]);
  const { page, pageCount, visible, setPage } = usePagination(
    filtered,
    PAGE_SIZE,
  );
  useEffect(() => {
    setQuery(searchParams.get("search") ?? "");
    setPage(1);
  }, [searchParams, setPage]);
  const currentMonthKey = getTodayDateKey().slice(0, 7);
  const currentMonthSales = sales.filter(
    (sale) => sale.date.slice(0, 7) === currentMonthKey,
  );
  const receivableTotal = sales.reduce(
    (sum, sale) => sum + getSaleOutstanding(sale, returns),
    0,
  );
  const monthTotal = currentMonthSales.reduce(
    (sum, sale) => sum + getNetSaleAmount(sale),
    0,
  );
  const completed = sales.filter(
    (sale) => getSaleStatus(sale, returns) === "completed",
  ).length;

  return (
    <div className="workspace-page mx-auto grid w-full max-w-[1560px] min-w-0 content-start gap-4 p-4 sm:gap-5 sm:p-5 xl:p-6">
      <PageHeader
        title="فروش‌ها"
        description="فاکتورهای فروش، پرداخت‌ها و مطالبات مشتریان را بررسی کنید."
        action={
          <Link
            className={buttonVariants({ variant: "primary" })}
            to="/sales/new"
          >
            <Plus aria-hidden="true" size={16} /> ثبت فروش
          </Link>
        }
      />
      <div className="metric-grid grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
        <MetricCard
          label="فروش خالص این ماه"
          value={formatCurrency(monthTotal)}
          hint="پس از تخفیف و مرجوعی‌های ثبت‌شده"
          tone="positive"
        />
        <MetricCard
          label="تعداد فاکتورها"
          value={sales.length}
          hint="فروش‌های نمونه و ثبت‌شده"
        />
        <MetricCard
          label="مطالبات باز"
          value={formatCurrency(receivableTotal)}
          tone={receivableTotal ? "warning" : "positive"}
          hint="ماندهٔ فاکتورهای مشتریان"
        />
        <MetricCard
          label="تسویه‌شده"
          value={`${formatNumber(completed)} فاکتور`}
          hint="بر اساس پرداخت‌های ثبت‌شده"
        />
      </div>
      <SectionCard
        title="سوابق فروش"
        description={`${formatNumber(filtered.length)} فاکتور`}
      >
        <div className="list-toolbar flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card-raised/50 p-3">
          <FilterInput
            id="sales-search"
            label="جست‌وجوی فروش"
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            placeholder="شماره فاکتور، مشتری یا کالا"
            value={query}
          />
          <Select
            onValueChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
            value={statusFilter}
          >
            <SelectTrigger aria-label="وضعیت پرداخت">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همهٔ وضعیت‌ها</SelectItem>
              <SelectItem value="completed">تسویه‌شده</SelectItem>
              <SelectItem value="partial">پرداخت جزئی</SelectItem>
              <SelectItem value="pending">در انتظار پرداخت</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {visible.length ? (
          <div className="data-table-scroll min-w-0 overflow-x-auto rounded-2xl border border-border">
            <table className="data-table w-full min-w-[680px] border-collapse text-right text-sm [&_thead]:bg-muted/60 [&_th]:whitespace-nowrap [&_th]:px-3 [&_th]:py-3 [&_th]:text-right [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground [&_tbody_tr]:border-t [&_tbody_tr]:border-border/70 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-muted/30 [&_td]:px-3 [&_td]:py-3 [&_td]:align-middle">
              <thead>
                <tr>
                  <th>فاکتور</th>
                  <th>تاریخ</th>
                  <th>مشتری</th>
                  <th>تعداد اقلام</th>
                  <th>مبلغ فروش</th>
                  <th>پرداخت خالص</th>
                  <th>مانده</th>
                  <th>وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((sale) => (
                  <tr key={sale.id}>
                    <td>
                      <Link
                        className="table-primary-link font-medium text-primary transition-colors hover:text-primary-hover hover:underline"
                        to={`/sales/${sale.id}`}
                      >
                        {sale.reference}
                      </Link>
                      <span className="table-subline mt-1 block text-[11px] leading-4 text-muted-foreground">
                        {sale.items.length} ردیف کالا
                        {isSaleVoided(sale) ? " · باطل‌شده" : ""}
                      </span>
                    </td>
                    <td>{getDateLabel(sale.date, calendarMode, true)}</td>
                    <td>{sale.customerName}</td>
                    <td className="numeric-cell whitespace-nowrap text-start tabular-nums">
                      {formatNumber(sale.itemCount)}
                    </td>
                    <td className="numeric-cell whitespace-nowrap text-start tabular-nums">
                      {formatCurrency(getNetSaleAmount(sale))}
                    </td>
                    <td className="numeric-cell whitespace-nowrap text-start tabular-nums">
                      {formatCurrency(getSaleNetPaidAmount(sale, returns))}
                    </td>
                    <td className="numeric-cell whitespace-nowrap text-start tabular-nums">
                      {formatCurrency(getSaleOutstanding(sale, returns))}
                    </td>
                    <td>
                      <StatusBadge status={getSaleStatus(sale, returns)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="فروشی برای نمایش نیست"
            description={
              sales.length
                ? "جست‌وجو یا فیلتر را تغییر دهید."
                : "فروش‌های ثبت‌شده در این فهرست نگهداری می‌شوند."
            }
            action={
              !sales.length ? (
                <Link
                  className={buttonVariants({ variant: "primary", size: "sm" })}
                  to="/sales/new"
                >
                  ثبت نخستین فروش
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

let saleDraftItemSequence = 0;

function nextSaleDraftItemId(): string {
  saleDraftItemSequence += 1;
  return `sale-draft-${saleDraftItemSequence}`;
}

interface SaleDraftItem {
  id: string;
  productId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
}

type SaleFormValues = Omit<SaleInput, "items" | "dueDate"> & {
  items: SaleDraftItem[];
  dueDate: string;
};

export function NewSalePage() {
  const navigate = useNavigate();
  const allProducts = useRetailStore((state) => state.products);
  const allCustomers = useRetailStore((state) => state.customers);
  const products = useMemo(
    () => allProducts.filter((product) => product.active),
    [allProducts],
  );
  const productSearchEntries = useMemo(
    () => createProductSearchEntries(products),
    [products],
  );
  const customers = useMemo(
    () => allCustomers.filter((customer) => customer.active),
    [allCustomers],
  );
  const createSale = useRetailStore((state) => state.createSale);
  const calendarMode = useAppStore((state) => state.calendarMode);
  const [codeLookup, setCodeLookup] = useState("");
  const [codeLookupError, setCodeLookupError] = useState("");
  const [codeLookupNotice, setCodeLookupNotice] = useState("");
  const firstProduct = products[0];
  const defaultCustomerId =
    customers.find((item) => item.id === "cus-004")?.id ??
    customers[0]?.id ??
    "";
  const {
    control,
    register,
    handleSubmit,
    setValue,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SaleFormValues>({
    defaultValues: {
      date: getTodayDateKey(),
      customerId: defaultCustomerId,
      items: firstProduct
        ? [
            {
              id: nextSaleDraftItemId(),
              productId: firstProduct.id,
              variantId:
                firstProduct.variants.length === 1
                  ? (firstProduct.variants[0]?.id ?? "")
                  : "",
              quantity: 1,
              unitPrice: firstProduct.sellingPrice,
            },
          ]
        : [],
      discountAmount: 0,
      paidAmount: 0,
      paymentMethod: "cash",
      dueDate: "",
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
    keyName: "fieldKey",
  });
  const items = useWatch({ control, name: "items" }) ?? [];
  const discountAmount = useWatch({ control, name: "discountAmount" }) ?? 0;
  const paidAmount = useWatch({ control, name: "paidAmount" }) ?? 0;
  const total = Math.max(
    0,
    items.reduce(
      (sum, item) =>
        sum +
        (Number.isFinite(item.quantity) ? item.quantity : 0) *
          (Number.isFinite(item.unitPrice) ? item.unitPrice : 0),
      0,
    ) - (Number.isFinite(discountAmount) ? discountAmount : 0),
  );

  const addLine = () => {
    const product = products.find((item) => item.stock > 0) ?? products[0];
    if (product)
      append({
        id: nextSaleDraftItemId(),
        productId: product.id,
        variantId:
          product.variants.length === 1 ? (product.variants[0]?.id ?? "") : "",
        quantity: 1,
        unitPrice: product.sellingPrice,
      });
  };
  const addProductByCode = () => {
    const matches = findProductCodeMatches(products, codeLookup);
    if (matches.length !== 1) {
      setCodeLookupNotice("");
      setCodeLookupError(
        matches.length > 1
          ? "این کد برای چند کالای فعال یا گونه ثبت شده است؛ از فهرست دستی، کالا و گونهٔ دقیق را انتخاب کنید."
          : "شناسهٔ بارکد/QR، SKU یا کد داخلی پیدا نشد؛ کد را بررسی کنید یا از فهرست دستی انتخاب کنید.",
      );
      return;
    }
    const match = matches[0];
    if (!match) return;
    const requiresVariantSelection =
      !match.variant && match.product.variants.length > 1;
    append({
      id: nextSaleDraftItemId(),
      productId: match.product.id,
      variantId: match.variant?.id ?? "",
      quantity: 1,
      unitPrice: match.product.sellingPrice,
    });
    setCodeLookup("");
    setCodeLookupError("");
    setCodeLookupNotice(
      requiresVariantSelection
        ? "این شناسه فقط محصول را مشخص می‌کند؛ از انتخاب‌گر گونه در ردیف افزوده‌شده، گونهٔ دقیق را دستی انتخاب کنید."
        : "",
    );
  };
  const submit = handleSubmit((values) => {
    clearErrors("root");
    const input: SaleInput = {
      ...values,
      items: values.items,
      dueDate: values.dueDate || undefined,
    };
    const result = createSale(input);
    if (!result.ok) {
      setError("root", { type: "business", message: result.error });
      return;
    }
    notifyPersistedMutation(
      `فروش ${result.value.reference} ثبت شد و موجودی کالاها به‌روزرسانی شد.`,
    );
    navigate(`/sales/${result.value.id}`);
  });
  const updatePaymentToFull = () =>
    setValue("paidAmount", total, { shouldDirty: true });

  return (
    <div className="workspace-page mx-auto grid w-full max-w-[1560px] min-w-0 content-start gap-4 p-4 sm:gap-5 sm:p-5 xl:p-6">
      <PageHeader
        title="ثبت فروش جدید"
        description="با تأیید فاکتور، موجودی کاهش می‌یابد و پرداخت یا مانده ثبت می‌شود."
        breadcrumbs={[
          { label: "فروش‌ها", to: "/sales" },
          { label: "فروش جدید" },
        ]}
      />
      <form
        className="workspace-form grid min-w-0 gap-4"
        noValidate
        onSubmit={submit}
      >
        <SectionCard
          title="مشخصات فاکتور"
          description="مشتری، تاریخ و اقلام فروش را انتخاب کنید."
        >
          <div className="form-grid grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <Controller
              control={control}
              name="date"
              rules={{ required: "تاریخ فروش معتبر نیست." }}
              render={({ field, fieldState }) => (
                <DateField
                  error={fieldState.error?.message}
                  id="sale-date"
                  label="تاریخ فروش"
                  mode={calendarMode}
                  onChange={field.onChange}
                  required
                  value={field.value}
                />
              )}
            />
            <Controller
              control={control}
              name="customerId"
              rules={{ required: "مشتری انتخاب‌شده پیدا نشد." }}
              render={({ field, fieldState }) => (
                <Field
                  error={fieldState.error?.message}
                  label="مشتری"
                  htmlFor="sale-customer"
                  required
                >
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger
                      aria-describedby={
                        fieldState.error ? "sale-customer-error" : undefined
                      }
                      aria-invalid={Boolean(fieldState.error)}
                      id="sale-customer"
                    >
                      <SelectValue placeholder="انتخاب مشتری" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </div>
        </SectionCard>
        <SectionCard
          title="اقلام فروش"
          description="قیمت هر ردیف را می‌توانید برای همین فاکتور تغییر دهید."
        >
          <div className="mb-4 flex items-center min-w-0 gap-2 rounded-xl border border-border bg-card-raised/30 p-3">
            <Field
              label="افزودن با SKU، بارکد/QR یا کد داخلی (اختیاری)"
              htmlFor="sale-code-lookup"
              hint={
                codeLookupNotice ||
                "می‌توانید کد را تایپ کنید یا از اسکنر کیبوردی سازگار استفاده کنید؛ کالا و گونه را هم می‌توان دستی انتخاب کرد."
              }
              error={codeLookupError || undefined}
              className="w-full"
            >
              <Input
                autoComplete="off"
                autoCapitalize="off"
                id="sale-code-lookup"
                spellCheck={false}
                onChange={(event) => {
                  setCodeLookup(event.target.value);
                  setCodeLookupError("");
                  setCodeLookupNotice("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addProductByCode();
                  }
                }}
                placeholder="کد اختیاری را وارد کنید"
                value={codeLookup}
              />
            </Field>
            <Button
              onClick={addProductByCode}
              type="button"
              variant="outline"
              className="w-1/5"
            >
              افزودن با کد
            </Button>
          </div>
          <div className="sale-line-list grid min-w-0 gap-3">
            {fields.map((field, index) => {
              const item = items[index] ?? field;
              const product = products.find(
                (entry) => entry.id === item.productId,
              );
              const selectedVariant = product?.variants.find(
                (variant) => variant.id === item.variantId,
              );
              const availableStock = product?.variants.length
                ? (selectedVariant?.stock ?? 0)
                : (product?.stock ?? 0);
              return (
                <div
                  className="sale-line-row grid min-w-0 grid-cols-1 gap-3 rounded-2xl border border-border bg-card-raised/40 p-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(100px,0.55fr)_minmax(145px,0.8fr)_auto]"
                  key={field.fieldKey}
                >
                  <Controller
                    control={control}
                    name={`items.${index}.productId`}
                    rules={{
                      required:
                        "یکی از کالاهای انتخاب‌شده فعال نیست یا پیدا نشد.",
                    }}
                    render={({ field: productField, fieldState }) => (
                      <Field
                        error={fieldState.error?.message}
                        label={`کالای ردیف ${formatNumber(index + 1)}`}
                        htmlFor={`sale-product-${index}`}
                        required
                      >
                        <ProductCombobox
                          entries={productSearchEntries}
                          id={`sale-product-${index}`}
                          onChange={(value) => {
                            if (value === productField.value) return;
                            productField.onChange(value);
                            const selected = products.find(
                              (entry) => entry.id === value,
                            );
                            const defaultVariantId =
                              selected?.variants.length === 1
                                ? (selected.variants[0]?.id ?? "")
                                : "";
                            setValue(
                              `items.${index}.variantId`,
                              defaultVariantId,
                              {
                                shouldDirty: true,
                                shouldValidate: true,
                              },
                            );
                            setValue(
                              `items.${index}.unitPrice`,
                              selected?.sellingPrice ?? 0,
                              {
                                shouldDirty: true,
                                shouldValidate: true,
                              },
                            );
                          }}
                          selectedProduct={product}
                          value={productField.value}
                        />
                      </Field>
                    )}
                  />
                  {product?.variants.length ? (
                    <Controller
                      control={control}
                      name={`items.${index}.variantId`}
                      rules={{ required: "گونهٔ دقیق کالا را انتخاب کنید." }}
                      render={({ field: variantField, fieldState }) => (
                        <Field
                          error={fieldState.error?.message}
                          label={`گونهٔ ردیف ${formatNumber(index + 1)}`}
                          htmlFor={`sale-variant-${index}`}
                          required
                        >
                          <Select
                            onValueChange={(value) => {
                              variantField.onChange(value);
                              setCodeLookupNotice("");
                            }}
                            value={variantField.value || ""}
                          >
                            <SelectTrigger
                              aria-describedby={
                                fieldState.error
                                  ? `sale-variant-${index}-error`
                                  : undefined
                              }
                              aria-invalid={Boolean(fieldState.error)}
                              id={`sale-variant-${index}`}
                            >
                              <SelectValue placeholder="انتخاب سایز، رنگ یا گونه" />
                            </SelectTrigger>
                            <SelectContent>
                              {product.variants.map((variant) => (
                                <SelectItem key={variant.id} value={variant.id}>
                                  {formatVariantAttributes(variant.attributes)}{" "}
                                  · کد داخلی {variant.code} · SKU{" "}
                                  {variant.sku || "—"} · موجودی{" "}
                                  {formatNumber(variant.stock)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                      )}
                    />
                  ) : null}
                  <Field
                    error={errors.items?.[index]?.quantity?.message}
                    label="تعداد"
                    htmlFor={`sale-quantity-${index}`}
                    required
                    hint={
                      product?.variants.length
                        ? selectedVariant
                          ? `موجودی ${formatVariantAttributes(selectedVariant.attributes)}: ${formatNumber(availableStock)} ${product.unit}`
                          : "ابتدا گونهٔ دقیق را انتخاب کنید."
                        : product
                          ? `موجودی فعلی: ${formatNumber(product.stock)} ${product.unit}`
                          : undefined
                    }
                    hintId={`sale-quantity-${index}-hint`}
                  >
                    <Input
                      {...register(`items.${index}.quantity`, {
                        valueAsNumber: true,
                        required: "تعداد هر قلم باید عدد صحیح مثبت باشد.",
                        min: {
                          value: 1,
                          message: "تعداد هر قلم باید عدد صحیح مثبت باشد.",
                        },
                        validate: (value) => {
                          if (!Number.isInteger(value) || value <= 0) {
                            return "تعداد هر قلم باید عدد صحیح مثبت باشد.";
                          }
                          return (
                            value <= availableStock ||
                            `موجودی ${selectedVariant ? formatVariantAttributes(selectedVariant.attributes) : "کالا"} برای این فروش کافی نیست.`
                          );
                        },
                      })}
                      id={`sale-quantity-${index}`}
                      min="1"
                      required
                      step="1"
                      type="number"
                    />
                  </Field>
                  <Field
                    error={errors.items?.[index]?.unitPrice?.message}
                    label="قیمت واحد (تومان)"
                    htmlFor={`sale-price-${index}`}
                    required
                  >
                    <Input
                      {...register(`items.${index}.unitPrice`, {
                        valueAsNumber: true,
                        required: "قیمت فروش هر قلم معتبر نیست.",
                        min: {
                          value: 0,
                          message: "قیمت فروش هر قلم معتبر نیست.",
                        },
                        validate: (value) =>
                          Number.isFinite(value) && value >= 0
                            ? true
                            : "قیمت فروش هر قلم معتبر نیست.",
                      })}
                      id={`sale-price-${index}`}
                      required
                      type="text"
                    />
                  </Field>
                  <div className="sale-line-total flex min-h-10 items-center justify-between gap-2 rounded-xl bg-muted/60 px-3 text-sm font-semibold tabular-nums">
                    <span>جمع ردیف</span>
                    <strong>
                      {formatCurrency(
                        (Number.isFinite(item.quantity) ? item.quantity : 0) *
                          (Number.isFinite(item.unitPrice)
                            ? item.unitPrice
                            : 0),
                      )}
                    </strong>
                    {items.length > 1 && (
                      <Button
                        aria-label={`حذف ردیف ${index + 1}`}
                        onClick={() => remove(index)}
                        size="icon-sm"
                        variant="outline"
                        className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash className="size-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <Button onClick={addLine} variant="outline">
            <Plus aria-hidden="true" size={14} /> افزودن کالا
          </Button>
          <div className="form-grid sale-pricing-grid grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
            <Field
              error={errors.discountAmount?.message}
              label="تخفیف فاکتور (تومان)"
              htmlFor="sale-discount"
            >
              <Input
                {...register("discountAmount", {
                  setValueAs: (value: string) =>
                    value === "" ? 0 : Number(value),
                  min: { value: 0, message: "تخفیف معتبر نیست." },
                  validate: (value) =>
                    (Number.isFinite(value) && value >= 0) ||
                    "تخفیف معتبر نیست.",
                })}
                id="sale-discount"
                type="text"
              />
            </Field>
            <Field label="مبلغ نهایی" htmlFor="sale-total">
              <Input
                aria-readonly="true"
                id="sale-total"
                readOnly
                value={formatCurrency(total)}
              />
            </Field>
          </div>
        </SectionCard>
        <SectionCard
          title="پرداخت و مانده"
          description="وصول وجه از فروش جدا ثبت می‌شود؛ پرداخت جزئی، طلب مشتری ایجاد می‌کند."
        >
          <div className="form-grid grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              error={errors.paidAmount?.message}
              label="مبلغ دریافتی (تومان)"
              htmlFor="sale-paid"
              required
              hint="برای فروش اعتباری صفر وارد کنید."
              hintId="sale-paid-hint"
            >
              <Input
                {...register("paidAmount", {
                  valueAsNumber: true,
                  required: "مبلغ دریافتی معتبر نیست.",
                  min: { value: 0, message: "مبلغ دریافتی معتبر نیست." },
                  validate: (value) =>
                    (Number.isFinite(value) && value >= 0) ||
                    "مبلغ دریافتی معتبر نیست.",
                })}
                id="sale-paid"
                required
                type="text"
              />
            </Field>
            <Controller
              control={control}
              name="paymentMethod"
              render={({ field }) => (
                <PaymentMethodSelect
                  id="sale-method"
                  onChange={field.onChange}
                  value={field.value}
                />
              )}
            />
            <Controller
              control={control}
              name="dueDate"
              render={({ field, fieldState }) => (
                <DateField
                  error={fieldState.error?.message}
                  id="sale-due-date"
                  label="سررسید (اختیاری)"
                  mode={calendarMode}
                  onChange={field.onChange}
                  value={field.value}
                />
              )}
            />
          </div>
          <div className="form-hint-row flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>ماندهٔ قابل‌وصول</span>
            <strong>
              {formatCurrency(
                Math.max(
                  0,
                  total - (Number.isFinite(paidAmount) ? paidAmount : 0),
                ),
              )}
            </strong>
            <Button onClick={updatePaymentToFull} size="sm" variant="outline">
              تسویهٔ کامل
            </Button>
          </div>
          {errors.root?.message && (
            <p
              className="form-field-error text-xs leading-5 text-destructive"
              role="alert"
            >
              {errors.root.message}
            </p>
          )}
          <FormActions
            cancelTo="/sales"
            saveLabel="تأیید و ثبت فروش"
            submitting={isSubmitting}
          />
        </SectionCard>
      </form>
    </div>
  );
}

export function SaleDetailPage() {
  const { id } = useParams();
  const sale = useRetailStore((state) =>
    state.sales.find((item) => item.id === id),
  );
  const payments = useRetailStore((state) => state.payments);
  const returns = useRetailStore((state) => state.returns);
  const settings = useRetailStore((state) => state.settings);
  const products = useRetailStore((state) => state.products);
  const calendarMode = useAppStore((state) => state.calendarMode);
  const relatedPayments = useMemo(
    () =>
      findRelatedPayment(payments, id).sort(
        (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
      ),
    [id, payments],
  );
  const outstanding = sale ? getSaleOutstanding(sale, returns) : 0;
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const saleVoided = sale ? isSaleVoided(sale) : false;
  const saleHasReturn = sale
    ? returns.some((record) => record.saleId === sale.id)
    : false;

  if (!sale)
    return (
      <div className="workspace-page mx-auto grid w-full max-w-[1560px] min-w-0 content-start gap-4 p-4 sm:gap-5 sm:p-5 xl:p-6">
        <PageHeader title="جزئیات فروش" description="فاکتور در دسترس نیست." />
        <EmptyState
          title="فاکتور پیدا نشد"
          description="به فهرست فروش‌ها بازگردید."
          action={
            <Link
              className={buttonVariants({ variant: "outline" })}
              to="/sales"
            >
              فهرست فروش‌ها
            </Link>
          }
        />
      </div>
    );

  return (
    <div className="workspace-page mx-auto grid w-full max-w-[1560px] min-w-0 content-start gap-4 p-4 sm:gap-5 sm:p-5 xl:p-6">
      <PageHeader
        title={`فاکتور ${sale.reference}`}
        description={`${sale.customerName} · ${getDateLabel(sale.date, calendarMode, true)} ${sale.time}`}
        breadcrumbs={[
          { label: "فروش‌ها", to: "/sales" },
          { label: sale.reference },
        ]}
        action={
          <>
            <Button onClick={() => window.print()} variant="outline">
              <Printer aria-hidden="true" size={15} /> چاپ رسید
            </Button>
            {!saleVoided && !saleHasReturn && (
              <Link
                className={buttonVariants({ variant: "outline" })}
                to={`/returns?saleId=${encodeURIComponent(sale.id)}`}
              >
                <Undo2 aria-hidden="true" size={15} /> ثبت مرجوعی
              </Link>
            )}
            {!saleVoided && (
              <Button onClick={() => setVoidOpen(true)} variant="outline">
                <Ban aria-hidden="true" size={15} /> ابطال فاکتور
              </Button>
            )}
          </>
        }
      />
      {saleVoided && (
        <div
          className="data-note rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs leading-6 text-muted-foreground"
          data-testid="sale-void-banner"
        >
          این فاکتور در تاریخ{" "}
          {getDateLabel(sale.voidedAt ?? sale.date, calendarMode, true)} باطل
          شده است. اثر فروش، مالیات‌ها و حرکت موجودی آن خنثی شده و ماندهٔ مشتری
          صفر است. دلیل: <strong>{sale.voidReason}</strong>
        </div>
      )}
      {sale.baseline && (
        <div className="data-note rounded-xl border border-info/20 bg-info/5 px-3 py-2 text-xs leading-6 text-muted-foreground">
          <span>رکورد نمونهٔ تاریخی</span>
          <p>
            موجودی آغازین فروشگاه از ماندهٔ فعلی کالاها شروع می‌شود؛ این فاکتور
            تاریخی در دفتر گردش جدید کالا ثبت نشده است.
          </p>
        </div>
      )}
      <div className="metric-grid grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
        <MetricCard
          label="مبلغ خالص فاکتور"
          value={formatCurrency(sale.amount - sale.returnedAmount)}
          hint={`تخفیف ثبت‌شده: ${formatCurrency(sale.discountAmount)}`}
        />
        <MetricCard
          label="پرداخت خالص"
          value={formatCurrency(getSaleNetPaidAmount(sale, returns))}
          hint={`پس از ${formatCurrency(
            sale.paidAmount - getSaleNetPaidAmount(sale, returns),
          )} بازپرداخت مرجوعی`}
          tone="positive"
        />
        <MetricCard
          label="ماندهٔ طلب"
          value={formatCurrency(outstanding)}
          tone={outstanding ? "warning" : "positive"}
        />
        <MetricCard
          label="وضعیت"
          value={
            getSaleStatus(sale, returns) === "completed"
              ? "تسویه‌شده"
              : getSaleStatus(sale, returns) === "partial"
                ? "پرداخت جزئی"
                : "در انتظار پرداخت"
          }
        />
      </div>
      <SectionCard
        title="اقلام فاکتور"
        description={`${formatNumber(sale.itemCount)} واحد کالا`}
      >
        <div className="data-table-scroll min-w-0 overflow-x-auto rounded-2xl border border-border">
          <table className="data-table w-full min-w-[680px] border-collapse text-right text-sm [&_thead]:bg-muted/60 [&_th]:whitespace-nowrap [&_th]:px-3 [&_th]:py-3 [&_th]:text-right [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground [&_tbody_tr]:border-t [&_tbody_tr]:border-border/70 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-muted/30 [&_td]:px-3 [&_td]:py-3 [&_td]:align-middle">
            <thead>
              <tr>
                <th>کالا</th>
                <th>تعداد</th>
                <th>قیمت واحد</th>
                <th>تخفیف ردیف</th>
                <th>جمع ردیف</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => (
                <tr
                  key={
                    item.id ??
                    `${sale.id}-${item.productId}-${item.quantity}-${item.unitPrice}`
                  }
                >
                  <td>
                    <Link
                      className="table-primary-link font-medium text-primary transition-colors hover:text-primary-hover hover:underline"
                      to={`/products/${item.productId}`}
                    >
                      {item.productName}
                    </Link>
                    {item.variantLabel && (
                      <span className="table-subline mt-1 block text-[11px] leading-4 text-muted-foreground">
                        {item.variantLabel} · {item.variantCode}
                      </span>
                    )}
                  </td>
                  <td>{formatNumber(item.quantity)}</td>
                  <td>{formatCurrency(item.unitPrice)}</td>
                  <td>{formatCurrency(item.discountAmount)}</td>
                  <td>{formatCurrency(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={4}>مبلغ نهایی</th>
                <th>{formatCurrency(sale.amount)}</th>
              </tr>
            </tfoot>
          </table>
        </div>
      </SectionCard>
      <div className="workspace-two-column grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <SectionCard
          title="سوابق پرداخت"
          description="پرداخت‌ها درآمد جدید ایجاد نمی‌کنند؛ هر ردیف به همین فاکتور متصل است."
          action={
            outstanding > 0 && !saleVoided ? (
              <Button onClick={() => setPaymentOpen(true)} size="sm">
                <Plus aria-hidden="true" size={14} /> ثبت دریافت
              </Button>
            ) : undefined
          }
        >
          {relatedPayments.length ? (
            <div className="data-table-scroll min-w-0 overflow-x-auto rounded-2xl border border-border">
              <table className="data-table w-full min-w-[680px] border-collapse text-right text-sm [&_thead]:bg-muted/60 [&_th]:whitespace-nowrap [&_th]:px-3 [&_th]:py-3 [&_th]:text-right [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground [&_tbody_tr]:border-t [&_tbody_tr]:border-border/70 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-muted/30 [&_td]:px-3 [&_td]:py-3 [&_td]:align-middle">
                <thead>
                  <tr>
                    <th>تاریخ</th>
                    <th>رویداد</th>
                    <th>روش</th>
                    <th>مبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {relatedPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{getDateLabel(payment.date, calendarMode, true)}</td>
                      <td>
                        {payment.kind === "refund"
                          ? "بازپرداخت"
                          : payment.kind === "sale-settlement"
                            ? "وصول طلب"
                            : "پرداخت اولیه"}
                      </td>
                      <td>{paymentMethodLabel(payment.method)}</td>
                      <td
                        className={
                          payment.direction === "in"
                            ? "positive-text font-medium text-success"
                            : "negative-text font-medium text-destructive"
                        }
                      >
                        {formatCurrency(payment.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="پرداختی ثبت نشده"
              description="این فاکتور هنوز پرداختی ندارد."
            />
          )}
        </SectionCard>
        <SectionCard
          title="خلاصهٔ رسید"
          description="نمای رسید محلی؛ برای خروجی کاغذی از چاپ مرورگر استفاده کنید."
        >
          <div className="receipt-preview mx-auto grid w-full max-w-xl gap-3 rounded-2xl border border-dashed border-border bg-card-raised/40 p-4 sm:p-6">
            <div className="receipt-brand border-b border-dashed border-border pb-3 text-center">
              {settings.storeName}
            </div>
            <div className="receipt-line flex items-center justify-between gap-4 border-b border-border/50 py-2 text-sm last:border-0">
              <span>شماره فاکتور</span>
              <strong>{sale.reference}</strong>
            </div>
            <div className="receipt-line flex items-center justify-between gap-4 border-b border-border/50 py-2 text-sm last:border-0">
              <span>تاریخ</span>
              <strong>{getDateLabel(sale.date, calendarMode, true)}</strong>
            </div>
            <div className="receipt-line flex items-center justify-between gap-4 border-b border-border/50 py-2 text-sm last:border-0">
              <span>مشتری</span>
              <strong>{sale.customerName}</strong>
            </div>
            {sale.items.map((item) => {
              const product = products.find(
                (entry) => entry.id === item.productId,
              );
              const variant = product?.variants.find(
                (entry) => entry.id === item.variantId,
              );
              const receiptCode = settings.showSkuOnReceipt
                ? variant?.sku || item.variantCode || product?.sku || ""
                : "";
              const sku = receiptCode ? ` · ${receiptCode}` : "";
              return (
                <div
                  className="receipt-line flex items-center justify-between gap-4 border-b border-border/50 py-2 text-sm last:border-0"
                  key={
                    item.id ??
                    `${sale.id}-${item.productId}-${item.quantity}-${item.unitPrice}`
                  }
                >
                  <span>
                    {item.productName}
                    {item.variantLabel ? ` · ${item.variantLabel}` : ""}
                    {sku} × {formatNumber(item.quantity)}
                  </span>
                  <strong>{formatCurrency(item.lineTotal)}</strong>
                </div>
              );
            })}
            <div className="receipt-line flex items-center justify-between gap-4 border-b border-border/50 py-2 text-sm last:border-0">
              <span>مبلغ ناخالص</span>
              <strong>{formatCurrency(sale.grossAmount)}</strong>
            </div>
            <div className="receipt-line flex items-center justify-between gap-4 border-b border-border/50 py-2 text-sm last:border-0">
              <span>تخفیف</span>
              <strong>{formatCurrency(sale.discountAmount)}</strong>
            </div>
            <div className="receipt-line flex items-center justify-between gap-4 border-b border-border/50 py-2 text-sm last:border-0 receipt-total">
              <span>جمع نهایی</span>
              <strong>{formatCurrency(sale.amount)}</strong>
            </div>
            <p>{settings.receiptFooter}</p>
          </div>
        </SectionCard>
      </div>
      <SalePaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        sale={sale}
      />
      <SaleVoidDialog open={voidOpen} onOpenChange={setVoidOpen} sale={sale} />
    </div>
  );
}

function SalePaymentDialog({
  sale,
  open,
  onOpenChange,
}: {
  sale: RetailSale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const addSalePayment = useRetailStore((state) => state.addSalePayment);
  const returns = useRetailStore((state) => state.returns);
  const calendarMode = useAppStore((state) => state.calendarMode);
  const {
    control,
    register,
    handleSubmit,
    reset,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<{ amount: number; method: PaymentMethod; date: string }>({
    defaultValues: {
      amount: getSaleOutstanding(sale, returns),
      method: "cash",
      date: getTodayDateKey(),
    },
  });
  useEffect(() => {
    if (open) {
      reset({
        amount: getSaleOutstanding(sale, returns),
        method: "cash",
        date: getTodayDateKey(),
      });
    }
  }, [open, reset, returns, sale]);
  const submit = handleSubmit(({ amount, method, date }) => {
    clearErrors("root");
    const result = addSalePayment(sale.id, amount, method, date);
    if (!result.ok) {
      setError("root", { type: "business", message: result.error });
      return;
    }
    notifyPersistedMutation("دریافت طلب ثبت شد.");
    reset({
      amount: getSaleOutstanding(
        result.value,
        useRetailStore.getState().returns,
      ),
      method: "cash",
      date: getTodayDateKey(),
    });
    onOpenChange(false);
  });
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <div className="dialog-heading mb-4 space-y-1 pe-7 text-right">
          <DialogTitle>ثبت دریافت طلب</DialogTitle>
          <DialogDescription>
            این دریافت، فروش جدید ایجاد نمی‌کند. ماندهٔ فعلی:{" "}
            {formatCurrency(getSaleOutstanding(sale, returns))}.
          </DialogDescription>
        </div>
        <form
          className="dialog-form grid min-w-0 gap-4"
          noValidate
          onSubmit={submit}
        >
          <Field
            error={errors.amount?.message}
            label="مبلغ دریافت (تومان)"
            htmlFor="sale-payment-amount"
            required
          >
            <Input
              {...register("amount", {
                valueAsNumber: true,
                required: "مبلغ دریافت باید بیشتر از صفر باشد.",
                min: {
                  value: 1,
                  message: "مبلغ دریافت باید بیشتر از صفر باشد.",
                },
                validate: (value) =>
                  (Number.isFinite(value) && value > 0) ||
                  "مبلغ دریافت باید بیشتر از صفر باشد.",
              })}
              id="sale-payment-amount"
              min="1"
              required
              type="number"
            />
          </Field>
          <Controller
            control={control}
            name="method"
            render={({ field }) => (
              <PaymentMethodSelect
                id="sale-payment-method"
                onChange={field.onChange}
                value={field.value}
              />
            )}
          />
          <Controller
            control={control}
            name="date"
            rules={{ required: "تاریخ دریافت معتبر نیست." }}
            render={({ field, fieldState }) => (
              <DateField
                error={fieldState.error?.message}
                id="sale-payment-date"
                label="تاریخ دریافت"
                mode={calendarMode}
                onChange={field.onChange}
                required
                value={field.value}
              />
            )}
          />
          {errors.root?.message && (
            <p
              className="form-field-error text-xs leading-5 text-destructive"
              role="alert"
            >
              {errors.root.message}
            </p>
          )}
          <div className="dialog-actions flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-4">
            <Button onClick={() => onOpenChange(false)} variant="outline">
              انصراف
            </Button>
            <Button disabled={isSubmitting} type="submit" variant="primary">
              {isSubmitting ? "در حال ثبت…" : "ثبت دریافت"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SaleVoidDialog({
  sale,
  open,
  onOpenChange,
}: {
  sale: RetailSale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const voidSale = useRetailStore((state) => state.voidSale);
  const calendarMode = useAppStore((state) => state.calendarMode);
  const {
    control,
    register,
    handleSubmit,
    reset,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<{ reason: string; date: string }>({
    defaultValues: { reason: "", date: getTodayDateKey() },
  });
  useEffect(() => {
    if (open) {
      reset({ reason: "", date: getTodayDateKey() });
    }
  }, [open, reset]);
  const submit = handleSubmit(({ reason, date }) => {
    clearErrors("root");
    const result = voidSale(sale.id, reason, date);
    if (!result.ok) {
      setError("root", { type: "business", message: result.error });
      return;
    }
    notifyPersistedMutation("فاکتور باطل شد و موجودی کالاها برگشت خورد.");
    onOpenChange(false);
  });
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <div className="dialog-heading mb-4 space-y-1 pe-7 text-right">
          <DialogTitle>ابطال فاکتور {sale.reference}</DialogTitle>
          <DialogDescription>
            ابطال، فاکتور را حذف نمی‌کند؛ سند در سوابق می‌ماند، موجودی کالاها به
            انبار برمی‌گردد و مبلغ دریافتی به‌عنوان برگشت وجه ثبت می‌شود. این
            عمل یک‌بار انجام می‌شود و قابل تکرار نیست. فاکتورهایی که مرجوعی
            ثبت‌شده دارند قابل ابطال نیستند.
          </DialogDescription>
        </div>
        <form
          className="dialog-form grid min-w-0 gap-4"
          noValidate
          onSubmit={submit}
        >
          <Field
            error={errors.reason?.message}
            htmlFor="sale-void-reason"
            label="دلیل ابطال"
            required
          >
            <Input
              {...register("reason", {
                validate: (value) =>
                  value.trim().length > 0 || "دلیل ابطال را وارد کنید.",
              })}
              id="sale-void-reason"
              placeholder="مثلاً ثبت اشتباه فاکتور"
              required
            />
          </Field>
          <Controller
            control={control}
            name="date"
            rules={{ required: "تاریخ ابطال معتبر نیست." }}
            render={({ field, fieldState }) => (
              <DateField
                error={fieldState.error?.message}
                id="sale-void-date"
                label="تاریخ ابطال"
                mode={calendarMode}
                onChange={field.onChange}
                required
                value={field.value}
              />
            )}
          />
          {errors.root?.message && (
            <p
              className="form-field-error text-xs leading-5 text-destructive"
              role="alert"
            >
              {errors.root.message}
            </p>
          )}
          <div className="dialog-actions flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-4">
            <Button onClick={() => onOpenChange(false)} variant="outline">
              انصراف
            </Button>
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "در حال ابطال…" : "تأیید ابطال فاکتور"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
