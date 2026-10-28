import { Undo2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterInput } from "@/components/records/FilterInput";
import { SectionCard } from "@/components/records/SectionCard";
import {
  DateField,
  EmptyState,
  Field,
  MetricCard,
  PaymentMethodSelect,
} from "@/components/records/Shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getDateLabel, getTodayDateKey } from "@/lib/date";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { notifyPersistedMutation } from "@/lib/persistence-feedback";
import { useAppStore } from "@/store/app-store";
import { type ReturnInput, useRetailStore } from "@/store/retail-store";
import type { PaymentMethod, RetailSale } from "@/types/retail";

type ReturnFormValues = {
  saleId: string;
  date: string;
  reason: string;
  refundMethod: PaymentMethod;
  quantities: Record<string, number>;
  restock: Record<string, boolean>;
};

export function ReturnsPage() {
  const returns = useRetailStore((state) => state.returns);
  const sales = useRetailStore((state) => state.sales);
  const calendarMode = useAppStore((state) => state.calendarMode);
  const [searchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const returnTotal = returns.reduce((sum, record) => sum + record.amount, 0);
  useEffect(() => {
    if (searchParams.get("saleId")) setOpen(true);
  }, [searchParams]);
  return (
    <div className="workspace-page mx-auto grid w-full max-w-[1560px] min-w-0 content-start gap-4 p-4 sm:gap-5 sm:p-5 xl:p-6">
      <PageHeader
        title="مرجوعی‌ها"
        description="مرجوعی به فاکتور اصلی متصل می‌شود؛ موجودی فقط برای کالای قابل‌فروش دوباره افزایش می‌یابد."
        action={
          <Button onClick={() => setOpen(true)} variant="primary">
            <Undo2 aria-hidden="true" size={15} /> ثبت مرجوعی
          </Button>
        }
      />
      <div className="metric-grid grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
        <MetricCard label="تعداد مرجوعی‌ها" value={returns.length} />
        <MetricCard
          label="ارزش کالای برگشتی"
          value={formatCurrency(returnTotal)}
          tone="warning"
        />
        <MetricCard
          label="بازپرداخت نقدی/غیرنقدی"
          value={formatCurrency(
            returns.reduce((sum, record) => sum + record.refundAmount, 0),
          )}
          hint="به روش ثبت‌شدهٔ بازپرداخت"
        />
        <MetricCard
          label="کاهش طلب"
          value={formatCurrency(
            returns.reduce(
              (sum, record) => sum + record.receivableReduction,
              0,
            ),
          )}
          hint="بخش مربوط به ماندهٔ فاکتور"
        />
      </div>
      <SectionCard
        title="دفتر مرجوعی‌ها"
        description={`${formatNumber(returns.length)} رویداد`}
      >
        {returns.length ? (
          <div className="data-table-scroll min-w-0 overflow-x-auto rounded-2xl border border-border">
            <table className="data-table w-full min-w-[680px] border-collapse text-right text-sm [&_thead]:bg-muted/60 [&_th]:whitespace-nowrap [&_th]:px-3 [&_th]:py-3 [&_th]:text-right [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground [&_tbody_tr]:border-t [&_tbody_tr]:border-border/70 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-muted/30 [&_td]:px-3 [&_td]:py-3 [&_td]:align-middle">
              <thead>
                <tr>
                  <th>تاریخ</th>
                  <th>شماره مرجوعی</th>
                  <th>فاکتور اصلی</th>
                  <th>مشتری</th>
                  <th>اقلام</th>
                  <th>ارزش مرجوعی</th>
                  <th>بازپرداخت</th>
                  <th>کاهش طلب</th>
                  <th>دلیل</th>
                </tr>
              </thead>
              <tbody>
                {returns.map((record) => (
                  <tr key={record.id}>
                    <td>{getDateLabel(record.date, calendarMode, true)}</td>
                    <td>{record.reference}</td>
                    <td>{record.saleReference}</td>
                    <td>{record.customerName}</td>
                    <td>
                      {record.items
                        .map(
                          (item) =>
                            `${item.productName}${item.variantLabel ? ` · ${item.variantLabel}` : ""} × ${item.quantity}`,
                        )
                        .join("، ")}
                    </td>
                    <td>{formatCurrency(record.amount)}</td>
                    <td>{formatCurrency(record.refundAmount)}</td>
                    <td>{formatCurrency(record.receivableReduction)}</td>
                    <td>{record.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="مرجوعی‌ای ثبت نشده"
            description="برای شروع، فاکتور اصلی را پیدا کرده و قلم‌های مرجوعی را انتخاب کنید."
          />
        )}
      </SectionCard>
      <div className="data-note rounded-xl border border-info/20 bg-info/5 px-3 py-2 text-xs leading-6 text-muted-foreground">
        <span>قاعدهٔ حسابداری</span>
        <p>
          بازپرداخت وجه از فروش جداست. مقدار بازپرداخت حداکثر تا مبلغ پرداخت‌شده
          محاسبه می‌شود و بخش پرداخت‌نشده، ماندهٔ طلب را کاهش می‌دهد. این ابزار
          برای ثبت نمونهٔ محلی است.
        </p>
      </div>
      <ReturnCreateDialog
        open={open}
        onOpenChange={setOpen}
        sales={sales}
        defaultSaleId={searchParams.get("saleId") ?? ""}
      />
    </div>
  );
}

function ReturnCreateDialog({
  open,
  onOpenChange,
  sales,
  defaultSaleId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sales: RetailSale[];
  defaultSaleId: string;
}) {
  const createReturn = useRetailStore((state) => state.createReturn);
  const returns = useRetailStore((state) => state.returns);
  const calendarMode = useAppStore((state) => state.calendarMode);
  const [query, setQuery] = useState("");
  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ReturnFormValues>({
    defaultValues: {
      saleId: defaultSaleId,
      date: getTodayDateKey(),
      reason: "",
      refundMethod: "cash",
      quantities: {},
      restock: {},
    },
  });
  const selectedSaleId = useWatch({ control, name: "saleId" }) ?? "";
  const quantities = useWatch({ control, name: "quantities" }) ?? {};
  const restock = useWatch({ control, name: "restock" }) ?? {};
  const sale = sales.find((item) => item.id === selectedSaleId);
  const matchingSales = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return sales
      .filter(
        (item) =>
          !normalized ||
          `${item.reference} ${item.customerName} ${item.items
            .map(
              (line) =>
                `${line.productName} ${line.variantLabel ?? ""} ${line.variantCode ?? ""}`,
            )
            .join(" ")}`
            .toLocaleLowerCase()
            .includes(normalized),
      )
      .slice(0, 12);
  }, [query, sales]);
  const soldByVariant = useMemo(() => {
    if (!sale) return [];
    const groups = new Map<
      string,
      {
        key: string;
        productId: string;
        variantId?: string;
        variantCode?: string;
        variantLabel?: string;
        name: string;
        quantity: number;
        lineTotal: number;
      }
    >();
    for (const item of sale.items) {
      const key = `${item.productId}::${item.variantId ?? "product"}`;
      const current = groups.get(key) ?? {
        key,
        productId: item.productId,
        variantId: item.variantId,
        variantCode: item.variantCode,
        variantLabel: item.variantLabel,
        name: item.productName,
        quantity: 0,
        lineTotal: 0,
      };
      current.quantity += item.quantity;
      current.lineTotal += item.lineTotal;
      groups.set(key, current);
    }
    return Array.from(groups.values()).map((item) => {
      const already = returns
        .filter((record) => record.saleId === sale.id)
        .flatMap((record) => record.items)
        .filter(
          (returned) =>
            returned.productId === item.productId &&
            returned.variantId === item.variantId,
        )
        .reduce((sum, returned) => sum + returned.quantity, 0);
      return {
        ...item,
        available: Math.max(0, item.quantity - already),
        unitNetPrice: item.quantity ? item.lineTotal / item.quantity : 0,
      };
    });
  }, [returns, sale]);
  const selectedReturnAmount = soldByVariant.reduce(
    (sum, item) =>
      sum + Math.round(item.unitNetPrice * (quantities[item.key] ?? 0)),
    0,
  );
  useEffect(() => {
    if (!open) return;
    reset({
      saleId: defaultSaleId,
      date: getTodayDateKey(),
      reason: "",
      refundMethod: "cash",
      quantities: {},
      restock: {},
    });
    setQuery("");
  }, [defaultSaleId, open, reset]);
  const submit = handleSubmit((values) => {
    clearErrors("root");
    const input: ReturnInput = {
      date: values.date,
      saleId: values.saleId,
      reason: values.reason,
      refundMethod: values.refundMethod,
      items: soldByVariant
        .filter((item) => (values.quantities[item.key] ?? 0) > 0)
        .map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: values.quantities[item.key] ?? 0,
          restocked: values.restock[item.key] ?? false,
        })),
    };
    const result = createReturn(input);
    if (!result.ok) {
      setError("root", { type: "business", message: result.error });
      return;
    }
    notifyPersistedMutation(
      `مرجوعی ثبت شد؛ ارزش ${formatCurrency(result.value.amount)}، بازپرداخت ${formatCurrency(result.value.refundAmount)}.`,
    );
    reset({
      saleId: "",
      date: getTodayDateKey(),
      reason: "",
      refundMethod: "cash",
      quantities: {},
      restock: {},
    });
    onOpenChange(false);
  });
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="return-dialog max-w-[620px]">
        <div className="dialog-heading mb-4 space-y-1 pe-7 text-right">
          <DialogTitle>ثبت مرجوعی فروش</DialogTitle>
          <DialogDescription>
            فاکتور اصلی را انتخاب کنید؛ امکان ثبت تعداد بیش از خرید باقی‌مانده
            وجود ندارد.
          </DialogDescription>
        </div>
        <form
          className="dialog-form grid min-w-0 gap-4"
          noValidate
          onSubmit={submit}
        >
          <input
            {...register("saleId", { required: "فاکتور فروش پیدا نشد." })}
            type="hidden"
          />
          {!sale ? (
            <>
              <FilterInput
                id="return-sale-search"
                label="جست‌وجوی فاکتور اصلی"
                onChange={setQuery}
                placeholder="شماره فاکتور یا نام مشتری"
                value={query}
              />
              <div className="return-sale-picker grid max-h-48 gap-2 overflow-y-auto rounded-xl border border-border p-2">
                {matchingSales.map((item) => (
                  <button
                    className="return-sale-option flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-start text-xs transition-colors hover:bg-muted aria-[pressed=true]:bg-primary/10 aria-[pressed=true]:text-foreground"
                    key={item.id}
                    onClick={() =>
                      setValue("saleId", item.id, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    type="button"
                  >
                    <span>
                      <strong>{item.reference}</strong>
                      <small>
                        {item.customerName} ·{" "}
                        {getDateLabel(item.date, calendarMode, true)}
                      </small>
                    </span>
                    <strong>{formatCurrency(item.amount)}</strong>
                  </button>
                ))}
                {matchingSales.length === 0 && (
                  <p className="notification-empty rounded-xl border border-dashed border-border px-4 py-5 text-center text-xs leading-6 text-muted-foreground">
                    فاکتوری پیدا نشد.
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="selected-sale-chip inline-flex w-fit items-center gap-2 rounded-full border border-border bg-primary/10 px-3 py-1 text-xs font-medium text-foreground">
                <span>
                  <strong>{sale.reference}</strong>
                  <small>
                    {sale.customerName} ·{" "}
                    {getDateLabel(sale.date, calendarMode, true)}
                  </small>
                </span>
                <Button
                  onClick={() => setValue("saleId", "", { shouldDirty: true })}
                  size="sm"
                  variant="ghost"
                >
                  تغییر فاکتور
                </Button>
              </div>
              <div className="return-items-list grid gap-2">
                {soldByVariant.map((item) => {
                  const fieldKey = item.key.replace(/[^a-zA-Z0-9_-]/g, "-");
                  return (
                    <div
                      className="return-item-row grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-card-raised/40 p-3"
                      key={item.key}
                    >
                      <div>
                        <strong>{item.name}</strong>
                        {item.variantLabel && (
                          <small>
                            {item.variantLabel} · {item.variantCode}
                          </small>
                        )}
                        <small>
                          فروخته‌شده {formatNumber(item.quantity)} · قابل مرجوعی{" "}
                          {formatNumber(item.available)}
                        </small>
                      </div>
                      <Field
                        error={errors.quantities?.[item.key]?.message}
                        label="تعداد مرجوعی"
                        htmlFor={`return-quantity-${fieldKey}`}
                      >
                        <Input
                          {...register(`quantities.${item.key}` as const, {
                            setValueAs: (value: string) =>
                              value === "" ? 0 : Number(value),
                            min: {
                              value: 0,
                              message: "تعداد مرجوعی باید نامنفی باشد.",
                            },
                            max: {
                              value: item.available,
                              message:
                                "تعداد مرجوعی نمی‌تواند از تعداد فروخته‌شدهٔ باقی‌مانده بیشتر باشد.",
                            },
                            validate: (value) => {
                              if (!Number.isInteger(value))
                                return "تعداد مرجوعی باید عدد صحیح باشد.";
                              if (value < 0)
                                return "تعداد مرجوعی باید نامنفی باشد.";
                              return (
                                value <= item.available ||
                                "تعداد مرجوعی نمی‌تواند از تعداد فروخته‌شدهٔ باقی‌مانده بیشتر باشد."
                              );
                            },
                          })}
                          defaultValue={0}
                          disabled={item.available === 0}
                          id={`return-quantity-${fieldKey}`}
                          max={item.available}
                          min="0"
                          step="1"
                          type="number"
                        />
                      </Field>
                      <label className="toggle-row flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border bg-card-raised/60 p-3 text-sm return-restock sm:col-span-2">
                        <span>
                          <strong>قابل فروش و بازگشت به موجودی این گونه</strong>
                          <small>
                            {" "}
                            بدون انتخاب، موجودی همان گونه افزایش نمی‌یابد.
                          </small>
                        </span>
                        <input
                          {...register(`restock.${item.key}` as const)}
                          defaultChecked={restock[item.key] ?? false}
                          type="checkbox"
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
              <div className="form-grid grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                <Controller
                  control={control}
                  name="date"
                  rules={{ required: "تاریخ مرجوعی معتبر نیست." }}
                  render={({ field, fieldState }) => (
                    <DateField
                      error={fieldState.error?.message}
                      id="return-date"
                      label="تاریخ مرجوعی"
                      mode={calendarMode}
                      onChange={field.onChange}
                      required
                      value={field.value}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="refundMethod"
                  render={({ field, fieldState }) => (
                    <PaymentMethodSelect
                      error={fieldState.error?.message}
                      id="return-method"
                      label="روش بازپرداخت"
                      onChange={field.onChange}
                      value={field.value}
                    />
                  )}
                />
                <Field
                  className="form-field-wide sm:col-span-2"
                  error={errors.reason?.message}
                  label="دلیل مرجوعی"
                  htmlFor="return-reason"
                  required
                >
                  <Input
                    {...register("reason", {
                      required: "علت مرجوعی را وارد کنید.",
                    })}
                    id="return-reason"
                    required
                  />
                </Field>
              </div>
              <div className="return-total flex items-center justify-between gap-3 rounded-xl border border-border bg-card-raised/60 p-3 font-semibold tabular-nums">
                <span>ارزش محاسبه‌شدهٔ اقلام</span>
                <strong>{formatCurrency(selectedReturnAmount)}</strong>
              </div>
              <p className="form-field-hint text-[11px] leading-5 text-muted-foreground">
                بازپرداخت واقعی حداکثر به مبلغ پرداخت‌شدهٔ فاکتور محدود می‌شود؛
                باقی‌مانده از طلب مشتری کسر می‌شود.
              </p>
            </>
          )}
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
              disabled={isSubmitting || !sale || selectedReturnAmount <= 0}
              type="submit"
              variant="primary"
            >
              {isSubmitting ? "در حال ثبت…" : "ثبت مرجوعی"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
