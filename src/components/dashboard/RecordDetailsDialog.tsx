import {
  CircleDollarSign,
  CreditCard,
  type LucideIcon,
  PackageOpen,
  ReceiptText,
  ShoppingCart,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  RecordKind,
  SearchRecord,
  TransactionStatus,
} from "@/data/dashboard-data";
import type { CalendarMode } from "@/lib/date";
import { getDateLabel } from "@/lib/date";
import { formatCurrency } from "@/lib/formatters";

const recordIcons: Record<RecordKind, LucideIcon> = {
  product: PackageOpen,
  sale: ShoppingCart,
  purchase: ShoppingCart,
  expense: ReceiptText,
  payment: CreditCard,
  customer: UsersRound,
  supplier: CircleDollarSign,
};

const statusText: Record<TransactionStatus, string> = {
  completed: "تکمیل‌شده",
  partial: "پرداخت جزئی",
  pending: "در انتظار",
};

interface RecordDetailsDialogProps {
  record: SearchRecord | null;
  calendarMode: CalendarMode;
  onOpenChange: (open: boolean) => void;
}

export function RecordDetailsDialog({
  record,
  calendarMode,
  onOpenChange,
}: RecordDetailsDialogProps) {
  const Icon = record ? recordIcons[record.kind] : PackageOpen;

  return (
    <Dialog open={record !== null} onOpenChange={onOpenChange}>
      <DialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          document.querySelector<HTMLButtonElement>(".search-trigger")?.focus();
        }}
      >
        {record && (
          <>
            <div className="dialog-heading mb-4 space-y-1 pe-7 text-right">
              <DialogTitle>{record.title}</DialogTitle>
              <DialogDescription>
                {record.kindLabel} · جزئیات دادهٔ ثبت‌شده
              </DialogDescription>
            </div>
            <div className="record-dialog-content grid min-w-0 gap-4">
              <div className="record-dialog-summary flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card-raised p-3">
                <span className="record-dialog-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-foreground">
                  <Icon aria-hidden="true" size={18} />
                </span>
                <span className="record-dialog-copy grid min-w-0 gap-1">
                  <span className="record-dialog-title truncate text-sm font-semibold text-foreground">
                    {record.subtitle}
                  </span>
                  <span className="record-dialog-subtitle text-xs text-muted-foreground">
                    {record.dateKey
                      ? getDateLabel(record.dateKey, calendarMode, true)
                      : "رکورد کالا یا مخاطب"}
                    {record.reference ? ` · ${record.reference}` : ""}
                  </span>
                </span>
              </div>

              {(record.amount !== undefined || record.status !== undefined) && (
                <div className="record-detail-list grid gap-2 rounded-xl border border-border bg-card-raised/50 p-3">
                  {record.amount !== undefined && (
                    <div className="record-detail-row flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border/60 py-2 last:border-0 last:pb-0">
                      <span className="record-detail-label text-xs text-muted-foreground">
                        مبلغ ثبت‌شده
                      </span>
                      <strong className="record-detail-value text-sm font-semibold tabular-nums text-foreground">
                        {formatCurrency(record.amount)}
                      </strong>
                    </div>
                  )}
                  {record.status && (
                    <div className="record-detail-row flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border/60 py-2 last:border-0 last:pb-0">
                      <span className="record-detail-label text-xs text-muted-foreground">
                        وضعیت
                      </span>
                      <Badge
                        variant={
                          record.status === "completed"
                            ? "success"
                            : record.status === "partial"
                              ? "warning"
                              : "danger"
                        }
                      >
                        {statusText[record.status]}
                      </Badge>
                    </div>
                  )}
                </div>
              )}

              <div className="record-detail-list grid gap-2 rounded-xl border border-border bg-card-raised/50 p-3">
                {record.details.map((detail) => (
                  <div
                    className="record-detail-row flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border/60 py-2 last:border-0 last:pb-0"
                    key={`${record.id}-${detail.label}`}
                  >
                    <span className="record-detail-label text-xs text-muted-foreground">
                      {detail.label}
                    </span>
                    <strong className="record-detail-value text-sm font-semibold tabular-nums text-foreground">
                      {detail.value}
                    </strong>
                  </div>
                ))}
              </div>
              <p className="record-dialog-note rounded-xl bg-muted/60 px-3 py-2 text-xs leading-6 text-muted-foreground">
                این نمای سریع فقط برای مرور داده‌های نمونه است؛ گردش کار و
                ویرایش رکوردها در این فاز فعال نیست.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
