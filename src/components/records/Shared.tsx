import { faIR } from "@doranjs/core";
import { DoranDatePicker } from "@doranjs/react";
import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import { Badge } from "@/components/ui/badge";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TransactionStatus } from "@/data/dashboard-data";
import type { CalendarMode, DateKey } from "@/lib/date";
import { dateKeyFromDoran, getDateLabel, toDoranDate } from "@/lib/date";
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
} from "@/lib/formatters";
import { paymentMethodLabel } from "@/lib/retail-data";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/types/retail";

export function StatusBadge({ status }: { status: TransactionStatus }) {
  const label =
    status === "completed"
      ? "تسویه‌شده"
      : status === "partial"
        ? "پرداخت جزئی"
        : "در انتظار پرداخت";
  const variant =
    status === "completed"
      ? "success"
      : status === "partial"
        ? "warning"
        : "danger";
  return <Badge variant={variant}>{label}</Badge>;
}

export function InventoryStatus({
  stock,
  minimumStock,
}: {
  stock: number;
  minimumStock: number;
}) {
  if (stock <= 0) return <Badge variant="danger">ناموجود</Badge>;
  if (stock <= minimumStock) return <Badge variant="warning">کم‌موجود</Badge>;
  return <Badge variant="success">موجود</Badge>;
}

export function MetricCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "neutral" | "positive" | "warning" | "negative";
  icon?: ReactNode;
}) {
  const toneClasses = {
    neutral: "border-border bg-card",
    positive:
      "border-success/25 bg-success/5 [&_.metric-tile-icon]:bg-success/10 [&_.metric-tile-icon]:text-success",
    warning:
      "border-warning/25 bg-warning/5 [&_.metric-tile-icon]:bg-warning/10 [&_.metric-tile-icon]:text-warning",
    negative:
      "border-destructive/25 bg-destructive/5 [&_.metric-tile-icon]:bg-destructive/10 [&_.metric-tile-icon]:text-destructive",
  }[tone];

  return (
    <section
      className={cn(
        "metric-tile grid min-w-0 gap-2 rounded-2xl border p-4 shadow-card",
        `is-${tone}`,
        toneClasses,
      )}
      data-tone={tone}
    >
      <div className="metric-tile-top flex min-w-0 items-center justify-between gap-3">
        <span className="metric-tile-label text-xs font-medium text-muted-foreground">
          {label}
        </span>
        {icon && (
          <span className="metric-tile-icon grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
            {icon}
          </span>
        )}
      </div>
      <strong className="metric-tile-value block break-words text-xl font-semibold leading-tight tabular-nums text-foreground sm:text-2xl">
        {typeof value === "number" ? formatNumber(value) : value}
      </strong>
      {hint && (
        <span className="metric-tile-hint text-[11px] leading-5 text-muted-foreground">
          {hint}
        </span>
      )}
    </section>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="workspace-empty-state flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center">
      <span
        className="workspace-empty-mark grid h-12 w-12 place-items-center rounded-full bg-muted text-xl font-semibold text-muted-foreground"
        aria-hidden="true"
      >
        ···
      </span>
      <strong>{title}</strong>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  labelId,
  hintId,
  required = false,
  hint,
  error,
  children,
  className = "",
}: {
  label: string;
  htmlFor?: string;
  labelId?: string;
  hintId?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  const errorId = error
    ? `${htmlFor ?? labelId ?? "form-field"}-error`
    : undefined;
  const childProps = isValidElement(children)
    ? (children.props as {
        "aria-describedby"?: string;
        "aria-invalid"?: boolean;
      })
    : undefined;
  const existingDescriptions = childProps?.["aria-describedby"]
    ?.split(/\s+/)
    .filter(Boolean)
    .filter((id) => !(error && id === hintId));
  const describedBy = childProps
    ? [
        ...(existingDescriptions ?? []),
        error ? errorId : hint ? hintId : undefined,
      ]
        .filter(Boolean)
        .join(" ") || undefined
    : undefined;
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : childProps?.["aria-invalid"],
      })
    : children;

  return (
    <div
      className={`form-field flex min-w-0 flex-col gap-1.5 ${className}`.trim()}
    >
      <label
        className="form-field-label text-xs font-medium text-muted-foreground"
        htmlFor={htmlFor}
        id={labelId}
      >
        {label}
        {required && (
          <>
            <span
              aria-hidden="true"
              className="form-required ms-1 text-destructive"
            >
              *
            </span>
            <span className="sr-only"> الزامی</span>
          </>
        )}
      </label>
      {control}
      {hint && !error && (
        <span
          className="form-field-hint text-[11px] leading-5 text-muted-foreground"
          id={hintId}
        >
          {hint}
        </span>
      )}
      {error && (
        <span
          className="form-field-error text-xs leading-5 text-destructive"
          id={errorId}
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  );
}

export function DateField({
  id,
  label,
  value,
  onChange,
  mode,
  required = false,
  error,
}: {
  id: string;
  label: string;
  value: DateKey;
  onChange: (value: DateKey) => void;
  mode: CalendarMode;
  required?: boolean;
  error?: string;
}) {
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );

  useEffect(() => {
    const pickerRoot = document.getElementById(id);
    setPortalContainer(
      pickerRoot?.closest<HTMLElement>('[role="dialog"]') ?? null,
    );
  }, [id]);

  return (
    <Field
      className="date-field"
      label={label}
      labelId={`${id}-label`}
      hintId={`${id}-date-hint`}
      required={required}
      hint={datePreview(value, mode)}
      error={error}
    >
      <DoranDatePicker
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-date-hint`}
        className="w-full"
        classNames={{
          root: "w-full min-w-0",
          trigger:
            "min-h-10 w-full rounded-xl border border-input bg-control px-3 text-sm text-foreground",
          input:
            "min-w-0 flex-1 bg-transparent font-sans text-sm text-foreground outline-none placeholder:text-muted-foreground",
          icon: "text-muted-foreground transition-colors hover:text-foreground",
          popover: "z-[80] max-w-[calc(100vw-16px)]",
          calendar:
            "rounded-2xl border border-border bg-popover shadow-popover",
        }}
        format="YYYY/MM/DD"
        id={id}
        locale={faIR}
        mode="auto"
        portalContainer={portalContainer}
        onChange={(date) => onChange(date ? dateKeyFromDoran(date) : "")}
        placeholder="انتخاب تاریخ شمسی"
        required={required}
        value={value ? toDoranDate(value) : null}
      />
    </Field>
  );
}

export function datePreview(value: DateKey, mode: CalendarMode): string {
  if (!value) return "تاریخی انتخاب نشده است.";
  try {
    return `${getDateLabel(value, mode, true)} · ذخیره‌سازی بر پایهٔ تاریخ میلادی`;
  } catch {
    return "تاریخ نامعتبر است.";
  }
}

export function PaymentMethodSelect({
  id,
  label = "روش پرداخت",
  value,
  onChange,
  error,
}: {
  id: string;
  label?: string;
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
  error?: string;
}) {
  return (
    <Field error={error} label={label} htmlFor={id}>
      <Select
        onValueChange={(next) => onChange(next as PaymentMethod)}
        value={value}
      >
        <SelectTrigger
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={Boolean(error)}
          id={id}
          aria-label={label}
        >
          <SelectValue placeholder="انتخاب روش پرداخت" />
        </SelectTrigger>
        <SelectContent align="start">
          <SelectItem value="cash">نقدی</SelectItem>
          <SelectItem value="card">کارت‌خوان</SelectItem>
          <SelectItem value="transfer">انتقال بانکی</SelectItem>
        </SelectContent>
      </Select>
    </Field>
  );
}

export function PaymentMethodText({ method }: { method: PaymentMethod }) {
  return <span>{paymentMethodLabel(method)}</span>;
}

export function ConfirmAction({
  title,
  description,
  confirmLabel,
  triggerLabel,
  onConfirm,
  variant = "outline",
  confirmVariant = "primary",
  triggerClassName,
  confirmClassName,
  disabled = false,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  triggerLabel: string;
  onConfirm: () => void;
  variant?: ButtonProps["variant"];
  confirmVariant?: ButtonProps["variant"];
  triggerClassName?: string;
  confirmClassName?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        className={triggerClassName}
        disabled={disabled}
        onClick={() => setOpen(true)}
        variant={variant}
        size="sm"
      >
        {triggerLabel}
      </Button>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent>
          <div className="dialog-heading mb-4 space-y-1 pe-7 text-right">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </div>
          <div className="dialog-actions mt-4 flex flex-wrap items-center gap-2 border-t border-border/70 pt-4">
            <Button onClick={() => setOpen(false)} variant="outline">
              انصراف
            </Button>
            <Button
              onClick={() => {
                onConfirm();
                setOpen(false);
              }}
              className={confirmClassName}
              variant={confirmVariant}
            >
              {confirmLabel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function Amount({
  value,
  compact = false,
}: {
  value: number;
  compact?: boolean;
}) {
  return (
    <span className="amount-value">
      {compact ? formatCompactCurrency(value) : formatCurrency(value)}
    </span>
  );
}
