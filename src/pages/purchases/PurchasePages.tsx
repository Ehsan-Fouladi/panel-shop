import { PackageCheck, Plus, RotateCcw, Trash, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
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
  getPurchaseOutstanding,
  getPurchaseReturnedAmount,
  getPurchaseReturnedQuantities,
  getPurchaseStatus,
  paymentMethodLabel,
} from "@/lib/retail-data";
import { useAppStore } from "@/store/app-store";
import {
  type PurchaseInput,
  type PurchaseReturnInput,
  useRetailStore,
} from "@/store/retail-store";
import type {
  PaymentMethod,
  PurchaseReturnRecord,
  RetailPurchase,
} from "@/types/retail";
import { sileo } from "sileo";

const PAGE_SIZE = 10;
let purchaseDraftItemSequence = 0;

function nextPurchaseDraftItemId(): string {
  purchaseDraftItemSequence += 1;
  return `purchase-draft-${purchaseDraftItemSequence}`;
}

interface PurchaseDraftItem {
  id: string;
  productId: string;
  variantId: string;
  quantity: number;
  unitCost: number;
}

type PurchaseFormValues = Omit<PurchaseInput, "items" | "dueDate"> & {
  items: PurchaseDraftItem[];
  dueDate: string;
};

export function PurchasesPage() {
  const purchases = useRetailStore((state) => state.purchases);
  const calendarMode = useAppStore((state) => state.calendarMode);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [receivedFilter, setReceivedFilter] = useState("all");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return purchases
      .filter((purchase) => {
        const textMatch =
          !normalized ||
          `${purchase.reference} ${purchase.supplierName} ${purchase.description}`
            .toLocaleLowerCase()
            .includes(normalized);
        const balanceMatch =
          statusFilter === "all" ||
          getPurchaseStatus(purchase) === statusFilter;
        const receiptMatch =
          receivedFilter === "all" ||
          String(purchase.received) === receivedFilter;
        return textMatch && balanceMatch && receiptMatch;
      })
      .sort((left, right) => right.date.localeCompare(left.date));
  }, [purchases, query, receivedFilter, statusFilter]);
  const outstanding = purchases.reduce(
    (sum, purchase) => sum + getPurchaseOutstanding(purchase),
    0,
  );
  const pendingReceipt = purchases.filter(
    (purchase) => !purchase.received,
  ).length;
  const { page, pageCount, visible, setPage } = usePagination(
    filtered,
    PAGE_SIZE,
  );

  return (
    <div className="workspace-page mx-auto grid w-full max-w-[1560px] min-w-0 content-start gap-4 p-4 sm:gap-5 sm:p-5 xl:p-6">
      <PageHeader
        title="خریدها"
        description="خریدهای ثبت‌شده، دریافت کالا و ماندهٔ بدهی تأمین‌کنندگان را پیگیری کنید."
        action={
          <Link
            className={buttonVariants({ variant: "primary" })}
            to="/purchases/new"
          >
            <Plus aria-hidden="true" size={16} /> ثبت خرید
          </Link>
        }
      />
      <div className="metric-grid grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
        <MetricCard label="خریدهای ثبت‌شده" value={purchases.length} />
        <MetricCard
          label="بدهی تأمین‌کنندگان"
          value={formatCurrency(outstanding)}
          tone={outstanding ? "warning" : "positive"}
        />
        <MetricCard
          label="در انتظار دریافت"
          value={pendingReceipt}
          tone={pendingReceipt ? "warning" : "neutral"}
          hint="ثبت خرید به‌تنهایی موجودی را تغییر نمی‌دهد"
        />
        <MetricCard
          label="رسیدشده"
          value={purchases.filter((purchase) => purchase.received).length}
          tone="positive"
        />
      </div>
      <SectionCard
        title="سوابق خرید"
        description={`${formatNumber(filtered.length)} سفارش`}
      >
        <div className="list-toolbar flex flex-col min-w-0 gap-3 rounded-2xl border border-border bg-card-raised/50 p-3">
          <FilterInput
            id="purchase-search"
            label="جست‌وجوی خرید"
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            placeholder="شماره سفارش، تأمین‌کننده یا کالا"
            value={query}
          />
          <div className="flex max-lg:flex-col gap-3">
            <Select
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
              value={statusFilter}
            >
              <SelectTrigger aria-label="وضعیت پرداخت خرید">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همهٔ وضعیت‌های پرداخت</SelectItem>
                <SelectItem value="completed">تسویه‌شده</SelectItem>
                <SelectItem value="partial">پرداخت جزئی</SelectItem>
                <SelectItem value="pending">در انتظار پرداخت</SelectItem>
              </SelectContent>
            </Select>
            <Select
              onValueChange={(value) => {
                setReceivedFilter(value);
                setPage(1);
              }}
              value={receivedFilter}
            >
              <SelectTrigger aria-label="وضعیت دریافت">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همهٔ وضعیت‌های دریافت</SelectItem>
                <SelectItem value="true">دریافت‌شده</SelectItem>
                <SelectItem value="false">در انتظار دریافت</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {visible.length ? (
          <div className="data-table-scroll min-w-0 overflow-x-auto rounded-2xl border border-border">
            <table className="data-table w-full min-w-[680px] border-collapse text-right text-sm [&_thead]:bg-muted/60 [&_th]:whitespace-nowrap [&_th]:px-3 [&_th]:py-3 [&_th]:text-right [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground [&_tbody_tr]:border-t [&_tbody_tr]:border-border/70 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-muted/30 [&_td]:px-3 [&_td]:py-3 [&_td]:align-middle">
              <thead>
                <tr>
                  <th>شماره خرید</th>
                  <th>تاریخ</th>
                  <th>تأمین‌کننده</th>
                  <th>اقلام</th>
                  <th>مبلغ</th>
                  <th>پرداخت‌شده</th>
                  <th>بدهی</th>
                  <th>دریافت کالا</th>
                  <th>وضعیت پرداخت</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((purchase) => (
                  <tr key={purchase.id}>
                    <td>
                      <Link
                        className="table-primary-link font-medium text-primary transition-colors hover:text-primary-hover hover:underline"
                        to={`/purchases/${purchase.id}`}
                      >
                        {purchase.reference}
                      </Link>
                    </td>
                    <td>{getDateLabel(purchase.date, calendarMode, true)}</td>
                    <td>{purchase.supplierName}</td>
                    <td>{formatNumber(purchase.items.length)} ردیف</td>
                    <td className="numeric-cell whitespace-nowrap text-start tabular-nums">
                      {formatCurrency(purchase.amount)}
                    </td>
                    <td className="numeric-cell whitespace-nowrap text-start tabular-nums">
                      {formatCurrency(purchase.paidAmount)}
                    </td>
                    <td className="numeric-cell whitespace-nowrap text-start tabular-nums">
                      {formatCurrency(getPurchaseOutstanding(purchase))}
                    </td>
                    <td>
                      <span
                        className={`status-text inline-flex items-center rounded-full border border-border bg-muted px-2 py-1 text-[10px] font-medium leading-none text-muted-foreground ${purchase.received ? "is-positive bg-success/10 text-success" : "is-warning"}`}
                      >
                        {purchase.received ? "دریافت‌شده" : "در انتظار"}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={getPurchaseStatus(purchase)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="خریدی پیدا نشد"
            description={
              purchases.length
                ? "فیلترها را تغییر دهید."
                : "سفارش خرید با ثبت دریافت، موجودی را افزایش می‌دهد."
            }
            action={
              !purchases.length ? (
                <Link
                  className={buttonVariants({ variant: "primary", size: "sm" })}
                  to="/purchases/new"
                >
                  ثبت خرید
                </Link>
              ) : undefined
            }
          />
        )}
        <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
      </SectionCard>
      <p className="data-note rounded-xl border border-info/20 bg-info/5 px-3 py-2 text-xs leading-6 text-muted-foreground compact-note py-1.5">
        خریدهای نمونهٔ تاریخی برای گزارش نگهداری شده‌اند؛ فقط خریدهای جدیدِ
        دریافت‌شده به دفتر گردش موجودی اضافه می‌شوند.
      </p>
    </div>
  );
}

export function NewPurchasePage() {
  const navigate = useNavigate();
  const products = useRetailStore((state) => state.products);
  const suppliers = useRetailStore((state) => state.suppliers);
  const createPurchase = useRetailStore((state) => state.createPurchase);
  const calendarMode = useAppStore((state) => state.calendarMode);
  const [codeLookup, setCodeLookup] = useState("");
  const [codeLookupError, setCodeLookupError] = useState("");
  const [codeLookupNotice, setCodeLookupNotice] = useState("");
  const activeProducts = useMemo(
    () => products.filter((product) => product.active),
    [products],
  );
  const productSearchEntries = useMemo(
    () => createProductSearchEntries(activeProducts),
    [activeProducts],
  );
  const activeSuppliers = useMemo(
    () => suppliers.filter((supplier) => supplier.active),
    [suppliers],
  );
  const {
    control,
    register,
    handleSubmit,
    setValue,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PurchaseFormValues>({
    defaultValues: {
      date: getTodayDateKey(),
      supplierId: activeSuppliers[0]?.id ?? "",
      items: activeProducts[0]
        ? [
            {
              id: nextPurchaseDraftItemId(),
              productId: activeProducts[0].id,
              variantId:
                activeProducts[0].variants.length === 1
                  ? (activeProducts[0].variants[0]?.id ?? "")
                  : "",
              quantity: 1,
              unitCost: activeProducts[0].purchaseCost,
            },
          ]
        : [],
      additionalCosts: 0,
      paidAmount: 0,
      paymentMethod: "transfer",
      dueDate: "",
      received: false,
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
    keyName: "fieldKey",
  });
  const items = useWatch({ control, name: "items" }) ?? [];
  const additionalCosts = useWatch({ control, name: "additionalCosts" }) ?? 0;
  const received = useWatch({ control, name: "received" }) ?? false;
  const total =
    items.reduce(
      (sum, item) =>
        sum +
        (Number.isFinite(item.quantity) ? item.quantity : 0) *
          (Number.isFinite(item.unitCost) ? item.unitCost : 0),
      0,
    ) + (Number.isFinite(additionalCosts) ? additionalCosts : 0);
  const addLine = () => {
    const product = activeProducts[0];
    if (product)
      append({
        id: nextPurchaseDraftItemId(),
        productId: product.id,
        variantId:
          product.variants.length === 1 ? (product.variants[0]?.id ?? "") : "",
        quantity: 1,
        unitCost: product.purchaseCost,
      });
  };
  const addProductByCode = () => {
    const matches = findProductCodeMatches(activeProducts, codeLookup);
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
      id: nextPurchaseDraftItemId(),
      productId: match.product.id,
      variantId: match.variant?.id ?? "",
      quantity: 1,
      unitCost: match.product.purchaseCost,
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
    const input: PurchaseInput = {
      ...values,
      items: values.items,
      dueDate: values.dueDate || undefined,
    };
    const result = createPurchase(input);
    if (!result.ok) {
      setError("root", { type: "business", message: result.error });
      return;
    }
    notifyPersistedMutation(
      values.received
        ? "خرید ثبت شد و کالا به موجودی افزوده شد."
        : "خرید ثبت شد؛ موجودی تا زمان دریافت تغییر نکرد.",
    );
    navigate(`/purchases/${result.value.id}`);
  });
  return (
    <div className="workspace-page mx-auto grid w-full max-w-[1560px] min-w-0 content-start gap-4 p-4 sm:gap-5 sm:p-5 xl:p-6">
      <PageHeader
        title="ثبت خرید جدید"
        description="ثبت سفارش بدهی تأمین‌کننده را ثبت می‌کند؛ فقط گزینهٔ دریافت، موجودی کالا را افزایش می‌دهد."
        breadcrumbs={[
          { label: "خریدها", to: "/purchases" },
          { label: "خرید جدید" },
        ]}
      />
      <form
        className="workspace-form grid min-w-0 gap-4"
        noValidate
        onSubmit={submit}
      >
        <SectionCard
          title="مشخصات سفارش"
          description="تأمین‌کننده، تاریخ و اقلام خرید را وارد کنید."
        >
          <div className="form-grid grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <Controller
              control={control}
              name="date"
              rules={{ required: "تاریخ خرید معتبر نیست." }}
              render={({ field, fieldState }) => (
                <DateField
                  error={fieldState.error?.message}
                  id="purchase-date"
                  label="تاریخ خرید"
                  mode={calendarMode}
                  onChange={field.onChange}
                  required
                  value={field.value}
                />
              )}
            />
            <Controller
              control={control}
              name="supplierId"
              rules={{ required: "تأمین‌کنندهٔ انتخاب‌شده پیدا نشد." }}
              render={({ field, fieldState }) => (
                <Field
                  error={fieldState.error?.message}
                  label="تأمین‌کننده"
                  htmlFor="purchase-supplier"
                  required
                >
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger
                      aria-describedby={
                        fieldState.error ? "purchase-supplier-error" : undefined
                      }
                      aria-invalid={Boolean(fieldState.error)}
                      id="purchase-supplier"
                    >
                      <SelectValue placeholder="انتخاب تأمین‌کننده" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeSuppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
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
          title="اقلام خرید"
          description="بهای واحد برای محاسبهٔ میانگین موزون موجودی استفاده می‌شود."
        >
          <div className="mb-4 flex items-center min-w-0 gap-2 rounded-xl border border-border bg-card-raised/30 p-3">
            <Field
              label="افزودن با SKU، بارکد/QR یا کد داخلی (اختیاری)"
              htmlFor="purchase-code-lookup"
              hint={
                codeLookupNotice ||
                "کد را تایپ کنید یا از اسکنر کیبوردی سازگار استفاده کنید؛ کالا و گونه را هم می‌توان دستی انتخاب کرد."
              }
              error={codeLookupError || undefined}
              className="w-full"
            >
              <Input
                autoComplete="off"
                autoCapitalize="off"
                id="purchase-code-lookup"
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
              className="w-1/5"
              onClick={addProductByCode}
              type="button"
              variant="outline"
            >
              افزودن با کد
            </Button>
          </div>
          <div className="sale-line-list grid min-w-0 gap-3">
            {fields.map((field, index) => {
              const item = items[index] ?? field;
              const selectedProduct = activeProducts.find(
                (entry) => entry.id === item.productId,
              );
              const selectedVariant = selectedProduct?.variants.find(
                (variant) => variant.id === item.variantId,
              );
              return (
                <div
                  className="sale-line-row grid min-w-0 grid-cols-1 gap-3 rounded-2xl border border-border bg-card-raised/40 p-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(100px,0.55fr)_minmax(145px,0.8fr)_auto]"
                  key={field.fieldKey}
                >
                  <Controller
                    control={control}
                    name={`items.${index}.productId`}
                    rules={{
                      required: "یکی از کالاهای خرید فعال نیست یا پیدا نشد.",
                    }}
                    render={({ field: productField, fieldState }) => (
                      <Field
                        error={fieldState.error?.message}
                        label={`کالای ردیف ${formatNumber(index + 1)}`}
                        htmlFor={`purchase-product-${index}`}
                        required
                      >
                        <ProductCombobox
                          entries={productSearchEntries}
                          id={`purchase-product-${index}`}
                          onChange={(value) => {
                            if (value === productField.value) return;
                            productField.onChange(value);
                            const selected = activeProducts.find(
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
                              `items.${index}.unitCost`,
                              selected?.purchaseCost ?? 0,
                              {
                                shouldDirty: true,
                                shouldValidate: true,
                              },
                            );
                          }}
                          selectedProduct={selectedProduct}
                          value={productField.value}
                        />
                      </Field>
                    )}
                  />
                  {selectedProduct?.variants.length ? (
                    <Controller
                      control={control}
                      name={`items.${index}.variantId`}
                      rules={{ required: "گونهٔ دقیق کالا را انتخاب کنید." }}
                      render={({ field: variantField, fieldState }) => (
                        <Field
                          error={fieldState.error?.message}
                          label={`گونهٔ ردیف ${formatNumber(index + 1)}`}
                          htmlFor={`purchase-variant-${index}`}
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
                                  ? `purchase-variant-${index}-error`
                                  : undefined
                              }
                              aria-invalid={Boolean(fieldState.error)}
                              id={`purchase-variant-${index}`}
                            >
                              <SelectValue placeholder="انتخاب سایز، رنگ یا گونه" />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedProduct.variants.map((variant) => (
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
                    htmlFor={`purchase-quantity-${index}`}
                    required
                    hint={
                      selectedProduct?.variants.length
                        ? selectedVariant
                          ? `موجودی فعلی گونه: ${formatNumber(selectedVariant.stock)} ${selectedProduct.unit}`
                          : "ابتدا گونهٔ دقیق را انتخاب کنید."
                        : selectedProduct
                          ? `موجودی فعلی محصول: ${formatNumber(selectedProduct.stock)} ${selectedProduct.unit}`
                          : undefined
                    }
                  >
                    <Input
                      {...register(`items.${index}.quantity`, {
                        valueAsNumber: true,
                        required: "تعداد خرید باید عدد صحیح مثبت باشد.",
                        min: {
                          value: 1,
                          message: "تعداد خرید باید عدد صحیح مثبت باشد.",
                        },
                        validate: (value) =>
                          (Number.isInteger(value) && value > 0) ||
                          "تعداد خرید باید عدد صحیح مثبت باشد.",
                      })}
                      id={`purchase-quantity-${index}`}
                      min="1"
                      required
                      step="1"
                      type="number"
                    />
                  </Field>
                  <Field
                    error={errors.items?.[index]?.unitCost?.message}
                    label="بهای واحد (تومان)"
                    htmlFor={`purchase-cost-${index}`}
                    required
                  >
                    <Input
                      {...register(`items.${index}.unitCost`, {
                        valueAsNumber: true,
                        required: "بهای خرید هر قلم معتبر نیست.",
                        min: {
                          value: 0,
                          message: "بهای خرید هر قلم معتبر نیست.",
                        },
                        validate: (value) =>
                          (Number.isFinite(value) && value >= 0) ||
                          "بهای خرید هر قلم معتبر نیست.",
                      })}
                      id={`purchase-cost-${index}`}
                      required
                      type="text"
                    />
                  </Field>
                  <div className="sale-line-total flex min-h-10 items-center justify-between gap-2 rounded-xl bg-muted/60 px-3 text-sm font-semibold tabular-nums">
                    <span>جمع ردیف</span>
                    <strong>
                      {formatCurrency(
                        (Number.isFinite(item.quantity) ? item.quantity : 0) *
                          (Number.isFinite(item.unitCost) ? item.unitCost : 0),
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
                        <Trash className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <Button
            disabled={!activeProducts.length}
            onClick={addLine}
            variant="outline"
          >
            <Plus aria-hidden="true" size={14} /> افزودن کالا
          </Button>
          <div className="form-grid sale-pricing-grid grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
            <Field
              error={errors.additionalCosts?.message}
              label="هزینه‌های جانبی"
              htmlFor="purchase-extra"
            >
              <Input
                {...register("additionalCosts", {
                  setValueAs: (value: string) =>
                    value === "" ? 0 : Number(value),
                  min: { value: 0, message: "هزینهٔ جانبی معتبر نیست." },
                  validate: (value) =>
                    (Number.isFinite(value) && value >= 0) ||
                    "هزینهٔ جانبی معتبر نیست.",
                })}
                id="purchase-extra"
                min="0"
                type="number"
              />
            </Field>
            <Field label="جمع کل سفارش" htmlFor="purchase-total">
              <Input
                id="purchase-total"
                readOnly
                value={formatCurrency(total)}
              />
            </Field>
          </div>
        </SectionCard>
        <SectionCard title="پرداخت و دریافت کالا">
          <div className="form-grid grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              error={errors.paidAmount?.message}
              label="مبلغ پرداخت‌شده (تومان)"
              htmlFor="purchase-paid"
              required
            >
              <Input
                {...register("paidAmount", {
                  valueAsNumber: true,
                  required: "مبلغ پرداخت‌شده معتبر نیست.",
                  min: { value: 0, message: "مبلغ پرداخت‌شده معتبر نیست." },
                  validate: (value) =>
                    (Number.isFinite(value) && value >= 0) ||
                    "مبلغ پرداخت‌شده معتبر نیست.",
                })}
                id="purchase-paid"
                required
                type="text"
              />
            </Field>
            <Controller
              control={control}
              name="paymentMethod"
              render={({ field }) => (
                <PaymentMethodSelect
                  id="purchase-method"
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
                  id="purchase-due-date"
                  label="سررسید پرداخت (اختیاری)"
                  mode={calendarMode}
                  onChange={field.onChange}
                  value={field.value}
                />
              )}
            />
          </div>
          <label className="toggle-row flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border bg-card-raised/60 p-3 text-sm">
            <span>
              <strong>کالا اکنون دریافت شده است</strong>
              <small>
                با ثبت خرید، موجودی کالاها افزایش و گردش رسید ایجاد می‌شود.
              </small>
            </span>
            <input {...register("received")} type="checkbox" />
          </label>
          {errors.root?.message && (
            <p
              className="form-field-error text-xs leading-5 text-destructive"
              role="alert"
            >
              {errors.root.message}
            </p>
          )}
          <FormActions
            cancelTo="/purchases"
            saveLabel={received ? "ثبت خرید و دریافت کالا" : "ثبت سفارش خرید"}
            submitting={isSubmitting}
          />
        </SectionCard>
      </form>
    </div>
  );
}

export function PurchaseDetailPage() {
  const { id } = useParams();
  const purchase = useRetailStore((state) =>
    state.purchases.find((item) => item.id === id),
  );
  const payments = useRetailStore((state) => state.payments);
  const addPurchasePayment = useRetailStore(
    (state) => state.addPurchasePayment,
  );
  const receivePurchase = useRetailStore((state) => state.receivePurchase);
  const allPurchaseReturns = useRetailStore((state) => state.purchaseReturns);
  const purchaseReturns = useMemo(
    () => allPurchaseReturns.filter((record) => record.purchaseId === id),
    [allPurchaseReturns, id],
  );
  const [returnOpen, setReturnOpen] = useState(false);
  const relatedPayments = useMemo(
    () =>
      findRelatedPayment(payments, undefined, id).sort(
        (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
      ),
    [id, payments],
  );
  const [paymentOpen, setPaymentOpen] = useState(false);
  const calendarMode = useAppStore((state) => state.calendarMode);
  if (!purchase)
    return (
      <div className="workspace-page mx-auto grid w-full max-w-[1560px] min-w-0 content-start gap-4 p-4 sm:gap-5 sm:p-5 xl:p-6">
        <PageHeader title="جزئیات خرید" description="سفارش در دسترس نیست." />
        <EmptyState
          title="خرید پیدا نشد"
          description="به فهرست خریدها بازگردید."
          action={
            <Link
              className={buttonVariants({ variant: "outline" })}
              to="/purchases"
            >
              فهرست خریدها
            </Link>
          }
        />
      </div>
    );
  const receive = () => {
    const result = receivePurchase(purchase.id, getTodayDateKey());
    if (!result.ok) sileo.error({ title: result.error, duration: 3000 });
    else notifyPersistedMutation("رسید خرید ثبت و موجودی به‌روزرسانی شد.");
  };
  const outstanding = getPurchaseOutstanding(purchase);
  return (
    <div className="workspace-page mx-auto grid w-full max-w-[1560px] min-w-0 content-start gap-4 p-4 sm:gap-5 sm:p-5 xl:p-6">
      <PageHeader
        title={`خرید ${purchase.reference}`}
        description={`${purchase.supplierName} · ${getDateLabel(purchase.date, calendarMode, true)}`}
        breadcrumbs={[
          { label: "خریدها", to: "/purchases" },
          { label: purchase.reference },
        ]}
        action={
          !purchase.received ? (
            <Button onClick={receive} variant="primary">
              <PackageCheck aria-hidden="true" size={15} /> ثبت دریافت کالا
            </Button>
          ) : (
            <span className="status-text inline-flex items-center rounded-full border border-border bg-muted px-2 py-1 text-[10px] font-medium leading-none text-muted-foreground is-positive bg-success/10 text-success">
              کالا دریافت شده
            </span>
          )
        }
      />
      {purchase.baseline && (
        <div className="data-note rounded-xl border border-info/20 bg-info/5 px-3 py-2 text-xs leading-6 text-muted-foreground">
          <span>رکورد نمونهٔ تاریخی</span>
          <p>
            این سفارش به‌عنوان سابقهٔ واردشده نمایش داده می‌شود و ماندهٔ
            افتتاحیهٔ کالاها را دوباره تغییر نمی‌دهد.
          </p>
        </div>
      )}
      <div className="metric-grid grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
        <MetricCard label="مبلغ خرید" value={formatCurrency(purchase.amount)} />
        <MetricCard
          label="پرداخت‌شده"
          value={formatCurrency(purchase.paidAmount)}
          tone="positive"
        />
        <MetricCard
          label="ماندهٔ بدهی"
          value={formatCurrency(outstanding)}
          tone={outstanding ? "warning" : "positive"}
        />
        <MetricCard
          label="وضعیت دریافت"
          value={purchase.received ? "دریافت‌شده" : "در انتظار دریافت"}
          tone={purchase.received ? "positive" : "warning"}
        />
        <MetricCard
          label="مرجوعی به تأمین‌کننده"
          value={formatCurrency(
            getPurchaseReturnedAmount(purchase.id, allPurchaseReturns),
          )}
          tone={
            getPurchaseReturnedAmount(purchase.id, allPurchaseReturns)
              ? "warning"
              : "neutral"
          }
        />
      </div>
      <SectionCard title="اقلام خرید">
        <div className="data-table-scroll min-w-0 overflow-x-auto rounded-2xl border border-border">
          <table className="data-table w-full min-w-[680px] border-collapse text-right text-sm [&_thead]:bg-muted/60 [&_th]:whitespace-nowrap [&_th]:px-3 [&_th]:py-3 [&_th]:text-right [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground [&_tbody_tr]:border-t [&_tbody_tr]:border-border/70 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-muted/30 [&_td]:px-3 [&_td]:py-3 [&_td]:align-middle">
            <thead>
              <tr>
                <th>کالا</th>
                <th>تعداد</th>
                <th>بهای واحد</th>
                <th>هزینهٔ جانبی تخصیص‌یافته</th>
                <th>جمع</th>
              </tr>
            </thead>
            <tbody>
              {purchase.items.map((item) => (
                <tr
                  key={
                    item.id ??
                    `${purchase.id}-${item.productId}-${item.quantity}-${item.unitCost}`
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
                  <td>{formatCurrency(item.unitCost)}</td>
                  <td>
                    {formatCurrency(item.additionalCostPerUnit * item.quantity)}
                  </td>
                  <td>
                    {formatCurrency(
                      item.lineTotal +
                        item.additionalCostPerUnit * item.quantity,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={4}>جمع کل</th>
                <th>{formatCurrency(purchase.amount)}</th>
              </tr>
            </tfoot>
          </table>
        </div>
      </SectionCard>
      <div className="workspace-two-column grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <SectionCard
          title="پرداخت‌های تأمین‌کننده"
          description="تسویهٔ بدهی، پرداخت خرید جدید محسوب نمی‌شود."
          action={
            outstanding > 0 ? (
              <Button onClick={() => setPaymentOpen(true)} size="sm">
                <Wallet aria-hidden="true" size={14} /> ثبت پرداخت
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
                    <th>شرح</th>
                    <th>روش</th>
                    <th>مبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {relatedPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{getDateLabel(payment.date, calendarMode, true)}</td>
                      <td>{payment.description}</td>
                      <td>{paymentMethodLabel(payment.method)}</td>
                      <td>{formatCurrency(payment.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="پرداختی ثبت نشده"
              description="پرداخت‌های سفارش در اینجا ثبت می‌شوند."
            />
          )}
        </SectionCard>
        <SectionCard
          title="تأمین‌کننده"
          description="اطلاعات تماس و مانده از سوابق تأمین‌کننده استخراج می‌شود."
        >
          <p className="detail-lead rounded-xl border border-border bg-card-raised/50 p-3 text-sm leading-6 text-muted-foreground">
            {purchase.supplierName}
          </p>
          <Link
            className="text-link font-medium text-primary transition-colors hover:text-primary-hover hover:underline"
            to={`/suppliers/${purchase.supplierId}`}
          >
            مشاهدهٔ جزئیات تأمین‌کننده
          </Link>
        </SectionCard>
      </div>
      <SectionCard
        title="مرجوعی به تأمین‌کننده"
        description="مرجوعی خرید، موجودی را کم و مبلغ خرید را کاهش می‌دهد؛ بخش پرداخت‌شده به‌صورت اعتبار نزد تأمین‌کننده ثبت می‌شود و بازپرداخت نقدی خودکار نیست."
        action={
          purchase.received ? (
            <Button
              onClick={() => setReturnOpen(true)}
              size="sm"
              variant="outline"
            >
              <RotateCcw aria-hidden="true" size={14} /> ثبت مرجوعی خرید
            </Button>
          ) : undefined
        }
      >
        {purchaseReturns.length ? (
          <div className="grid gap-3">
            {purchaseReturns.map((record) => (
              <div
                className="rounded-2xl border border-border bg-card-raised/40 p-3 text-sm"
                data-testid="purchase-return-row"
                key={record.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{record.reference}</strong>
                  <span className="text-xs text-muted-foreground">
                    {getDateLabel(record.date, calendarMode, true)}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                  {record.items
                    .map(
                      (item) =>
                        `${item.productName}${item.variantLabel ? ` · ${item.variantLabel}` : ""} × ${formatNumber(item.quantity)}`,
                    )
                    .join(" ، ")}
                </p>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span>ارزش مرجوعی: {formatCurrency(record.amount)}</span>
                  <span>
                    اعتبار نزد تأمین‌کننده:{" "}
                    {formatCurrency(record.supplierCredit)}
                  </span>
                  <span>دلیل: {record.reason}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="مرجوعی ثبت نشده"
            description="اگر کالای خریداری‌شده به تأمین‌کننده برگردانده شد، از همین بخش ثبت کنید."
          />
        )}
      </SectionCard>
      <PurchasePaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        purchase={purchase}
        addPayment={addPurchasePayment}
        calendarMode={calendarMode}
      />
      <PurchaseReturnDialog
        calendarMode={calendarMode}
        onOpenChange={setReturnOpen}
        open={returnOpen}
        purchase={purchase}
        purchaseReturns={allPurchaseReturns}
      />
    </div>
  );
}

function PurchasePaymentDialog({
  purchase,
  open,
  onOpenChange,
  addPayment,
  calendarMode,
}: {
  purchase: RetailPurchase;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  addPayment: (
    id: string,
    amount: number,
    method: PaymentMethod,
    date: string,
  ) => { ok: boolean; error?: string };
  calendarMode: "jalali" | "gregorian";
}) {
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
      amount: getPurchaseOutstanding(purchase),
      method: "cash",
      date: getTodayDateKey(),
    },
  });
  useEffect(() => {
    if (open) {
      reset({
        amount: getPurchaseOutstanding(purchase),
        method: "cash",
        date: getTodayDateKey(),
      });
    }
  }, [open, purchase, reset]);
  const submit = handleSubmit(({ amount, method, date }) => {
    clearErrors("root");
    const result = addPayment(purchase.id, amount, method, date);
    if (!result.ok) {
      setError("root", {
        type: "business",
        message: result.error ?? "پرداخت ثبت نشد.",
      });
      return;
    }
    notifyPersistedMutation("پرداخت تأمین‌کننده ثبت شد.");
    onOpenChange(false);
  });
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <div className="dialog-heading mb-4 space-y-1 pe-7 text-right">
          <DialogTitle>ثبت پرداخت بدهی</DialogTitle>
          <DialogDescription>
            ماندهٔ فعلی {formatCurrency(getPurchaseOutstanding(purchase))} ·
            پرداخت به همین خرید متصل می‌شود.
          </DialogDescription>
        </div>
        <form
          className="dialog-form grid min-w-0 gap-4"
          noValidate
          onSubmit={submit}
        >
          <Field
            error={errors.amount?.message}
            label="مبلغ پرداخت (تومان)"
            htmlFor="purchase-payment-amount"
            required
          >
            <Input
              {...register("amount", {
                valueAsNumber: true,
                required: "مبلغ پرداخت باید بیشتر از صفر باشد.",
                min: {
                  value: 1,
                  message: "مبلغ پرداخت باید بیشتر از صفر باشد.",
                },
                validate: (value) =>
                  (Number.isFinite(value) && value > 0) ||
                  "مبلغ پرداخت باید بیشتر از صفر باشد.",
              })}
              id="purchase-payment-amount"
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
                id="purchase-payment-method"
                onChange={field.onChange}
                value={field.value}
              />
            )}
          />
          <Controller
            control={control}
            name="date"
            rules={{ required: "تاریخ پرداخت معتبر نیست." }}
            render={({ field, fieldState }) => (
              <DateField
                error={fieldState.error?.message}
                id="purchase-payment-date"
                label="تاریخ پرداخت"
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
              {isSubmitting ? "در حال ثبت…" : "ثبت پرداخت"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PurchaseReturnDialog({
  purchase,
  purchaseReturns,
  open,
  onOpenChange,
  calendarMode,
}: {
  purchase: RetailPurchase;
  purchaseReturns: PurchaseReturnRecord[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendarMode: "jalali" | "gregorian";
}) {
  const createPurchaseReturn = useRetailStore(
    (state) => state.createPurchaseReturn,
  );
  const lines = useMemo(() => {
    const returned = getPurchaseReturnedQuantities(
      purchase.id,
      purchaseReturns,
    );
    const grouped = new Map<
      string,
      {
        productId: string;
        variantId?: string;
        label: string;
        remaining: number;
      }
    >();
    for (const item of purchase.items) {
      const key = `${item.productId}::${item.variantId ?? "product"}`;
      const entry = grouped.get(key);
      const label = `${item.productName}${item.variantLabel ? ` · ${item.variantLabel}` : ""}`;
      if (entry) {
        entry.remaining += item.quantity;
      } else {
        grouped.set(key, {
          productId: item.productId,
          variantId: item.variantId,
          label,
          remaining: item.quantity,
        });
      }
    }
    return [...grouped.entries()].map(([key, entry]) => ({
      ...entry,
      key,
      remaining: entry.remaining - (returned.get(key) ?? 0),
    }));
  }, [purchase, purchaseReturns]);
  const {
    control,
    register,
    handleSubmit,
    reset,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<{
    reason: string;
    date: string;
    quantities: Record<string, number>;
  }>({
    defaultValues: { reason: "", date: getTodayDateKey(), quantities: {} },
  });
  useEffect(() => {
    if (open) {
      reset({ reason: "", date: getTodayDateKey(), quantities: {} });
    }
  }, [open, reset]);
  const submit = handleSubmit(({ reason, date, quantities }) => {
    clearErrors("root");
    const items: PurchaseReturnInput["items"] = lines
      .map((line) => ({
        productId: line.productId,
        variantId: line.variantId,
        quantity: Number(quantities[line.key] ?? 0),
      }))
      .filter((line) => Number.isFinite(line.quantity) && line.quantity > 0);
    if (items.length === 0) {
      setError("root", {
        type: "business",
        message: "حداقل یک قلم برای مرجوعی انتخاب کنید.",
      });
      return;
    }
    const result = createPurchaseReturn({
      purchaseId: purchase.id,
      reason,
      date,
      items,
    });
    if (!result.ok) {
      setError("root", { type: "business", message: result.error });
      return;
    }
    notifyPersistedMutation("مرجوعی خرید ثبت و موجودی کالاها کاهش یافت.");
    onOpenChange(false);
  });
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <div className="dialog-heading mb-4 space-y-1 pe-7 text-right">
          <DialogTitle>ثبت مرجوعی خرید {purchase.reference}</DialogTitle>
          <DialogDescription>
            فقط تعداد دریافت‌شده و مرجوع‌نشده قابل مرجوع است. مرجوعی موجودی
            انبار را کم می‌کند و مبلغ خرید را کاهش می‌دهد؛ پرداخت اضافه به‌صورت
            اعتبار نزد تأمین‌کننده ثبت می‌شود.
          </DialogDescription>
        </div>
        <form
          className="dialog-form grid min-w-0 gap-4"
          noValidate
          onSubmit={submit}
        >
          <div className="grid gap-3">
            {lines.map((line) => (
              <div
                className="grid gap-2 rounded-xl border border-border p-3"
                key={line.key}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <strong className="text-sm text-foreground">
                    {line.label}
                  </strong>
                  <span>
                    قابل مرجوع: {formatNumber(Math.max(0, line.remaining))}
                  </span>
                </div>
                <Controller
                  control={control}
                  name={`quantities.${line.key}` as const}
                  render={({ field }) => (
                    <Input
                      aria-label={`تعداد مرجوعی ${line.label}`}
                      disabled={line.remaining <= 0}
                      max={Math.max(0, line.remaining)}
                      min={0}
                      onChange={(event) =>
                        field.onChange(Number(event.target.value))
                      }
                      type="number"
                      value={field.value ?? 0}
                    />
                  )}
                />
              </div>
            ))}
          </div>
          <Field
            error={errors.reason?.message}
            htmlFor="purchase-return-reason"
            label="دلیل مرجوعی"
            required
          >
            <Input
              {...register("reason", {
                validate: (value) =>
                  value.trim().length > 0 || "دلیل مرجوعی را وارد کنید.",
              })}
              id="purchase-return-reason"
              placeholder="مثلاً کالای معیوب"
              required
            />
          </Field>
          <Controller
            control={control}
            name="date"
            rules={{ required: "تاریخ مرجوعی معتبر نیست." }}
            render={({ field, fieldState }) => (
              <DateField
                error={fieldState.error?.message}
                id="purchase-return-date"
                label="تاریخ مرجوعی"
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
              {isSubmitting ? "در حال ثبت…" : "ثبت مرجوعی"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
