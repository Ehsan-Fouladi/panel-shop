import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { DashboardLayoutContext } from "@/app/layouts/DashboardLayout";
import { BusinessInsightsCard } from "@/components/dashboard/BusinessInsightsCard";
import { CalendarCard } from "@/components/dashboard/CalendarCard";
import { ExpenseDistributionCard } from "@/components/dashboard/ExpenseDistributionCard";
import { RecentTransactionsCard } from "@/components/dashboard/RecentTransactionsCard";
import { SalesOverviewCard } from "@/components/dashboard/SalesOverviewCard";
import { expenseCategories } from "@/data/dashboard-data";
import { getSalesSummary, type SalesPeriod } from "@/lib/dashboard-metrics";
import {
  buildRetailDashboardTransactions,
  getDailySalesSummary,
  getNetSaleAmount,
} from "@/lib/retail-data";
import { useRetailStore } from "@/store/retail-store";

export function DashboardPage() {
  const {
    selectedDate,
    calendarMode,
    customRange,
    onSelectedDateChange,
    onCalendarModeChange,
    onCustomRangeChange,
    onSelectRecord,
  } = useOutletContext<DashboardLayoutContext>();
  const [salesPeriod, setSalesPeriod] = useState<SalesPeriod>("yearly");
  const retailData = useRetailStore((state) => state);
  const sales = useMemo(
    () =>
      retailData.sales.map((sale) => ({
        ...sale,
        amount: getNetSaleAmount(sale),
      })),
    [retailData.sales],
  );
  const salesSummary = useMemo(
    () =>
      getSalesSummary(
        salesPeriod,
        selectedDate,
        calendarMode,
        customRange,
        sales,
      ),
    [calendarMode, customRange, sales, salesPeriod, selectedDate],
  );
  const dateSales = useMemo(
    () => sales.filter((sale) => sale.date === selectedDate),
    [sales, selectedDate],
  );
  const lowStockProducts = useMemo(
    () =>
      retailData.products.filter(
        (product) => product.active && product.stock <= product.minimumStock,
      ),
    [retailData.products],
  );
  const dateSummary = useMemo(() => {
    const dailySales = getDailySalesSummary(retailData.sales, selectedDate);
    return {
      ...dailySales,
      cashReceived: retailData.payments
        .filter(
          (payment) =>
            payment.date === selectedDate && payment.direction === "in",
        )
        .reduce((sum, payment) => sum + payment.amount, 0),
    };
  }, [retailData.payments, retailData.sales, selectedDate]);
  const categories = useMemo(() => {
    const colorById = new Map(
      expenseCategories.map((category) => [category.id, category.color]),
    );
    return retailData.settings.expenseCategories.map((category) => ({
      ...category,
      color: colorById.get(category.id) ?? "var(--chart-7)",
    }));
  }, [retailData.settings.expenseCategories]);
  const transactions = useMemo(
    () => buildRetailDashboardTransactions(retailData),
    [retailData],
  );

  return (
    <div className="dashboard-grid mx-auto grid w-full max-w-[1560px] min-w-0 gap-3 pb-5 lg:gap-4">
      <section
        aria-label="فروش و تقویم"
        className="upper-grid grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.8fr)_minmax(280px,0.78fr)] lg:gap-4"
        dir="ltr"
      >
        <SalesOverviewCard
          calendarMode={calendarMode}
          customRange={customRange}
          onCustomRangeChange={onCustomRangeChange}
          onPeriodChange={setSalesPeriod}
          onSelectedDateChange={onSelectedDateChange}
          period={salesPeriod}
          sales={sales}
          selectedDate={selectedDate}
          summary={salesSummary}
        />
        <CalendarCard
          mode={calendarMode}
          onModeChange={onCalendarModeChange}
          onSelectedDateChange={onSelectedDateChange}
          selectedDate={selectedDate}
          summary={dateSummary}
        />
      </section>
      <section
        aria-label="بینش، هزینه‌ها و تراکنش‌ها"
        className="lower-grid grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 lg:gap-4 xl:grid-cols-3"
        dir="ltr"
      >
        <BusinessInsightsCard
          calendarMode={calendarMode}
          dateSales={dateSales}
          lowStockProducts={lowStockProducts}
          salesSummary={salesSummary}
          selectedDate={selectedDate}
        />
        <ExpenseDistributionCard
          calendarMode={calendarMode}
          categories={categories}
          expenses={retailData.expenses}
          selectedDate={selectedDate}
        />
        <RecentTransactionsCard
          calendarMode={calendarMode}
          onSelectRecord={onSelectRecord}
          transactions={transactions}
        />
      </section>
    </div>
  );
}
