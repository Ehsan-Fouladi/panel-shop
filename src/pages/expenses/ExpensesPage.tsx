import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterInput } from "@/components/records/FilterInput";
import { FormActions } from "@/components/records/FormActions";
import { Pagination } from "@/components/records/Pagination";
import { SectionCard } from "@/components/records/SectionCard";
import {
  ConfirmAction,
  DateField,
  EmptyState,
  Field,
  MetricCard,
  PaymentMethodSelect,
  PaymentMethodText,
} from "@/components/records/Shared";
import { usePagination } from "@/components/records/usePagination";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addDays,
  type CalendarMode,
  getDateLabel,
  getMonthCursor,
  getMonthStart,
  getTodayDateKey,
  getYearStart,
} from "@/lib/date";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { notifyPersistedMutation } from "@/lib/persistence-feedback";
import { useAppStore } from "@/store/app-store";
import { type ExpenseInput, useRetailStore } from "@/store/retail-store";
import type { RetailExpense } from "@/types/retail";
import { sileo } from "sileo";

const PAGE_SIZE = 10;
type PeriodFilter = "all" | "last30" | "month" | "year";

export function ExpensesPage() {
  const expenses = useRetailStore((state) => state.expenses);
  const categories = useRetailStore(
    (state) => state.settings.expenseCategories,
  );
  const deleteExpense = useRetailStore((state) => state.deleteExpense);
  const calendarMode = useAppStore((state) => state.calendarMode);
  const today = getTodayDateKey();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get("search") ?? "");
  const [period, setPeriod] = useState<PeriodFilter>(() =>
    searchParams.get("search") ? "all" : "last30",
  );
  const [category, setCategory] = useState("all");
  const start =
    period === "all"
      ? "0001-01-01"
      : period === "last30"
        ? addDays(today, -29)
        : period === "month"
          ? getMonthStart(getMonthCursor(today, calendarMode), calendarMode)
          : getYearStart(today, calendarMode);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return expenses
      .filter(
        (expense) =>
          expense.date >= start &&
          expense.date <= today &&
          (category === "all" || expense.categoryId === category) &&
          (!normalized ||
            `${expense.description} ${expense.reference} ${expense.categoryLabel}`
              .toLocaleLowerCase()
              .includes(normalized)),
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [category, expenses, query, start, today]);
  const total = filtered.reduce((sum, expense) => sum + expense.amount, 0);
  const { page, pageCount, visible, setPage } = usePagination(
    filtered,
    PAGE_SIZE,
  );
  useEffect(() => {
    const value = searchParams.get("search") ?? "";
    setQuery(value);
    if (value) setPeriod("all");
    setPage(1);
  }, [searchParams, setPage]);
  const cashPaid = filtered
    .filter((expense) => expense.paymentMethod === "cash")
    .reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="workspace-page mx-auto grid w-full max-w-[1560px] min-w-0 content-start gap-4 p-4 sm:gap-5 sm:p-5 xl:p-6">
      <PageHeader
        title="هزینه‌های جاری"
        description="هزینه‌های عملیاتی را ثبت کنید؛ خرید کالا و موجودی انبار در بخش خریدها نگهداری می‌شود."
        action={
          <Link
            className={buttonVariants({ variant: "primary" })}
            to="/expenses/new"
          >
            <Plus aria-hidden="true" size={16} /> ثبت هزینه
          </Link>
        }
      />
      <div className="metric-grid grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
        <MetricCard
          label="جمع بازه"
          value={formatCurrency(total)}
          hint="فقط هزینه‌های عملیاتی"
        />
        <MetricCard label="تعداد هزینه‌ها" value={filtered.length} />
        <MetricCard
          label="پرداخت نقدی"
          value={formatCurrency(cashPaid)}
          hint="برای تطبیق با صندوق"
          tone="warning"
        />
        <MetricCard label="دسته‌بندی‌ها" value={categories.length} />
      </div>
      <SectionCard
        title="دفتر هزینه‌ها"
        description={`${formatNumber(filtered.length)} مورد · مجموع ${formatCurrency(total)}`}
      >
        <div className="list-toolbar flex flex-col min-w-0 gap-3 rounded-2xl border border-border bg-card-raised/50 p-3">
          <FilterInput
            id="expense-search"
            label="جست‌وجوی هزینه"
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            placeholder="شرح، شماره یا دسته‌بندی"
            value={query}
          />
          <div className="flex max-md:flex-col gap-3">
            <Select
              onValueChange={(value) => {
                setPeriod(value as PeriodFilter);
                setPage(1);
              }}
              value={period}
            >
              <SelectTrigger aria-label="دورهٔ هزینه">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last30">۳۰ روز اخیر</SelectItem>
                <SelectItem value="month">ماه جاری</SelectItem>
                <SelectItem value="year">سال جاری</SelectItem>
                <SelectItem value="all">تمام سوابق</SelectItem>
              </SelectContent>
            </Select>
            <Select
              onValueChange={(value) => {
                setCategory(value);
                setPage(1);
              }}
              value={category}
            >
              <SelectTrigger aria-label="دسته‌بندی هزینه">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همهٔ دسته‌ها</SelectItem>
                {categories.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {visible.length ? (
          <div className="data-table-scroll min-w-0 overflow-x-auto rounded-2xl border border-border">
            <table className="data-table w-full min-w-[680px] border-collapse text-right text-sm [&_thead]:bg-muted/60 [&_th]:whitespace-nowrap [&_th]:px-3 [&_th]:py-3 [&_th]:text-right [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground [&_tbody_tr]:border-t [&_tbody_tr]:border-border/70 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-muted/30 [&_td]:px-3 [&_td]:py-3 [&_td]:align-middle">
              <thead>
                <tr>
                  <th>تاریخ</th>
                  <th>شماره</th>
                  <th>شرح</th>
                  <th>دسته‌بندی</th>
                  <th>روش پرداخت</th>
                  <th>مبلغ</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((expense) => (
                  <ExpenseRow
                    calendarMode={calendarMode}
                    expense={expense}
                    key={expense.id}
                    onDelete={() => {
                      const result = deleteExpense(expense.id);
                      if (!result.ok)
                        sileo.error({ title: result.error, duration: 3000 });
                      else
                        notifyPersistedMutation(
                          "هزینه حذف و اثر نقدی آن با ثبت برگشت اصلاح شد.",
                        );
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="هزینه‌ای در این بازه نیست"
            description={
              expenses.length
                ? "فیلترها را تغییر دهید یا هزینهٔ جدید ثبت کنید."
                : "هزینه‌های جاری از موجودی کالا و خریدها جدا نگهداری می‌شوند."
            }
            action={
              !expenses.length ? (
                <Link
                  className={buttonVariants({ variant: "primary", size: "sm" })}
                  to="/expenses/new"
                >
                  ثبت هزینه
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

function ExpenseRow({
  calendarMode,
  expense,
  onDelete,
}: {
  calendarMode: CalendarMode;
  expense: RetailExpense;
  onDelete: () => void;
}) {
  return (
    <tr>
      <td>{getDateLabel(expense.date, calendarMode, true)}</td>
      <td>{expense.reference}</td>
      <td>
        <strong>{expense.description}</strong>
        {expense.notes && (
          <span className="table-subline mt-1 block text-[11px] leading-4 text-muted-foreground">
            {expense.notes}
          </span>
        )}
      </td>
      <td>{expense.categoryLabel}</td>
      <td>
        <PaymentMethodText method={expense.paymentMethod} />
      </td>
      <td className="numeric-cell whitespace-nowrap text-start tabular-nums">
        {formatCurrency(expense.amount)}
      </td>
      <td>
        <ConfirmAction
          title="حذف هزینه؟"
          description={`هزینهٔ «${expense.description} از گزارش هزینه‌ها حذف می‌شود. برای حفظ دفتر نقدی، برگشت اصلاحی ثبت خواهد شد.`}
          confirmLabel="حذف هزینه"
          triggerLabel="حذف"
          onConfirm={onDelete}
          triggerClassName="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          variant="outline"
        />
      </td>
    </tr>
  );
}

export function NewExpensePage() {
  const navigate = useNavigate();
  const categories = useRetailStore(
    (state) => state.settings.expenseCategories,
  );
  const createExpense = useRetailStore((state) => state.createExpense);
  const calendarMode = useAppStore((state) => state.calendarMode);
  const {
    control,
    register,
    handleSubmit,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseInput>({
    defaultValues: {
      date: getTodayDateKey(),
      categoryId: categories[0]?.id ?? "rent",
      categoryLabel: categories[0]?.label ?? "سایر",
      description: "",
      amount: 0,
      paymentMethod: "cash",
      notes: "",
    },
  });
  const categoryId = useWatch({ control, name: "categoryId" });
  const selectedCategory = categories.find((item) => item.id === categoryId);
  const submit = handleSubmit((values) => {
    clearErrors("root");
    const result = createExpense({
      ...values,
      categoryLabel: selectedCategory?.label ?? "سایر",
    });
    if (!result.ok) {
      setError("root", { type: "business", message: result.error });
      return;
    }
    notifyPersistedMutation("هزینه ثبت شد و گزارش مالی به‌روزرسانی شد.");
    navigate("/expenses");
  });
  return (
    <div className="workspace-page mx-auto grid w-full max-w-[1560px] min-w-0 content-start gap-4 p-4 sm:gap-5 sm:p-5 xl:p-6">
      <PageHeader
        title="ثبت هزینهٔ جاری"
        description="هزینهٔ عملیاتی جدید را ثبت کنید. خرید موجودی کالا در بخش خرید ثبت می‌شود."
        breadcrumbs={[
          { label: "هزینه‌ها", to: "/expenses" },
          { label: "هزینهٔ جدید" },
        ]}
      />
      <form
        className="workspace-form grid min-w-0 gap-4"
        noValidate
        onSubmit={submit}
      >
        <SectionCard title="جزئیات هزینه">
          <div className="form-grid grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <Controller
              control={control}
              name="date"
              rules={{ required: "تاریخ هزینه معتبر نیست." }}
              render={({ field, fieldState }) => (
                <DateField
                  error={fieldState.error?.message}
                  id="expense-date"
                  label="تاریخ"
                  mode={calendarMode}
                  onChange={field.onChange}
                  required
                  value={field.value}
                />
              )}
            />
            <Controller
              control={control}
              name="categoryId"
              rules={{ required: "دسته‌بندی هزینه پیدا نشد." }}
              render={({ field, fieldState }) => (
                <Field
                  error={fieldState.error?.message}
                  label="دسته‌بندی"
                  htmlFor="expense-category"
                  required
                >
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger
                      aria-describedby={
                        fieldState.error ? "expense-category-error" : undefined
                      }
                      aria-invalid={Boolean(fieldState.error)}
                      id="expense-category"
                    >
                      <SelectValue placeholder="انتخاب دسته" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
            <Field
              error={errors.description?.message}
              label="شرح هزینه"
              htmlFor="expense-description"
              required
            >
              <Input
                {...register("description", {
                  required: "شرح هزینه الزامی است.",
                })}
                id="expense-description"
                required
              />
            </Field>
            <Field
              error={errors.amount?.message}
              label="مبلغ (تومان)"
              htmlFor="expense-amount"
              required
            >
              <Input
                {...register("amount", {
                  valueAsNumber: true,
                  required: "مبلغ هزینه باید بیشتر از صفر باشد.",
                  min: {
                    value: 1,
                    message: "مبلغ هزینه باید بیشتر از صفر باشد.",
                  },
                  validate: (value) =>
                    (Number.isFinite(value) && value > 0) ||
                    "مبلغ هزینه باید بیشتر از صفر باشد.",
                })}
                id="expense-amount"
                min="1"
                required
                type="number"
              />
            </Field>
            <Controller
              control={control}
              name="paymentMethod"
              render={({ field }) => (
                <PaymentMethodSelect
                  id="expense-method"
                  onChange={field.onChange}
                  value={field.value}
                />
              )}
            />
            <Field
              className="form-field-wide sm:col-span-2"
              label="یادداشت اختیاری"
              htmlFor="expense-notes"
            >
              <textarea
                {...register("notes")}
                className="workspace-textarea min-h-24 w-full resize-y rounded-xl border border-input bg-control px-3 py-2 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
                id="expense-notes"
                rows={3}
              />
            </Field>
          </div>
          <div className="data-note rounded-xl border border-info/20 bg-info/5 px-3 py-2 text-xs leading-6 text-muted-foreground">
            <span>تأثیر مالی</span>
            <p>
              هزینه در سود و زیان ثبت می‌شود. اگر روش پرداخت نقدی باشد، یک خروج
              نقدی نیز به صندوق اضافه خواهد شد.
            </p>
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
            cancelTo="/expenses"
            saveLabel="ثبت هزینه"
            submitting={isSubmitting}
          />
        </SectionCard>
      </form>
    </div>
  );
}
