import {
  type ExpenseCategoryId,
  type ExpenseRecord,
  expenseCategories,
  getCashReceivedForDate as getSampleCashReceivedForDate,
  getSalesForDate as getSampleSalesForDate,
  type ProductRecord,
  type SaleRecord,
  expenses as sampleExpenses,
  products as sampleProducts,
  sales as sampleSales,
} from "@/data/dashboard-data";
import {
  addDays,
  type CalendarMode,
  compareDateKeys,
  type DateKey,
  daysBetween,
  getDateLabel,
  getMonthCursor,
  getMonthEnd,
  getMonthLabel,
  getMonthLength,
  getMonthStart,
  getWeekdayLabel,
  getYearStart,
  type MonthCursor,
  shiftDateByMonth,
  shiftDateByYear,
  shiftMonthCursor,
} from "@/lib/date";

export type SalesPeriod = "daily" | "weekly" | "monthly" | "yearly" | "custom";
export type ExpensePeriod = "last30" | "month" | "year";

export interface DateRange {
  start: DateKey;
  end: DateKey;
}

export interface SalesChartDatum {
  label: string;
  amount: number;
  previousAmount: number;
  startDate: DateKey;
  endDate: DateKey;
  selectionDate: DateKey;
}

export interface SalesSummary {
  total: number;
  previousTotal: number;
  percentChange: number | null;
  range: DateRange;
  previousRange: DateRange;
}

export interface ExpenseCategorySummary {
  id: ExpenseCategoryId;
  label: string;
  color: string;
  amount: number;
  percentage: number;
}

export interface ExpenseSummary {
  total: number;
  categories: ExpenseCategorySummary[];
  range: DateRange;
}

export function getSalesForDate(
  dateKey: DateKey,
  sourceSales: SaleRecord[] = sampleSales,
): SaleRecord[] {
  return sourceSales.filter((sale) => sale.date === dateKey);
}

export function getSalesRecords(
  start: DateKey,
  end: DateKey,
  sourceSales: SaleRecord[] = sampleSales,
): SaleRecord[] {
  return sourceSales.filter(
    (sale) =>
      compareDateKeys(sale.date, start) >= 0 &&
      compareDateKeys(sale.date, end) <= 0,
  );
}

export function getExpenseRecords(
  start: DateKey,
  end: DateKey,
  sourceExpenses: ExpenseRecord[] = sampleExpenses,
): ExpenseRecord[] {
  return sourceExpenses.filter(
    (expense) =>
      compareDateKeys(expense.date, start) >= 0 &&
      compareDateKeys(expense.date, end) <= 0,
  );
}

function sumSales(
  start: DateKey,
  end: DateKey,
  sourceSales: SaleRecord[],
): number {
  return getSalesRecords(start, end, sourceSales).reduce(
    (total, sale) => total + sale.amount,
    0,
  );
}

function clampEnd(
  start: DateKey,
  end: DateKey,
  maximum: DateKey,
): DateKey | null {
  if (compareDateKeys(start, maximum) > 0) return null;
  return compareDateKeys(end, maximum) > 0 ? maximum : end;
}

export function getSalesPeriodRange(
  period: SalesPeriod,
  selectedDate: DateKey,
  mode: CalendarMode,
  customRange: DateRange,
): DateRange {
  if (period === "daily")
    return { start: addDays(selectedDate, -29), end: selectedDate };
  if (period === "weekly")
    return { start: addDays(selectedDate, -6), end: selectedDate };
  if (period === "monthly") {
    return {
      start: getMonthStart(getMonthCursor(selectedDate, mode), mode),
      end: selectedDate,
    };
  }
  if (period === "yearly")
    return { start: getYearStart(selectedDate, mode), end: selectedDate };
  return customRange;
}

export function getPreviousPeriodRange(
  period: SalesPeriod,
  selectedDate: DateKey,
  mode: CalendarMode,
  customRange: DateRange,
): DateRange {
  if (period === "daily")
    return {
      start: addDays(selectedDate, -59),
      end: addDays(selectedDate, -30),
    };
  if (period === "weekly")
    return {
      start: addDays(selectedDate, -13),
      end: addDays(selectedDate, -7),
    };
  if (period === "monthly") {
    const previousAnchor = shiftDateByMonth(selectedDate, -1, mode);
    return {
      start: getMonthStart(getMonthCursor(previousAnchor, mode), mode),
      end: previousAnchor,
    };
  }
  if (period === "yearly") {
    const previousAnchor = shiftDateByYear(selectedDate, -1, mode);
    return { start: getYearStart(previousAnchor, mode), end: previousAnchor };
  }
  const duration = Math.max(
    1,
    daysBetween(customRange.start, customRange.end) + 1,
  );
  return {
    start: addDays(customRange.start, -duration),
    end: addDays(customRange.end, -duration),
  };
}

export function getSalesSummary(
  period: SalesPeriod,
  selectedDate: DateKey,
  mode: CalendarMode,
  customRange: DateRange,
  sourceSales: SaleRecord[] = sampleSales,
): SalesSummary {
  const range = getSalesPeriodRange(period, selectedDate, mode, customRange);
  const previousRange = getPreviousPeriodRange(
    period,
    selectedDate,
    mode,
    customRange,
  );
  const total = sumSales(range.start, range.end, sourceSales);
  const previousTotal = sumSales(
    previousRange.start,
    previousRange.end,
    sourceSales,
  );
  const percentChange =
    previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : null;
  return { total, previousTotal, percentChange, range, previousRange };
}

function createDatum(
  label: string,
  startDate: DateKey,
  endDate: DateKey,
  previousStart: DateKey,
  amountEnd: DateKey | null,
  previousAmountEnd: DateKey | null,
  selectionDate: DateKey,
  sourceSales: SaleRecord[],
): SalesChartDatum {
  return {
    label,
    amount:
      amountEnd !== null && compareDateKeys(startDate, amountEnd) <= 0
        ? sumSales(startDate, amountEnd, sourceSales)
        : 0,
    previousAmount:
      previousAmountEnd !== null &&
      compareDateKeys(previousStart, previousAmountEnd) <= 0
        ? sumSales(previousStart, previousAmountEnd, sourceSales)
        : 0,
    startDate,
    endDate,
    selectionDate,
  };
}

function monthBucketLabel(start: DateKey, end: DateKey): string {
  const firstDay = Number(start.slice(-2));
  const lastDay = Number(end.slice(-2));
  const first = new Intl.NumberFormat("fa-IR").format(firstDay);
  const last = new Intl.NumberFormat("fa-IR").format(lastDay);
  return firstDay === lastDay ? first : `${first}–${last}`;
}

function buildDailyChart(
  selectedDate: DateKey,
  mode: CalendarMode,
  sourceSales: SaleRecord[],
): SalesChartDatum[] {
  const start = addDays(selectedDate, -29);
  return Array.from({ length: 30 }, (_, index) => {
    const date = addDays(start, index);
    const previousDate = addDays(date, -30);
    return createDatum(
      getDateLabel(date, mode, false),
      date,
      date,
      previousDate,
      date,
      previousDate,
      date,
      sourceSales,
    );
  });
}

function buildWeeklyChart(
  selectedDate: DateKey,
  sourceSales: SaleRecord[],
): SalesChartDatum[] {
  const start = addDays(selectedDate, -6);
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    return createDatum(
      getWeekdayLabel(date, true),
      date,
      date,
      addDays(date, -7),
      date,
      addDays(date, -7),
      date,
      sourceSales,
    );
  });
}

function buildMonthlyChart(
  selectedDate: DateKey,
  mode: CalendarMode,
  sourceSales: SaleRecord[],
): SalesChartDatum[] {
  const cursor = getMonthCursor(selectedDate, mode);
  const previousCursor = shiftMonthCursor(cursor, -1, mode);
  const start = getMonthStart(cursor, mode);
  const previousStart = getMonthStart(previousCursor, mode);
  const monthLength = getMonthLength(cursor, mode);
  const previousLength = getMonthLength(previousCursor, mode);
  const bucketCount = Math.ceil(monthLength / 7);
  const previousAnchor = shiftDateByMonth(selectedDate, -1, mode);
  const previousMonthEnd = getMonthEnd(previousCursor, mode);

  return Array.from({ length: bucketCount }, (_, index) => {
    const offset = index * 7;
    const currentStart = addDays(start, offset);
    const currentEnd = addDays(start, Math.min(monthLength - 1, offset + 6));
    const previousBucketStart = addDays(previousStart, offset);
    const previousBucketEnd = addDays(
      previousStart,
      Math.min(previousLength - 1, offset + 6),
    );
    const currentVisibleEnd = clampEnd(currentStart, currentEnd, selectedDate);
    const previousCutoff =
      compareDateKeys(previousAnchor, previousMonthEnd) > 0
        ? previousMonthEnd
        : previousAnchor;
    const previousVisibleEnd = clampEnd(
      previousBucketStart,
      previousBucketEnd,
      previousCutoff,
    );
    return createDatum(
      monthBucketLabel(currentStart, currentEnd),
      currentStart,
      currentEnd,
      previousBucketStart,
      currentVisibleEnd,
      previousVisibleEnd,
      currentVisibleEnd ?? currentEnd,
      sourceSales,
    );
  });
}

function buildYearlyChart(
  selectedDate: DateKey,
  mode: CalendarMode,
  sourceSales: SaleRecord[],
): SalesChartDatum[] {
  const currentMonth = getMonthCursor(selectedDate, mode);
  const previousAnchor = shiftDateByYear(selectedDate, -1, mode);
  const previousYear = getMonthCursor(previousAnchor, mode).year;
  const currentYear = currentMonth.year;
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const currentCursor: MonthCursor = { year: currentYear, month };
    const previousCursor: MonthCursor = { year: previousYear, month };
    const currentStart = getMonthStart(currentCursor, mode);
    const currentEnd = getMonthEnd(currentCursor, mode);
    const previousStart = getMonthStart(previousCursor, mode);
    const previousEnd = getMonthEnd(previousCursor, mode);
    const currentVisibleEnd = clampEnd(currentStart, currentEnd, selectedDate);
    const previousVisibleEnd = clampEnd(
      previousStart,
      previousEnd,
      previousAnchor,
    );
    return createDatum(
      getMonthLabel(currentCursor, mode),
      currentStart,
      currentEnd,
      previousStart,
      currentVisibleEnd,
      previousVisibleEnd,
      currentVisibleEnd ?? currentEnd,
      sourceSales,
    );
  });
}

function buildCustomChart(
  customRange: DateRange,
  mode: CalendarMode,
  sourceSales: SaleRecord[],
): SalesChartDatum[] {
  const duration = Math.max(
    1,
    daysBetween(customRange.start, customRange.end) + 1,
  );
  if (customRange.start === customRange.end) {
    const previousDate = addDays(customRange.start, -1);
    return [
      createDatum(
        getDateLabel(customRange.start, mode, false),
        customRange.start,
        customRange.end,
        previousDate,
        customRange.end,
        previousDate,
        customRange.end,
        sourceSales,
      ),
    ];
  }
  const bucketCount = Math.min(8, Math.max(3, Math.ceil(duration / 5)));
  return Array.from({ length: bucketCount }, (_, index) => {
    const offsetStart = Math.floor((index * duration) / bucketCount);
    const offsetEnd = Math.floor(((index + 1) * duration) / bucketCount) - 1;
    const start = addDays(customRange.start, offsetStart);
    const end = addDays(customRange.start, Math.max(offsetStart, offsetEnd));
    const previousStart = addDays(start, -duration);
    const previousEnd = addDays(end, -duration);
    return createDatum(
      getDateLabel(start, mode, false),
      start,
      end,
      previousStart,
      end,
      previousEnd,
      end,
      sourceSales,
    );
  });
}

export function getSalesChartData(
  period: SalesPeriod,
  selectedDate: DateKey,
  mode: CalendarMode,
  customRange: DateRange,
  sourceSales: SaleRecord[] = sampleSales,
): SalesChartDatum[] {
  switch (period) {
    case "daily":
      return buildDailyChart(selectedDate, mode, sourceSales);
    case "weekly":
      return buildWeeklyChart(selectedDate, sourceSales);
    case "monthly":
      return buildMonthlyChart(selectedDate, mode, sourceSales);
    case "yearly":
      return buildYearlyChart(selectedDate, mode, sourceSales);
    case "custom":
      return buildCustomChart(customRange, mode, sourceSales);
  }
}

export function getSelectedChartIndex(
  chartData: SalesChartDatum[],
  selectedDate: DateKey,
): number {
  const selected = chartData.findIndex(
    (point) =>
      compareDateKeys(selectedDate, point.startDate) >= 0 &&
      compareDateKeys(selectedDate, point.endDate) <= 0,
  );
  return selected >= 0 ? selected : Math.max(0, chartData.length - 1);
}

export function getSelectedDateSummary(dateKey: DateKey): {
  sales: number;
  count: number;
  cashReceived: number;
} {
  const dateSales = getSampleSalesForDate(dateKey);
  return {
    sales: dateSales.reduce((total, sale) => total + sale.amount, 0),
    count: dateSales.length,
    cashReceived: getSampleCashReceivedForDate(dateKey),
  };
}

export function getExpenseRange(
  period: ExpensePeriod,
  selectedDate: DateKey,
  mode: CalendarMode,
): DateRange {
  if (period === "last30")
    return { start: addDays(selectedDate, -29), end: selectedDate };
  if (period === "month") {
    return {
      start: getMonthStart(getMonthCursor(selectedDate, mode), mode),
      end: selectedDate,
    };
  }
  return { start: getYearStart(selectedDate, mode), end: selectedDate };
}

export function getExpenseSummary(
  period: ExpensePeriod,
  selectedDate: DateKey,
  mode: CalendarMode,
  sourceExpenses: ExpenseRecord[] = sampleExpenses,
  sourceCategories: Array<{
    id: ExpenseCategoryId;
    label: string;
    color: string;
  }> = expenseCategories,
): ExpenseSummary {
  const range = getExpenseRange(period, selectedDate, mode);
  const records = getExpenseRecords(range.start, range.end, sourceExpenses);
  const total = records.reduce((sum, expense) => sum + expense.amount, 0);
  const categories = sourceCategories
    .map((category) => {
      const amount = records
        .filter((expense) => expense.categoryId === category.id)
        .reduce((sum, expense) => sum + expense.amount, 0);
      return {
        ...category,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
      };
    })
    .filter((category) => category.amount > 0)
    .sort((left, right) => right.amount - left.amount);
  return { total, categories, range };
}

export function getTopExpenseInsight(summary: ExpenseSummary): string {
  const top = summary.categories[0];
  if (!top) return "در این بازه هزینهٔ جاری ثبت نشده است.";
  if (summary.categories.length === 1)
    return `تمام هزینه‌های این بازه در دستهٔ ${top.label} ثبت شده است.`;
  return `بیشترین سهم هزینه مربوط به ${top.label} است (${new Intl.NumberFormat(
    "fa-IR",
    {
      maximumFractionDigits: 0,
    },
  ).format(top.percentage)}٪).`;
}

export function getSalesInsight(summary: SalesSummary): string {
  if (summary.percentChange === null)
    return "برای این بازه هنوز دادهٔ مقایسه‌ای کافی وجود ندارد.";
  const change = new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 1,
  }).format(Math.abs(summary.percentChange));
  if (summary.percentChange > 0)
    return `فروش این بازه ${change}٪ نسبت به بازهٔ مشابه قبل رشد داشته است.`;
  if (summary.percentChange < 0)
    return `فروش این بازه ${change}٪ نسبت به بازهٔ مشابه قبل کاهش داشته است.`;
  return "فروش این بازه با دورهٔ مشابه قبل برابر است.";
}

export function getTotalForRange(
  range: DateRange,
  mode: "sales" | "expenses",
  sourceSales: SaleRecord[] = sampleSales,
  sourceExpenses: ExpenseRecord[] = sampleExpenses,
): number {
  if (mode === "sales") return sumSales(range.start, range.end, sourceSales);
  return getExpenseRecords(range.start, range.end, sourceExpenses).reduce(
    (total, expense) => total + expense.amount,
    0,
  );
}

export function getExpenseRecordCount(
  range: DateRange,
  sourceExpenses: ExpenseRecord[] = sampleExpenses,
): number {
  return sourceExpenses.filter(
    (expense) =>
      compareDateKeys(expense.date, range.start) >= 0 &&
      compareDateKeys(expense.date, range.end) <= 0,
  ).length;
}

export function getLowStockProducts(
  sourceProducts: ProductRecord[] = sampleProducts,
): ProductRecord[] {
  return sourceProducts.filter(
    (product) => product.stock <= product.minimumStock,
  );
}
