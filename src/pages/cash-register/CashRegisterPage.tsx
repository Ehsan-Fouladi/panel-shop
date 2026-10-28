import { LockKeyhole, UnlockKeyhole } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/records/SectionCard";
import { EmptyState, Field, MetricCard } from "@/components/records/Shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getDateLabel, getTodayDateKey } from "@/lib/date";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { notifyPersistedMutation } from "@/lib/persistence-feedback";
import { getCashMovementLabel, getCashTotals } from "@/lib/retail-data";
import { useAppStore } from "@/store/app-store";
import { useRetailStore } from "@/store/retail-store";
import type { CashMovementRecord, CashSessionRecord } from "@/types/retail";

function movementsForSession(
  movements: CashMovementRecord[],
  session: CashSessionRecord | undefined,
  endDate = getTodayDateKey(),
) {
  if (!session) return [];
  return movements.filter(
    (movement) =>
      movement.date >= session.openedAt &&
      movement.date <= endDate &&
      !(
        movement.date === session.openedAt && movement.time < session.openedTime
      ),
  );
}

export function CashRegisterPage() {
  const sessions = useRetailStore((state) => state.cashSessions);
  const movements = useRetailStore((state) => state.cashMovements);
  const calendarMode = useAppStore((state) => state.calendarMode);
  const openCashSession = useRetailStore((state) => state.openCashSession);
  const closeCashSession = useRetailStore((state) => state.closeCashSession);
  const today = getTodayDateKey();
  const currentSession = sessions.find((session) => !session.closedAt);
  const currentMovements = useMemo(
    () => movementsForSession(movements, currentSession, today),
    [currentSession, movements, today],
  );
  const totals = getCashTotals(currentMovements);
  const expected = (currentSession?.openingAmount ?? 0) + totals.net;
  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const openForm = useForm<{ openingAmount: number }>({
    defaultValues: { openingAmount: 0 },
  });
  const closeForm = useForm<{ actualAmount: number }>({
    defaultValues: { actualAmount: expected },
  });
  const actualAmount =
    useWatch({ control: closeForm.control, name: "actualAmount" }) ?? expected;
  const openShift = openForm.handleSubmit(({ openingAmount }) => {
    openForm.clearErrors("root");
    const result = openCashSession(openingAmount, getTodayDateKey());
    if (!result.ok) {
      openForm.setError("root", { type: "business", message: result.error });
      return;
    }
    notifyPersistedMutation("نوبت صندوق باز شد.");
    setOpenDialog(false);
    openForm.reset({ openingAmount: 0 });
  });
  const closeShift = closeForm.handleSubmit(({ actualAmount }) => {
    closeForm.clearErrors("root");
    const result = closeCashSession(actualAmount, getTodayDateKey());
    if (!result.ok) {
      closeForm.setError("root", { type: "business", message: result.error });
      return;
    }
    notifyPersistedMutation(
      `صندوق بسته شد؛ اختلاف ${formatCurrency(result.value.difference ?? 0)}.`,
    );
    setCloseDialog(false);
  });
  const history = sessions.filter((session) => session.closedAt);
  return (
    <div className="workspace-page mx-auto grid w-full max-w-[1560px] min-w-0 content-start gap-4 p-4 sm:gap-5 sm:p-5 xl:p-6">
      <PageHeader
        title="صندوق فروشگاه"
        description="تطبیق پول نقد واقعی با پرداخت‌های نقدی ثبت‌شده؛ فروش کارت‌خوان و انتقال بانکی در صندوق نقدی شمرده نمی‌شود."
        action={
          currentSession ? (
            <Button
              onClick={() => {
                closeForm.reset({ actualAmount: expected });
                setCloseDialog(true);
              }}
              variant="primary"
            >
              <LockKeyhole aria-hidden="true" size={15} /> بستن نوبت
            </Button>
          ) : (
            <Button
              onClick={() => {
                openForm.reset({ openingAmount: 0 });
                setOpenDialog(true);
              }}
              variant="primary"
            >
              <UnlockKeyhole aria-hidden="true" size={15} /> باز کردن صندوق
            </Button>
          )
        }
      />
      <div className="metric-grid grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
        <MetricCard
          label="موجودی آغازین"
          value={formatCurrency(
            currentSession?.openingAmount ?? history[0]?.actualClosing ?? 0,
          )}
          hint={
            currentSession
              ? `نوبت از ${getDateLabel(currentSession.openedAt, calendarMode, true)}`
              : "آخرین ماندهٔ شمارش‌شده"
          }
        />
        <MetricCard
          label="ورودی نقدی"
          value={formatCurrency(totals.inflows)}
          tone="positive"
          hint="فروش و وصول طلب"
        />
        <MetricCard
          label="خروجی نقدی"
          value={formatCurrency(totals.outflows)}
          tone="warning"
          hint="هزینه، خرید، تسویه و بازپرداخت"
        />
        <MetricCard
          label="موجودی موردانتظار"
          value={formatCurrency(
            currentSession ? expected : (history[0]?.expectedClosing ?? 0),
          )}
          tone="positive"
          hint={currentSession ? "محاسبه از ثبت‌های صندوق" : "صندوق بسته است"}
        />
      </div>
      {currentSession ? (
        <div className="data-note rounded-xl border border-info/20 bg-info/5 px-3 py-2 text-xs leading-6 text-muted-foreground">
          <span>
            نوبت باز ·{" "}
            {getDateLabel(currentSession.openedAt, calendarMode, true)}، ساعت{" "}
            {currentSession.openedTime}
          </span>
          <p>
            انتظار صندوق = موجودی آغازین + ورودی نقدی − خروجی نقدی. این محاسبه
            فقط رویدادهای با روش «نقدی» را در نظر می‌گیرد.
          </p>
        </div>
      ) : (
        <div className="data-note rounded-xl border border-info/20 bg-info/5 px-3 py-2 text-xs leading-6 text-muted-foreground">
          <span>صندوق بسته است</span>
          <p>
            برای آغاز نوبت جدید، مبلغ واقعی آغازین را وارد کنید. باز و بسته کردن
            نوبت هیچ فروش یا هزینهٔ جدیدی ایجاد نمی‌کند.
          </p>
        </div>
      )}
      <div className="workspace-two-column grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <SectionCard
          title="گردش نقدی نوبت"
          description={
            currentSession
              ? `${formatNumber(currentMovements.length)} رویداد از زمان بازشدن`
              : "گردش نوبت باز وجود ندارد."
          }
        >
          {currentMovements.length ? (
            <div className="data-table-scroll min-w-0 overflow-x-auto rounded-2xl border border-border">
              <table className="data-table w-full min-w-[680px] border-collapse text-right text-sm [&_thead]:bg-muted/60 [&_th]:whitespace-nowrap [&_th]:px-3 [&_th]:py-3 [&_th]:text-right [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground [&_tbody_tr]:border-t [&_tbody_tr]:border-border/70 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-muted/30 [&_td]:px-3 [&_td]:py-3 [&_td]:align-middle">
                <thead>
                  <tr>
                    <th>زمان</th>
                    <th>نوع رویداد</th>
                    <th>شرح</th>
                    <th>ورودی/خروجی</th>
                    <th>مبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {currentMovements.map((movement) => (
                    <tr key={movement.id}>
                      <td>
                        {getDateLabel(movement.date, calendarMode, true)}
                        <span className="table-subline mt-1 block text-[11px] leading-4 text-muted-foreground">
                          {movement.time}
                        </span>
                      </td>
                      <td>{getCashMovementLabel(movement)}</td>
                      <td>{movement.description}</td>
                      <td>{movement.direction === "in" ? "ورودی" : "خروجی"}</td>
                      <td
                        className={
                          movement.direction === "in"
                            ? "positive-text font-medium text-success"
                            : "negative-text font-medium text-destructive"
                        }
                      >
                        {movement.direction === "in" ? "+" : "−"}
                        {formatCurrency(movement.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title={
                currentSession
                  ? "هنوز رویداد نقدی نیست"
                  : "نوبت بازی وجود ندارد"
              }
              description={
                currentSession
                  ? "فروش یا پرداخت نقدی در این نوبت اینجا ثبت می‌شود."
                  : "پس از بازکردن صندوق، گردش جدید نمایش داده می‌شود."
              }
            />
          )}
        </SectionCard>
        <SectionCard
          title="تطبیق صندوق"
          description="فروش با درآمد یکی نیست؛ فقط وجوه نقد ثبت‌شده در این محاسبه لحاظ می‌شود."
        >
          <div className="cash-reconciliation grid gap-3 rounded-2xl border border-border bg-card-raised/50 p-4 sm:grid-cols-2">
            <div>
              <span>موجودی آغازین</span>
              <strong>
                {formatCurrency(currentSession?.openingAmount ?? 0)}
              </strong>
            </div>
            <div>
              <span>ورودی نقدی</span>
              <strong className="positive-text font-medium text-success">
                + {formatCurrency(totals.inflows)}
              </strong>
            </div>
            <div>
              <span>خروجی نقدی</span>
              <strong className="negative-text font-medium text-destructive">
                − {formatCurrency(totals.outflows)}
              </strong>
            </div>
            <div className="cash-reconciliation-total flex items-center justify-between gap-3 border-t border-border pt-3 font-semibold tabular-nums sm:col-span-2">
              <span>ماندهٔ موردانتظار</span>
              <strong>{formatCurrency(currentSession ? expected : 0)}</strong>
            </div>
            {!currentSession && (
              <p>برای مشاهدهٔ تطبیق زنده، یک نوبت جدید باز کنید.</p>
            )}
          </div>
        </SectionCard>
      </div>
      <SectionCard
        title="نوبت‌های بسته‌شده"
        description="موجودی موردانتظار با عدد شمارش‌شده مقایسه شده است."
      >
        {history.length ? (
          <div className="data-table-scroll min-w-0 overflow-x-auto rounded-2xl border border-border">
            <table className="data-table w-full min-w-[680px] border-collapse text-right text-sm [&_thead]:bg-muted/60 [&_th]:whitespace-nowrap [&_th]:px-3 [&_th]:py-3 [&_th]:text-right [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground [&_tbody_tr]:border-t [&_tbody_tr]:border-border/70 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-muted/30 [&_td]:px-3 [&_td]:py-3 [&_td]:align-middle">
              <thead>
                <tr>
                  <th>بازشدن</th>
                  <th>بسته‌شدن</th>
                  <th>آغازین</th>
                  <th>موردانتظار</th>
                  <th>شمارش واقعی</th>
                  <th>اختلاف</th>
                </tr>
              </thead>
              <tbody>
                {history.map((session) => (
                  <tr key={session.id}>
                    <td>
                      {getDateLabel(session.openedAt, calendarMode, true)} ·{" "}
                      {session.openedTime}
                    </td>
                    <td>
                      {session.closedAt
                        ? getDateLabel(session.closedAt, calendarMode, true)
                        : "—"}{" "}
                      {session.closedTime}
                    </td>
                    <td>{formatCurrency(session.openingAmount)}</td>
                    <td>{formatCurrency(session.expectedClosing ?? 0)}</td>
                    <td>{formatCurrency(session.actualClosing ?? 0)}</td>
                    <td
                      className={
                        (session.difference ?? 0) === 0
                          ? "positive-text font-medium text-success"
                          : "negative-text font-medium text-destructive"
                      }
                    >
                      {formatCurrency(session.difference ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="سابقهٔ بسته‌شدن ثبت نشده"
            description="هر نوبت بسته‌شده با اختلاف واقعی و موردانتظار در اینجا ذخیره می‌شود."
          />
        )}
      </SectionCard>
      <Dialog onOpenChange={setOpenDialog} open={openDialog}>
        <DialogContent>
          <div className="dialog-heading mb-4 space-y-1 pe-7 text-right">
            <DialogTitle>باز کردن صندوق</DialogTitle>
            <DialogDescription>
              موجودی واقعی آغاز نوبت را وارد کنید. نوبت با تاریخ جاری ثبت
              می‌شود.
            </DialogDescription>
          </div>
          <form
            className="dialog-form grid min-w-0 gap-4"
            noValidate
            onSubmit={openShift}
          >
            <Field
              error={openForm.formState.errors.openingAmount?.message}
              label="موجودی آغازین (تومان)"
              htmlFor="opening-amount"
              required
            >
              <Input
                {...openForm.register("openingAmount", {
                  valueAsNumber: true,
                  required: "موجودی آغازین باید نامنفی باشد.",
                  min: { value: 0, message: "موجودی آغازین باید نامنفی باشد." },
                  validate: (value) =>
                    (Number.isFinite(value) && value >= 0) ||
                    "موجودی آغازین باید نامنفی باشد.",
                })}
                id="opening-amount"
                required
                type="text"
              />
            </Field>
            {openForm.formState.errors.root?.message && (
              <p
                className="form-field-error text-xs leading-5 text-destructive"
                role="alert"
              >
                {openForm.formState.errors.root.message}
              </p>
            )}
            <div className="dialog-actions flex flex-wrap items-center gap-2 border-t border-border/70 pt-4">
              <Button onClick={() => setOpenDialog(false)} variant="outline">
                انصراف
              </Button>
              <Button
                disabled={openForm.formState.isSubmitting}
                type="submit"
                variant="primary"
              >
                {openForm.formState.isSubmitting ? "در حال ثبت…" : "باز کردن"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog onOpenChange={setCloseDialog} open={closeDialog}>
        <DialogContent>
          <div className="dialog-heading mb-4 space-y-1 pe-7 text-right">
            <DialogTitle>بستن و تطبیق صندوق</DialogTitle>
            <DialogDescription>
              مبلغ موردانتظار {formatCurrency(expected)} است. شمارش واقعی را
              وارد کنید تا اختلاف ثبت شود.
            </DialogDescription>
          </div>
          <form
            className="dialog-form grid min-w-0 gap-4"
            noValidate
            onSubmit={closeShift}
          >
            <Field
              error={closeForm.formState.errors.actualAmount?.message}
              label="موجودی شمارش‌شده (تومان)"
              htmlFor="actual-amount"
              required
            >
              <Input
                {...closeForm.register("actualAmount", {
                  valueAsNumber: true,
                  required: "موجودی شمارش‌شده باید نامنفی باشد.",
                  min: {
                    value: 0,
                    message: "موجودی شمارش‌شده باید نامنفی باشد.",
                  },
                  validate: (value) =>
                    (Number.isFinite(value) && value >= 0) ||
                    "موجودی شمارش‌شده باید نامنفی باشد.",
                })}
                id="actual-amount"
                required
                type="text"
              />
            </Field>
            <div className="data-note rounded-xl border border-info/20 bg-info/5 px-3 py-2 text-xs leading-6 text-muted-foreground">
              <span>اختلاف فعلی</span>
              <p>
                {formatCurrency(
                  (Number.isFinite(actualAmount) ? actualAmount : 0) - expected,
                )}
              </p>
            </div>
            {closeForm.formState.errors.root?.message && (
              <p
                className="form-field-error text-xs leading-5 text-destructive"
                role="alert"
              >
                {closeForm.formState.errors.root.message}
              </p>
            )}
            <div className="dialog-actions flex flex-wrap items-center gap-2 border-t border-border/70 pt-4">
              <Button onClick={() => setCloseDialog(false)} variant="outline">
                انصراف
              </Button>
              <Button
                disabled={closeForm.formState.isSubmitting}
                type="submit"
                variant="primary"
              >
                {closeForm.formState.isSubmitting
                  ? "در حال ثبت…"
                  : "ثبت تطبیق و بستن"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
