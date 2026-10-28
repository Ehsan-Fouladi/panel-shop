import { Megaphone, Pencil, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterInput } from "@/components/records/FilterInput";
import { Pagination } from "@/components/records/Pagination";
import { SectionCard } from "@/components/records/SectionCard";
import {
  ConfirmAction,
  EmptyState,
  Field,
  MetricCard,
} from "@/components/records/Shared";
import { usePagination } from "@/components/records/usePagination";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDateLabel } from "@/lib/date";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { notifyPersistedMutation } from "@/lib/persistence-feedback";
import {
  customerGroupLabel,
  getNetSaleAmount,
  getSaleOutstanding,
} from "@/lib/retail-data";
import { useAppStore } from "@/store/app-store";
import { type CustomerInput, useRetailStore } from "@/store/retail-store";
import type { CustomerGroup, RetailCustomer, RetailSale } from "@/types/retail";
import { sileo } from "sileo";

const PAGE_SIZE = 10;

const emptyCustomer: CustomerInput = {
  name: "",
  phone: "",
  group: "regular",
  address: "",
  notes: "",
};

function customerToInput(customer: RetailCustomer | null): CustomerInput {
  if (!customer) return emptyCustomer;
  return {
    name: customer.name,
    phone: customer.phone,
    group: customer.group,
    address: customer.address,
    notes: customer.notes,
  };
}

export function CrmPage() {
  const customers = useRetailStore((state) => state.customers);
  const sales = useRetailStore((state) => state.sales);
  const returns = useRetailStore((state) => state.returns);
  const createCustomer = useRetailStore((state) => state.createCustomer);
  const updateCustomer = useRetailStore((state) => state.updateCustomer);
  const deleteCustomer = useRetailStore((state) => state.deleteCustomer);
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<RetailCustomer | null>(null);
  const [details, setDetails] = useState<RetailCustomer | null>(null);
  const active = useMemo(
    () => customers.filter((customer) => customer.active),
    [customers],
  );
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return active.filter(
      (customer) =>
        (group === "all" || customer.group === group) &&
        (!normalized ||
          `${customer.name} ${customer.phone}`
            .toLocaleLowerCase()
            .includes(normalized)),
    );
  }, [active, group, query]);
  const {
    page,
    pageCount,
    visible: visibleCustomers,
    setPage,
  } = usePagination(filtered, PAGE_SIZE);
  const totalReceivable = active.reduce(
    (sum, customer) =>
      sum +
      sales
        .filter((sale) => sale.customerId === customer.id)
        .reduce(
          (balance, sale) => balance + getSaleOutstanding(sale, returns),
          0,
        ),
    0,
  );

  useEffect(() => {
    const customerId = searchParams.get("customer");
    if (customerId)
      setDetails(
        customers.find(
          (customer) => customer.id === customerId && customer.active,
        ) ?? null,
      );
  }, [customers, searchParams]);

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const saveCustomer = (input: CustomerInput) => {
    const result = editing
      ? updateCustomer(editing.id, input)
      : createCustomer(input);
    if (result.ok) {
      notifyPersistedMutation(
        editing ? "اطلاعات مشتری به‌روزرسانی شد." : "مشتری ثبت شد.",
      );
      setEditorOpen(false);
    }
    return result;
  };

  return (
    <div className="workspace-page mx-auto grid w-full max-w-[1560px] min-w-0 content-start gap-4 p-4 sm:gap-5 sm:p-5 xl:p-6">
      <PageHeader
        title="مشتریان"
        description="مخاطبان، گروه‌بندی، خریدهای ثبت‌شده و ماندهٔ طلب را مدیریت کنید."
        action={
          <>
            <Link
              className={buttonVariants({ variant: "outline" })}
              to="/crm/campaigns"
            >
              <Megaphone aria-hidden="true" size={15} /> پویش‌ها
            </Link>
            <Button onClick={openCreate} variant="primary">
              <Plus aria-hidden="true" size={16} /> مشتری جدید
            </Button>
          </>
        }
      />
      <div className="metric-grid grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
        <MetricCard label="مشتریان فعال" value={active.length} />
        <MetricCard label="فروش‌های مرتبط" value={sales.length} />
        <MetricCard
          label="مطالبات کل"
          value={formatCurrency(totalReceivable)}
          tone={totalReceivable ? "warning" : "positive"}
        />
        <MetricCard
          label="دارای شماره تماس"
          value={
            active.filter(
              (customer) =>
                customer.phone && customer.phone !== "بدون شماره تماس",
            ).length
          }
          hint="برای فهرست مخاطبان پویش"
        />
      </div>
      <SectionCard
        title="دفتر مشتریان"
        description={`${formatNumber(filtered.length)} مخاطب`}
      >
        <div className="list-toolbar flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card-raised/50 p-3">
          <FilterInput
            id="customer-search"
            label="جست‌وجوی مشتری"
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            placeholder="نام یا شماره تماس"
            value={query}
          />
          <Select
            onValueChange={(value) => {
              setGroup(value);
              setPage(1);
            }}
            value={group}
          >
            <SelectTrigger aria-label="گروه مشتری">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همهٔ گروه‌ها</SelectItem>
              <SelectItem value="walk-in">فروش حضوری</SelectItem>
              <SelectItem value="regular">معمولی</SelectItem>
              <SelectItem value="vip">ویژه</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {filtered.length ? (
          <div className="data-table-scroll min-w-0 overflow-x-auto rounded-2xl border border-border">
            <table className="data-table w-full min-w-[680px] border-collapse text-right text-sm [&_thead]:bg-muted/60 [&_th]:whitespace-nowrap [&_th]:px-3 [&_th]:py-3 [&_th]:text-right [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground [&_tbody_tr]:border-t [&_tbody_tr]:border-border/70 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-muted/30 [&_td]:px-3 [&_td]:py-3 [&_td]:align-middle">
              <thead>
                <tr>
                  <th>مشتری</th>
                  <th>شماره تماس</th>
                  <th>گروه</th>
                  <th>تعداد خرید</th>
                  <th>جمع خرید ثبت‌شده</th>
                  <th>ماندهٔ طلب</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {visibleCustomers.map((customer) => {
                  const customerSales = sales.filter(
                    (sale) => sale.customerId === customer.id,
                  );
                  const total = customerSales.reduce(
                    (sum, sale) => sum + getNetSaleAmount(sale),
                    0,
                  );
                  const receivable = customerSales.reduce(
                    (sum, sale) => sum + getSaleOutstanding(sale, returns),
                    0,
                  );
                  return (
                    <tr key={customer.id}>
                      <td>
                        <button
                          className="table-link-button text-xs font-medium text-primary hover:underline"
                          onClick={() => setDetails(customer)}
                          type="button"
                        >
                          {customer.name}
                        </button>
                      </td>
                      <td>{customer.phone || "—"}</td>
                      <td>{customerGroupLabel(customer.group)}</td>
                      <td>{formatNumber(customerSales.length)}</td>
                      <td>{formatCurrency(total)}</td>
                      <td>{formatCurrency(receivable)}</td>
                      <td>
                        <div className="table-row-actions flex flex-wrap items-center gap-1.5">
                          <Button
                            onClick={() => setDetails(customer)}
                            size="sm"
                            variant="outline"
                          >
                            جزئیات
                          </Button>
                          <Button
                            aria-label={`ویرایش ${customer.name}`}
                            onClick={() => {
                              setEditing(customer);
                              setEditorOpen(true);
                            }}
                            size="icon-sm"
                            variant="ghost"
                          >
                            <Pencil aria-hidden="true" size={14} />
                          </Button>
                          <ConfirmAction
                            confirmClassName="border-destructive/35 bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive"
                            confirmLabel="حذف از فهرست فعال"
                            confirmVariant="outline"
                            description={`مشتری «${customer.name}» از فهرست فعال این مرورگر خارج می‌شود. سوابق فروش، پرداخت و ماندهٔ حساب حذف نمی‌شوند؛ این تغییر فقط در داده‌های محلی همین مرورگر ذخیره می‌شود.`}
                            onConfirm={() => {
                              const result = deleteCustomer(customer.id);
                              if (!result.ok)
                                sileo.error({
                                  title: result.error,
                                  duration: 3000,
                                });
                              else
                                notifyPersistedMutation(
                                  `مشتری «${result.value.name}» از فهرست فعال این مرورگر خارج شد؛ سوابق فروش و پرداخت حفظ شدند.`,
                                );
                            }}
                            title={`حذف ${customer.name} از فهرست فعال؟`}
                            triggerClassName="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            triggerLabel="حذف"
                            variant="outline"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="مشتری‌ای پیدا نشد"
            description={
              active.length
                ? "فیلترها را تغییر دهید."
                : "برای ساخت دفتر مشتریان، رکورد نخست را اضافه کنید."
            }
            action={
              !active.length ? (
                <Button onClick={openCreate} size="sm" variant="primary">
                  ثبت مشتری
                </Button>
              ) : undefined
            }
          />
        )}
        <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
      </SectionCard>
      <CustomerEditorDialog
        editing={editing}
        onOpenChange={setEditorOpen}
        onSave={saveCustomer}
        open={editorOpen}
      />
      <CustomerDetailsDialog
        customer={details}
        onClose={() => setDetails(null)}
        onEdit={() => {
          if (details) {
            setEditing(details);
            setEditorOpen(true);
          }
          setDetails(null);
        }}
        sales={sales.filter((sale) => sale.customerId === details?.id)}
      />
    </div>
  );
}

function CustomerEditorDialog({
  editing,
  open,
  onOpenChange,
  onSave,
}: {
  editing: RetailCustomer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: CustomerInput) => { ok: boolean; error?: string };
}) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CustomerInput>({ defaultValues: customerToInput(editing) });
  useEffect(() => {
    if (open) {
      reset(customerToInput(editing));
    }
  }, [editing, open, reset]);
  const submit = handleSubmit((form) => {
    clearErrors("root");
    const result = onSave(form);
    if (!result.ok) {
      setError("root", {
        type: "business",
        message: result.error ?? "مشتری ذخیره نشد.",
      });
      return;
    }
    reset(customerToInput(null));
  });
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <div className="dialog-heading mb-4 space-y-1 pe-7 text-right">
          <DialogTitle>{editing ? "ویرایش مشتری" : "ثبت مشتری"}</DialogTitle>
          <DialogDescription>
            گروه مشتری برای گزارش و انتخاب مخاطبان پویش استفاده می‌شود.
          </DialogDescription>
        </div>
        <form
          className="dialog-form grid min-w-0 gap-4"
          noValidate
          onSubmit={submit}
        >
          <Field
            error={errors.name?.message}
            label="نام مشتری"
            htmlFor="crm-name"
            required
          >
            <Input
              {...register("name", { required: "نام مشتری الزامی است." })}
              id="crm-name"
              required
            />
          </Field>
          <Field label="شماره تماس" htmlFor="crm-phone">
            <Input {...register("phone")} id="crm-phone" inputMode="tel" />
          </Field>
          <Controller
            control={control}
            name="group"
            render={({ field, fieldState }) => (
              <Field
                error={fieldState.error?.message}
                label="گروه"
                htmlFor="crm-group"
              >
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger
                    aria-describedby={
                      fieldState.error ? "crm-group-error" : undefined
                    }
                    aria-invalid={Boolean(fieldState.error)}
                    id="crm-group"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk-in">فروش حضوری</SelectItem>
                    <SelectItem value="regular">معمولی</SelectItem>
                    <SelectItem value="vip">ویژه</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
          <Field label="نشانی" htmlFor="crm-address">
            <Input {...register("address")} id="crm-address" />
          </Field>
          <Field label="یادداشت" htmlFor="crm-notes">
            <textarea
              {...register("notes")}
              className="workspace-textarea min-h-24 w-full resize-y rounded-xl border border-input bg-control px-3 py-2 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
              id="crm-notes"
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
              {isSubmitting
                ? "در حال ثبت…"
                : editing
                  ? "ذخیرهٔ تغییرات"
                  : "ثبت مشتری"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CustomerDetailsDialog({
  customer,
  onClose,
  onEdit,
  sales,
}: {
  customer: RetailCustomer | null;
  onClose: () => void;
  onEdit: () => void;
  sales: RetailSale[];
}) {
  const calendarMode = useAppStore((state) => state.calendarMode);
  const returnRecords = useRetailStore((state) => state.returns);
  const receivable = sales.reduce(
    (sum, sale) => sum + getSaleOutstanding(sale, returnRecords),
    0,
  );
  return (
    <Dialog
      onOpenChange={(open) => !open && onClose()}
      open={customer !== null}
    >
      <DialogContent>
        <div className="dialog-heading mb-4 space-y-1 pe-7 text-right">
          <DialogTitle>{customer?.name ?? "جزئیات مشتری"}</DialogTitle>
          <DialogDescription>خلاصهٔ خرید و وضعیت حساب</DialogDescription>
        </div>
        {customer && (
          <div className="record-detail-list grid gap-2 rounded-xl border border-border bg-card-raised/50 p-3">
            <div className="record-detail-row flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border/60 py-2 last:border-0 last:pb-0">
              <span className="record-detail-label text-xs text-muted-foreground">
                شماره تماس
              </span>
              <strong>{customer.phone || "ثبت نشده"}</strong>
            </div>
            <div className="record-detail-row flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border/60 py-2 last:border-0 last:pb-0">
              <span className="record-detail-label text-xs text-muted-foreground">
                گروه
              </span>
              <strong>{customerGroupLabel(customer.group)}</strong>
            </div>
            <div className="record-detail-row flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border/60 py-2 last:border-0 last:pb-0">
              <span className="record-detail-label text-xs text-muted-foreground">
                تعداد خرید
              </span>
              <strong>{formatNumber(sales.length)}</strong>
            </div>
            <div className="record-detail-row flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border/60 py-2 last:border-0 last:pb-0">
              <span className="record-detail-label text-xs text-muted-foreground">
                مطالبات
              </span>
              <strong>{formatCurrency(receivable)}</strong>
            </div>
            <div className="record-detail-row flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border/60 py-2 last:border-0 last:pb-0">
              <span className="record-detail-label text-xs text-muted-foreground">
                یادداشت
              </span>
              <strong>{customer.notes || "—"}</strong>
            </div>
            {sales.slice(0, 5).map((sale) => (
              <div
                className="record-detail-row flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border/60 py-2 last:border-0 last:pb-0"
                key={sale.id}
              >
                <span className="record-detail-label text-xs text-muted-foreground">
                  {sale.reference} ·{" "}
                  {getDateLabel(sale.date, calendarMode, true)}
                </span>
                <strong>{formatCurrency(sale.amount)}</strong>
              </div>
            ))}
          </div>
        )}
        <div className="dialog-actions mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-4">
          <Button onClick={onEdit} variant="outline">
            <Pencil aria-hidden="true" size={14} /> ویرایش
          </Button>
          <Button onClick={onClose} variant="secondary">
            بستن
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CampaignsPage() {
  const customers = useRetailStore((state) => state.customers);
  const campaigns = useRetailStore((state) => state.campaigns);
  const calendarMode = useAppStore((state) => state.calendarMode);
  const createCampaign = useRetailStore((state) => state.createCampaign);
  const simulateCampaign = useRetailStore((state) => state.simulateCampaign);
  const {
    control,
    register,
    handleSubmit,
    reset,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<{
    title: string;
    message: string;
    target: "all" | CustomerGroup;
  }>({
    defaultValues: { title: "", message: "", target: "all" },
  });
  const title = useWatch({ control, name: "title" }) ?? "";
  const message = useWatch({ control, name: "message" }) ?? "";
  const target = useWatch({ control, name: "target" }) ?? "all";
  const recipientCount = customers.filter(
    (customer) =>
      customer.active &&
      customer.phone &&
      customer.phone !== "بدون شماره تماس" &&
      (target === "all" || customer.group === target),
  ).length;
  const segments = Math.max(1, Math.ceil(message.length / 70));

  const save = (
    form: { title: string; message: string; target: "all" | CustomerGroup },
    simulate: boolean,
  ) => {
    clearErrors("root");
    if (!form.title.trim()) {
      setError("root", {
        type: "business",
        message: "عنوان پویش را وارد کنید.",
      });
      return;
    }
    if (!form.message.trim()) {
      setError("root", { type: "business", message: "متن پیام را وارد کنید." });
      return;
    }
    const eligibleRecipients = customers.filter(
      (customer) =>
        customer.active &&
        customer.phone &&
        customer.phone !== "بدون شماره تماس" &&
        (form.target === "all" || customer.group === form.target),
    ).length;
    if (simulate && eligibleRecipients === 0) {
      setError("root", {
        type: "business",
        message: "برای شبیه‌سازی، دست‌کم یک مخاطب دارای شماره لازم است.",
      });
      return;
    }
    const campaign = createCampaign({
      title: form.title.trim(),
      message: form.message.trim(),
      target: form.target,
    });
    if (simulate) {
      const result = simulateCampaign(campaign.id);
      if (!result.ok) {
        setError("root", { type: "business", message: result.error });
        return;
      }
      notifyPersistedMutation(
        "شبیه‌سازی ثبت شد؛ هیچ پیامکی ارسال نشده و وضعیت تحویل واقعی وجود ندارد.",
        "info",
      );
    } else {
      notifyPersistedMutation("پویش به‌صورت پیش‌نویس ذخیره شد.");
    }
    reset({ title: "", message: "", target: form.target });
  };
  const submit = handleSubmit((form, event) => {
    const submitter = (event?.nativeEvent as SubmitEvent | undefined)
      ?.submitter;
    save(
      form,
      submitter instanceof HTMLButtonElement && submitter.value === "simulate",
    );
  });

  return (
    <div className="workspace-page mx-auto grid w-full max-w-[1560px] min-w-0 content-start gap-4 p-4 sm:gap-5 sm:p-5 xl:p-6">
      <PageHeader
        title="پویش‌های پیامکی"
        description="متن و مخاطبان را آماده کنید. اتصال به درگاه پیامک وجود ندارد؛ ارسال فقط به‌صورت شبیه‌سازی‌شده ثبت می‌شود."
        breadcrumbs={[{ label: "مشتریان", to: "/crm" }, { label: "پویش‌ها" }]}
        action={
          <Link className={buttonVariants({ variant: "outline" })} to="/crm">
            بازگشت به مشتریان
          </Link>
        }
      />
      <div className="workspace-two-column campaign-layout grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
        <SectionCard
          title="ساخت پویش"
          description="متن پیام، گروه مخاطب و برآورد محلی را مشخص کنید."
        >
          <form className="grid min-w-0 gap-4" noValidate onSubmit={submit}>
            <div className="form-grid grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="عنوان پویش" htmlFor="campaign-title" required>
                <Input {...register("title")} id="campaign-title" />
              </Field>
              <Controller
                control={control}
                name="target"
                render={({ field, fieldState }) => (
                  <Field
                    error={fieldState.error?.message}
                    label="گروه مخاطبان"
                    htmlFor="campaign-target"
                  >
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger
                        aria-describedby={
                          fieldState.error ? "campaign-target-error" : undefined
                        }
                        aria-invalid={Boolean(fieldState.error)}
                        id="campaign-target"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          همهٔ مشتریان دارای شماره
                        </SelectItem>
                        <SelectItem value="regular">مشتریان معمولی</SelectItem>
                        <SelectItem value="vip">مشتریان ویژه</SelectItem>
                        <SelectItem value="walk-in">فروش حضوری</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
              <Field
                className="form-field-wide sm:col-span-2"
                label="متن پیام"
                htmlFor="campaign-message"
                required
                hint={`${formatNumber(message.length)} نویسه · حدود ${formatNumber(segments)} بخش متنی، برآورد محلی`}
                hintId="campaign-message-hint"
              >
                <textarea
                  {...register("message")}
                  className="workspace-textarea min-h-24 w-full resize-y rounded-xl border border-input bg-control px-3 py-2 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
                  id="campaign-message"
                  maxLength={1000}
                  rows={6}
                />
              </Field>
            </div>
            <div className="campaign-estimate flex justify-between rounded-xl border border-info/20 bg-info/5 p-3 text-sm">
              <span>مخاطبان دارای شمارهٔ تماس</span>
              <strong>{formatNumber(recipientCount)}</strong>
            </div>
            {errors.root?.message && (
              <p
                className="form-field-error text-xs leading-5 text-destructive"
                role="alert"
              >
                {errors.root.message}
              </p>
            )}
            <div className="form-actions flex flex-wrap items-center gap-2 border-t border-border/70 pt-4">
              <Button
                disabled={isSubmitting}
                name="campaign-action"
                type="submit"
                value="draft"
                variant="outline"
              >
                ذخیرهٔ پیش‌نویس
              </Button>
              <Button
                disabled={
                  isSubmitting ||
                  recipientCount === 0 ||
                  !title.trim() ||
                  !message.trim()
                }
                name="campaign-action"
                type="submit"
                value="simulate"
                variant="primary"
              >
                {isSubmitting ? "در حال ثبت…" : "ثبت شبیه‌سازی"}
              </Button>
            </div>
          </form>
        </SectionCard>
        <SectionCard
          title="پیش‌نمایش پیام"
          description="نمونهٔ نمایش محلی؛ از برنامه خارج نمی‌شود."
        >
          <div className="sms-preview grid gap-3 rounded-2xl border border-border bg-card-raised/60 p-4">
            <span className="sms-preview-brand flex items-center gap-2 border-b border-border pb-3 text-sm font-semibold">
              {title.trim() || "نام پویش"}
            </span>
            <p>
              {message.trim() ||
                "متن پیام پس از نوشتن در اینجا پیش‌نمایش داده می‌شود."}
            </p>
            <span className="sms-preview-footnote text-[11px] leading-5 text-muted-foreground">
              ارسال واقعی غیرفعال است · {formatNumber(recipientCount)} مخاطب
              تخمینی
            </span>
          </div>
        </SectionCard>
      </div>
      <SectionCard
        title="سوابق پویش محلی"
        description="سوابق ذخیره‌شده در همین مرورگر؛ بدون گزارش ارسال یا تحویل واقعی."
      >
        {campaigns.length ? (
          <div className="data-table-scroll min-w-0 overflow-x-auto rounded-2xl border border-border">
            <table className="data-table w-full min-w-[680px] border-collapse text-right text-sm [&_thead]:bg-muted/60 [&_th]:whitespace-nowrap [&_th]:px-3 [&_th]:py-3 [&_th]:text-right [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground [&_tbody_tr]:border-t [&_tbody_tr]:border-border/70 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-muted/30 [&_td]:px-3 [&_td]:py-3 [&_td]:align-middle">
              <thead>
                <tr>
                  <th>عنوان</th>
                  <th>مخاطب</th>
                  <th>تاریخ</th>
                  <th>وضعیت محلی</th>
                  <th>متن</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td>{campaign.title}</td>
                    <td>
                      {campaign.target === "all"
                        ? "همه"
                        : customerGroupLabel(campaign.target)}
                    </td>
                    <td>
                      {getDateLabel(campaign.createdAt, calendarMode, true)}
                    </td>
                    <td>
                      <span
                        className={`status-text inline-flex items-center rounded-full border border-border bg-muted px-2 py-1 text-[10px] font-medium leading-none text-muted-foreground ${campaign.status === "draft" ? "is-neutral bg-muted text-muted-foreground" : "is-warning"}`}
                      >
                        {campaign.status === "draft"
                          ? "پیش‌نویس"
                          : "شبیه‌سازی ثبت شده · ارسال نشده"}
                      </span>
                    </td>
                    <td>
                      <span className="table-subline mt-1 block text-[11px] leading-4 text-muted-foreground campaign-message-cell max-w-[280px] whitespace-normal text-xs leading-5">
                        {campaign.message}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="پویشی ذخیره نشده"
            description="پیش‌نویس یا درخواست شبیه‌سازی‌شدهٔ محلی در اینجا دیده می‌شود."
          />
        )}
      </SectionCard>
    </div>
  );
}
