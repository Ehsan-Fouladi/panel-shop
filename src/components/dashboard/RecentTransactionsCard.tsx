import {
  ArrowDownLeft,
  ArrowUpLeft,
  CircleDollarSign,
  type LucideIcon,
  PackageOpen,
  ReceiptText,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type {
  DashboardTransaction,
  TransactionStatus,
} from "@/data/dashboard-data";
import type { CalendarMode } from "@/lib/date";
import { getDateLabel } from "@/lib/date";
import {
  formatCompactCurrency,
  formatCount,
  getCurrencyUnit,
} from "@/lib/formatters";
import { cn } from "@/lib/utils";

const transactionIcons: Record<DashboardTransaction["kind"], LucideIcon> = {
  sale: ShoppingCart,
  purchase: PackageOpen,
  expense: ReceiptText,
  payment: CircleDollarSign,
};

const statusLabels: Record<TransactionStatus, string> = {
  completed: "تکمیل‌شده",
  partial: "پرداخت جزئی",
  pending: "در انتظار",
};

interface RecentTransactionsCardProps {
  calendarMode: CalendarMode;
  onSelectRecord: (record: DashboardTransaction) => void;
  transactions: DashboardTransaction[];
}

function getTransactionName(transaction: DashboardTransaction): string {
  if (transaction.kind === "sale" || transaction.kind === "payment") {
    return transaction.subtitle.split(" · ")[0] ?? transaction.subtitle;
  }
  if (transaction.kind === "purchase") {
    return transaction.subtitle.split(" · ")[0] ?? transaction.subtitle;
  }
  return transaction.title;
}

function getTransactionReference(transaction: DashboardTransaction): string {
  if (transaction.kind === "expense") {
    return transaction.subtitle.split(" · ")[0] ?? transaction.subtitle;
  }
  return transaction.reference ?? transaction.subtitle;
}

export function RecentTransactionsCard({
  calendarMode,
  onSelectRecord,
  transactions,
}: RecentTransactionsCardProps) {
  const rows = transactions.slice(0, 5);

  return (
    <Card
      dir="rtl"
      className="panel-card transactions-card flex min-h-[305px] min-w-0 flex-col rounded-[22px] border border-border bg-card p-4 shadow-card sm:p-5 md:col-span-2 xl:col-span-1"
    >
      <div className="lower-card-header mb-3 flex min-w-0 items-start justify-between gap-3">
        <div className="lower-card-heading flex min-w-0 items-center gap-2.5">
          <span className="lower-card-icon grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-foreground">
            <Truck aria-hidden="true" size={17} />
          </span>
          <div className="lower-card-title-block min-w-0 grid gap-0.5">
            <h2 className="lower-card-title text-sm font-semibold text-foreground">
              تراکنش‌های اخیر
            </h2>
            <span className="lower-card-caption text-[10px] leading-4 text-muted-foreground">
              فروش، خرید، دریافت و هزینهٔ جاری
            </span>
          </div>
        </div>
        <span className="transactions-subtitle whitespace-nowrap pt-1 text-[10px] text-muted-foreground">
          {formatCount(rows.length)} مورد · {getCurrencyUnit()}
        </span>
      </div>

      {rows.length > 0 ? (
        <div className="transaction-list grid min-w-0 divide-y divide-border/60">
          {rows.map((transaction) => {
            const Icon = transactionIcons[transaction.kind];
            const isIncome = transaction.direction === "incoming";
            const title = `${transaction.kindLabel} · ${getTransactionName(transaction)}`;
            const description = `${getDateLabel(transaction.dateKey, calendarMode, false)} · ${getTransactionReference(transaction)}`;

            return (
              <button
                aria-label={`${title}, ${formatCompactCurrency(transaction.amount)}, ${statusLabels[transaction.status]}`}
                className="transaction-row flex w-full min-w-0 items-center justify-between gap-3 py-2 text-start transition-colors hover:bg-muted/25"
                key={`${transaction.kind}-${transaction.id}`}
                onClick={() => onSelectRecord(transaction)}
                type="button"
              >
                <span className="transaction-row-main flex min-w-0 items-center gap-2.5">
                  <span
                    className={cn(
                      "transaction-kind-icon grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground [&.is-income]:bg-success/10 [&.is-income]:text-success [&.is-outgoing]:bg-destructive/10 [&.is-outgoing]:text-destructive",
                      isIncome ? "is-income" : "is-outgoing",
                    )}
                  >
                    <Icon aria-hidden="true" size={15} />
                  </span>
                  <span className="transaction-copy grid min-w-0 gap-0.5">
                    <span className="transaction-title max-w-[210px] truncate text-xs font-medium text-foreground">
                      {title}
                    </span>
                    <span className="transaction-description max-w-[220px] truncate text-[10px] text-muted-foreground">
                      {description}
                    </span>
                  </span>
                </span>
                <span className="transaction-row-side grid shrink-0 justify-items-end gap-1">
                  <span
                    className={cn(
                      "transaction-amount inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold tabular-nums [&.is-income]:text-success [&.is-outgoing]:text-destructive",
                      isIncome ? "is-income" : "is-outgoing",
                    )}
                  >
                    {isIncome ? (
                      <ArrowDownLeft aria-hidden="true" size={11} />
                    ) : (
                      <ArrowUpLeft aria-hidden="true" size={11} />
                    )}
                    {formatCompactCurrency(transaction.amount)}
                  </span>
                  <span
                    className={`transaction-status text-[9px] text-muted-foreground [&.is-completed]:text-success [&.is-partial]:text-warning [&.is-pending]:text-muted-foreground is-${transaction.status}`}
                  >
                    {statusLabels[transaction.status]}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="transaction-empty flex min-h-28 items-center justify-center rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
          هنوز تراکنشی برای نمایش ثبت نشده است.
        </div>
      )}
    </Card>
  );
}
