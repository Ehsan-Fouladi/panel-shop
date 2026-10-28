import { type KeyboardEvent, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterInput } from "@/components/records/FilterInput";
import { Pagination } from "@/components/records/Pagination";
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
import {
  getPurchaseOutstanding,
  getPurchaseStatus,
  getSaleNetPaidAmount,
  getSaleOutstanding,
  getSaleStatus,
  isDueDateOverdue,
  paymentKindLabel,
  paymentMethodLabel,
} from "@/lib/retail-data";
import { useAppStore } from "@/store/app-store";
import { useRetailStore } from "@/store/retail-store";
import type { PaymentMethod } from "@/types/retail";

type CreditTab = "all" | "receivables" | "payables";

const PAGE_SIZE = 10;

const creditTabs: Array<{ id: CreditTab; label: string }> = [
  { id: "all", label: "همه" },
  { id: "receivables", label: "مطالبات مشتری" },
  { id: "payables", label: "بدهی تأمین‌کننده" },
];

interface CreditEntry {
  id: string;
  kind: "receivable" | "payable";
  person: string;
  reference: string;
  date: string;
  dueDate?: string;
  total: number;
  settled: number;
  outstanding: number;
  status: "completed" | "partial" | "pending";
  path: string;
}

export function CreditBookPage() {
  const sales = useRetailStore((state) => state.sales);
  const returns = useRetailStore((state) => state.returns);
  const purchases = useRetailStore((state) => state.purchases);
  const payments = useRetailStore((state) => state.payments);
  const customers = useRetailStore((state) => state.customers);
  const suppliers = useRetailStore((state) => state.suppliers);
  const [tab, setTab] = useState<CreditTab>("all");
  const [query, setQuery] = useState("");
  const [paymentEntry, setPaymentEntry] = useState<CreditEntry | null>(null);
  const today = getTodayDateKey();
  const entries: CreditEntry[] = useMemo(
    () =>
      [
        ...sales.map((sale) => ({
          id: sale.id,
          kind: "receivable" as const,
          person: sale.customerName,
          reference: sale.reference,
          date: sale.date,
          dueDate: sale.dueDate,
          total: Math.max(0, sale.amount - sale.returnedAmount),
          settled: getSaleNetPaidAmount(sale, returns),
          outstanding: getSaleOutstanding(sale, returns),
          status: getSaleStatus(sale, returns),
          path: `/sales/${sale.id}`,
        })),
        ...purchases.map((purchase) => ({
          id: purchase.id,
          kind: "payable" as const,
          person: purchase.supplierName,
          reference: purchase.reference,
          date: purchase.date,
          dueDate: purchase.dueDate,
          total: purchase.amount,
          settled: purchase.paidAmount,
          outstanding: getPurchaseOutstanding(purchase),
          status: getPurchaseStatus(purchase),
          path: `/purchases/${purchase.id}`,
        })),
      ]
        .filter((entry) => entry.outstanding > 0)
        .sort((left, right) =>
          (left.dueDate ?? left.date).localeCompare(
            right.dueDate ?? right.date,
          ),
        ),
    [purchases, returns, sales],
  );
  const tabEntries = entries.filter(
    (entry) =>
      tab === "all" ||
      (tab === "receivables"
        ? entry.kind === "receivable"
        : entry.kind === "payable"),
  );
  const normalized = query.trim().toLocaleLowerCase();
  const filteredEntries = tabEntries.filter(
    (entry) =>
      !normalized ||
      `${entry.person} ${entry.reference}`
        .toLocaleLowerCase()
        .includes(normalized),
  );
  const {
    page,
    pageCount,
    visible: visibleEntries,
    setPage,
  } = usePagination(filteredEntries, PAGE_SIZE);
  const selectTab = (nextTab: CreditTab) => {
    setTab(nextTab);
    setPage(1);
  };
  const handleTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = creditTabs.findIndex((item) => item.id === tab);
    let nextIndex = currentIndex;
    if (event.key === "ArrowLeft")
      nextIndex = (currentIndex + 1) % creditTabs.length;
    else if (event.key === "ArrowRight")
      nextIndex = (currentIndex - 1 + creditTabs.length) % creditTabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = creditTabs.length - 1;
    else return;
    event.preventDefault();
    const nextTab = creditTabs[nextIndex].id;
    selectTab(nextTab);
    window.requestAnimationFrame(() =>
      document.getElementById(`credit-tab-${nextTab}`)?.focus(),
    );
  };
  const receivables = entries
    .filter((entry) => entry.kind === "receivable")
    .reduce((sum, entry) => sum + entry.outstanding, 0);
  const payables = entries
    .filter((entry) => entry.kind === "payable")
    .reduce((sum, entry) => sum + entry.outstanding, 0);
  const calendarMode = useAppStore((state) => state.calendarMode);
  const paymentHistory = payments
    .filter(
      (payment) =>
        payment.kind === "sale-settlement" ||
        payment.kind === "supplier-settlement",
    )
    .sort(
      (a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time),
    )
    .slice(0, 15);

  return (
    <div className="workspace-page mx-auto grid w-full max-w-[1560px] min-w-0 content-start gap-4 p-4 sm:gap-5 sm:p-5 xl:p-6">
      <PageHeader
        title="دفتر حساب‌های نسیه"
        description="مطالبات مشتریان و بدهی تأمین‌کنندگان را با پرداخت‌های مستقل از فروش و خرید پیگیری کنید."
      />
      <div className="metric-grid grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
        <MetricCard
          label="مطالبات مشتریان"
          value={formatCurrency(receivables)}
          tone={receivables ? "warning" : "positive"}
        />
        <MetricCard
          label="بدهی تأمین‌کنندگان"
          value={formatCurrency(payables)}
          tone={payables ? "warning" : "positive"}
        />
        <MetricCard
          label="مانده‌های باز"
          value={filteredEntries.length}
          hint="رکوردهای دارای مانده"
        />
        <MetricCard
          label="تاریخچهٔ پرداخت"
          value={paymentHistory.length}
          hint="۱۵ پرداخت اخیر در دفتر"
        />
      </div>
      <SectionCard
        title="تراکنش‌های اعتباری"
        description={`${formatNumber(filteredEntries.length)} ماندهٔ باز`}
      >
        <div
          aria-label="نوع حساب"
          aria-orientation="horizontal"
          className="credit-tabs flex w-fit max-w-full min-w-0 flex-wrap items-center gap-1 rounded-full border border-border bg-muted/40 p-1"
          onKeyDown={handleTabKeyDown}
          role="tablist"
        >
          {creditTabs.map((item) => (
            <Button
              aria-controls="credit-entries-panel"
              aria-selected={tab === item.id}
              className={`credit-tab ${tab === item.id ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover hover:text-primary-foreground" : "text-muted-foreground hover:bg-card/70 hover:text-foreground"}`}
              id={`credit-tab-${item.id}`}
              key={item.id}
              onClick={() => selectTab(item.id)}
              role="tab"
              size="sm"
              tabIndex={tab === item.id ? 0 : -1}
              variant="ghost"
            >
              {item.label}
            </Button>
          ))}
        </div>
        <div className="list-toolbar flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card-raised/50 p-3">
          <FilterInput
            id="credit-book-search"
            label="جست‌وجوی بدهکار یا تراکنش"
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            placeholder="نام یا شمارهٔ تراکنش"
            value={query}
          />
        </div>
        <div
          aria-labelledby={`credit-tab-${tab}`}
          className="credit-entries-panel grid min-w-0 gap-4"
          id="credit-entries-panel"
          role="tabpanel"
        >
          {visibleEntries.length ? (
            <div className="data-table-scroll min-w-0 overflow-x-auto rounded-2xl border border-border">
              <table className="data-table w-full min-w-[680px] border-collapse text-right text-sm [&_thead]:bg-muted/60 [&_th]:whitespace-nowrap [&_th]:px-3 [&_th]:py-3 [&_th]:text-right [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground [&_tbody_tr]:border-t [&_tbody_tr]:border-border/70 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-muted/30 [&_td]:px-3 [&_td]:py-3 [&_td]:align-middle">
                <thead>
                  <tr>
                    <th>نوع</th>
                    <th>مشتری/تأمین‌کننده</th>
                    <th>تراکنش اصلی</th>
                    <th>مبلغ اولیه</th>
                    <th>تسویه‌شده</th>
                    <th>مانده</th>
                    <th>سررسید</th>
                    <th>وضعیت</th>
                    <th>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleEntries.map((entry) => {
                    const overdue = isDueDateOverdue(entry.dueDate, today);
                    return (
                      <tr key={`${entry.kind}-${entry.id}`}>
                        <td>
                          {entry.kind === "receivable"
                            ? "طلب مشتری"
                            : "بدهی تأمین‌کننده"}
                        </td>
                        <td>{entry.person}</td>
                        <td>
                          <Link
                            className="table-primary-link font-medium text-primary transition-colors hover:text-primary-hover hover:underline"
                            to={entry.path}
                          >
                            {entry.reference}
                          </Link>
                        </td>
                        <td>{formatCurrency(entry.total)}</td>
                        <td>{formatCurrency(entry.settled)}</td>
                        <td className="numeric-cell whitespace-nowrap text-start tabular-nums">
                          {formatCurrency(entry.outstanding)}
                        </td>
                        <td>
                          {entry.dueDate
                            ? getDateLabel(entry.dueDate, calendarMode, true)
                            : "تعیین نشده"}
                          {overdue && (
                            <span className="table-subline mt-1 block text-[11px] leading-4 text-muted-foreground negative-text font-medium text-destructive">
                              سررسید گذشته
                            </span>
                          )}
                        </td>
                        <td>
                          <StatusBadge status={entry.status} />
                        </td>
                        <td>
                          <Button
                            onClick={() => setPaymentEntry(entry)}
                            size="sm"
                            variant="outline"
                          >
                            {entry.kind === "receivable"
                              ? "ثبت دریافت"
                              : "ثبت پرداخت"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title={
                tabEntries.length
                  ? "نتیجه‌ای پیدا نشد"
                  : "ماندهٔ بازی در این نما نیست"
              }
              description={
                tabEntries.length
                  ? "عبارت جست‌وجو را تغییر دهید یا پاک کنید."
                  : "همهٔ تراکنش‌های این نما تسویه شده‌اند؛ سابقهٔ پرداخت‌ها در بخش بعدی باقی است."
              }
            />
          )}
          <Pagination
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
          />
        </div>
      </SectionCard>
      <SectionCard
        title="تاریخچهٔ تسویه‌ها"
        description="وصول طلب فروش جدید ایجاد نمی‌کند و پرداخت بدهی خرید را تکرار نمی‌کند."
      >
        {paymentHistory.length ? (
          <div className="data-table-scroll min-w-0 overflow-x-auto rounded-2xl border border-border">
            <table className="data-table w-full min-w-[680px] border-collapse text-right text-sm [&_thead]:bg-muted/60 [&_th]:whitespace-nowrap [&_th]:px-3 [&_th]:py-3 [&_th]:text-right [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground [&_tbody_tr]:border-t [&_tbody_tr]:border-border/70 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-muted/30 [&_td]:px-3 [&_td]:py-3 [&_td]:align-middle">
              <thead>
                <tr>
                  <th>تاریخ</th>
                  <th>نوع</th>
                  <th>مخاطب</th>
                  <th>مرجع</th>
                  <th>روش</th>
                  <th>مبلغ</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((payment) => {
                  const person = payment.customerId
                    ? customers.find(
                        (customer) => customer.id === payment.customerId,
                      )?.name
                    : payment.supplierId
                      ? suppliers.find(
                          (supplier) => supplier.id === payment.supplierId,
                        )?.name
                      : "—";
                  const to = payment.relatedSaleId
                    ? `/sales/${payment.relatedSaleId}`
                    : payment.relatedPurchaseId
                      ? `/purchases/${payment.relatedPurchaseId}`
                      : "/credit-book";
                  return (
                    <tr key={payment.id}>
                      <td>{getDateLabel(payment.date, calendarMode, true)}</td>
                      <td>{paymentKindLabel(payment.kind)}</td>
                      <td>{person}</td>
                      <td>
                        <Link
                          className="text-link font-medium text-primary transition-colors hover:text-primary-hover hover:underline"
                          to={to}
                        >
                          {payment.reference}
                        </Link>
                      </td>
                      <td>{paymentMethodLabel(payment.method)}</td>
                      <td>{formatCurrency(payment.amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="پرداختی ثبت نشده"
            description="وصول‌های بعدی به سابقهٔ همان فاکتور یا خرید افزوده می‌شود."
          />
        )}
      </SectionCard>
      <CreditPaymentDialog
        entry={paymentEntry}
        onOpenChange={(open) => !open && setPaymentEntry(null)}
        calendarMode={calendarMode}
      />
    </div>
  );
}

function CreditPaymentDialog({
  entry,
  onOpenChange,
  calendarMode,
}: {
  entry: CreditEntry | null;
  onOpenChange: (open: boolean) => void;
  calendarMode: "jalali" | "gregorian";
}) {
  const addSalePayment = useRetailStore((state) => state.addSalePayment);
  const addPurchasePayment = useRetailStore(
    (state) => state.addPurchasePayment,
  );
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
      amount: entry?.outstanding ?? 0,
      method: "cash",
      date: getTodayDateKey(),
    },
  });
  useEffect(() => {
    if (entry) {
      reset({
        amount: entry.outstanding,
        method: "cash",
        date: getTodayDateKey(),
      });
    }
  }, [entry, reset]);
  const open = entry !== null;
  const submit = handleSubmit(({ amount, method, date }) => {
    if (!entry) return;
    clearErrors("root");
    const result =
      entry.kind === "receivable"
        ? addSalePayment(entry.id, amount, method, date)
        : addPurchasePayment(entry.id, amount, method, date);
    if (!result.ok) {
      setError("root", { type: "business", message: result.error });
      return;
    }
    notifyPersistedMutation(
      entry.kind === "receivable"
        ? "دریافت طلب ثبت شد؛ فروش جدید ایجاد نشد."
        : "پرداخت بدهی ثبت شد؛ خرید جدید ایجاد نشد.",
    );
    onOpenChange(false);
  });
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <div className="dialog-heading mb-4 space-y-1 pe-7 text-right">
          <DialogTitle>
            {entry?.kind === "receivable"
              ? "ثبت دریافت از مشتری"
              : "ثبت پرداخت به تأمین‌کننده"}
          </DialogTitle>
          <DialogDescription>
            تراکنش {entry?.reference} · ماندهٔ فعلی{" "}
            {formatCurrency(entry?.outstanding ?? 0)}.
          </DialogDescription>
        </div>
        {entry && (
          <form
            className="dialog-form grid min-w-0 gap-4"
            noValidate
            onSubmit={submit}
          >
            <Field
              error={errors.amount?.message}
              label="مبلغ"
              htmlFor="credit-payment-amount"
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
                id="credit-payment-amount"
                required
                type="text"
              />
            </Field>
            <Controller
              control={control}
              name="method"
              render={({ field }) => (
                <PaymentMethodSelect
                  id="credit-payment-method"
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
                  id="credit-payment-date"
                  label="تاریخ"
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
            <div className="dialog-actions flex flex-wrap items-center gap-2 border-t border-border/70 pt-4">
              <Button onClick={() => onOpenChange(false)} variant="outline">
                انصراف
              </Button>
              <Button disabled={isSubmitting} type="submit" variant="primary">
                {isSubmitting ? "در حال ثبت…" : "ثبت تسویه"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
