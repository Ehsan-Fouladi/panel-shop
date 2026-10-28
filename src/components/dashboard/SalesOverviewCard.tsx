import { type DoranDate, faIR } from "@doranjs/core";
import { DoranRangeDatePicker } from "@doranjs/react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import type { SaleRecord } from "@/data/dashboard-data";
import {
  type DateRange,
  getSalesChartData,
  getSelectedChartIndex,
  type SalesChartDatum,
  type SalesPeriod,
  type SalesSummary,
} from "@/lib/dashboard-metrics";
import { type CalendarMode, type DateKey, toDoranDate } from "@/lib/date";
import {
  formatCompactAxis,
  formatCompactCurrency,
  formatCurrency,
  formatSignedPercent,
  getCurrencyUnit,
} from "@/lib/formatters";

const periods: Array<{ id: SalesPeriod; label: string }> = [
  { id: "daily", label: "روزانه" },
  { id: "weekly", label: "هفتگی" },
  { id: "monthly", label: "ماهانه" },
  { id: "yearly", label: "سالانه" },
  { id: "custom", label: "بازه" },
];

interface SalesOverviewCardProps {
  selectedDate: DateKey;
  calendarMode: CalendarMode;
  customRange: DateRange;
  period: SalesPeriod;
  summary: SalesSummary;
  sales: SaleRecord[];
  onPeriodChange: (period: SalesPeriod) => void;
  onSelectedDateChange: (date: DateKey) => void;
  onCustomRangeChange: (range: DateRange) => void;
}

type SalesTooltipProps = TooltipContentProps;
type DoranRangeDraft = { start: DoranDate | null; end: DoranDate | null };

function SalesTooltip({ active, payload }: SalesTooltipProps) {
  if (!active || !payload?.[0]?.payload) return null;
  const datum = payload[0].payload as SalesChartDatum;

  return (
    <div className="chart-tooltip min-w-[170px] rounded-xl border border-border bg-popover/95 p-3 text-xs text-popover-foreground shadow-popover backdrop-blur-sm">
      <div className="chart-tooltip-label mb-2 font-semibold text-foreground">
        {datum.label}
      </div>
      <div className="chart-tooltip-row flex items-center justify-between gap-4 py-1 text-muted-foreground">
        <span>فروش این بازه</span>
        <strong>{formatCurrency(datum.amount)}</strong>
      </div>
      <div className="chart-tooltip-row is-muted flex items-center justify-between gap-4 py-1 text-muted-foreground">
        <span>دورهٔ مشابه قبل</span>
        <span>{formatCurrency(datum.previousAmount)}</span>
      </div>
    </div>
  );
}

function SalesComparison({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span className="sales-change inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success is-neutral bg-muted text-muted-foreground">
        <Minus aria-hidden="true" size={12} />
        بدون دادهٔ مقایسه‌ای
      </span>
    );
  }

  if (value > 0) {
    return (
      <span className="sales-change inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success">
        <ArrowUpRight aria-hidden="true" size={13} />
        {formatSignedPercent(value)}
      </span>
    );
  }

  if (value < 0) {
    return (
      <span className="sales-change inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success is-negative bg-destructive/10 text-destructive">
        <ArrowDownRight aria-hidden="true" size={13} />
        {formatSignedPercent(value)}
      </span>
    );
  }

  return (
    <span className="sales-change inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success is-neutral bg-muted text-muted-foreground">
      <Minus aria-hidden="true" size={12} />
      {formatSignedPercent(value)}
    </span>
  );
}

export function SalesOverviewCard({
  selectedDate,
  calendarMode,
  sales,
  customRange,
  period,
  summary,
  onPeriodChange,
  onSelectedDateChange,
  onCustomRangeChange,
}: SalesOverviewCardProps) {
  const chartData = useMemo(
    () =>
      getSalesChartData(period, selectedDate, calendarMode, customRange, sales),
    [period, selectedDate, calendarMode, customRange, sales],
  );
  const selectedIndex = getSelectedChartIndex(chartData, selectedDate);
  const rangeControlRef = useRef<HTMLFieldSetElement>(null);
  const suppressRangeFocusRef = useRef(false);
  const [draftRange, setDraftRange] = useState<DoranRangeDraft>(() => ({
    start: toDoranDate(customRange.start),
    end: toDoranDate(customRange.end),
  }));
  const focusRangeControl = useCallback(() => {
    window.requestAnimationFrame(() => {
      suppressRangeFocusRef.current = false;
      rangeControlRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    const appliedRange = {
      start: toDoranDate(customRange.start),
      end: toDoranDate(customRange.end),
    };
    setDraftRange(appliedRange);

    const resetDraftOnOutsidePointer = (event: PointerEvent) => {
      const popup = document.querySelector(".doran-datepicker__popover");
      const target = event.target;
      if (
        !popup ||
        !(target instanceof Node) ||
        popup.contains(target) ||
        rangeControlRef.current?.contains(target)
      ) {
        return;
      }
      setDraftRange(appliedRange);
    };

    const resetDraftOnKeyboardClose = (event: KeyboardEvent) => {
      const popup = document.querySelector(".doran-datepicker__popover");
      const isPickerInput =
        event.target instanceof HTMLInputElement &&
        rangeControlRef.current?.contains(event.target);
      if (
        popup &&
        (event.key === "Escape" || (event.key === "Enter" && isPickerInput))
      ) {
        suppressRangeFocusRef.current = true;
        setDraftRange(appliedRange);
        focusRangeControl();
      }
    };

    document.addEventListener("pointerdown", resetDraftOnOutsidePointer, true);
    document.addEventListener("keydown", resetDraftOnKeyboardClose, true);
    return () => {
      document.removeEventListener(
        "pointerdown",
        resetDraftOnOutsidePointer,
        true,
      );
      document.removeEventListener("keydown", resetDraftOnKeyboardClose, true);
    };
  }, [customRange.start, customRange.end, focusRangeControl]);

  const handleRangeChange = (range: DoranRangeDraft) => {
    setDraftRange(range);
    if (!range.start || !range.end) return;
    suppressRangeFocusRef.current = true;
    const start = range.start.formatGregorian("YYYY-MM-DD");
    const end = range.end.formatGregorian("YYYY-MM-DD");
    onCustomRangeChange({ start, end });
    onSelectedDateChange(end);
    focusRangeControl();
  };

  return (
    <Card
      dir="rtl"
      className="panel-card sales-card flex min-h-[390px] min-w-0 flex-col gap-3 rounded-[22px] border border-border bg-card p-4 shadow-card sm:p-5"
    >
      <div className="sales-card-header flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="panel-title-block min-w-0 space-y-1">
          <h2 className="panel-title text-base font-semibold tracking-tight text-foreground sm:text-lg">
            نمای کلی فروش
          </h2>
          <p className="panel-caption text-xs leading-5 text-muted-foreground">
            {period === "daily"
              ? "۳۰ روز اخیر و مقایسه با ۳۰ روز قبل؛ بر اساس تاریخ فاکتور و خالص از مرجوعی‌ها"
              : "فروش خالص به تاریخ فاکتور و مقایسه با دورهٔ مشابه؛ مرجوعی از همان فاکتور کم می‌شود"}
          </p>
        </div>
        <div className="sales-tools flex min-w-0 flex-wrap items-center justify-start gap-2 lg:justify-end">
          <fieldset className="period-selector flex w-fit max-w-full flex-wrap items-center gap-1 rounded-full border border-border bg-muted/40 p-1">
            <legend className="sr-only">بازهٔ نمودار فروش</legend>
            {periods.map((item) => (
              <button
                aria-pressed={period === item.id}
                className="period-button rounded-full px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground aria-[pressed=true]:bg-primary aria-[pressed=true]:font-semibold aria-[pressed=true]:text-primary-foreground"
                key={item.id}
                onClick={() => onPeriodChange(item.id)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </fieldset>
          {period === "custom" && (
            <fieldset
              className="custom-range-control grid min-w-0 gap-1 rounded-xl border border-border bg-card-raised/50 p-2"
              onFocusCapture={(event) => {
                if (
                  suppressRangeFocusRef.current &&
                  event.target instanceof HTMLInputElement
                ) {
                  suppressRangeFocusRef.current = false;
                  event.stopPropagation();
                }
              }}
              ref={rangeControlRef}
              tabIndex={-1}
            >
              <legend className="sr-only">بازهٔ سفارشی فروش</legend>
              <span className="custom-range-caption text-[10px] text-muted-foreground">
                انتخاب بازهٔ شمسی یا میلادی
              </span>
              <DoranRangeDatePicker
                key={`${customRange.start}-${customRange.end}`}
                className="doran-range-skin w-full min-w-0"
                endPlaceholder="تا تاریخ"
                format="YYYY/MM/DD"
                icon={null}
                locale={faIR}
                mode="auto"
                numberOfMonths={1}
                onChange={(range) => handleRangeChange(range)}
                presets={false}
                startPlaceholder="از تاریخ"
                style={{ width: "100%" }}
                value={draftRange}
              />
            </fieldset>
          )}
        </div>
      </div>

      <div className="sales-summary flex min-w-0 flex-wrap items-end gap-x-3 gap-y-1 border-b border-border/60 pb-2">
        <div className="sales-total-wrap flex items-baseline gap-2">
          <strong className="sales-total text-2xl font-semibold tracking-tight tabular-nums text-foreground sm:text-3xl">
            {formatCompactCurrency(summary.total)}
          </strong>
          <span className="sales-total-unit text-xs text-muted-foreground">
            {getCurrencyUnit()} فروش
          </span>
        </div>
        <SalesComparison value={summary.percentChange} />
        <span className="sales-comparison text-[11px] text-muted-foreground">
          نسبت به دورهٔ مشابه قبل
        </span>
      </div>

      <figure className="sales-chart h-[230px] min-h-[220px] w-full flex-1 sm:h-[270px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer height="100%" width="100%">
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 13, right: 8, left: -12, bottom: 0 }}
            >
              <defs>
                <pattern
                  height="8"
                  id="salesBarPattern"
                  patternTransform="rotate(45)"
                  patternUnits="userSpaceOnUse"
                  width="8"
                >
                  <rect fill="var(--sales-bar-surface)" height="8" width="8" />
                  <line
                    stroke="var(--sales-bar-texture)"
                    strokeWidth="2"
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="8"
                  />
                </pattern>
              </defs>
              <CartesianGrid
                stroke="var(--border)"
                strokeDasharray="3 5"
                strokeOpacity={0.75}
                vertical={false}
              />
              <XAxis
                axisLine={false}
                dataKey="label"
                interval={period === "daily" ? "preserveStartEnd" : 0}
                tickLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                tickMargin={11}
              />
              <YAxis
                axisLine={false}
                domain={[0, "dataMax"]}
                tickFormatter={formatCompactAxis}
                tickLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                tickMargin={8}
                tickCount={5}
                width={54}
              />
              <Tooltip
                content={(props) => <SalesTooltip {...props} />}
                cursor={{ fill: "var(--muted)", opacity: 0.34 }}
                isAnimationActive={false}
              />
              <Bar
                dataKey="amount"
                maxBarSize={42}
                minPointSize={3}
                radius={[8, 8, 4, 4]}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    cursor="pointer"
                    fill={
                      index === selectedIndex
                        ? "var(--primary)"
                        : "url(#salesBarPattern)"
                    }
                    key={`${entry.label}-${entry.startDate}`}
                    onClick={() => onSelectedDateChange(entry.selectionDate)}
                    stroke={
                      index === selectedIndex
                        ? "var(--primary)"
                        : "var(--border)"
                    }
                    strokeWidth={index === selectedIndex ? 1 : 1.1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="expense-empty flex min-h-28 items-center justify-center rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs leading-5 text-muted-foreground">
            برای این بازه فروش ثبت نشده است.
          </div>
        )}
        <figcaption className="sr-only">
          نمودار فروش برای بازهٔ انتخاب‌شده
        </figcaption>
      </figure>
      <div aria-live="polite" className="sr-only">
        نقطهٔ انتخاب‌شده در نمودار:{" "}
        {chartData[selectedIndex]?.label ?? "بدون داده"}،
        {chartData[selectedIndex]?.amount
          ? formatCurrency(chartData[selectedIndex].amount)
          : ` صفر ${getCurrencyUnit()}`}
      </div>
    </Card>
  );
}
