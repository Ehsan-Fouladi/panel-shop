import { Activity, Wallet } from "lucide-react";
import {
  type RefObject,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/records/SectionCard";
import { DateField, MetricCard } from "@/components/records/Shared";
import {
  getMonthCursor,
  getMonthEnd,
  getMonthLabel,
  getMonthStart,
  getTodayDateKey,
  getYearStart,
} from "@/lib/date";
import {
  formatCompactAxis,
  formatCurrency,
  formatNumber,
  getCurrencyUnit,
} from "@/lib/formatters";
import {
  getFinancialChartDomain,
  getFinancialSummary,
  getHourlySaleTotals,
  getPaymentTotalsForDate,
  getSaleOutstanding,
} from "@/lib/retail-data";
import { useAppStore } from "@/store/app-store";
import { useRetailStore } from "@/store/retail-store";

type FinancialTooltipProps = TooltipContentProps & {
  chartRef: RefObject<HTMLDivElement | null>;
};

function FinancialTooltip({
  active,
  chartRef,
  coordinate,
  label,
  payload,
}: FinancialTooltipProps) {
  const tooltipContentRef = useRef<HTMLDivElement>(null);
  const entries =
    payload?.filter(
      (entry) => entry.value !== null && entry.value !== undefined,
    ) ?? [];

  useLayoutEffect(() => {
    const content = tooltipContentRef.current;
    const wrapper = content?.parentElement;
    const chart = chartRef.current;
    if (!active || !coordinate || !wrapper || !chart || !payload?.length)
      return;

    const positionTooltip = () => {
      const cardRect = chart
        .closest(".workspace-card")
        ?.getBoundingClientRect();
      const chartRect = chart.getBoundingClientRect();
      const tooltipRect = wrapper.getBoundingClientRect();
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

      const width = tooltipRect.width;
      const height = tooltipRect.height;
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
      ]
        .map(({ x, y }) => ({
          left: Math.min(Math.max(x, minX), maxX),
          top: Math.min(Math.max(y, minY), maxY),
        }))
        .map(({ left, top }) => ({
          left,
          top,
          distance: Math.hypot(
            left + width / 2 - anchorX,
            top + height / 2 - anchorY,
          ),
        }))
        .sort((left, right) => left.distance - right.distance);
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
  }, [active, chartRef, coordinate, payload]);

  if (!active || entries.length === 0) return null;

  return (
    <div
      className="chart-tooltip min-w-[170px] max-w-[220px] rounded-xl border border-border bg-popover/95 p-3 text-xs text-popover-foreground shadow-popover backdrop-blur-sm"
      ref={tooltipContentRef}
    >
      <div className="chart-tooltip-label mb-2 font-semibold text-foreground">
        {String(label ?? "")}
      </div>
      <div className="grid gap-1">
        {entries.map((entry) => {
          const name = entry.name ?? entry.dataKey;
          const color =
            typeof entry.color === "string" ? entry.color : "var(--chart-3)";
          return (
            <div
              className="chart-tooltip-row flex items-center justify-between gap-4 py-1 text-muted-foreground"
              key={String(name ?? "financial-value")}
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="truncate">{String(name ?? "")}</span>
              </span>
              <strong className="shrink-0 whitespace-nowrap tabular-nums text-foreground">
                {formatCurrency(Number(entry.value ?? 0))}
              </strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FinancialsPage() {
  const hourlyChartRef = useRef<HTMLDivElement>(null);
  const annualChartRef = useRef<HTMLDivElement>(null);
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
  const [selectedDate, setSelectedDate] = useState(() => getTodayDateKey());
  const cursor = getMonthCursor(selectedDate, calendarMode);
  const startOfYear = getYearStart(selectedDate, calendarMode);
  const yearSummary = getFinancialSummary(data, startOfYear, selectedDate);
  const dailySales = data.sales.filter((sale) => sale.date === selectedDate);
  const paymentTotals = getPaymentTotalsForDate(data.payments, selectedDate);
  const hourlyData = getHourlySaleTotals(data.sales, selectedDate).map(
    (amount, hour) => ({
      hour: `${formatNumber(hour).padStart(2, "۰")}:۰۰`,
      amount,
    }),
  );
  const monthlyData = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const month = index + 1;
        const monthCursor = { year: cursor.year, month };
        const start = getMonthStart(monthCursor, calendarMode);
        const end = getMonthEnd(monthCursor, calendarMode);
        const summary = getFinancialSummary(
          data,
          start,
          end > selectedDate ? selectedDate : end,
        );
        return {
          label: getMonthLabel(monthCursor, calendarMode),
          sales: summary.netSales,
          expenses: summary.operatingExpenses,
        };
      }),
    [calendarMode, cursor.year, data, selectedDate],
  );
  const selectedMonthStart = getMonthStart(cursor, calendarMode);
  const selectedMonthEnd = selectedDate;
  const monthSummary = getFinancialSummary(
    data,
    selectedMonthStart,
    selectedMonthEnd,
  );
  const annualChartDomain = getFinancialChartDomain(monthlyData);

  return (
    <div className="workspace-page mx-auto grid w-full max-w-[1560px] min-w-0 content-start gap-4 p-4 sm:gap-5 sm:p-5 xl:p-6">
      <PageHeader
        title="تحلیل مالی"
        description="فروش، وصول وجه، بهای کالا، هزینهٔ عملیاتی و سود را با تعریف‌های جداگانه بررسی کنید."
      />
      <div className="financial-filter-row flex min-w-0 flex-wrap items-end justify-between gap-3">
        <DateField
          id="financial-date"
          label="تاریخ مرجع گزارش"
          mode={calendarMode}
          onChange={setSelectedDate}
          required
          value={selectedDate}
        />
        <span className="data-note rounded-xl border border-info/20 bg-info/5 px-3 py-2 text-xs leading-6 text-muted-foreground compact-note py-1.5">
          بهای تمام‌شده از میانگین موزون ذخیره‌شده هنگام فروش می‌آید؛ مرجوعی در
          تاریخ رویداد ثبت می‌شود.
        </span>
      </div>
      <div className="metric-grid grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
        <MetricCard
          label="فروش ناخالص سال تا تاریخ"
          value={formatCurrency(yearSummary.grossSales)}
        />
        <MetricCard
          label="تخفیف و مرجوعی"
          value={formatCurrency(yearSummary.discounts + yearSummary.returns)}
          tone="warning"
        />
        <MetricCard
          label="فروش خالص"
          value={formatCurrency(yearSummary.netSales)}
          tone="positive"
        />
        <MetricCard
          label="بهای کالای فروخته‌شده"
          value={formatCurrency(yearSummary.costOfGoodsSold)}
        />
      </div>
      <div className="metric-grid grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
        <MetricCard
          label="سود ناخالص سال تا تاریخ"
          value={formatCurrency(yearSummary.grossProfit)}
          tone={yearSummary.grossProfit >= 0 ? "positive" : "negative"}
        />
        <MetricCard
          label="هزینه‌های عملیاتی"
          value={formatCurrency(yearSummary.operatingExpenses)}
          tone="warning"
        />
        <MetricCard
          label="سود خالص"
          value={formatCurrency(yearSummary.netProfit)}
          tone={yearSummary.netProfit >= 0 ? "positive" : "negative"}
        />
      </div>
      <SectionCard
        title="فروش ساعتی بر اساس تاریخ فاکتور"
        description={`فاکتورهای تاریخ ${selectedDate} · مبلغ نمودار خالص از مرجوعی‌های همان فاکتورهاست؛ فروش با وجه دریافتی یکی نیست.`}
      >
        <div className="metric-grid grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3 compact-metric-grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
          <MetricCard label="تعداد فاکتور" value={dailySales.length} />
          <MetricCard
            label="فروش ناخالص روز"
            value={formatCurrency(
              dailySales.reduce((sum, sale) => sum + sale.grossAmount, 0),
            )}
          />
          <MetricCard
            label="وجه دریافتی روز"
            value={formatCurrency(paymentTotals.received)}
            hint={
              paymentTotals.refunded
                ? `بدون بازپرداخت مرجوعی ${formatCurrency(paymentTotals.refunded)}`
                : "وصول طلب و پرداخت فروش"
            }
            tone="positive"
          />
          <MetricCard
            label="ماندهٔ فعلی همین فاکتورها"
            value={formatCurrency(
              dailySales.reduce(
                (sum, sale) => sum + getSaleOutstanding(sale, data.returns),
                0,
              ),
            )}
            tone="warning"
          />
        </div>
        {dailySales.length ? (
          <div
            className="financial-chart-frame h-[270px] min-w-0 sm:h-[310px]"
            ref={hourlyChartRef}
          >
            <ResponsiveContainer height="100%" width="100%">
              <BarChart
                accessibilityLayer
                data={hourlyData}
                margin={{ top: 12, right: 8, left: 0, bottom: 4 }}
              >
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="3 5"
                  strokeOpacity={0.75}
                  vertical={false}
                />
                <XAxis
                  axisLine={false}
                  dataKey="hour"
                  interval={3}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  tickLine={false}
                  tickMargin={10}
                />
                <YAxis
                  axisLine={false}
                  domain={[0, "dataMax"]}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  tickCount={5}
                  tickFormatter={formatCompactAxis}
                  tickLine={false}
                  tickMargin={8}
                  width={58}
                />
                <Tooltip
                  content={(props) => (
                    <FinancialTooltip {...props} chartRef={hourlyChartRef} />
                  )}
                  cursor={{ fill: "var(--muted)", opacity: 0.34 }}
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
                <Bar
                  dataKey="amount"
                  maxBarSize={28}
                  name="فروش خالص فاکتور"
                  fill="var(--chart-3)"
                  radius={[7, 7, 3, 3]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="chart-empty-state rounded-xl bg-muted/40 px-4 py-5 text-center text-xs leading-6 text-muted-foreground">
            در این تاریخ فروش ثبت نشده است.
          </p>
        )}
        <p className="chart-footnote text-[11px] leading-5 text-muted-foreground">
          نمودار به تفکیک ساعت بر اساس ساعت ثبت محلی فاکتور است؛ مرجوعی‌ها در
          این نما به تاریخ فاکتور اصلی نسبت داده می‌شوند. برای سوابق نمونه فقط
          زمان نمایشی ذخیره شده است.
        </p>
      </SectionCard>
      <div className="workspace-two-column grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <SectionCard
          title="سود و زیان ماه انتخاب‌شده"
          description={`${getMonthLabel(cursor, calendarMode)} · مبالغ ${getCurrencyUnit()}`}
        >
          <div className="pnl-list grid gap-2">
            <div>
              <span>فروش ناخالص</span>
              <strong>{formatCurrency(monthSummary.grossSales)}</strong>
            </div>
            <div>
              <span>تخفیف‌ها</span>
              <strong>− {formatCurrency(monthSummary.discounts)}</strong>
            </div>
            <div>
              <span>مرجوعی‌ها</span>
              <strong>− {formatCurrency(monthSummary.returns)}</strong>
            </div>
            <div className="pnl-subtotal flex items-center justify-between gap-3 border-t border-border/70 pt-3 text-sm font-medium">
              <span>فروش خالص</span>
              <strong>{formatCurrency(monthSummary.netSales)}</strong>
            </div>
            <div>
              <span>بهای کالای فروخته‌شده</span>
              <strong>− {formatCurrency(monthSummary.costOfGoodsSold)}</strong>
            </div>
            <div className="pnl-subtotal flex items-center justify-between gap-3 border-t border-border/70 pt-3 text-sm font-medium">
              <span>سود ناخالص</span>
              <strong>{formatCurrency(monthSummary.grossProfit)}</strong>
            </div>
            <div>
              <span>هزینه‌های عملیاتی</span>
              <strong>
                − {formatCurrency(monthSummary.operatingExpenses)}
              </strong>
            </div>
            <div className="pnl-total flex items-center justify-between gap-3 rounded-xl border border-border bg-primary/5 p-3 font-semibold tabular-nums">
              <span>سود خالص</span>
              <strong>{formatCurrency(monthSummary.netProfit)}</strong>
            </div>
          </div>
        </SectionCard>
        <SectionCard
          title="مانده‌های ترازنامه‌ای"
          description="مبالغ باز همهٔ دوره‌ها؛ نه فقط ماه جاری."
        >
          <div className="pnl-list grid gap-2">
            <div>
              <span>مطالبات مشتریان</span>
              <strong>{formatCurrency(yearSummary.receivables)}</strong>
            </div>
            <div>
              <span>بدهی به تأمین‌کنندگان</span>
              <strong>{formatCurrency(yearSummary.payables)}</strong>
            </div>
            <div>
              <span>ارزش موجودی فعلی</span>
              <strong>{formatCurrency(yearSummary.inventoryValue)}</strong>
            </div>
          </div>
        </SectionCard>
      </div>
      <SectionCard
        title="نمای سالانه"
        description={`۱۲ ماه از سال ${cursor.year} در تقویم ${calendarMode === "jalali" ? "شمسی" : "میلادی"} · فروش خالص در برابر هزینهٔ جاری`}
      >
        <ul
          aria-label="راهنمای نمودار سالانه"
          className="financial-chart-legend m-0 flex list-none flex-wrap items-center gap-x-5 gap-y-2 p-0 text-xs"
        >
          <li className="financial-chart-legend-item inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full bg-chart-3"
            />
            <span className="text-muted-foreground">فروش خالص</span>
          </li>
          <li className="financial-chart-legend-item inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full bg-chart-5"
            />
            <span className="text-muted-foreground">هزینهٔ عملیاتی</span>
          </li>
        </ul>
        <div
          className="financial-chart-frame h-[320px] min-w-0 sm:h-[360px]"
          ref={annualChartRef}
        >
          <ResponsiveContainer height="100%" width="100%">
            <BarChart
              accessibilityLayer
              barGap={4}
              data={monthlyData}
              margin={{ top: 12, right: 8, left: 0, bottom: 4 }}
            >
              <CartesianGrid
                stroke="var(--border)"
                strokeDasharray="3 5"
                strokeOpacity={0.75}
                vertical={false}
              />
              <XAxis
                axisLine={false}
                dataKey="label"
                interval="preserveStartEnd"
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                tickLine={false}
                tickMargin={10}
              />
              <YAxis
                axisLine={false}
                domain={annualChartDomain}
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                tickCount={5}
                tickFormatter={formatCompactAxis}
                tickLine={false}
                tickMargin={8}
                width={58}
              />
              <Tooltip
                content={(props) => (
                  <FinancialTooltip {...props} chartRef={annualChartRef} />
                )}
                cursor={{ fill: "var(--muted)", opacity: 0.34 }}
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
              <Bar
                dataKey="sales"
                maxBarSize={28}
                name="فروش خالص"
                fill="var(--chart-3)"
                radius={[6, 6, 2, 2]}
              />
              <Bar
                dataKey="expenses"
                maxBarSize={28}
                name="هزینهٔ عملیاتی"
                fill="var(--chart-5)"
                radius={[6, 6, 2, 2]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
      <div className="financial-definitions grid gap-2 text-xs leading-5 text-muted-foreground">
        <span className="flex items-center gap-2">
          <Activity aria-hidden="true" size={15} /> سودوزیان بر مبنای تاریخ
          رویداد است: فروش بر اساس تاریخ فاکتور و مرجوعی بر اساس تاریخ ثبت؛ در
          بازهٔ مرجوعی، فقط بهای کالای برگشته به موجودی از بهای تمام‌شده کسر
          می‌شود.
        </span>
        <span className="flex items-center gap-2">
          <Wallet aria-hidden="true" size={15} /> وجه دریافتی از دفتر پرداخت‌ها
          می‌آید، نه از مبلغ کل فاکتور؛ نمودار فروش ساعتی بر مبنای تاریخ فاکتور
          و پس از کسر مرجوعی‌های همان فاکتور است.
        </span>
      </div>
    </div>
  );
}
