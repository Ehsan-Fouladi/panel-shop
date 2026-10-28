import type { CalendarMode } from "@/lib/date";
import type { ThemeMode } from "@/store/app-store";
import { normalizePersistedRetailData } from "@/store/retail-store";
import type { RetailData, RetailProductVariant } from "@/types/retail";

export const RETAIL_BACKUP_FORMAT = "retail-store-backup";
export const RETAIL_BACKUP_SCHEMA_VERSION = 1;
export const RETAIL_BACKUP_SCOPE = "local-browser-data";

export interface RetailBackupPreferences {
  theme: ThemeMode;
  calendarMode: CalendarMode;
}

export interface RetailBackupFile {
  format: typeof RETAIL_BACKUP_FORMAT;
  schemaVersion: typeof RETAIL_BACKUP_SCHEMA_VERSION;
  exportedAt: string;
  scope: typeof RETAIL_BACKUP_SCOPE;
  note: string;
  data: RetailData & { appPreferences: RetailBackupPreferences };
}

export interface ParsedRetailBackup {
  data: RetailData;
  appPreferences?: RetailBackupPreferences;
  exportedAt?: string;
  legacy: boolean;
}

export type RetailBackupParseResult =
  { ok: true; value: ParsedRetailBackup } | { ok: false; error: string };

const expenseCategoryIds = new Set([
  "rent",
  "utilities",
  "salary",
  "transport",
  "maintenance",
  "marketing",
  "supplies",
]);
const paymentMethods = new Set(["cash", "card", "transfer"]);
const transactionStatuses = new Set(["completed", "partial", "pending"]);
const customerGroups = new Set(["walk-in", "regular", "vip"]);
const campaignTargets = new Set(["all", ...customerGroups]);
const stockMovementTypes = new Set([
  "opening",
  "purchase",
  "sale",
  "return",
  "adjustment-in",
  "adjustment-out",
  "correction",
]);
const cashMovementCategories = new Set([
  "sale",
  "customer-payment",
  "purchase",
  "supplier-payment",
  "expense",
  "refund",
  "reversal",
  "adjustment",
]);
const paymentKinds = new Set([
  "sale",
  "sale-settlement",
  "purchase",
  "supplier-settlement",
  "expense",
  "refund",
  "reversal",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasText(value: unknown): value is string {
  return typeof value === "string";
}

function hasNonEmptyText(value: unknown): value is string {
  return hasText(value) && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day
  );
}

function isTime(value: unknown): boolean {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function optional(
  value: Record<string, unknown>,
  key: string,
  predicate: (entry: unknown) => boolean,
) {
  return value[key] === undefined || predicate(value[key]);
}

function isPaymentMethod(value: unknown): boolean {
  return typeof value === "string" && paymentMethods.has(value);
}

function isVariant(value: unknown): value is RetailProductVariant {
  if (!isRecord(value)) return false;
  return (
    hasNonEmptyText(value.id) &&
    hasNonEmptyText(value.code) &&
    Array.isArray(value.attributes) &&
    value.attributes.every(
      (attribute) =>
        isRecord(attribute) &&
        hasText(attribute.name) &&
        hasText(attribute.value),
    ) &&
    isNonNegativeInteger(value.stock) &&
    optional(value, "sku", hasText) &&
    optional(value, "barcode", hasText) &&
    optional(
      value,
      "barcodeFormat",
      (format) => format === "linear" || format === "qr",
    )
  );
}

function isProduct(value: unknown, legacy: boolean): boolean {
  if (!isRecord(value)) return false;
  const baseValid =
    hasNonEmptyText(value.id) &&
    hasNonEmptyText(value.name) &&
    hasText(value.sku) &&
    hasText(value.category) &&
    hasText(value.unit) &&
    isNonNegativeInteger(value.stock) &&
    isNonNegativeInteger(value.minimumStock) &&
    isNonNegativeNumber(value.purchaseCost) &&
    isNonNegativeNumber(value.sellingPrice) &&
    hasText(value.description) &&
    typeof value.active === "boolean" &&
    isDateKey(value.createdAt) &&
    isDateKey(value.updatedAt) &&
    optional(value, "brand", hasText) &&
    optional(value, "barcode", hasText) &&
    optional(
      value,
      "barcodeFormat",
      (format) => format === "linear" || format === "qr",
    );
  if (!baseValid) return false;
  if (legacy && value.variants === undefined) return true;
  if (!Array.isArray(value.variants) || !value.variants.every(isVariant))
    return false;
  return (
    new Set(value.variants.map((variant) => variant.id)).size ===
    value.variants.length
  );
}

function isSaleItem(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    hasNonEmptyText(value.productId) &&
    hasText(value.productName) &&
    isNonNegativeInteger(value.quantity) &&
    Number(value.quantity) > 0 &&
    isNonNegativeNumber(value.unitPrice) &&
    isNonNegativeNumber(value.unitCost) &&
    isNonNegativeNumber(value.discountAmount) &&
    isNonNegativeNumber(value.lineTotal) &&
    optional(value, "id", hasText) &&
    optional(value, "variantId", hasText) &&
    optional(value, "variantCode", hasText) &&
    optional(value, "variantLabel", hasText)
  );
}

function isSale(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    hasNonEmptyText(value.id) &&
    hasNonEmptyText(value.reference) &&
    isDateKey(value.date) &&
    hasNonEmptyText(value.customerId) &&
    hasText(value.customerName) &&
    hasNonEmptyText(value.productId) &&
    hasText(value.productName) &&
    isNonNegativeInteger(value.itemCount) &&
    isNonNegativeNumber(value.amount) &&
    isNonNegativeNumber(value.paidAmount) &&
    isPaymentMethod(value.paymentMethod) &&
    typeof value.status === "string" &&
    transactionStatuses.has(value.status) &&
    Array.isArray(value.items) &&
    value.items.length > 0 &&
    value.items.every(isSaleItem) &&
    isNonNegativeNumber(value.grossAmount) &&
    isNonNegativeNumber(value.discountAmount) &&
    isNonNegativeNumber(value.returnedAmount) &&
    isTime(value.time) &&
    typeof value.baseline === "boolean" &&
    optional(value, "dueDate", isDateKey) &&
    optional(value, "voidedAt", isDateKey) &&
    optional(value, "voidReason", hasText)
  );
}

function isPurchaseItem(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    hasNonEmptyText(value.productId) &&
    hasText(value.productName) &&
    isNonNegativeInteger(value.quantity) &&
    Number(value.quantity) > 0 &&
    isNonNegativeNumber(value.unitCost) &&
    isNonNegativeNumber(value.additionalCostPerUnit) &&
    isNonNegativeNumber(value.lineTotal) &&
    optional(value, "id", hasText) &&
    optional(value, "variantId", hasText) &&
    optional(value, "variantCode", hasText) &&
    optional(value, "variantLabel", hasText)
  );
}

function isPurchase(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    hasNonEmptyText(value.id) &&
    hasNonEmptyText(value.reference) &&
    isDateKey(value.date) &&
    hasNonEmptyText(value.supplierId) &&
    hasText(value.supplierName) &&
    hasText(value.description) &&
    isNonNegativeNumber(value.amount) &&
    isNonNegativeNumber(value.paidAmount) &&
    isPaymentMethod(value.paymentMethod) &&
    typeof value.status === "string" &&
    transactionStatuses.has(value.status) &&
    Array.isArray(value.items) &&
    value.items.length > 0 &&
    value.items.every(isPurchaseItem) &&
    isNonNegativeNumber(value.additionalCosts) &&
    typeof value.received === "boolean" &&
    typeof value.baseline === "boolean" &&
    optional(value, "receivedAt", isDateKey) &&
    optional(value, "dueDate", isDateKey)
  );
}

function isCustomer(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    hasNonEmptyText(value.id) &&
    hasNonEmptyText(value.name) &&
    hasText(value.phone) &&
    typeof value.group === "string" &&
    customerGroups.has(value.group) &&
    hasText(value.address) &&
    hasText(value.notes) &&
    isDateKey(value.createdAt) &&
    typeof value.active === "boolean"
  );
}

function isSupplier(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    hasNonEmptyText(value.id) &&
    hasNonEmptyText(value.name) &&
    hasText(value.phone) &&
    hasText(value.email) &&
    hasText(value.address) &&
    hasText(value.notes) &&
    isDateKey(value.createdAt) &&
    typeof value.active === "boolean"
  );
}

function isExpense(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    hasNonEmptyText(value.id) &&
    hasNonEmptyText(value.reference) &&
    isDateKey(value.date) &&
    typeof value.categoryId === "string" &&
    expenseCategoryIds.has(value.categoryId) &&
    hasText(value.categoryLabel) &&
    hasText(value.description) &&
    isNonNegativeNumber(value.amount) &&
    isPaymentMethod(value.paymentMethod) &&
    hasText(value.notes)
  );
}

function isPayment(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    hasNonEmptyText(value.id) &&
    hasNonEmptyText(value.reference) &&
    isDateKey(value.date) &&
    isTime(value.time) &&
    (value.direction === "in" || value.direction === "out") &&
    typeof value.kind === "string" &&
    paymentKinds.has(value.kind) &&
    isNonNegativeNumber(value.amount) &&
    isPaymentMethod(value.method) &&
    hasText(value.description) &&
    optional(value, "customerId", hasText) &&
    optional(value, "supplierId", hasText) &&
    optional(value, "relatedSaleId", hasText) &&
    optional(value, "relatedPurchaseId", hasText) &&
    optional(value, "relatedExpenseId", hasText) &&
    optional(value, "relatedReturnId", hasText)
  );
}

function isStockMovement(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    hasNonEmptyText(value.id) &&
    hasText(value.reference) &&
    isDateKey(value.date) &&
    isTime(value.time) &&
    hasNonEmptyText(value.productId) &&
    hasText(value.productName) &&
    typeof value.type === "string" &&
    stockMovementTypes.has(value.type) &&
    isFiniteNumber(value.quantityChange) &&
    isNonNegativeInteger(value.previousStock) &&
    isNonNegativeInteger(value.resultingStock) &&
    hasText(value.reason) &&
    hasText(value.source) &&
    optional(value, "variantId", hasText) &&
    optional(value, "variantLabel", hasText) &&
    optional(value, "relatedRecordId", hasText)
  );
}

function isCashMovement(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    hasNonEmptyText(value.id) &&
    hasText(value.reference) &&
    isDateKey(value.date) &&
    isTime(value.time) &&
    (value.direction === "in" || value.direction === "out") &&
    typeof value.category === "string" &&
    cashMovementCategories.has(value.category) &&
    isNonNegativeNumber(value.amount) &&
    isPaymentMethod(value.method) &&
    hasText(value.description) &&
    optional(value, "relatedSaleId", hasText) &&
    optional(value, "relatedPurchaseId", hasText) &&
    optional(value, "relatedExpenseId", hasText) &&
    optional(value, "relatedPaymentId", hasText) &&
    optional(value, "relatedReturnId", hasText)
  );
}

function isReturnItem(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    hasNonEmptyText(value.productId) &&
    hasText(value.productName) &&
    isNonNegativeInteger(value.quantity) &&
    Number(value.quantity) > 0 &&
    isNonNegativeNumber(value.unitPrice) &&
    isNonNegativeNumber(value.amount) &&
    typeof value.restocked === "boolean" &&
    optional(value, "variantId", hasText) &&
    optional(value, "variantCode", hasText) &&
    optional(value, "variantLabel", hasText)
  );
}

function isReturn(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    hasNonEmptyText(value.id) &&
    hasNonEmptyText(value.reference) &&
    isDateKey(value.date) &&
    hasNonEmptyText(value.saleId) &&
    hasNonEmptyText(value.saleReference) &&
    hasNonEmptyText(value.customerId) &&
    hasText(value.customerName) &&
    Array.isArray(value.items) &&
    value.items.length > 0 &&
    value.items.every(isReturnItem) &&
    isNonNegativeNumber(value.amount) &&
    isNonNegativeNumber(value.refundAmount) &&
    isNonNegativeNumber(value.receivableReduction) &&
    isPaymentMethod(value.refundMethod) &&
    hasText(value.reason)
  );
}

function isPurchaseReturnItem(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    hasNonEmptyText(value.productId) &&
    hasText(value.productName) &&
    isNonNegativeInteger(value.quantity) &&
    Number(value.quantity) > 0 &&
    isNonNegativeNumber(value.unitCost) &&
    isNonNegativeNumber(value.amount) &&
    optional(value, "variantId", hasText) &&
    optional(value, "variantCode", hasText) &&
    optional(value, "variantLabel", hasText)
  );
}

function isPurchaseReturn(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    hasNonEmptyText(value.id) &&
    hasNonEmptyText(value.reference) &&
    isDateKey(value.date) &&
    hasNonEmptyText(value.purchaseId) &&
    hasNonEmptyText(value.purchaseReference) &&
    hasNonEmptyText(value.supplierId) &&
    hasText(value.supplierName) &&
    Array.isArray(value.items) &&
    value.items.length > 0 &&
    value.items.every(isPurchaseReturnItem) &&
    isNonNegativeNumber(value.amount) &&
    isNonNegativeNumber(value.supplierCredit) &&
    hasText(value.reason)
  );
}

function isCashSession(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    hasNonEmptyText(value.id) &&
    isDateKey(value.openedAt) &&
    isTime(value.openedTime) &&
    isNonNegativeNumber(value.openingAmount) &&
    optional(value, "closedAt", isDateKey) &&
    optional(value, "closedTime", isTime) &&
    optional(value, "expectedClosing", isNonNegativeNumber) &&
    optional(value, "actualClosing", isNonNegativeNumber) &&
    optional(value, "difference", isFiniteNumber) &&
    optional(value, "note", hasText)
  );
}

function isCampaign(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    hasNonEmptyText(value.id) &&
    hasNonEmptyText(value.title) &&
    hasText(value.message) &&
    typeof value.target === "string" &&
    campaignTargets.has(value.target) &&
    (value.status === "draft" || value.status === "simulation-requested") &&
    isDateKey(value.createdAt) &&
    optional(value, "simulatedAt", isDateKey)
  );
}

function isSettings(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    hasNonEmptyText(value.storeName) &&
    (value.currency === "تومان" || value.currency === "ریال") &&
    isNonNegativeInteger(value.minimumStockDefault) &&
    isNonNegativeNumber(value.taxRatePercent) &&
    (value.taxBasis === "net-sales" || value.taxBasis === "net-profit") &&
    Array.isArray(value.expenseCategories) &&
    value.expenseCategories.every(
      (category) =>
        isRecord(category) &&
        typeof category.id === "string" &&
        expenseCategoryIds.has(category.id) &&
        hasNonEmptyText(category.label),
    ) &&
    hasText(value.receiptFooter) &&
    typeof value.showSkuOnReceipt === "boolean" &&
    (value.calendarMode === "jalali" || value.calendarMode === "gregorian")
  );
}

function hasUniqueRecordIds(records: unknown[]): boolean {
  const ids = records.map((record) =>
    isRecord(record) ? record.id : undefined,
  );
  return ids.every(hasNonEmptyText) && new Set(ids).size === ids.length;
}

function validateRetailData(
  value: unknown,
  legacy: boolean,
): { data?: RetailData; error?: string } {
  if (!isRecord(value))
    return { error: "ساختار دادهٔ فروشگاه در فایل موجود نیست." };
  const sections: Array<{
    key: keyof RetailData;
    label: string;
    isValid: (row: unknown) => boolean;
  }> = [
    {
      key: "products",
      label: "کالاها",
      isValid: (row) => isProduct(row, legacy),
    },
    { key: "sales", label: "فروش‌ها", isValid: isSale },
    { key: "purchases", label: "خریدها", isValid: isPurchase },
    { key: "customers", label: "مشتریان", isValid: isCustomer },
    { key: "suppliers", label: "تأمین‌کنندگان", isValid: isSupplier },
    { key: "expenses", label: "هزینه‌ها", isValid: isExpense },
    { key: "payments", label: "پرداخت‌ها", isValid: isPayment },
    { key: "stockMovements", label: "گردش موجودی", isValid: isStockMovement },
    { key: "cashMovements", label: "گردش صندوق", isValid: isCashMovement },
    { key: "returns", label: "مرجوعی‌ها", isValid: isReturn },
    { key: "cashSessions", label: "نوبت‌های صندوق", isValid: isCashSession },
    { key: "campaigns", label: "پویش‌ها", isValid: isCampaign },
  ];

  for (const section of sections) {
    const records = value[section.key];
    if (
      !Array.isArray(records) ||
      !records.every(section.isValid) ||
      !hasUniqueRecordIds(records)
    ) {
      return { error: `بخش «${section.label}» ناقص یا نامعتبر است.` };
    }
  }
  if (value.purchaseReturns !== undefined) {
    const records = value.purchaseReturns;
    if (
      !Array.isArray(records) ||
      !records.every(isPurchaseReturn) ||
      !hasUniqueRecordIds(records)
    ) {
      return { error: "بخش «مرجوعی‌های خرید» ناقص یا نامعتبر است." };
    }
  }
  if (!isSettings(value.settings))
    return { error: "تنظیمات فروشگاه ناقص یا نامعتبر است." };

  const retailValue = { ...value };
  delete retailValue.appPreferences;
  const normalized = normalizePersistedRetailData(retailValue);
  if (!normalized)
    return { error: "داده‌های فروشگاه با ساختار فعلی سازگار نیستند." };
  return { data: normalized };
}

function parsePreferences(
  value: unknown,
): RetailBackupPreferences | undefined | null {
  if (value === undefined) return undefined;
  if (!isRecord(value)) return null;
  if (
    (value.theme !== "dark" && value.theme !== "light") ||
    (value.calendarMode !== "jalali" && value.calendarMode !== "gregorian")
  ) {
    return null;
  }
  return { theme: value.theme, calendarMode: value.calendarMode };
}

export function createRetailBackup(
  data: RetailData,
  appPreferences: RetailBackupPreferences,
  exportedAt = new Date().toISOString(),
): RetailBackupFile {
  return {
    format: RETAIL_BACKUP_FORMAT,
    schemaVersion: RETAIL_BACKUP_SCHEMA_VERSION,
    exportedAt,
    scope: RETAIL_BACKUP_SCOPE,
    note: "پشتیبان محلی فروشگاه؛ این فایل فقط برای همین برنامه است و نسخهٔ پشتیبان ابری نیست.",
    data: {
      ...data,
      settings: { ...data.settings, calendarMode: appPreferences.calendarMode },
      appPreferences: { ...appPreferences },
    },
  };
}

export function parseRetailBackupText(text: string): RetailBackupParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "فایل انتخاب‌شده JSON معتبر نیست." };
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: "ساختار فایل پشتیبان معتبر نیست." };
  }
  const hasFormat = parsed.format !== undefined;
  const hasVersion = parsed.schemaVersion !== undefined;
  const legacy =
    !hasFormat && !hasVersion && parsed.scope === RETAIL_BACKUP_SCOPE;

  if (!legacy) {
    if (parsed.format !== RETAIL_BACKUP_FORMAT) {
      return { ok: false, error: "این فایل نسخهٔ پشتیبان فروشگاه نیست." };
    }
    if (parsed.schemaVersion !== RETAIL_BACKUP_SCHEMA_VERSION) {
      return { ok: false, error: "نسخهٔ فایل پشتیبان پشتیبانی نمی‌شود." };
    }
  }
  if (parsed.scope !== RETAIL_BACKUP_SCOPE || !isRecord(parsed.data)) {
    return { ok: false, error: "فایل پشتیبان ناقص یا ناسازگار است." };
  }
  if (
    !legacy &&
    (typeof parsed.exportedAt !== "string" ||
      !Number.isFinite(Date.parse(parsed.exportedAt)))
  ) {
    return { ok: false, error: "زمان صدور فایل پشتیبان نامعتبر است." };
  }

  const preferences = parsePreferences(parsed.data.appPreferences);
  if (preferences === null || (!legacy && preferences === undefined)) {
    return {
      ok: false,
      error: "ترجیحات پوسته یا تقویم در فایل پشتیبان نامعتبر است.",
    };
  }
  const validated = validateRetailData(parsed.data, legacy);
  if (!validated.data) {
    return {
      ok: false,
      error: `${validated.error ?? "دادهٔ فروشگاه نامعتبر است."} هیچ تغییری اعمال نشد.`,
    };
  }

  return {
    ok: true,
    value: {
      data: validated.data,
      appPreferences: preferences ?? undefined,
      exportedAt:
        typeof parsed.exportedAt === "string" ? parsed.exportedAt : undefined,
      legacy,
    },
  };
}
