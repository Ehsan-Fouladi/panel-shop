import {
  ArrowUpLeft,
  Box,
  ChartNoAxesCombined,
  ClipboardList,
  Lightbulb,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProductRecord, SaleRecord } from "@/data/dashboard-data";
import { getSalesInsight, type SalesSummary } from "@/lib/dashboard-metrics";
import { type CalendarMode, type DateKey, getDateLabel } from "@/lib/date";
import { formatCount, formatCurrency } from "@/lib/formatters";

interface BusinessInsightsCardProps {
  selectedDate: DateKey;
  calendarMode: CalendarMode;
  salesSummary: SalesSummary;
  lowStockProducts: ProductRecord[];
  dateSales: SaleRecord[];
}

type InsightDetails = "stock" | "daily-sales" | "overview" | null;

export function BusinessInsightsCard({
  selectedDate,
  calendarMode,
  salesSummary,
  lowStockProducts,
  dateSales,
}: BusinessInsightsCardProps) {
  const [dialogType, setDialogType] = useState<InsightDetails>(null);
  const salesInsight = getSalesInsight(salesSummary);
  const lowStockMessage = lowStockProducts.length
    ? `${formatCount(lowStockProducts.length)} کالا به حداقل موجودی رسیده یا از آن پایین‌تر است.`
    : "موجودی فعلی کالاها از حداقل تعریف‌شده پایین‌تر نیست.";

  const dialogTitle =
    dialogType === "stock"
      ? "کالاهای نیازمند بررسی"
      : dialogType === "daily-sales"
        ? "فروش‌های روز انتخاب‌شده"
        : "خلاصهٔ بینش کسب‌وکار";

  return (
    <Card
      dir="rtl"
      className="panel-card insights-card flex min-h-[305px] min-w-0 flex-col gap-3 rounded-[22px] border border-border bg-card p-4 shadow-card sm:p-5"
    >
      <div className="lower-card-header flex min-w-0 items-start justify-between gap-3">
        <div className="lower-card-heading flex min-w-0 items-center gap-2.5">
          <span className="lower-card-icon grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-foreground">
            <Lightbulb aria-hidden="true" size={17} />
          </span>
          <div className="lower-card-title-block min-w-0 grid gap-0.5">
            <h2 className="lower-card-title text-sm font-semibold text-foreground">
              بینش کسب‌وکار
            </h2>
            <span className="lower-card-caption text-[10px] leading-4 text-muted-foreground">
              بر پایهٔ داده‌های ثبت‌شده
            </span>
          </div>
        </div>
        <Button
          aria-label="نمایش جزئیات بینش کسب‌وکار"
          className="h-8 w-8 rounded-full"
          onClick={() => setDialogType("overview")}
          variant="icon"
          size="icon-sm"
        >
          <ArrowUpLeft aria-hidden="true" size={14} />
        </Button>
      </div>

      <div className="insight-message rounded-xl border border-border bg-card-raised/45 p-3">
        <div className="insight-message-label mb-1.5 flex items-center gap-2 text-xs font-medium text-foreground">
          <ChartNoAxesCombined aria-hidden="true" size={14} />
          خلاصهٔ عملکرد فروش
        </div>
        <p className="insight-message-copy text-xs leading-5 text-muted-foreground">
          {salesInsight} {lowStockMessage}
        </p>
      </div>

      <div className="insight-stats grid grid-cols-2 gap-2">
        <button
          className="insight-stat grid min-w-0 gap-1 rounded-xl border border-border bg-card-raised/50 p-3 text-start transition-colors hover:border-border-strong hover:bg-muted/50"
          onClick={() => setDialogType("stock")}
          type="button"
        >
          <span className="insight-stat-icon grid h-7 w-7 place-items-center rounded-lg bg-muted text-muted-foreground">
            <Box aria-hidden="true" size={14} />
          </span>
          <span className="insight-stat-title text-[10px] leading-4 text-muted-foreground">
            کالای کم‌موجود
          </span>
          <span className="insight-stat-value-row flex items-center justify-between gap-1">
            <strong className="insight-stat-value text-lg font-semibold tabular-nums text-foreground">
              {formatCount(lowStockProducts.length)}
            </strong>
            <span
              className={`insight-stat-note rounded-full bg-warning/10 px-2 py-1 text-[9px] text-warning${lowStockProducts.length === 0 ? " is-positive bg-success/10 text-success" : ""}`}
            >
              {lowStockProducts.length === 0 ? "مناسب" : "بررسی"}
            </span>
          </span>
        </button>

        <button
          className="insight-stat grid min-w-0 gap-1 rounded-xl border border-border bg-card-raised/50 p-3 text-start transition-colors hover:border-border-strong hover:bg-muted/50"
          onClick={() => setDialogType("daily-sales")}
          type="button"
        >
          <span className="insight-stat-icon grid h-7 w-7 place-items-center rounded-lg bg-muted text-muted-foreground">
            <ClipboardList aria-hidden="true" size={14} />
          </span>
          <span className="insight-stat-title text-[10px] leading-4 text-muted-foreground">
            فروش در روز انتخابی
          </span>
          <span className="insight-stat-value-row flex items-center justify-between gap-1">
            <strong className="insight-stat-value text-lg font-semibold tabular-nums text-foreground">
              {formatCount(dateSales.length)}
            </strong>
            <span className="insight-stat-note rounded-full bg-warning/10 px-2 py-1 text-[9px] text-warning is-positive bg-success/10 text-success">
              فاکتور
            </span>
          </span>
        </button>
      </div>

      <div className="insight-footer mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
        <span className="insight-footer-note text-[10px] text-muted-foreground">
          تاریخ مرجع: {getDateLabel(selectedDate, calendarMode, false)}
        </span>
        <Button
          className="insight-action h-8"
          onClick={() => setDialogType("overview")}
          variant="outline"
          size="sm"
        >
          جزئیات
          <ArrowUpLeft aria-hidden="true" size={12} />
        </Button>
      </div>

      <Dialog
        open={dialogType !== null}
        onOpenChange={(open) => !open && setDialogType(null)}
      >
        <DialogContent>
          <div className="dialog-heading mb-4 space-y-1 pe-7 text-right">
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              {dialogType === "daily-sales"
                ? `فاکتورهای ${getDateLabel(selectedDate, calendarMode, true)}`
                : "مقادیر بر پایهٔ داده‌های ثبت‌شدهٔ فروشگاه محاسبه شده‌اند."}
            </DialogDescription>
          </div>
          {dialogType === "stock" ? (
            <div className="insight-dialog-list grid max-h-[60vh] gap-2 overflow-y-auto pe-1">
              {lowStockProducts.length > 0 ? (
                lowStockProducts.map((product) => (
                  <div
                    className="insight-dialog-item flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card-raised/60 p-3"
                    key={product.id}
                  >
                    <span className="insight-dialog-item-copy grid min-w-0 flex-1 gap-1">
                      <span className="insight-dialog-item-title text-sm font-medium text-foreground">
                        {product.name}
                      </span>
                      <span className="insight-dialog-item-caption text-[11px] leading-5 text-muted-foreground">
                        کد {product.sku} · حداقل موجودی{" "}
                        {formatCount(product.minimumStock)} {product.unit}
                      </span>
                    </span>
                    <strong className="insight-dialog-item-value text-sm font-semibold tabular-nums text-foreground">
                      {formatCount(product.stock)} {product.unit}
                    </strong>
                  </div>
                ))
              ) : (
                <p className="notification-empty rounded-xl border border-dashed border-border px-4 py-5 text-center text-xs leading-6 text-muted-foreground">
                  در حال حاضر کالایی زیر حداقل موجودی نیست.
                </p>
              )}
            </div>
          ) : dialogType === "daily-sales" ? (
            <div className="insight-dialog-list grid max-h-[60vh] gap-2 overflow-y-auto pe-1">
              {dateSales.length > 0 ? (
                dateSales.map((sale) => (
                  <div
                    className="insight-dialog-item flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card-raised/60 p-3"
                    key={sale.id}
                  >
                    <span className="insight-dialog-item-copy grid min-w-0 flex-1 gap-1">
                      <span className="insight-dialog-item-title text-sm font-medium text-foreground">
                        {sale.reference} · {sale.customerName}
                      </span>
                      <span className="insight-dialog-item-caption text-[11px] leading-5 text-muted-foreground">
                        {sale.productName} · {sale.itemCount} قلم
                      </span>
                    </span>
                    <strong className="insight-dialog-item-value text-sm font-semibold tabular-nums text-foreground">
                      {formatCurrency(sale.amount)}
                    </strong>
                  </div>
                ))
              ) : (
                <p className="notification-empty rounded-xl border border-dashed border-border px-4 py-5 text-center text-xs leading-6 text-muted-foreground">
                  در این روز فروش ثبت نشده است.
                </p>
              )}
            </div>
          ) : (
            <div className="insight-dialog-list grid max-h-[60vh] gap-2 overflow-y-auto pe-1">
              <div className="insight-dialog-item flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card-raised/60 p-3">
                <span className="insight-dialog-item-copy grid min-w-0 flex-1 gap-1">
                  <span className="insight-dialog-item-title text-sm font-medium text-foreground">
                    مقایسهٔ فروش
                  </span>
                  <span className="insight-dialog-item-caption text-[11px] leading-5 text-muted-foreground">
                    مجموع دورهٔ جاری در برابر دورهٔ مشابه
                  </span>
                </span>
                <strong className="insight-dialog-item-value text-sm font-semibold tabular-nums text-foreground">
                  {formatCurrency(salesSummary.total)}
                </strong>
              </div>
              <div className="insight-dialog-item flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card-raised/60 p-3">
                <span className="insight-dialog-item-copy grid min-w-0 flex-1 gap-1">
                  <span className="insight-dialog-item-title text-sm font-medium text-foreground">
                    کالاهای کم‌موجود
                  </span>
                  <span className="insight-dialog-item-caption text-[11px] leading-5 text-muted-foreground">
                    موجودی برابر یا پایین‌تر از حداقل تعریف‌شده
                  </span>
                </span>
                <strong className="insight-dialog-item-value text-sm font-semibold tabular-nums text-foreground">
                  {formatCount(lowStockProducts.length)}
                </strong>
              </div>
              <p className="record-dialog-note rounded-xl bg-muted/60 px-3 py-2 text-xs leading-6 text-muted-foreground">
                {salesInsight} {lowStockMessage}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
