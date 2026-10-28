import { Download, Save, SunMoon } from "lucide-react";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/records/SectionCard";
import { ConfirmAction, Field } from "@/components/records/Shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumber } from "@/lib/formatters";
import { notifyPersistedMutation } from "@/lib/persistence-feedback";
import {
  createRetailBackup,
  type ParsedRetailBackup,
  parseRetailBackupText,
} from "@/lib/retail-backup";
import {
  APP_PREFERENCES_STORAGE_KEY,
  getStorageHealth,
  RETAIL_STORAGE_KEY,
} from "@/lib/safe-storage";
import { useAppStore } from "@/store/app-store";
import { useRetailStore } from "@/store/retail-store";
import type { RetailSettings } from "@/types/retail";
import { sileo } from "sileo";

export function SettingsPage() {
  const settings = useRetailStore((state) => state.settings);
  const products = useRetailStore((state) => state.products);
  const sales = useRetailStore((state) => state.sales);
  const purchases = useRetailStore((state) => state.purchases);
  const expenses = useRetailStore((state) => state.expenses);
  const updateSettings = useRetailStore((state) => state.updateSettings);
  const resetRetailData = useRetailStore((state) => state.resetRetailData);
  const initializeEmptyRetailData = useRetailStore(
    (state) => state.initializeEmptyRetailData,
  );
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const calendarMode = useAppStore((state) => state.calendarMode);
  const setCalendarMode = useAppStore((state) => state.setCalendarMode);
  const backupFileInput = useRef<HTMLInputElement>(null);
  const [backupPreview, setBackupPreview] = useState<ParsedRetailBackup | null>(
    null,
  );
  const [backupFileName, setBackupFileName] = useState("");
  const [backupError, setBackupError] = useState("");
  const [isReadingBackup, setIsReadingBackup] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    reset,
    clearErrors,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RetailSettings>({ defaultValues: { ...settings, calendarMode } });
  const expenseCategories =
    useWatch({ control, name: "expenseCategories" }) ??
    settings.expenseCategories;
  useEffect(
    () => reset({ ...settings, calendarMode }),
    [calendarMode, reset, settings],
  );
  const submit = handleSubmit((form) => {
    clearErrors("root");
    const result = updateSettings(form);
    if (!result.ok) {
      setError("root", { type: "business", message: result.error });
      return;
    }
    setCalendarMode(form.calendarMode);
    reset(result.value);
    notifyPersistedMutation("تنظیمات محلی ذخیره شد.");
  });
  const exportData = () => {
    if (
      getStorageHealth(RETAIL_STORAGE_KEY).readFailure ||
      getStorageHealth(APP_PREFERENCES_STORAGE_KEY).readFailure
    ) {
      sileo.error({
        title:
          "دادهٔ ذخیره‌شدهٔ قبلی قابل خواندن نیست؛ خروجی کامل‌بودن نسخهٔ پشتیبان را تضمین نمی‌کند.",
        duration: 3000,
      });
      return;
    }
    const current = useRetailStore.getState();
    const currentPreferences = useAppStore.getState();
    const payload = createRetailBackup(
      {
        products: current.products,
        sales: current.sales,
        purchases: current.purchases,
        suppliers: current.suppliers,
        customers: current.customers,
        expenses: current.expenses,
        payments: current.payments,
        returns: current.returns,
        purchaseReturns: current.purchaseReturns,
        stockMovements: current.stockMovements,
        cashMovements: current.cashMovements,
        cashSessions: current.cashSessions,
        campaigns: current.campaigns,
        settings: current.settings,
      },
      {
        theme: currentPreferences.theme,
        calendarMode: currentPreferences.calendarMode,
      },
    );
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "retail-local-data.json";
    anchor.click();
    URL.revokeObjectURL(url);
    sileo.success({
      title: "فایل JSON داده‌های محلی ساخته شد.",
      duration: 3000,
    });
  };
  const readBackupFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsReadingBackup(true);
    setBackupError("");
    setBackupPreview(null);
    setBackupFileName(file.name);
    try {
      const result = parseRetailBackupText(await file.text());
      if (!result.ok) {
        setBackupError(result.error);
        return;
      }
      setBackupPreview(result.value);
    } catch {
      setBackupError(
        "خواندن فایل پشتیبان ممکن نشد؛ فایل را دوباره انتخاب کنید.",
      );
    } finally {
      setIsReadingBackup(false);
      event.target.value = "";
    }
  };
  const restoreBackup = () => {
    if (!backupPreview) return;
    const currentCalendarMode = useAppStore.getState().calendarMode;
    const data = {
      ...backupPreview.data,
      settings: {
        ...backupPreview.data.settings,
        calendarMode: currentCalendarMode,
      },
    };
    const result = useRetailStore.getState().restoreRetailData(data);
    if (!result.ok) {
      setBackupError(result.error);
      return;
    }
    setBackupError("");
    setBackupPreview(null);
    setBackupFileName("");
    notifyPersistedMutation(
      "داده‌های پشتیبان بازیابی شدند؛ پوسته و تقویم فعلی حفظ شدند.",
    );
  };
  const resetData = () => {
    resetRetailData();
    notifyPersistedMutation(
      "داده‌های کسب‌وکار به مجموعهٔ نمونهٔ اولیه بازنشانی شد.",
    );
  };
  const startEmptyStore = () => {
    initializeEmptyRetailData();
    notifyPersistedMutation("فروشگاه با دادهٔ خالی آماده شد.");
  };

  const storeName = watch("storeName");

  useEffect(() => {
    const titlePanel = document.querySelector("title") as HTMLTitleElement;

    titlePanel.textContent = storeName
      ? `${storeName} - پنل مدیریت`
      : "پنل مدیریت";
  }, [storeName]);

  return (
    <div className="workspace-page mx-auto grid w-full max-w-[1560px] min-w-0 content-start gap-4 p-4 sm:gap-5 sm:p-5 xl:p-6">
      <PageHeader
        title="تنظیمات فروشگاه"
        description="ترجیحات نمایش، موجودی و اطلاعات رسید در همین مرورگر ذخیره می‌شوند."
      />
      <form
        className="workspace-form grid min-w-0 gap-4"
        noValidate
        onSubmit={submit}
      >
        <SectionCard
          title="مشخصات فروشگاه"
          description="نام فروشگاه در سربرگ رسید محلی نمایش داده می‌شود."
        >
          <div className="form-grid grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              error={errors.storeName?.message}
              label="نام فروشگاه"
              htmlFor="settings-store-name"
              required
            >
              <Input
                {...register("storeName", {
                  required: "نام فروشگاه الزامی است.",
                })}
                id="settings-store-name"
                required
              />
            </Field>
          </div>
        </SectionCard>
        <SectionCard
          title="واحد و موجودی"
          description={`مبالغ ورودی با واحد پایهٔ تومان ذخیره می‌شوند؛ واحد نمایش فعلی ${settings.currency} است. نمایش ریالی فقط هنگام نمایش با ضریب ۱۰ محاسبه می‌شود.`}
        >
          <div className="form-grid grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <Controller
              control={control}
              name="currency"
              render={({ field, fieldState }) => (
                <Field
                  error={fieldState.error?.message}
                  label="واحد نمایش"
                  htmlFor="settings-currency"
                >
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger
                      aria-describedby={
                        fieldState.error ? "settings-currency-error" : undefined
                      }
                      aria-invalid={Boolean(fieldState.error)}
                      id="settings-currency"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="تومان">تومان</SelectItem>
                      <SelectItem value="ریال">
                        ریال · نمایش با ضریب ۱۰
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
            <Field
              error={errors.minimumStockDefault?.message}
              label="حداقل موجودی پیش‌فرض"
              htmlFor="settings-minimum-stock"
            >
              <Input
                {...register("minimumStockDefault", {
                  setValueAs: (value: string) =>
                    value === "" ? 0 : Number(value),
                  min: {
                    value: 0,
                    message: "حداقل موجودی پیش‌فرض باید عدد صحیح نامنفی باشد.",
                  },
                  validate: (value) =>
                    (Number.isInteger(value) && value >= 0) ||
                    "حداقل موجودی پیش‌فرض باید عدد صحیح نامنفی باشد.",
                })}
                id="settings-minimum-stock"
                min="0"
                step="1"
                type="number"
              />
            </Field>
          </div>
          <p className="form-field-hint text-[11px] leading-5 text-muted-foreground">
            این مقدار برای کالاهای تازه‌ثبت‌شده پیش‌فرض است؛ تغییر آن آستانهٔ
            کالاهای موجود را عوض نمی‌کند. حد هر کالا جداگانه ذخیره می‌شود.
          </p>
        </SectionCard>
        <SectionCard
          title="دسته‌بندی هزینه‌ها"
          description="شناسهٔ دسته‌ها ثابت است. تغییر نام، عنوان هزینه‌های همان شناسه را در گزارش‌ها نیز به‌روز می‌کند؛ رکوردها و مبالغ حذف یا جابه‌جا نمی‌شوند."
        >
          <div className="form-grid grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3">
            {expenseCategories.map((category, index) => (
              <Field
                key={category.id}
                label={`دستهٔ ${index + 1}`}
                htmlFor={`expense-category-${category.id}`}
              >
                <Input
                  {...register(`expenseCategories.${index}.label` as const)}
                  id={`expense-category-${category.id}`}
                />
              </Field>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="رسید و تقویم">
          <div className="form-grid grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="پایین‌نویس رسید" htmlFor="settings-receipt-footer">
              <Input
                {...register("receiptFooter")}
                id="settings-receipt-footer"
              />
            </Field>
            <label className="toggle-row flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border bg-card-raised/60 p-3 text-sm">
              <span>
                <strong>نمایش SKU یا کد داخلی کالا در رسید</strong>
                <small> در پیش‌نمایش رسید و چاپ مرورگر مصرف می‌شود.</small>
              </span>
              <input {...register("showSkuOnReceipt")} type="checkbox" />
            </label>
            <Controller
              control={control}
              name="calendarMode"
              render={({ field, fieldState }) => (
                <Field
                  error={fieldState.error?.message}
                  label="تقویم پیش‌فرض"
                  htmlFor="settings-calendar"
                >
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger
                      aria-describedby={
                        fieldState.error ? "settings-calendar-error" : undefined
                      }
                      aria-invalid={Boolean(fieldState.error)}
                      id="settings-calendar"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jalali">شمسی</SelectItem>
                      <SelectItem value="gregorian">میلادی</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </div>
          <div className="theme-preference grid min-w-0 gap-3 rounded-xl border border-border bg-card-raised/40 p-3 sm:col-span-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <span className="flex min-w-0 items-center gap-2 text-sm">
              <SunMoon aria-hidden="true" size={16} /> پوستهٔ فعلی:{" "}
              {theme === "dark" ? "تیره" : "روشن"}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => setTheme("dark")}
                size="sm"
                type="button"
                variant={theme === "dark" ? "primary" : "outline"}
              >
                تیره
              </Button>
              <Button
                onClick={() => setTheme("light")}
                size="sm"
                type="button"
                variant={theme === "light" ? "primary" : "outline"}
              >
                روشن
              </Button>
            </div>
            <small className="text-xs text-muted-foreground sm:col-span-2">
              تنظیم تقویم فعلی: {calendarMode === "jalali" ? "شمسی" : "میلادی"}
            </small>
          </div>
        </SectionCard>
        {errors.root?.message && (
          <p
            className="form-field-error text-xs leading-5 text-destructive"
            role="alert"
          >
            {errors.root.message}
          </p>
        )}
        <div className="form-actions flex flex-wrap items-center gap-2 border-t border-border/70 pt-4">
          <Button disabled={isSubmitting} type="submit" variant="primary">
            <Save aria-hidden="true" size={15} />
            {isSubmitting ? "در حال ذخیره…" : "ذخیرهٔ تنظیمات"}
          </Button>
        </div>
      </form>
      <SectionCard
        title="داده‌های محلی"
        description={`${products.length} کالا، ${sales.length} فروش، ${purchases.length} خرید و ${expenses.length} هزینهٔ جاری در این مرورگر.`}
      >
        <div className="settings-data-actions grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="settings-export-card grid min-w-0 content-between gap-3 rounded-2xl border border-border bg-card-raised/40 p-4">
            <strong>خروجی JSON</strong>
            <p className="break-words text-sm leading-6 text-muted-foreground">
              رکوردهای کاری، تنظیمات فروشگاه و ترجیحات پوسته/تقویم همین برنامه
              را در یک فایل محلی می‌سازد؛ شامل کوکی‌ها، رمزها یا دادهٔ سایت‌های
              دیگر نمی‌شود و پشتیبان ابری نیست.
            </p>
            <Button
              className="w-fit max-w-full"
              onClick={exportData}
              variant="outline"
            >
              <Download aria-hidden="true" size={15} /> دریافت فایل JSON
            </Button>
          </div>
          <div className="settings-restore-card grid min-w-0 content-between gap-3 rounded-2xl border border-warning/30 bg-warning/5 p-4">
            <div>
              <strong>بازیابی نسخهٔ پشتیبان</strong>
              <p className="break-words text-sm leading-6 text-muted-foreground">
                ابتدا فایل JSON بررسی و خلاصه‌اش نمایش داده می‌شود. هیچ داده‌ای
                پیش از تأیید صریح جایگزین نمی‌شود. برای بازگشت‌پذیری، پیش از
                بازیابی از دادهٔ فعلی خروجی بگیرید.
              </p>
            </div>
            <input
              accept=".json,application/json"
              aria-label="انتخاب فایل نسخهٔ پشتیبان"
              className="sr-only"
              id="backup-import-file"
              onChange={readBackupFile}
              ref={backupFileInput}
              type="file"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                className="w-fit max-w-full"
                disabled={isReadingBackup}
                onClick={() => backupFileInput.current?.click()}
                type="button"
                variant="outline"
              >
                {isReadingBackup
                  ? "در حال بررسی فایل…"
                  : "انتخاب فایل پشتیبان JSON"}
              </Button>
              <Button
                className="w-fit max-w-full"
                onClick={exportData}
                type="button"
                variant="outline"
              >
                <Download aria-hidden="true" size={15} /> دریافت خروجی از دادهٔ
                فعلی
              </Button>
            </div>
            {backupError && (
              <p
                className="form-field-error text-xs leading-6 text-destructive"
                role="alert"
              >
                {backupError}
              </p>
            )}
            {backupPreview && (
              <div
                aria-live="polite"
                className="backup-preview grid gap-1 rounded-xl border border-border bg-card/70 p-3 text-xs leading-6"
                role="status"
              >
                <strong className="break-all">
                  پیش‌نمایش: {backupFileName}
                </strong>
                <span>
                  {formatNumber(backupPreview.data.products.length)} کالا ·{" "}
                  {formatNumber(backupPreview.data.sales.length)} فروش ·{" "}
                  {formatNumber(backupPreview.data.purchases.length)} خرید ·{" "}
                  {formatNumber(backupPreview.data.customers.length)} مشتری ·{" "}
                  {formatNumber(backupPreview.data.suppliers.length)}{" "}
                  تأمین‌کننده ·{" "}
                  {formatNumber(backupPreview.data.expenses.length)} هزینه
                </span>
                <span>
                  {backupPreview.legacy
                    ? "قالب قدیمیِ سازگار"
                    : `نسخهٔ پشتیبان ${backupPreview.exportedAt ?? ""}`}
                </span>
                {backupPreview.appPreferences && (
                  <span>
                    پوسته/تقویم داخل فایل:{" "}
                    {backupPreview.appPreferences.theme === "dark"
                      ? "تیره"
                      : "روشن"}{" "}
                    ·{" "}
                    {backupPreview.appPreferences.calendarMode === "jalali"
                      ? "شمسی"
                      : "میلادی"}
                  </span>
                )}
                <span>
                  با بازیابی، پوسته و تقویم فعلی همین مرورگر حفظ می‌شوند.
                </span>
              </div>
            )}
            <ConfirmAction
              title="جایگزینی داده‌های فعلی با این پشتیبان؟"
              description={
                backupPreview
                  ? `فایل «${backupFileName}» شامل ${formatNumber(backupPreview.data.products.length)} کالا، ${formatNumber(backupPreview.data.sales.length)} فروش، ${formatNumber(backupPreview.data.purchases.length)} خرید و ${formatNumber(backupPreview.data.expenses.length)} هزینه است. با تأیید، رکوردهای کاری و تنظیمات فروشگاه فعلی جایگزین می‌شوند. انصراف هیچ تغییری نمی‌دهد؛ پوسته و تقویم فعلی حفظ می‌شوند.`
                  : "ابتدا یک فایل پشتیبان معتبر انتخاب کنید."
              }
              confirmLabel="بازیابی و جایگزینی"
              disabled={!backupPreview || isReadingBackup}
              onConfirm={restoreBackup}
              triggerLabel="تأیید بازیابی"
              variant="outline"
            />
          </div>
          <div className="danger-zone grid min-w-0 content-between gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 p-4">
            <strong>بارگذاری دادهٔ نمایشی (جایگزینی داده‌های محلی)</strong>
            <p className="break-words text-sm leading-6 text-muted-foreground">
              همهٔ رکوردهای کاری این مرورگر با مجموعهٔ نمونهٔ اولیه جایگزین
              می‌شوند. پوسته و تقویم برنامه جداگانه ذخیره شده و حفظ می‌شوند؛ پیش
              از ادامه خروجی JSON بگیرید.
            </p>
            <ConfirmAction
              title="جایگزینی همهٔ داده‌های محلی با نمونه؟"
              description="با تأیید، همهٔ فروش‌ها، خریدها، کالاها، هزینه‌ها، پرداخت‌ها، مرجوعی‌ها و سایر رکوردهای این مرورگر با مجموعهٔ نمونهٔ اولیه جایگزین می‌شوند؛ این کار قابل بازگشت نیست. انتخاب «انصراف» هیچ داده‌ای را تغییر نمی‌دهد. پوسته و تقویم جداگانه ذخیره شده و حفظ می‌شوند."
              confirmLabel="جایگزینی با دادهٔ نمونه"
              triggerLabel="بارگذاری نمونه"
              onConfirm={resetData}
              variant="outline"
            />
          </div>
          <div className="danger-zone grid min-w-0 content-start gap-3 rounded-2xl border border-warning/25 bg-warning/5 p-4">
            <div>
              <strong>شروع فروشگاه واقعی با دادهٔ خالی</strong>
              <p className="break-words text-sm leading-6 text-muted-foreground">
                فروش، خرید، کالا، مشتری، تأمین‌کننده، پرداخت، بدهی و سابقهٔ
                نمونه وارد نمی‌شود. این گزینه همهٔ رکوردهای کاری فعلی همین
                مرورگر را با دادهٔ خالی جایگزین می‌کند؛ پیش از ادامه، در صورت
                نیاز خروجی JSON بگیرید. نام فروشگاه، واحد پول، آستانه و
                دسته‌بندی‌های هزینه، پوسته و تقویم برنامه حفظ می‌شوند.
              </p>
            </div>
            <ConfirmAction
              title="شروع فروشگاه با دادهٔ خالی؟"
              description="با تأیید، همهٔ رکوردهای کاری فعلی این مرورگر جایگزین می‌شوند و فروشگاه بدون کالا، فروش، خرید، مشتری، تأمین‌کننده، هزینه، پرداخت، بدهی یا سابقه شروع می‌شود. این کار قابل بازگشت نیست؛ برای حفظ اطلاعات فعلی ابتدا خروجی JSON بگیرید. انتخاب «انصراف» داده‌ای را تغییر نمی‌دهد. تنظیمات فروشگاه، پوسته و تقویم حفظ می‌شوند."
              confirmLabel="شروع با دادهٔ خالی"
              triggerLabel="شروع خالی"
              onConfirm={startEmptyStore}
              variant="outline"
            />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
