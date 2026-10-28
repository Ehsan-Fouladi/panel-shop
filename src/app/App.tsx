import { Toaster } from "sileo";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { DashboardLayout } from "@/app/layouts/DashboardLayout";
import { StorageErrorNotifier } from "@/app/providers/StorageErrorNotifier";
import { ThemeProvider } from "@/app/providers/ThemeProvider";
import { CashRegisterPage } from "@/pages/cash-register/CashRegisterPage";
import { CreditBookPage } from "@/pages/credit-book/CreditBookPage";
import { CampaignsPage, CrmPage } from "@/pages/crm/CrmPages";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { ExpensesPage, NewExpensePage } from "@/pages/expenses/ExpensesPage";
import { FinancialsPage } from "@/pages/financials/FinancialsPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import {
  ProductDetailPage,
  ProductFormPage,
  ProductsPage,
} from "@/pages/products/ProductsPages";
import {
  NewPurchasePage,
  PurchaseDetailPage,
  PurchasesPage,
} from "@/pages/purchases/PurchasePages";
import { ReportsPage } from "@/pages/reports/ReportsPage";
import { ReturnsPage } from "@/pages/returns/ReturnsPage";
import {
  NewSalePage,
  SaleDetailPage,
  SalesPage,
} from "@/pages/sales/SalesPages";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { StockMovementsPage } from "@/pages/stock-movements/StockMovementsPage";
import {
  SupplierDetailPage,
  SupplierFormPage,
  SuppliersPage,
} from "@/pages/suppliers/SuppliersPages";

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route
              path="products/new"
              element={<ProductFormPage mode="create" />}
            />
            <Route path="products/:id" element={<ProductDetailPage />} />
            <Route
              path="products/:id/edit"
              element={<ProductFormPage mode="edit" />}
            />
            <Route path="sales" element={<SalesPage />} />
            <Route path="sales/new" element={<NewSalePage />} />
            <Route path="sales/:id" element={<SaleDetailPage />} />
            <Route path="purchases" element={<PurchasesPage />} />
            <Route path="purchases/new" element={<NewPurchasePage />} />
            <Route path="purchases/:id" element={<PurchaseDetailPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="suppliers/new" element={<SupplierFormPage />} />
            <Route path="suppliers/:id" element={<SupplierDetailPage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="expenses/new" element={<NewExpensePage />} />
            <Route path="financials" element={<FinancialsPage />} />
            <Route path="credit-book" element={<CreditBookPage />} />
            <Route path="crm" element={<CrmPage />} />
            <Route path="crm/campaigns" element={<CampaignsPage />} />
            <Route path="stock-movements" element={<StockMovementsPage />} />
            <Route path="cash-register" element={<CashRegisterPage />} />
            <Route path="returns" element={<ReturnsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="not-found" element={<NotFoundPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          <Route path="/not-found" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate replace to="/not-found" />} />
        </Routes>
        <StorageErrorNotifier />
        <Toaster position="top-center" theme="system" />
      </BrowserRouter>
    </ThemeProvider>
  );
}
