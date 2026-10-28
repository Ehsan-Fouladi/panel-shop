import { ChartNoAxesCombined, Lightbulb } from "lucide-react";
import {
  type RefObject,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
} from "recharts";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ExpenseCategoryId, ExpenseRecord } from "@/data/dashboard-data";
import {
  type ExpenseCategorySummary,
  type ExpensePeriod,
  getExpenseSummary,
  getTopExpenseInsight,
} from "@/lib/dashboard-metrics";
import type { CalendarMode, DateKey } from "@/lib/date";
import {
  formatCompactAxis,
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
  getCurrencyUnit,
} from "@/lib/formatters";

interface ExpenseDistributionCardProps {
  selectedDate: DateKey;
  calendarMode: CalendarMode;
  expenses: ExpenseRecord[];
  categories: Array<{ id: ExpenseCategoryId; label: string; color: string }>;
}

type ExpenseTooltipProps = TooltipContentProps & {
  chartRef: RefObject<HTMLDivElement | null>;
};

function ExpenseTooltip({
  active,
  chartRef,
  coordinate,
  payload,
}: ExpenseTooltipProps) {
  const tooltipContentRef = useRef<HTMLDivElement>(null);
  const category = payload?.[0]?.payload as ExpenseCategorySummary | undefined;

  useLayoutEffect(() => {
    const content = tooltipContentRef.current;
    const wrapper = content?.parentElement;
    const chart = chartRef.current;
    if (!active || !coordinate || !wrapper || !chart || !category) return;

    const positionTooltip = () => {
      const card = chart.closest(".expense-card");
      const cardRect = card?.getBoundingClientRect();
      const chartRect = chart.getBoundingClientRect();
      const centerRect = chart
        .querySelector(".expense-chart-center")
        ?.getBoundingClientRect();
      const tooltipRect = wrapper.getBoundingClientRect();
      const width = tooltipRect.width;
      const height = tooltipRect.height;
      const bounds = {
        left: Math.max(0, cardRect?.left ?? 0),
        right: Math.min(
          window.innerWidth,
          cardRect?.right ?? window.innerWidth,
        ),
        top: Math.max(0, cardRect?.top ?? 0),
        bottom: Math.min(
          window.innerHeight,
          cardRect?.bottom ?? window.innerHeight,
        ),
      };
      let ancestor = chart.parentElement;
      while (ancestor && ancestor !== document.body) {
        const style = window.getComputedStyle(ancestor);
        const rect = ancestor.getBoundingClientRect();
        if (style.overflowX !== "visible") {
          bounds.left = Math.max(bounds.left, rect.left);
          bounds.right = Math.min(bounds.right, rect.right);
        }
        if (style.overflowY !== "visible") {
          bounds.top = Math.max(bounds.top, rect.top);
          bounds.bottom = Math.min(bounds.bottom, rect.bottom);
        }
        ancestor = ancestor.parentElement;
      }
      const padding = 8;
      const gap = 12;
      const minX = bounds.left + padding;
      const minY = bounds.top + padding;
      const maxX = Math.max(minX, bounds.right - width - padding);
      const maxY = Math.max(minY, bounds.bottom - height - padding);
      const anchorX = chartRect.left + coordinate.x;
      const anchorY = chartRect.top + coordinate.y;
      const candidates = [
        { x: anchorX + gap, y: anchorY + gap },
        { x: anchorX - width - gap, y: anchorY + gap },
        { x: anchorX + gap, y: anchorY - height - gap },
        { x: anchorX - width - gap, y: anchorY - height - gap },
      ].map(({ x, y }) => {
        const left = Math.min(Math.max(x, minX), maxX);
        const top = Math.min(Math.max(y, minY), maxY);
        const overlapsCenter =
          centerRect !== undefined &&
          left < centerRect.right + 6 &&
          left + width > centerRect.left - 6 &&
          top < centerRect.bottom + 6 &&
          top + height > centerRect.top - 6;
        return {
          left,
          top,
          overlap: overlapsCenter ? 1 : 0,
          distance: Math.hypot(
            left + width / 2 - anchorX,
            top + height / 2 - anchorY,
          ),
        };
      });
      candidates.sort(
        (left, right) =>
          left.overlap - right.overlap || left.distance - right.distance,
      );
      const best = candidates[0];
      if (best) {
        wrapper.style.transform = `translate3d(${Math.round(best.left)}px, ${Math.round(best.top)}px, 0)`;
      }
    };

    positionTooltip();
    window.addEventListener("resize", positionTooltip);
    window.addEventListener("scroll", positionTooltip, true);
    return () => {
      window.removeEventListener("resize", positionTooltip);
      window.removeEventListener("scroll", positionTooltip, true);
    };
  }, [active, category, chartRef, coordinate]);

  if (!active || !category) return null;

  return (
    <div
      className="chart-tooltip min-w-[170px] rounded-xl border border-border bg-popover/95 p-3 text-xs text-popover-foreground shadow-popover backdrop-blur-sm"
      ref={tooltipContentRef}
    >
      <div className="chart-tooltip-label mb-2 font-semibold text-foreground">
        {category.label}
      </div>
      <div className="chart-tooltip-row flex items-center justify-between gap-4 py-1 text-muted-foreground">
        <span>مبلغ</span>
        <strong>{formatCurrency(category.amount)}</strong>
      </div>
      <div className="chart-tooltip-row is-muted flex items-center justify-between gap-4 py-1 text-muted-foreground">
        <span>از کل هزینه‌ها</span>
        <span>{formatPercent(category.percentage)}</span>
      </div>
    </div>
  );
}

const periodLabels: Record<ExpensePeriod, string> = {
  last30: "۳۰ روز اخیر",
  month: "ماه جاری",
  year: "سال جاری",
};

export function ExpenseDistributionCard({
  selectedDate,
  calendarMode,
  expenses,
  categories,
}: ExpenseDistributionCardProps) {
  const [period, setPeriod] = useState<ExpensePeriod>("last30");
  const [selectedCategoryId, setSelectedCategoryId] =
    useState<ExpenseCategoryId | null>(null);
  const expenseChartRef = useRef<HTMLDivElement>(null);
  const summary = useMemo(
    () =>
      getExpenseSummary(
        period,
        selectedDate,
        calendarMode,
        expenses,
        categories,
      ),
    [period, selectedDate, calendarMode, expenses, categories],
  );
  const selectedCategory =
    summary.categories.find((category) => category.id === selectedCategoryId) ??
    summary.categories[0] ??
    null;
  const insight = getTopExpenseInsight(summary);

  return (
    <Card
      dir="rtl"
      className="panel-card expense-card flex min-h-[305px] min-w-0 flex-col rounded-[22px] border border-border bg-card p-4 shadow-card sm:p-5"
    >
      <div className="lower-card-header mb-3 flex min-w-0 items-start justify-between gap-3">
        <div className="lower-card-heading flex min-w-0 items-center gap-2.5">
          <span className="lower-card-icon grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-foreground">
            <ChartNoAxesCombined aria-hidden="true" size={17} />
          </span>
          <div className="lower-card-title-block min-w-0 grid gap-0.5">
            <h2 className="lower-card-title text-sm font-semibold text-foreground">
              توزیع هزینه‌ها
            </h2>
            <span className="lower-card-caption text-[10px] leading-4 text-muted-foreground">
              هزینه‌های جاری · {getCurrencyUnit()}
            </span>
          </div>
        </div>
        <div className="expense-card-header-actions shrink-0">
          <label
            className="sr-only"
            htmlFor="expense-period"
            id="expense-period-label"
          >
            بازهٔ هزینه‌ها
          </label>
          <Select
            onValueChange={(value) => setPeriod(value as ExpensePeriod)}
            value={period}
          >
            <SelectTrigger
              aria-labelledby="expense-period-label"
              className="expense-period-select h-8 min-w-[125px] rounded-full px-3 text-[10px]"
              id="expense-period"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              align="start"
              className="expense-select-content min-w-[150px]"
              position="popper"
            >
              {Object.entries(periodLabels).map(([value, label]) => (
                <SelectItem
                  className="expense-select-item text-xs"
                  key={value}
                  value={value}
                >
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {summary.total > 0 ? (
        <>
          <div className="expense-body grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-[minmax(140px,0.9fr)_minmax(0,1.1fr)] sm:items-center">
            <div
              aria-label="نمودار حلقه‌ای هزینه‌ها"
              className="expense-chart-wrap relative mx-auto h-[190px] w-full max-w-[240px] min-w-0"
              ref={expenseChartRef}
              role="img"
            >
              <ResponsiveContainer height="100%" width="100%">
                <PieChart>
                  <Pie
                    data={summary.categories}
                    dataKey="amount"
                    innerRadius="59%"
                    outerRadius="84%"
                    paddingAngle={3}
                    stroke="none"
                  >
                    {summary.categories.map((category) => (
                      <Cell
                        fill={category.color}
                        fillOpacity={
                          !selectedCategory ||
                          category.id === selectedCategory.id
                            ? 1
                            : 0.42
                        }
                        key={category.id}
                        stroke={
                          category.id === selectedCategory?.id
                            ? "var(--foreground)"
                            : "transparent"
                        }
                        strokeWidth={
                          category.id === selectedCategory?.id ? 1.5 : 0
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={(props) => (
                      <ExpenseTooltip {...props} chartRef={expenseChartRef} />
                    )}
                    isAnimationActive={false}
                    portal={document.body}
                    wrapperStyle={{
                      height: "max-content",
                      left: 0,
                      pointerEvents: "none",
                      position: "fixed",
                      top: 0,
                      width: "max-content",
                      zIndex: 60,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div
                aria-hidden="true"
                className="expense-chart-center pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
              >
                <strong className="expense-chart-total text-lg font-semibold tabular-nums text-foreground">
                  {formatCompactCurrency(summary.total)}
                </strong>
                <span className="expense-chart-label mt-1 text-[10px] text-muted-foreground">
                  {getCurrencyUnit()} · جمع
                </span>
              </div>
            </div>

            <fieldset className="expense-legend grid min-w-0 gap-1.5 border-0 p-0">
              <legend className="sr-only">دسته‌بندی هزینه‌ها</legend>
              {summary.categories.map((category) => (
                <button
                  aria-pressed={category.id === selectedCategory?.id}
                  className={`expense-legend-item flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-start transition-colors hover:bg-muted/60 [&.is-selected]:bg-muted/60${category.id === selectedCategory?.id ? " is-selected" : ""}`}
                  key={category.id}
                  onClick={() => setSelectedCategoryId(category.id)}
                  type="button"
                >
                  <span
                    className="expense-legend-dot h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: category.color }}
                  />
                  <span className="expense-legend-name min-w-0 flex-1 truncate text-[10px] text-muted-foreground">
                    {category.label}
                  </span>
                  <span className="expense-legend-value whitespace-nowrap text-[10px] tabular-nums text-foreground">
                    {formatCompactAxis(category.amount)} ·{" "}
                    {formatPercent(category.percentage)}
                  </span>
                </button>
              ))}
            </fieldset>
          </div>

          <div className="expense-insight mt-3 flex items-start gap-2 rounded-xl bg-muted/50 p-2.5 text-[10px] leading-5 text-muted-foreground [&>svg]:mt-0.5 [&>svg]:shrink-0 [&>svg]:text-warning">
            <Lightbulb aria-hidden="true" size={14} />
            <span>
              {insight}
              {selectedCategory && (
                <>
                  {" "}
                  انتخاب: {selectedCategory.label}،{" "}
                  {formatCurrency(selectedCategory.amount)}
                </>
              )}
            </span>
          </div>
        </>
      ) : (
        <div className="expense-empty flex min-h-28 items-center justify-center rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs leading-5 text-muted-foreground">
          در بازهٔ انتخاب‌شده هزینهٔ جاری ثبت نشده است.
        </div>
      )}
    </Card>
  );
}
