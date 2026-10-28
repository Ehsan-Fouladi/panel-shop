import { Download, Sheet } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterInput } from "@/components/records/FilterInput";
import { Pagination } from "@/components/records/Pagination";
import { SectionCard } from "@/components/records/SectionCard";
import { DateField, EmptyState, MetricCard } from "@/components/records/Shared";
import { usePagination } from "@/components/records/usePagination";
import { Button } from "@/components/ui/button";
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
  getTodayDateKey,
} from "@/lib/date";
import { formatNumber } from "@/lib/formatters";
import {
  buildReport,
  type ReportId,
  type ReportRow,
  serializeCsv,
} from "@/lib/retail-reports";
import { useAppStore } from "@/store/app-store";
import { useRetailStore } from "@/store/retail-store";
import { sileo } from "sileo";

const PAGE_SIZE = 15;

function reportRowKey(row: Record<string, string | number>): string {
  return Object.keys(row)
    .sort()
    .map((key) => `${key}:${String(row[key])}`)
    .join("|");
}

/** Two report rows can legitimately have identical visible values; add an occurrence suffix so keys stay unique. */
function addRowKeys(rows: ReportRow[]): string[] {
  const occurrences = new Map<string, number>();
  return rows.map((row) => {
    const base = reportRowKey(row);
    const seen = occurrences.get(base) ?? 0;
    occurrences.set(base, seen + 1);
    return `${base}#${seen}`;
  });
}

function displayReportValue(
  key: string,
  value: string | number | undefined,
  mode: CalendarMode,
): string {
  const rawValue = String(value ?? "—");
  if (
    (key === "date" || key === "due" || key === "saleDate") &&
    /^\d{4}-\d{2}-\d{2}$/.test(rawValue)
  ) {
    return getDateLabel(rawValue, mode, true);
  }
  return rawValue;
}

const reportOptions: Array<{ id: ReportId; title: string }> = [
  { id: "sales", title: "فروش" },
  { id: "product-performance", title: "عملکرد کالا" },
  { id: "inventory", title: "موجودی کالا" },
  { id: "stock-movements", title: "گردش موجودی" },
  { id: "purchases", title: "خریدها" },
  { id: "supplier-balances", title: "ماندهٔ تأمین‌کنندگان" },
  { id: "expenses", title: "هزینه‌های جاری" },
  { id: "profit-loss", title: "سود و زیان" },
  { id: "receivables", title: "مطالبات مشتریان" },
  { id: "customer-activity", title: "فعالیت مشتریان" },
  { id: "returns", title: "مرجوعی‌ها" },
  { id: "cash-movements", title: "گردش نقدی" },
];

export function ReportsPage() {
  const products = useRetailStore((state) => state.products);
  const sales = useRetailStore((state) => state.sales);
  const purchases = useRetailStore((state) => state.purchases);
  const customers = useRetailStore((state) => state.customers);
  const suppliers = useRetailStore((state) => state.suppliers);
  const expenses = useRetailStore((state) => state.expenses);
  const payments = useRetailStore((state) => state.payments);
  const stockMovements = useRetailStore((state) => state.stockMovements);
  const cashMovements = useRetailStore((state) => state.cashMovements);
  const returns = useRetailStore((state) => state.returns);
  const cashSessions = useRetailStore((state) => state.cashSessions);
  const campaigns = useRetailStore((state) => state.campaigns);
  const purchaseReturns = useRetailStore((state) => state.purchaseReturns);
  const settings = useRetailStore((state) => state.settings);
  const data = useMemo(
    () => ({
      products,
      sales,
      purchases,
      customers,
      suppliers,
      expenses,
      payments,
      stockMovements,
      cashMovements,
      returns,
      cashSessions,
      campaigns,
      purchaseReturns,
      settings,
    }),
    [
      campaigns,
      cashMovements,
      cashSessions,
      customers,
      expenses,
      payments,
      products,
      purchaseReturns,
      purchases,
      returns,
      sales,
      settings,
      stockMovements,
      suppliers,
    ],
  );
  const calendarMode = useAppStore((state) => state.calendarMode);
  const [reportId, setReportId] = useState<ReportId>("sales");
  const [start, setStart] = useState(() => addDays(getTodayDateKey(), -29));
  const [end, setEnd] = useState(() => getTodayDateKey());
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("");
  const [sortDescending, setSortDescending] = useState(false);
  const selectedReport =
    reportOptions.find((item) => item.id === reportId) ?? reportOptions[0];
  const report = useMemo(
    () => buildReport(data, reportId, start, end),
    [data, end, reportId, start],
  );
  const displaySummary = report.summary.replace(
    `بازهٔ ${start} تا ${end}`,
    `بازهٔ ${getDateLabel(start, calendarMode, true)} تا ${getDateLabel(end, calendarMode, true)}`,
  );
  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    const filtered = report.rows.filter(
      (row) =>
        !normalized ||
        Object.entries(row).some(([key, value]) => {
          const rawValue = String(value).toLocaleLowerCase();
          const displayValue = displayReportValue(
            key,
            value,
            calendarMode,
          ).toLocaleLowerCase();
          return (
            rawValue.includes(normalized) || displayValue.includes(normalized)
          );
        }),
    );
    if (!sortKey) return filtered;
    return [...filtered].sort(
      (left, right) =>
        String(left[sortKey] ?? "").localeCompare(
          String(right[sortKey] ?? ""),
          "fa",
          {
            numeric: true,
          },
        ) * (sortDescending ? -1 : 1),
    );
  }, [calendarMode, query, report.rows, sortDescending, sortKey]);
  const rowKeys = useMemo(() => {
    const keys = new Map<ReportRow, string>();
    const generated = addRowKeys(report.rows);
    for (const [index, row] of report.rows.entries())
      keys.set(row, generated[index]);
    return keys;
  }, [report]);
  const {
    page,
    pageCount,
    visible: visibleRows,
    setPage,
  } = usePagination(filteredRows, PAGE_SIZE);
  const exportCsv = () => {
    const csv = serializeCsv(
      { ...report, rows: filteredRows },
      selectedReport.title,
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `report-${reportId}-${start}-to-${end}.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    sileo.success({
      title: `فایل CSV واقعی با ${formatNumber(filteredRows.length)} ردیف ساخته شد.`,
      duration: 3000,
    });
  };
  const changeReport = (value: string) => {
    setReportId(value as ReportId);
    setPage(1);
    setQuery("");
    setSortKey("");
  };

  return (
    <div className="workspace-page mx-auto grid w-full max-w-[1560px] min-w-0 content-start gap-4 p-4 sm:gap-5 sm:p-5 xl:p-6">
      <PageHeader
        title="گزارش‌ها"
        description="گزارش‌های عملیاتی از همان رکوردهای فروش، کالا، مالی، مشتری و صندوق ساخته می‌شوند."
        action={
          <Button
            disabled={!filteredRows.length}
            onClick={exportCsv}
            variant="primary"
          >
            <Download aria-hidden="true" size={15} /> دریافت CSV
          </Button>
        }
      />
      <SectionCard
        title="تنظیم گزارش"
        description="مبنای تاریخ با نوع گزارش فرق می‌کند؛ تعریف دقیق بازه و نحوهٔ برخورد با مرجوعی در توضیح نتایج نمایش داده می‌شود."
      >
        <div className="report-filter-grid grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <FieldlessSelect
            id="report-type"
            label="نوع گزارش"
            onChange={changeReport}
            options={reportOptions.map((item) => ({
              value: item.id,
              label: item.title,
            }))}
            value={reportId}
          />
          <DateField
            id="report-start"
            label="از تاریخ"
            mode={calendarMode}
            onChange={(value) => {
              setStart(value);
              setPage(1);
            }}
            required
            value={start}
          />
          <DateField
            id="report-end"
            label="تا تاریخ"
            mode={calendarMode}
            onChange={(value) => {
              setEnd(value);
              setPage(1);
            }}
            required
            value={end}
          />
          <div className="flex min-w-0 w-full items-center">
            <FilterInput
              id="report-search"
              label="فیلتر سطرهای گزارش"
              onChange={(value) => {
                setQuery(value);
                setPage(1);
              }}
              placeholder="فیلتر در نتایج"
              value={query}
            />
          </div>
        </div>
        {start > end && (
          <p
            className="form-field-error text-xs leading-5 text-destructive"
            role="alert"
          >
            تاریخ شروع نمی‌تواند پس از تاریخ پایان باشد.
          </p>
        )}
        <div className="report-summary-row flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card-raised/50 p-3">
          <span>{selectedReport.title}</span>
          <strong>{displaySummary}</strong>
          <Button
            disabled={!filteredRows.length || start > end}
            onClick={exportCsv}
            size="sm"
            variant="outline"
          >
            <Sheet aria-hidden="true" size={14} /> خروجی CSV
          </Button>
        </div>
      </SectionCard>
      <div className="metric-grid grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3 compact-metric-grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
        <MetricCard label="تعداد رکوردها" value={filteredRows.length} />
        <MetricCard label="ستون‌های گزارش" value={report.columns.length} />
        <MetricCard
          label="بازهٔ انتخابی"
          value={`${getDateLabel(start, calendarMode, true)} تا ${getDateLabel(end, calendarMode, true)}`}
        />
        <MetricCard
          label="نوع فایل خروجی"
          value="CSV UTF-8"
          hint="در Excel قابل بازکردن است؛ فایل XLSX تولید نمی‌شود."
        />
      </div>
      <SectionCard
        title={`نتایج · ${selectedReport.title}`}
        description={`${report.definition} مرتب‌سازی با عنوان ستون و جست‌وجو/صفحه‌بندی فقط روی نمایش اثر دارد.`}
      >
        {visibleRows.length && start <= end ? (
          <div className="data-table-scroll min-w-0 overflow-x-auto rounded-2xl border border-border">
            <table className="data-table w-full min-w-[680px] border-collapse text-right text-sm [&_thead]:bg-muted/60 [&_th]:whitespace-nowrap [&_th]:px-3 [&_th]:py-3 [&_th]:text-right [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground [&_tbody_tr]:border-t [&_tbody_tr]:border-border/70 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-muted/30 [&_td]:px-3 [&_td]:py-3 [&_td]:align-middle">
              <thead>
                <tr>
                  {report.columns.map((column) => (
                    <th key={column.key}>
                      <button
                        className="table-sort-button inline-flex items-center gap-1.5 whitespace-nowrap font-medium text-muted-foreground transition-colors hover:text-foreground"
                        onClick={() => {
                          if (sortKey === column.key)
                            setSortDescending((current) => !current);
                          else {
                            setSortKey(column.key);
                            setSortDescending(false);
                          }
                        }}
                        type="button"
                      >
                        {column.label}
                        {sortKey === column.key
                          ? sortDescending
                            ? " ↓"
                            : " ↑"
                          : ""}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr
                    key={`${reportId}-${rowKeys.get(row) ?? reportRowKey(row)}`}
                  >
                    {report.columns.map((column) => (
                      <td key={column.key}>
                        {displayReportValue(
                          column.key,
                          row[column.key],
                          calendarMode,
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={
              start > end ? "بازهٔ زمانی نامعتبر است" : "ردیفی برای نمایش نیست"
            }
            description={
              start > end
                ? "تاریخ شروع را پیش از تاریخ پایان قرار دهید."
                : filteredRows.length === 0 && report.rows.length
                  ? "فیلتر جست‌وجو را پاک کنید."
                  : "برای این گزارش و بازه داده‌ای ثبت نشده است."
            }
          />
        )}
        <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
      </SectionCard>
      <div className="data-note rounded-xl border border-info/20 bg-info/5 px-3 py-2 text-xs leading-6 text-muted-foreground">
        <span>خروجی واقعی</span>
        <p>
          دکمهٔ CSV یک فایل UTF-8 با BOM برای بازشدن مناسب متن فارسی تولید
          می‌کند. XLSX در این نسخه تولید نمی‌شود و فایل یا گزارش سروری نیز وجود
          ندارد.
        </p>
      </div>
    </div>
  );
}

function FieldlessSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="form-field flex min-w-0 flex-col gap-1.5">
      <label
        className="form-field-label text-xs font-medium text-muted-foreground"
        htmlFor={id}
      >
        {label}
      </label>
      <Select onValueChange={onChange} value={value}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
