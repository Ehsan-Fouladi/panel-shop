import { Edit2, Plus, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterInput } from "@/components/records/FilterInput";
import { FormActions } from "@/components/records/FormActions";
import { SectionCard } from "@/components/records/SectionCard";
import {
  DateField,
  EmptyState,
  Field,
  MetricCard,
  PaymentMethodSelect,
  StatusBadge,
} from "@/components/records/Shared";
import { Button, buttonVariants } from "@/components/ui/button";
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
import {
  getPurchaseOutstanding,
  getPurchaseStatus,
  paymentMethodLabel,
} from "@/lib/retail-data";
import { useAppStore } from "@/store/app-store";
import { type SupplierInput, useRetailStore } from "@/store/retail-store";
import type {
  PaymentMethod,
  RetailPurchase,
  RetailSupplier,
} from "@/types/retail";

const blankSupplier: SupplierInput = {
  name: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

function emailTypeMismatchRule(id: string) {
  return (value: string) => {
    if (!value) return true;
    const input = document.getElementById(id);
    return (
      !(input instanceof HTMLInputElement && input.validity.typeMismatch) ||
      "ایمیل معتبر وارد کنید."
    );
  };
}

export function SuppliersPage() {
  const suppliers = useRetailStore((state) => state.suppliers);
  const purchases = useRetailStore((state) => state.purchases);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return suppliers
      .filter(
        (supplier) =>
          supplier.active &&
          (!normalized ||
            `${supplier.name} ${supplier.phone} ${supplier.email}`
              .toLocaleLowerCase()
              .includes(normalized)),
      )
      .sort((left, right) => left.name.localeCompare(right.name, "fa"));
  }, [query, suppliers]);
  const totalPayable = purchases.reduce(
    (sum, purchase) => sum + getPurchaseOutstanding(purchase),
    0,
  );
  return (
    <div className="workspace-page mx-auto grid w-full max-w-[1560px] min-w-0 content-start gap-4 p-4 sm:gap-5 sm:p-5 xl:p-6">
      <PageHeader
        title="تأمین‌کنندگان"
        description="دفتر تأمین‌کنندگان، سوابق خرید و بدهی‌های پرداخت‌نشده."
        action={
          <Link
            className={buttonVariants({ variant: "primary" })}
            to="/suppliers/new"
          >
            <Plus aria-hidden="true" size={16} /> تأمین‌کنندهٔ جدید
          </Link>
        }
      />
      <div className="metric-grid grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
        <MetricCard label="تأمین‌کنندگان فعال" value={filtered.length} />
        <MetricCard
          label="ماندهٔ بدهی"
          value={formatCurrency(totalPayable)}
          tone={totalPayable ? "warning" : "positive"}
        />
        <MetricCard label="خریدهای مرتبط" value={purchases.length} />
        <MetricCard
          label="دارای مانده"
          value={
            purchases.filter((purchase) => getPurchaseOutstanding(purchase) > 0)
              .length
          }
          hint="سفارش‌های باز"
        />
      </div>
      <SectionCard
        title="دفتر تأمین‌کنندگان"
        description={`${formatNumber(filtered.length)} رکورد`}
      >
        <div className="list-toolbar flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card-raised/50 p-3">
          <FilterInput
            id="supplier-search"
            label="جست‌وجوی تأمین‌کننده"
            onChange={setQuery}
            placeholder="نام، شماره یا ایمیل"
            value={query}
          />
        </div>
        {filtered.length ? (
          <div className="data-table-scroll min-w-0 overflow-x-auto rounded-2xl border border-border">
            <table className="data-table w-full min-w-[680px] border-collapse text-right text-sm [&_thead]:bg-muted/60 [&_th]:whitespace-nowrap [&_th]:px-3 [&_th]:py-3 [&_th]:text-right [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground [&_tbody_tr]:border-t [&_tbody_tr]:border-border/70 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-muted/30 [&_td]:px-3 [&_td]:py-3 [&_td]:align-middle">
              <thead>
                <tr>
                  <th>تأمین‌کننده</th>
                  <th>تلفن</th>
                  <th>ایمیل</th>
                  <th>تعداد خرید</th>
                  <th>ماندهٔ بدهی</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((supplier) => {
                  const related = purchases.filter(
                    (purchase) => purchase.supplierId === supplier.id,
                  );
                  const payable = related.reduce(
                    (sum, purchase) => sum + getPurchaseOutstanding(purchase),
                    0,
                  );
                  return (
                    <tr key={supplier.id}>
                      <td>
                        <Link
                          className="table-primary-link font-medium text-primary transition-colors hover:text-primary-hover hover:underline"
                          to={`/suppliers/${supplier.id}`}
                        >
                          {supplier.name}
                        </Link>
                      </td>
                      <td>{supplier.phone || "—"}</td>
                      <td>{supplier.email || "—"}</td>
                      <td>{formatNumber(related.length)}</td>
                      <td className="numeric-cell whitespace-nowrap text-start tabular-nums">
                        {formatCurrency(payable)}
                      </td>
                      <td>
                        <Link
                          className={buttonVariants({
                            variant: "outline",
                            size: "sm",
                          })}
                          to={`/suppliers/${supplier.id}`}
                        >
                          جزئیات
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="تأمین‌کننده‌ای پیدا نشد"
            description={
              suppliers.length
                ? "عبارت جست‌وجو را تغییر دهید."
                : "برای ثبت نخستین تأمین‌کننده اقدام کنید."
            }
            action={
              !suppliers.length ? (
                <Link
                  className={buttonVariants({ variant: "primary", size: "sm" })}
                  to="/suppliers/new"
                >
                  ثبت تأمین‌کننده
                </Link>
              ) : undefined
            }
          />
        )}
      </SectionCard>
    </div>
  );
}

export function SupplierFormPage() {
  const navigate = useNavigate();
  const createSupplier = useRetailStore((state) => state.createSupplier);
  const {
    register,
    handleSubmit,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SupplierInput>({ defaultValues: blankSupplier });
  const submit = handleSubmit((form) => {
    clearErrors("root");
    const result = createSupplier(form);
    if (!result.ok) {
      setError("root", { type: "business", message: result.error });
      return;
    }
    notifyPersistedMutation("تأمین‌کننده ثبت شد.");
    navigate(`/suppliers/${result.value.id}`);
  });
  return (
    <div className="workspace-page mx-auto grid w-full max-w-[1560px] min-w-0 content-start gap-4 p-4 sm:gap-5 sm:p-5 xl:p-6">
      <PageHeader
        title="ثبت تأمین‌کننده"
        description="اطلاعات تماس برای پیگیری خریدها و پرداخت‌ها استفاده می‌شود."
        breadcrumbs={[
          { label: "تأمین‌کنندگان", to: "/suppliers" },
          { label: "مورد جدید" },
        ]}
      />
      <form
        className="workspace-form grid min-w-0 gap-4"
        noValidate
        onSubmit={submit}
      >
        <SectionCard title="اطلاعات تماس">
          <div className="form-grid grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              error={errors.name?.message}
              label="نام تأمین‌کننده"
              htmlFor="supplier-name"
              required
            >
              <Input
                {...register("name", {
                  required: "نام تأمین‌کننده الزامی است.",
                })}
                id="supplier-name"
                required
              />
            </Field>
            <Field label="شماره تماس" htmlFor="supplier-phone">
              <Input
                {...register("phone")}
                id="supplier-phone"
                inputMode="tel"
              />
            </Field>
            <Field
              error={errors.email?.message}
              label="ایمیل"
              htmlFor="supplier-email"
            >
              <Input
                {...register("email", {
                  validate: emailTypeMismatchRule("supplier-email"),
                })}
                id="supplier-email"
                type="email"
              />
            </Field>
            <Field label="نشانی" htmlFor="supplier-address">
              <Input {...register("address")} id="supplier-address" />
            </Field>
            <Field
              className="form-field-wide sm:col-span-2"
              label="یادداشت"
              htmlFor="supplier-notes"
            >
              <textarea
                {...register("notes")}
                className="workspace-textarea min-h-24 w-full resize-y rounded-xl border border-input bg-control px-3 py-2 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
                id="supplier-notes"
                rows={3}
              />
            </Field>
          </div>
          {errors.root?.message && (
            <p
              className="form-field-error text-xs leading-5 text-destructive"
              role="alert"
            >
              {errors.root.message}
            </p>
          )}
          <FormActions
            cancelTo="/suppliers"
            saveLabel="ثبت تأمین‌کننده"
            submitting={isSubmitting}
          />
        </SectionCard>
      </form>
    </div>
  );
}

export function SupplierDetailPage() {
  const { id } = useParams();
  const supplier = useRetailStore((state) =>
    state.suppliers.find((item) => item.id === id),
  );
  const allPurchases = useRetailStore((state) => state.purchases);
  const payments = useRetailStore((state) => state.payments);
  const calendarMode = useAppStore((state) => state.calendarMode);
  const purchases = useMemo(
    () =>
      allPurchases
        .filter((purchase) => purchase.supplierId === id)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [allPurchases, id],
  );
  const supplierPayments = useMemo(
    () =>
      payments
        .filter((payment) => payment.supplierId === id)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [id, payments],
  );
  const updateSupplier = useRetailStore((state) => state.updateSupplier);
  const addPurchasePayment = useRetailStore(
    (state) => state.addPurchasePayment,
  );
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState("");
  if (!supplier)
    return (
      <div className="workspace-page mx-auto grid w-full max-w-[1560px] min-w-0 content-start gap-4 p-4 sm:gap-5 sm:p-5 xl:p-6">
        <PageHeader
          title="جزئیات تأمین‌کننده"
          description="رکورد در دسترس نیست."
        />
        <EmptyState
          title="تأمین‌کننده پیدا نشد"
          description="به فهرست تأمین‌کنندگان بازگردید."
          action={
            <Link
              className={buttonVariants({ variant: "outline" })}
              to="/suppliers"
            >
              فهرست تأمین‌کنندگان
            </Link>
          }
        />
      </div>
    );
  const payable = purchases.reduce(
    (sum, purchase) => sum + getPurchaseOutstanding(purchase),
    0,
  );
  const outstandingPurchases = purchases.filter(
    (purchase) => getPurchaseOutstanding(purchase) > 0,
  );
  return (
    <div className="workspace-page mx-auto grid w-full max-w-[1560px] min-w-0 content-start gap-4 p-4 sm:gap-5 sm:p-5 xl:p-6">
      <PageHeader
        title={supplier.name}
        description={
          [supplier.phone, supplier.email].filter(Boolean).join(" · ") ||
          "اطلاعات تماس ثبت نشده"
        }
        breadcrumbs={[
          { label: "تأمین‌کنندگان", to: "/suppliers" },
          { label: "جزئیات" },
        ]}
        action={
          <>
            <Button onClick={() => setEditOpen(true)} variant="outline">
              <Edit2 aria-hidden="true" size={15} /> ویرایش اطلاعات
            </Button>
            <Button
              disabled={!outstandingPurchases.length}
              onClick={() => {
                setSelectedPurchaseId(outstandingPurchases[0]?.id ?? "");
                setPaymentOpen(true);
              }}
              variant="primary"
            >
              <Wallet aria-hidden="true" size={15} /> ثبت پرداخت
            </Button>
          </>
        }
      />
      <div className="metric-grid grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
        <MetricCard
          label="ماندهٔ بدهی"
          value={formatCurrency(payable)}
          tone={payable ? "warning" : "positive"}
        />
        <MetricCard label="سفارش‌های خرید" value={purchases.length} />
        <MetricCard
          label="پرداخت‌های ثبت‌شده"
          value={supplierPayments.length}
        />
        <MetricCard
          label="وضعیت حساب"
          value={payable ? "دارای مانده" : "تسویه‌شده"}
        />
      </div>
      <div className="workspace-two-column grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <SectionCard
          title="سوابق خرید"
          description="ثبت پرداخت هر سفارش از جزئیات همان خرید انجام می‌شود."
        >
          {purchases.length ? (
            <div className="data-table-scroll min-w-0 overflow-x-auto rounded-2xl border border-border">
              <table className="data-table w-full min-w-[680px] border-collapse text-right text-sm [&_thead]:bg-muted/60 [&_th]:whitespace-nowrap [&_th]:px-3 [&_th]:py-3 [&_th]:text-right [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground [&_tbody_tr]:border-t [&_tbody_tr]:border-border/70 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-muted/30 [&_td]:px-3 [&_td]:py-3 [&_td]:align-middle">
                <thead>
                  <tr>
                    <th>شماره</th>
                    <th>تاریخ</th>
                    <th>مبلغ</th>
                    <th>مانده</th>
                    <th>وضعیت دریافت</th>
                    <th>وضعیت پرداخت</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td>
                        <Link
                          className="table-primary-link font-medium text-primary transition-colors hover:text-primary-hover hover:underline"
                          to={`/purchases/${purchase.id}`}
                        >
                          {purchase.reference}
                        </Link>
                      </td>
                      <td>{getDateLabel(purchase.date, calendarMode, true)}</td>
                      <td>{formatCurrency(purchase.amount)}</td>
                      <td>
                        {formatCurrency(getPurchaseOutstanding(purchase))}
                      </td>
                      <td>{purchase.received ? "دریافت‌شده" : "در انتظار"}</td>
                      <td>
                        <StatusBadge status={getPurchaseStatus(purchase)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="خریدی ثبت نشده"
              description="خریدهای آینده در این فهرست دیده می‌شوند."
            />
          )}
        </SectionCard>
        <SectionCard
          title="تاریخچهٔ پرداخت"
          description="پرداخت‌های ثبت‌شده به سفارش مرتبط هستند."
        >
          {supplierPayments.length ? (
            <div className="data-table-scroll min-w-0 overflow-x-auto rounded-2xl border border-border">
              <table className="data-table w-full min-w-[680px] border-collapse text-right text-sm [&_thead]:bg-muted/60 [&_th]:whitespace-nowrap [&_th]:px-3 [&_th]:py-3 [&_th]:text-right [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground [&_tbody_tr]:border-t [&_tbody_tr]:border-border/70 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-muted/30 [&_td]:px-3 [&_td]:py-3 [&_td]:align-middle">
                <thead>
                  <tr>
                    <th>تاریخ</th>
                    <th>شرح</th>
                    <th>روش</th>
                    <th>مبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{getDateLabel(payment.date, calendarMode, true)}</td>
                      <td>
                        <Link
                          className="table-primary-link font-medium text-primary transition-colors hover:text-primary-hover hover:underline"
                          to={
                            payment.relatedPurchaseId
                              ? `/purchases/${payment.relatedPurchaseId}`
                              : "/credit-book"
                          }
                        >
                          {payment.description}
                        </Link>
                      </td>
                      <td>{paymentMethodLabel(payment.method)}</td>
                      <td>{formatCurrency(payment.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="پرداختی ثبت نشده"
              description="پرداخت‌های بعدی در اینجا نگهداری می‌شوند."
            />
          )}
        </SectionCard>
      </div>
      <SectionCard title="اطلاعات تکمیلی">
        <dl className="details-grid grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <dt>نام</dt>
            <dd>{supplier.name}</dd>
          </div>
          <div>
            <dt>تلفن</dt>
            <dd>{supplier.phone || "ثبت نشده"}</dd>
          </div>
          <div>
            <dt>ایمیل</dt>
            <dd>{supplier.email || "ثبت نشده"}</dd>
          </div>
          <div>
            <dt>نشانی</dt>
            <dd>{supplier.address || "ثبت نشده"}</dd>
          </div>
          <div className="details-grid-wide sm:col-span-2">
            <dt>یادداشت</dt>
            <dd>{supplier.notes || "یادداشتی ثبت نشده است."}</dd>
          </div>
        </dl>
      </SectionCard>
      <SupplierEditDialog
        key={`${supplier.id}-${editOpen}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        supplier={supplier}
        onSave={(input) => updateSupplier(supplier.id, input)}
      />
      {selectedPurchaseId && (
        <SupplierPaymentDialog
          key={selectedPurchaseId}
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          purchase={purchases.find((item) => item.id === selectedPurchaseId)}
          addPayment={addPurchasePayment}
        />
      )}
    </div>
  );
}

function SupplierEditDialog({
  supplier,
  open,
  onOpenChange,
  onSave,
}: {
  supplier: RetailSupplier;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: SupplierInput) => { ok: boolean; error?: string };
}) {
  const {
    register,
    handleSubmit,
    reset,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SupplierInput>({
    defaultValues: {
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      notes: supplier.notes,
    },
  });
  useEffect(() => {
    if (open) {
      reset({
        name: supplier.name,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        notes: supplier.notes,
      });
    }
  }, [open, reset, supplier]);
  const submit = handleSubmit((form) => {
    clearErrors("root");
    const result = onSave(form);
    if (!result.ok) {
      setError("root", {
        type: "business",
        message: result.error ?? "اطلاعات ذخیره نشد.",
      });
      return;
    }
    notifyPersistedMutation("اطلاعات تأمین‌کننده ذخیره شد.");
    reset(form);
    onOpenChange(false);
  });
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <div className="dialog-heading mb-4 space-y-1 pe-7 text-right">
          <DialogTitle>ویرایش تأمین‌کننده</DialogTitle>
          <DialogDescription>
            اطلاعات تماس و یادداشت‌ها را به‌روزرسانی کنید.
          </DialogDescription>
        </div>
        <form
          className="dialog-form grid min-w-0 gap-4"
          noValidate
          onSubmit={submit}
        >
          <Field
            error={errors.name?.message}
            label="نام"
            htmlFor="supplier-edit-name"
            required
          >
            <Input
              {...register("name", { required: "نام تأمین‌کننده الزامی است." })}
              id="supplier-edit-name"
              required
            />
          </Field>
          <Field label="شماره تماس" htmlFor="supplier-edit-phone">
            <Input {...register("phone")} id="supplier-edit-phone" />
          </Field>
          <Field
            error={errors.email?.message}
            label="ایمیل"
            htmlFor="supplier-edit-email"
          >
            <Input
              {...register("email", {
                validate: emailTypeMismatchRule("supplier-edit-email"),
              })}
              id="supplier-edit-email"
              type="email"
            />
          </Field>
          <Field label="نشانی" htmlFor="supplier-edit-address">
            <Input {...register("address")} id="supplier-edit-address" />
          </Field>
          <Field label="یادداشت" htmlFor="supplier-edit-notes">
            <textarea
              {...register("notes")}
              className="workspace-textarea min-h-24 w-full resize-y rounded-xl border border-input bg-control px-3 py-2 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
              id="supplier-edit-notes"
              rows={2}
            />
          </Field>
          {errors.root?.message && (
            <p
              className="form-field-error text-xs leading-5 text-destructive"
              role="alert"
            >
              {errors.root.message}
            </p>
          )}
          <div className="dialog-actions flex flex-wrap items-center gap-2 border-t border-border/70 pt-4">
            <Button onClick={() => onOpenChange(false)} variant="outline">
              انصراف
            </Button>
            <Button disabled={isSubmitting} type="submit" variant="primary">
              {isSubmitting ? "در حال ذخیره…" : "ذخیره"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SupplierPaymentDialog({
  purchase,
  open,
  onOpenChange,
  addPayment,
}: {
  purchase: RetailPurchase | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  addPayment: (
    id: string,
    amount: number,
    method: PaymentMethod,
    date: string,
  ) => { ok: boolean; error?: string };
}) {
  const calendarMode = useAppStore((state) => state.calendarMode);
  const {
    control,
    register,
    handleSubmit,
    reset,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<{ amount: number; method: PaymentMethod; date: string }>({
    defaultValues: {
      amount: purchase ? getPurchaseOutstanding(purchase) : 0,
      method: "cash",
      date: getTodayDateKey(),
    },
  });
  useEffect(() => {
    if (open && purchase) {
      reset({
        amount: getPurchaseOutstanding(purchase),
        method: "cash",
        date: getTodayDateKey(),
      });
    }
  }, [open, purchase, reset]);
  const submit = handleSubmit(({ amount, method, date }) => {
    if (!purchase) return;
    clearErrors("root");
    const result = addPayment(purchase.id, amount, method, date);
    if (!result.ok) {
      setError("root", {
        type: "business",
        message: result.error ?? "پرداخت ثبت نشد.",
      });
      return;
    }
    notifyPersistedMutation("پرداخت بدهی ثبت شد.");
    onOpenChange(false);
  });
  if (!purchase) return null;
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <div className="dialog-heading mb-4 space-y-1 pe-7 text-right">
          <DialogTitle>ثبت پرداخت تأمین‌کننده</DialogTitle>
          <DialogDescription>
            به سفارش {purchase.reference} متصل می‌شود؛ مانده{" "}
            {formatCurrency(getPurchaseOutstanding(purchase))}.
          </DialogDescription>
        </div>
        <form
          className="dialog-form grid min-w-0 gap-4"
          noValidate
          onSubmit={submit}
        >
          <Field
            error={errors.amount?.message}
            label="مبلغ پرداخت"
            htmlFor="supplier-payment-amount"
            required
          >
            <Input
              {...register("amount", {
                valueAsNumber: true,
                required: "مبلغ پرداخت باید بیشتر از صفر باشد.",
                min: {
                  value: 1,
                  message: "مبلغ پرداخت باید بیشتر از صفر باشد.",
                },
                validate: (value) =>
                  (Number.isFinite(value) && value > 0) ||
                  "مبلغ پرداخت باید بیشتر از صفر باشد.",
              })}
              id="supplier-payment-amount"
              required
              type="text"
            />
          </Field>
          <Controller
            control={control}
            name="method"
            render={({ field }) => (
              <PaymentMethodSelect
                id="supplier-payment-method"
                onChange={field.onChange}
                value={field.value}
              />
            )}
          />
          <Controller
            control={control}
            name="date"
            rules={{ required: "تاریخ پرداخت معتبر نیست." }}
            render={({ field, fieldState }) => (
              <DateField
                error={fieldState.error?.message}
                id="supplier-payment-date"
                label="تاریخ پرداخت"
                mode={calendarMode}
                onChange={field.onChange}
                required
                value={field.value}
              />
            )}
          />
          {errors.root?.message && (
            <p
              className="form-field-error text-xs leading-5 text-destructive"
              role="alert"
            >
              {errors.root.message}
            </p>
          )}
          <div className="dialog-actions flex flex-wrap items-center gap-2 border-t border-border/70 pt-4">
            <Button onClick={() => onOpenChange(false)} variant="outline">
              انصراف
            </Button>
            <Button disabled={isSubmitting} type="submit" variant="primary">
              {isSubmitting ? "در حال ثبت…" : "ثبت پرداخت"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
