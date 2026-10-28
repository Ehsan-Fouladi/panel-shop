import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  createEmptyRetailData,
  createInitialRetailData,
} from "@/data/retail-seed";
import { getTodayDateKey, parseDateKey } from "@/lib/date";
import {
  formatVariantAttributes,
  normalizeIdentificationCode,
  normalizeIdentificationFormat,
  normalizeVariantAttributes,
  validateIdentificationCode,
  variantSignature,
} from "@/lib/product-variants";
import {
  getPurchaseReturnedQuantities,
  getSaleNetPaidAmount,
  getSaleOutstanding,
  getSaleStatus,
  isSaleVoided,
} from "@/lib/retail-data";
import {
  getStorageHealth,
  RETAIL_STORAGE_KEY,
  reportStorageReadFailure,
  safeLocalStorage,
} from "@/lib/safe-storage";
import type {
  CampaignRecord,
  CashMovementCategory,
  CashMovementRecord,
  CashSessionRecord,
  OperationOutcome,
  PaymentKind,
  PaymentMethod,
  PaymentRecord,
  ProductIdentificationFormat,
  ProductVariantAttribute,
  PurchaseItem,
  PurchaseReturnRecord,
  RetailCustomer,
  RetailData,
  RetailExpense,
  RetailProduct,
  RetailProductVariant,
  RetailPurchase,
  RetailSale,
  RetailSettings,
  RetailSupplier,
  ReturnRecord,
  SaleItem,
  StockMovementRecord,
  StockMovementType,
} from "@/types/retail";
import { statusForBalance } from "@/types/retail";

export interface ProductVariantInput {
  id?: string;
  code?: string;
  attributes: ProductVariantAttribute[];
  stock: number;
  sku?: string;
  barcode?: string;
  barcodeFormat?: ProductIdentificationFormat;
}

export interface ProductInput {
  name: string;
  brand: string;
  sku: string;
  barcode: string;
  barcodeFormat?: ProductIdentificationFormat;
  category: string;
  unit: string;
  purchaseCost: number;
  sellingPrice: number;
  stock: number;
  minimumStock: number;
  description: string;
  variants: ProductVariantInput[];
}

export interface SaleInput {
  date: string;
  time?: string;
  customerId: string;
  items: Array<{
    id?: string;
    productId: string;
    variantId?: string;
    quantity: number;
    unitPrice: number;
  }>;
  discountAmount: number;
  paidAmount: number;
  paymentMethod: PaymentMethod;
  dueDate?: string;
}

export interface PurchaseInput {
  date: string;
  supplierId: string;
  items: Array<{
    id?: string;
    productId: string;
    variantId?: string;
    quantity: number;
    unitCost: number;
  }>;
  additionalCosts: number;
  paidAmount: number;
  paymentMethod: PaymentMethod;
  dueDate?: string;
  received: boolean;
}

export interface ExpenseInput {
  date: string;
  categoryId: RetailExpense["categoryId"];
  categoryLabel: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes: string;
}

export interface CustomerInput {
  name: string;
  phone: string;
  group: RetailCustomer["group"];
  address: string;
  notes: string;
}

export interface SupplierInput {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

export interface ReturnInput {
  date: string;
  saleId: string;
  reason: string;
  refundMethod: PaymentMethod;
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    restocked: boolean;
  }>;
}

export interface PurchaseReturnInput {
  date: string;
  purchaseId: string;
  reason: string;
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
  }>;
}

interface RetailActions {
  createProduct: (input: ProductInput) => OperationOutcome<RetailProduct>;
  updateProduct: (
    id: string,
    input: ProductInput,
    stockAdjustmentReason: string,
  ) => OperationOutcome<RetailProduct>;
  setProductActive: (
    id: string,
    active: boolean,
  ) => OperationOutcome<RetailProduct>;
  adjustStock: (
    productId: string,
    delta: number,
    reason: string,
    variantId?: string,
  ) => OperationOutcome<RetailProduct>;
  createSale: (input: SaleInput) => OperationOutcome<RetailSale>;
  addSalePayment: (
    saleId: string,
    amount: number,
    method: PaymentMethod,
    date: string,
  ) => OperationOutcome<RetailSale>;
  createPurchase: (input: PurchaseInput) => OperationOutcome<RetailPurchase>;
  receivePurchase: (
    purchaseId: string,
    date: string,
  ) => OperationOutcome<RetailPurchase>;
  addPurchasePayment: (
    purchaseId: string,
    amount: number,
    method: PaymentMethod,
    date: string,
  ) => OperationOutcome<RetailPurchase>;
  createExpense: (input: ExpenseInput) => OperationOutcome<RetailExpense>;
  deleteExpense: (expenseId: string) => OperationOutcome<RetailExpense>;
  createCustomer: (input: CustomerInput) => OperationOutcome<RetailCustomer>;
  updateCustomer: (
    id: string,
    input: CustomerInput,
  ) => OperationOutcome<RetailCustomer>;
  deleteCustomer: (id: string) => OperationOutcome<RetailCustomer>;
  createSupplier: (input: SupplierInput) => OperationOutcome<RetailSupplier>;
  updateSupplier: (
    id: string,
    input: SupplierInput,
  ) => OperationOutcome<RetailSupplier>;
  createReturn: (input: ReturnInput) => OperationOutcome<ReturnRecord>;
  voidSale: (
    saleId: string,
    reason: string,
    date: string,
  ) => OperationOutcome<RetailSale>;
  createPurchaseReturn: (
    input: PurchaseReturnInput,
  ) => OperationOutcome<PurchaseReturnRecord>;
  openCashSession: (
    openingAmount: number,
    date: string,
  ) => OperationOutcome<CashSessionRecord>;
  closeCashSession: (
    actualAmount: number,
    date: string,
  ) => OperationOutcome<CashSessionRecord>;
  createCampaign: (
    input: Omit<CampaignRecord, "id" | "status" | "createdAt">,
  ) => CampaignRecord;
  simulateCampaign: (campaignId: string) => OperationOutcome<CampaignRecord>;
  updateSettings: (
    settings: Partial<RetailSettings>,
  ) => OperationOutcome<RetailSettings>;
  restoreRetailData: (data: RetailData) => OperationOutcome<RetailData>;
  resetRetailData: () => void;
  initializeEmptyRetailData: () => void;
}

export type RetailStore = RetailData & RetailActions;

let idCounter = 1;
let referenceCounter = 1;

function makeId(prefix: string): string {
  const sequence = idCounter++;
  return `${prefix}-${Date.now().toString(36)}-${sequence.toString(36)}`;
}

function makeReference(prefix: string, date: string): string {
  const year = date.slice(0, 4) || "2026";
  return `${prefix}-${year}-${String(referenceCounter++).padStart(4, "0")}`;
}

function currentTime(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tehran",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
}

function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const { year, month, day } = parseDateKey(value);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

function fail<T>(error: string): OperationOutcome<T> {
  return { ok: false, error };
}

function ok<T>(value: T): OperationOutcome<T> {
  return { ok: true, value };
}

function makePayment(input: {
  date: string;
  direction: "in" | "out";
  kind: PaymentKind;
  amount: number;
  method: PaymentMethod;
  description: string;
  reference: string;
  customerId?: string;
  supplierId?: string;
  relatedSaleId?: string;
  relatedPurchaseId?: string;
  relatedExpenseId?: string;
  relatedReturnId?: string;
}): PaymentRecord {
  return {
    id: makeId("payment"),
    reference: input.reference,
    date: input.date,
    time: currentTime(),
    direction: input.direction,
    kind: input.kind,
    amount: input.amount,
    method: input.method,
    description: input.description,
    customerId: input.customerId,
    supplierId: input.supplierId,
    relatedSaleId: input.relatedSaleId,
    relatedPurchaseId: input.relatedPurchaseId,
    relatedExpenseId: input.relatedExpenseId,
    relatedReturnId: input.relatedReturnId,
  };
}

function cashCategory(kind: PaymentKind): CashMovementCategory {
  switch (kind) {
    case "sale":
      return "sale";
    case "sale-settlement":
      return "customer-payment";
    case "purchase":
      return "purchase";
    case "supplier-settlement":
      return "supplier-payment";
    case "expense":
      return "expense";
    case "refund":
      return "refund";
    case "reversal":
      return "reversal";
  }
}

function cashMovementForPayment(
  payment: PaymentRecord,
): CashMovementRecord | null {
  if (payment.method !== "cash") return null;
  return {
    id: makeId("cash"),
    reference: payment.reference,
    date: payment.date,
    time: payment.time,
    direction: payment.direction,
    category: cashCategory(payment.kind),
    amount: payment.amount,
    method: payment.method,
    description: payment.description,
    relatedSaleId: payment.relatedSaleId,
    relatedPurchaseId: payment.relatedPurchaseId,
    relatedExpenseId: payment.relatedExpenseId,
    relatedPaymentId: payment.id,
    relatedReturnId: payment.relatedReturnId,
  };
}

function makeStockMovement(input: {
  date: string;
  product: RetailProduct;
  type: StockMovementType;
  quantityChange: number;
  previousStock: number;
  reason: string;
  source: string;
  relatedRecordId?: string;
  reference?: string;
  variantId?: string;
  variantLabel?: string;
}): StockMovementRecord {
  return {
    id: makeId("movement"),
    reference: input.reference ?? makeReference("م", input.date),
    date: input.date,
    time: currentTime(),
    productId: input.product.id,
    productName: input.product.name,
    variantId: input.variantId,
    variantLabel: input.variantLabel,
    type: input.type,
    quantityChange: input.quantityChange,
    previousStock: input.previousStock,
    resultingStock: input.previousStock + input.quantityChange,
    reason: input.reason,
    source: input.source,
    relatedRecordId: input.relatedRecordId,
  };
}

function productInputIsValid(input: ProductInput): string | null {
  if (!input.name.trim()) return "نام کالا الزامی است.";
  if (!input.category.trim()) return "دسته‌بندی کالا را وارد کنید.";
  if (!input.unit.trim()) return "واحد کالا را وارد کنید.";
  if (!Number.isFinite(input.purchaseCost) || input.purchaseCost < 0)
    return "بهای خرید معتبر نیست.";
  if (!Number.isFinite(input.sellingPrice) || input.sellingPrice < 0)
    return "قیمت فروش معتبر نیست.";
  if (!Number.isInteger(input.stock) || input.stock < 0)
    return "موجودی باید عدد صحیح و نامنفی باشد.";
  if (!Number.isInteger(input.minimumStock) || input.minimumStock < 0) {
    return "حداقل موجودی باید عدد صحیح و نامنفی باشد.";
  }
  const productCodeError = validateIdentificationCode(
    input.barcode,
    input.barcodeFormat,
  );
  if (productCodeError) return `کد شناسایی محصول: ${productCodeError}`;
  for (const [index, variant] of (input.variants ?? []).entries()) {
    const variantCodeError = validateIdentificationCode(
      variant.barcode,
      variant.barcodeFormat,
    );
    if (variantCodeError) {
      return `کد شناسایی گونهٔ ${index + 1}: ${variantCodeError}`;
    }
  }
  return null;
}

function normalizeProductVariants(source: ProductVariantInput[] | undefined): {
  variants: RetailProductVariant[];
  error?: string;
} {
  const variants: RetailProductVariant[] = [];
  const signatures = new Set<string>();
  const ids = new Set<string>();
  for (const input of source ?? []) {
    if (!Number.isInteger(input.stock) || input.stock < 0) {
      return {
        variants: [],
        error: "موجودی هر گونه باید عدد صحیح و نامنفی باشد.",
      };
    }
    const attributes = normalizeVariantAttributes(input.attributes);
    if (!attributes.length) {
      return { variants: [], error: "برای هر گونه حداقل یک مشخصه وارد کنید." };
    }
    const names = new Set<string>();
    for (const attribute of attributes) {
      const name = attribute.name.toLocaleLowerCase();
      if (names.has(name)) {
        return { variants: [], error: "نام مشخصه را در یک گونه تکرار نکنید." };
      }
      names.add(name);
    }
    const signature = variantSignature(attributes);
    if (signatures.has(signature)) {
      return { variants: [], error: "ترکیب مشخصه‌های گونه‌ها باید یکتا باشد." };
    }
    signatures.add(signature);
    const id = input.id?.trim() || makeId("variant");
    if (ids.has(id))
      return { variants: [], error: "شناسهٔ گونه‌ها باید یکتا باشد." };
    ids.add(id);
    const code = input.code?.trim() || `V-${id.toLocaleUpperCase()}`;
    const barcode = normalizeIdentificationCode(input.barcode);
    variants.push({
      id,
      code,
      attributes,
      stock: input.stock,
      sku: input.sku?.trim() || undefined,
      barcode: barcode || undefined,
      barcodeFormat: normalizeIdentificationFormat(
        input.barcodeFormat,
        barcode,
      ),
    });
  }
  return { variants };
}

function productCodeSetsValidationError(
  identificationValues: Array<string | undefined>,
  legacyValues: Array<string | undefined>,
  products: RetailProduct[],
  currentProductId?: string,
  candidateActive = true,
): string | null {
  const normalizeLegacyCode = (value: string | undefined) =>
    value?.normalize("NFC").trim().toLocaleLowerCase() ?? "";
  const existingLegacyCodes = new Set<string>();
  const activeLegacyCodes = new Set<string>();
  const activeIdentificationCodes = new Set<string>();
  const activeIdentificationLookupKeys = new Set<string>();
  for (const product of products) {
    if (product.id === currentProductId) continue;
    const legacyCodes = [
      product.id,
      product.sku,
      ...(product.variants ?? []).flatMap((variant) => [
        variant.code,
        variant.sku,
      ]),
    ];
    for (const code of legacyCodes) {
      const normalized = normalizeLegacyCode(code);
      if (!normalized) continue;
      existingLegacyCodes.add(normalized);
      if (product.active) activeLegacyCodes.add(normalized);
    }
    if (!product.active) continue;
    for (const code of [
      product.barcode,
      ...(product.variants ?? []).map((variant) => variant.barcode),
    ]) {
      const normalized = normalizeIdentificationCode(code);
      if (!normalized) continue;
      activeIdentificationCodes.add(normalized);
      const lookupKey = normalizeLegacyCode(normalized);
      if (lookupKey) activeIdentificationLookupKeys.add(lookupKey);
    }
  }

  const incomingLegacyCodes = legacyValues
    .map(normalizeLegacyCode)
    .filter(Boolean);
  if (
    new Set(incomingLegacyCodes).size !== incomingLegacyCodes.length ||
    incomingLegacyCodes.some((code) => existingLegacyCodes.has(code))
  ) {
    return "SKU یا کد داخلی کالا/گونه قبلاً ثبت شده است.";
  }
  if (!candidateActive) return null;

  const incomingIdentificationCodes = identificationValues
    .map((code) => normalizeIdentificationCode(code))
    .filter((code) => code.length > 0);
  const incomingIdentificationLookupKeys = incomingIdentificationCodes
    .map(normalizeLegacyCode)
    .filter(Boolean);
  const incomingLegacyCodeSet = new Set(incomingLegacyCodes);
  if (
    new Set(incomingIdentificationCodes).size !==
      incomingIdentificationCodes.length ||
    incomingIdentificationCodes.some((code) =>
      activeIdentificationCodes.has(code),
    ) ||
    incomingIdentificationLookupKeys.some(
      (code) => activeLegacyCodes.has(code) || incomingLegacyCodeSet.has(code),
    ) ||
    incomingLegacyCodes.some((code) => activeIdentificationLookupKeys.has(code))
  ) {
    return "این کد با SKU، کد داخلی یا شناسهٔ بارکد/QR یک کالای فعال تداخل دارد؛ کدها باید یکتا باشند.";
  }
  return null;
}

function productCodeValidationError(
  input: ProductInput,
  variants: RetailProductVariant[],
  products: RetailProduct[],
  currentProductId?: string,
  candidateActive = true,
): string | null {
  return productCodeSetsValidationError(
    [input.barcode, ...variants.map((variant) => variant.barcode)],
    [input.sku, ...variants.flatMap((variant) => [variant.code, variant.sku])],
    products,
    currentProductId,
    candidateActive,
  );
}

function variantForProduct(
  product: RetailProduct,
  variantId?: string,
): RetailProductVariant | undefined {
  return variantId
    ? product.variants.find((variant) => variant.id === variantId)
    : undefined;
}

function variantStockTotal(variants: RetailProductVariant[]): number {
  return variants.reduce((sum, variant) => sum + variant.stock, 0);
}

function syncSaleBalance(
  sale: RetailSale,
  returnRecords: ReturnRecord[],
): RetailSale {
  return { ...sale, status: getSaleStatus(sale, returnRecords) };
}

function syncPurchaseBalance(purchase: RetailPurchase): RetailPurchase {
  return {
    ...purchase,
    status: statusForBalance(purchase.amount, purchase.paidAmount),
  };
}

function allocateAdditionalCostPerUnit(
  items: Array<Pick<PurchaseItem, "quantity" | "unitCost" | "lineTotal">>,
  additionalCosts: number,
): number[] {
  const totalBaseCost = items.reduce(
    (sum, item) =>
      sum +
      (Number.isFinite(item.lineTotal) && item.lineTotal >= 0
        ? item.lineTotal
        : item.quantity * item.unitCost),
    0,
  );
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  let allocatedSoFar = 0;

  return items.map((item, index) => {
    const lineTotal =
      Number.isFinite(item.lineTotal) && item.lineTotal >= 0
        ? item.lineTotal
        : item.quantity * item.unitCost;
    const lineAllocation =
      index === items.length - 1
        ? additionalCosts - allocatedSoFar
        : totalBaseCost > 0
          ? (additionalCosts * lineTotal) / totalBaseCost
          : totalQuantity > 0
            ? (additionalCosts * item.quantity) / totalQuantity
            : 0;
    allocatedSoFar += lineAllocation;
    return item.quantity > 0 ? lineAllocation / item.quantity : 0;
  });
}

function receiptAdditionalCostPerUnit(
  items: RetailPurchase["items"],
  additionalCosts: number,
): number[] {
  const hasCompleteAllocations = items.every(
    (item) =>
      Number.isFinite(item.additionalCostPerUnit) &&
      item.additionalCostPerUnit >= 0,
  );
  const allocatedTotal = items.reduce(
    (sum, item) => sum + (item.additionalCostPerUnit ?? 0) * item.quantity,
    0,
  );
  const tolerance = Math.max(0.01, Math.abs(additionalCosts) * 1e-9);
  if (
    hasCompleteAllocations &&
    Math.abs(allocatedTotal - additionalCosts) <= tolerance
  ) {
    return items.map((item) => item.additionalCostPerUnit);
  }
  return allocateAdditionalCostPerUnit(items, additionalCosts);
}

function applyReceivedItems(
  products: RetailProduct[],
  items: RetailPurchase["items"],
  additionalCosts: number,
  purchase: RetailPurchase,
  date: string,
): {
  products: RetailProduct[];
  movements: StockMovementRecord[];
  error?: string;
} {
  const updatedProducts = [...products];
  const movements: StockMovementRecord[] = [];
  const allocatedAdditionalCosts = receiptAdditionalCostPerUnit(
    items,
    additionalCosts,
  );

  for (const [itemIndex, item] of items.entries()) {
    const productIndex = updatedProducts.findIndex(
      (product) => product.id === item.productId,
    );
    const product = updatedProducts[productIndex];
    if (!product)
      return {
        products,
        movements: [],
        error: "یکی از کالاهای خرید پیدا نشد.",
      };
    const variantIndex = item.variantId
      ? product.variants.findIndex((variant) => variant.id === item.variantId)
      : -1;
    const variant =
      variantIndex >= 0 ? product.variants[variantIndex] : undefined;
    if (
      (product.variants.length > 0 && !variant) ||
      (item.variantId && !variant)
    ) {
      return {
        products,
        movements: [],
        error: "گونهٔ انتخاب‌شده برای رسید خرید پیدا نشد.",
      };
    }
    const previousProductStock = product.stock;
    const previousStock = variant?.stock ?? product.stock;
    const nextStock = previousProductStock + item.quantity;
    const unitCost = item.unitCost + (allocatedAdditionalCosts[itemIndex] ?? 0);
    const nextCost =
      nextStock > 0
        ? Math.round(
            (previousProductStock * product.purchaseCost +
              item.quantity * unitCost) /
              nextStock,
          )
        : product.purchaseCost;
    const variants = variant
      ? product.variants.map((entry, index) =>
          index === variantIndex
            ? { ...entry, stock: entry.stock + item.quantity }
            : entry,
        )
      : product.variants;
    const updatedProduct = {
      ...product,
      variants,
      stock: variant ? variantStockTotal(variants) : nextStock,
      purchaseCost: nextCost,
      updatedAt: date,
    };
    updatedProducts[productIndex] = updatedProduct;
    movements.push(
      makeStockMovement({
        date,
        product: updatedProduct,
        type: "purchase",
        quantityChange: item.quantity,
        previousStock,
        reason: `دریافت خرید ${purchase.reference}`,
        source: "رسید خرید",
        relatedRecordId: purchase.id,
        reference: purchase.reference,
        variantId: variant?.id,
        variantLabel: variant
          ? formatVariantAttributes(variant.attributes)
          : undefined,
      }),
    );
  }
  return { products: updatedProducts, movements };
}

function getPersistedData(state: RetailStore): RetailData {
  return {
    products: state.products,
    sales: state.sales,
    purchases: state.purchases,
    customers: state.customers,
    suppliers: state.suppliers,
    expenses: state.expenses,
    payments: state.payments,
    stockMovements: state.stockMovements,
    cashMovements: state.cashMovements,
    returns: state.returns,
    purchaseReturns: state.purchaseReturns,
    cashSessions: state.cashSessions,
    campaigns: state.campaigns,
    settings: state.settings,
  };
}

function isPersistedRetailData(value: unknown): value is RetailData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<RetailData>;
  return (
    Array.isArray(candidate.products) &&
    Array.isArray(candidate.sales) &&
    Array.isArray(candidate.purchases) &&
    Array.isArray(candidate.customers) &&
    Array.isArray(candidate.suppliers) &&
    Array.isArray(candidate.expenses) &&
    Array.isArray(candidate.payments) &&
    Array.isArray(candidate.stockMovements) &&
    Array.isArray(candidate.cashMovements) &&
    Array.isArray(candidate.returns) &&
    Array.isArray(candidate.cashSessions) &&
    Array.isArray(candidate.campaigns) &&
    typeof candidate.settings === "object" &&
    candidate.settings !== null
  );
}

export function normalizePersistedRetailData(
  value: unknown,
): RetailData | null {
  if (!isPersistedRetailData(value)) return null;
  const legacyProducts = value.products as Array<
    Omit<RetailProduct, "brand" | "barcode" | "barcodeFormat" | "variants"> & {
      brand?: string;
      barcode?: string;
      barcodeFormat?: unknown;
      variants?: unknown;
    }
  >;
  const products: RetailProduct[] = legacyProducts.map((product) => {
    const variants = Array.isArray(product.variants)
      ? product.variants.map((rawVariant, index): RetailProductVariant => {
          const entry =
            rawVariant && typeof rawVariant === "object"
              ? (rawVariant as Record<string, unknown>)
              : {};
          const id =
            typeof entry.id === "string"
              ? entry.id
              : `legacy-${product.id}-${index + 1}`;
          const rawAttributes = Array.isArray(entry.attributes)
            ? entry.attributes
            : [];
          const attributes: ProductVariantAttribute[] = rawAttributes
            .filter(
              (attribute): attribute is Record<string, unknown> =>
                !!attribute && typeof attribute === "object",
            )
            .map((attribute) => ({
              name: typeof attribute.name === "string" ? attribute.name : "",
              value: typeof attribute.value === "string" ? attribute.value : "",
            }))
            .filter(
              (attribute) => attribute.name.trim() && attribute.value.trim(),
            );
          const stock =
            typeof entry.stock === "number" &&
            Number.isInteger(entry.stock) &&
            entry.stock >= 0
              ? entry.stock
              : 0;
          const barcode = normalizeIdentificationCode(
            typeof entry.barcode === "string" ? entry.barcode : "",
          );
          return {
            id,
            code:
              typeof entry.code === "string" && entry.code
                ? entry.code
                : `V-${id}`,
            attributes,
            stock,
            sku: typeof entry.sku === "string" ? entry.sku : undefined,
            barcode: barcode || undefined,
            barcodeFormat: normalizeIdentificationFormat(
              entry.barcodeFormat,
              barcode,
            ),
          };
        })
      : [];
    const barcode = normalizeIdentificationCode(
      typeof product.barcode === "string" ? product.barcode : "",
    );
    return {
      ...product,
      brand: typeof product.brand === "string" ? product.brand : "",
      barcode,
      barcodeFormat: normalizeIdentificationFormat(
        product.barcodeFormat,
        barcode,
      ),
      variants,
      stock: variants.length ? variantStockTotal(variants) : product.stock,
    };
  });
  const sales: RetailSale[] = value.sales.map((sale) => {
    const voidedAt =
      typeof sale.voidedAt === "string" && isDateKey(sale.voidedAt)
        ? sale.voidedAt
        : undefined;
    return {
      ...sale,
      voidedAt,
      voidReason:
        voidedAt && typeof sale.voidReason === "string"
          ? sale.voidReason
          : undefined,
    };
  });
  const purchaseReturns: PurchaseReturnRecord[] = Array.isArray(
    value.purchaseReturns,
  )
    ? value.purchaseReturns
    : [];
  return { ...value, products, sales, purchaseReturns };
}

export const useRetailStore = create<RetailStore>()(
  persist(
    (set, get) => ({
      ...createEmptyRetailData(),
      createProduct: (input) => {
        const validationError = productInputIsValid(input);
        if (validationError) return fail(validationError);
        const state = get();
        const normalized = normalizeProductVariants(input.variants);
        if (normalized.error) return fail(normalized.error);
        const codeError = productCodeValidationError(
          input,
          normalized.variants,
          state.products,
        );
        if (codeError) return fail(codeError);
        const variants = normalized.variants;
        const stock = variants.length
          ? variantStockTotal(variants)
          : input.stock;
        const date = getTodayDateKey();
        const barcode = normalizeIdentificationCode(input.barcode);
        const product: RetailProduct = {
          ...input,
          id: makeId("prd"),
          name: input.name.trim(),
          brand: input.brand.trim(),
          sku: input.sku.trim(),
          barcode,
          barcodeFormat: normalizeIdentificationFormat(
            input.barcodeFormat,
            barcode,
          ),
          category: input.category.trim(),
          unit: input.unit.trim(),
          stock,
          variants,
          description: input.description.trim(),
          active: true,
          createdAt: date,
          updatedAt: date,
        };
        const movements = variants.length
          ? variants
              .filter((variant) => variant.stock > 0)
              .map((variant) =>
                makeStockMovement({
                  date,
                  product,
                  variantId: variant.id,
                  variantLabel: formatVariantAttributes(variant.attributes),
                  type: "opening",
                  quantityChange: variant.stock,
                  previousStock: 0,
                  reason: "موجودی اولیهٔ گونه هنگام ثبت کالا",
                  source: "ثبت کالا",
                }),
              )
          : stock > 0
            ? [
                makeStockMovement({
                  date,
                  product,
                  type: "opening",
                  quantityChange: stock,
                  previousStock: 0,
                  reason: "موجودی اولیه هنگام ثبت کالا",
                  source: "ثبت کالا",
                }),
              ]
            : [];
        set({
          products: [...state.products, product],
          stockMovements: [...movements, ...state.stockMovements],
        });
        return ok(product);
      },
      updateProduct: (id, input, stockAdjustmentReason) => {
        const validationError = productInputIsValid(input);
        if (validationError) return fail(validationError);
        const state = get();
        const existing = state.products.find((product) => product.id === id);
        if (!existing) return fail("کالا پیدا نشد.");
        const normalized = normalizeProductVariants(input.variants);
        if (normalized.error) return fail(normalized.error);
        const variants = normalized.variants;
        const codeError = productCodeValidationError(
          input,
          variants,
          state.products,
          id,
          existing.active,
        );
        if (codeError) return fail(codeError);
        if (existing.variants.length > 0 && variants.length === 0) {
          return fail(
            "گونه‌های کالای ثبت‌شده قابل حذف نیستند؛ برای حفظ گردش و سوابق، گونه‌ها را نگه دارید.",
          );
        }
        if (existing.variants.length === 0 && variants.length > 0) {
          const hasLegacyTransactions =
            state.sales.some((sale) =>
              sale.items.some((item) => item.productId === id),
            ) ||
            state.purchases.some((purchase) =>
              purchase.items.some((item) => item.productId === id),
            ) ||
            state.returns.some((record) =>
              record.items.some((item) => item.productId === id),
            ) ||
            state.stockMovements.some((movement) => movement.productId === id);
          if (existing.stock > 0 || hasLegacyTransactions) {
            return fail(
              "برای حفظ موجودی و سوابق قدیمی، کالای دارای موجودی یا تراکنش را نمی‌توان به گونه‌دار تبدیل کرد. کالای گونه‌دار جدید ثبت کنید.",
            );
          }
        }
        const oldVariantsById = new Map(
          existing.variants.map((variant) => [variant.id, variant]),
        );
        const nextVariantIds = new Set(variants.map((variant) => variant.id));
        for (const oldVariant of existing.variants) {
          if (nextVariantIds.has(oldVariant.id)) continue;
          const hasHistory =
            oldVariant.stock > 0 ||
            state.sales.some((sale) =>
              sale.items.some((item) => item.variantId === oldVariant.id),
            ) ||
            state.purchases.some((purchase) =>
              purchase.items.some((item) => item.variantId === oldVariant.id),
            ) ||
            state.returns.some((record) =>
              record.items.some((item) => item.variantId === oldVariant.id),
            ) ||
            state.stockMovements.some(
              (movement) => movement.variantId === oldVariant.id,
            );
          if (hasHistory) {
            return fail(
              "گونه‌ای با موجودی یا سابقه قابل حذف نیست؛ برای حفظ حسابرسی، موجودی آن را نگه دارید.",
            );
          }
        }
        if (
          variants.some((variant) =>
            state.products.some(
              (product) =>
                product.id !== id &&
                product.variants.some(
                  (existingVariant) => existingVariant.id === variant.id,
                ),
            ),
          )
        ) {
          return fail("شناسهٔ گونه متعلق به کالای دیگری است.");
        }
        const today = getTodayDateKey();
        const stock = variants.length
          ? variantStockTotal(variants)
          : input.stock;
        const stockMovements: StockMovementRecord[] = [];
        let stockChanged =
          !variants.length &&
          !existing.variants.length &&
          stock !== existing.stock;
        if (variants.length) {
          for (const variant of variants) {
            const previous = oldVariantsById.get(variant.id)?.stock ?? 0;
            if (previous === variant.stock) continue;
            stockChanged = true;
            stockMovements.push(
              makeStockMovement({
                date: today,
                product: { ...existing, ...input, variants, stock },
                variantId: variant.id,
                variantLabel: formatVariantAttributes(variant.attributes),
                type: "correction",
                quantityChange: variant.stock - previous,
                previousStock: previous,
                reason: stockAdjustmentReason.trim(),
                source: "اصلاح موجودی گونه",
              }),
            );
          }
        }
        if (stockChanged && !stockAdjustmentReason.trim()) {
          return fail("برای تغییر موجودی، دلیل اصلاح را وارد کنید.");
        }
        const barcode = normalizeIdentificationCode(input.barcode);
        const updated: RetailProduct = {
          ...existing,
          ...input,
          name: input.name.trim(),
          brand: input.brand.trim(),
          sku: input.sku.trim(),
          barcode,
          barcodeFormat: normalizeIdentificationFormat(
            input.barcodeFormat,
            barcode,
          ),
          category: input.category.trim(),
          unit: input.unit.trim(),
          description: input.description.trim(),
          variants,
          stock,
          updatedAt: today,
        };
        if (!variants.length && stockChanged) {
          stockMovements.push(
            makeStockMovement({
              date: today,
              product: updated,
              type: "correction",
              quantityChange: stock - existing.stock,
              previousStock: existing.stock,
              reason: stockAdjustmentReason.trim(),
              source: "اصلاح اطلاعات کالا",
            }),
          );
        }
        set({
          products: state.products.map((product) =>
            product.id === id ? updated : product,
          ),
          stockMovements: [...stockMovements, ...state.stockMovements],
        });
        return ok(updated);
      },
      setProductActive: (id, active) => {
        const state = get();
        const today = getTodayDateKey();
        const product = state.products.find((item) => item.id === id);
        if (!product) return fail("کالا پیدا نشد.");
        if (active && !product.active) {
          const codeError = productCodeSetsValidationError(
            [
              product.barcode,
              ...product.variants.map((variant) => variant.barcode),
            ],
            [
              product.id,
              product.sku,
              ...product.variants.flatMap((variant) => [
                variant.code,
                variant.sku,
              ]),
            ],
            state.products,
            id,
          );
          if (codeError) return fail(codeError);
        }
        const updated = { ...product, active, updatedAt: today };
        set({
          products: state.products.map((item) =>
            item.id === id ? updated : item,
          ),
        });
        return ok(updated);
      },
      adjustStock: (productId, delta, reason, variantId) => {
        const state = get();
        const today = getTodayDateKey();
        const product = state.products.find((item) => item.id === productId);
        if (!product) return fail("کالا پیدا نشد.");
        if (!Number.isInteger(delta) || delta === 0)
          return fail("مقدار تغییر باید عدد صحیح و غیرصفر باشد.");
        if (!reason.trim())
          return fail("برای تغییر دستی موجودی، ثبت دلیل الزامی است.");
        if (product.variants.length > 0 && !variantId) {
          return fail("برای اصلاح موجودی، گونهٔ کالا را انتخاب کنید.");
        }
        const variant = variantForProduct(product, variantId);
        if (variantId && !variant) return fail("گونهٔ انتخاب‌شده پیدا نشد.");
        const previousStock = variant?.stock ?? product.stock;
        if (previousStock + delta < 0)
          return fail("موجودی گونه نمی‌تواند منفی شود.");
        const variants = variant
          ? product.variants.map((entry) =>
              entry.id === variant.id
                ? { ...entry, stock: entry.stock + delta }
                : entry,
            )
          : product.variants;
        const updated: RetailProduct = {
          ...product,
          variants,
          stock: variant ? variantStockTotal(variants) : product.stock + delta,
          updatedAt: today,
        };
        const movement = makeStockMovement({
          date: today,
          product: updated,
          variantId: variant?.id,
          variantLabel: variant
            ? formatVariantAttributes(variant.attributes)
            : undefined,
          type: delta > 0 ? "adjustment-in" : "adjustment-out",
          quantityChange: delta,
          previousStock,
          reason: reason.trim(),
          source: variant ? "اصلاح دستی موجودی گونه" : "اصلاح دستی موجودی",
        });
        set({
          products: state.products.map((item) =>
            item.id === productId ? updated : item,
          ),
          stockMovements: [movement, ...state.stockMovements],
        });
        return ok(updated);
      },
      createSale: (input) => {
        if (!isDateKey(input.date)) return fail("تاریخ فروش معتبر نیست.");
        if (input.items.length === 0)
          return fail("حداقل یک قلم کالا به فاکتور اضافه کنید.");
        if (!Number.isFinite(input.discountAmount) || input.discountAmount < 0)
          return fail("تخفیف معتبر نیست.");
        if (!Number.isFinite(input.paidAmount) || input.paidAmount < 0)
          return fail("مبلغ دریافتی معتبر نیست.");
        if (input.dueDate && !isDateKey(input.dueDate))
          return fail("سررسید واردشده معتبر نیست.");
        const state = get();
        const customer = state.customers.find(
          (item) => item.id === input.customerId,
        );
        if (!customer) return fail("مشتری انتخاب‌شده پیدا نشد.");
        const quantities = new Map<
          string,
          { productId: string; variantId?: string; quantity: number }
        >();
        let grossAmount = 0;
        for (const item of input.items) {
          if (!Number.isInteger(item.quantity) || item.quantity <= 0)
            return fail("تعداد هر قلم باید عدد صحیح مثبت باشد.");
          if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0)
            return fail("قیمت فروش هر قلم معتبر نیست.");
          const product = state.products.find(
            (entry) => entry.id === item.productId && entry.active,
          );
          if (!product)
            return fail("یکی از کالاهای انتخاب‌شده فعال نیست یا پیدا نشد.");
          const variant = variantForProduct(product, item.variantId);
          if (product.variants.length > 0 && !variant) {
            return fail("برای کالای گونه‌دار، گونهٔ دقیق را انتخاب کنید.");
          }
          if (item.variantId && !variant)
            return fail("گونهٔ انتخاب‌شده پیدا نشد.");
          const key = `${product.id}::${variant?.id ?? "product"}`;
          const current = quantities.get(key);
          quantities.set(key, {
            productId: product.id,
            variantId: variant?.id,
            quantity: (current?.quantity ?? 0) + item.quantity,
          });
          grossAmount += item.quantity * item.unitPrice;
        }
        for (const requirement of quantities.values()) {
          const product = state.products.find(
            (entry) => entry.id === requirement.productId,
          );
          const variant = product
            ? variantForProduct(product, requirement.variantId)
            : undefined;
          const available = variant?.stock ?? product?.stock ?? 0;
          if (!product || available < requirement.quantity) {
            const detail = variant
              ? `${product?.name ?? "کالا"} · ${formatVariantAttributes(variant.attributes)}`
              : (product?.name ?? "کالا");
            return fail(`موجودی «${detail}» برای این فروش کافی نیست.`);
          }
        }
        if (input.discountAmount > grossAmount)
          return fail("تخفیف نمی‌تواند از جمع اقلام بیشتر باشد.");
        const amount = Math.round(grossAmount - input.discountAmount);
        if (amount <= 0)
          return fail("مبلغ نهایی فاکتور باید بیشتر از صفر باشد.");
        if (input.paidAmount > amount)
          return fail("مبلغ دریافتی نمی‌تواند از مبلغ نهایی بیشتر باشد.");
        const date = input.date;
        const time = input.time ?? currentTime();
        const id = makeId("sale");
        const reference = makeReference("ف", date);
        let discountRemaining = input.discountAmount;
        const items: SaleItem[] = [];
        for (const [index, item] of input.items.entries()) {
          const product = state.products.find(
            (entry) => entry.id === item.productId,
          );
          if (!product)
            return fail("یکی از کالاهای انتخاب‌شده فعال نیست یا پیدا نشد.");
          const variant = variantForProduct(product, item.variantId);
          const lineGross = item.quantity * item.unitPrice;
          const allocatedDiscount =
            index === input.items.length - 1
              ? discountRemaining
              : grossAmount > 0
                ? Math.round((input.discountAmount * lineGross) / grossAmount)
                : 0;
          discountRemaining -= allocatedDiscount;
          items.push({
            id: item.id ?? makeId("sale-line"),
            productId: product.id,
            productName: product.name,
            variantId: variant?.id,
            variantCode: variant?.code,
            variantLabel: variant
              ? formatVariantAttributes(variant.attributes)
              : undefined,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            unitCost: product.purchaseCost,
            discountAmount: allocatedDiscount,
            lineTotal: lineGross - allocatedDiscount,
          });
        }
        const firstItem = items[0];
        if (!firstItem) return fail("حداقل یک قلم کالا به فاکتور اضافه کنید.");
        const sale: RetailSale = {
          id,
          reference,
          date,
          time,
          customerId: customer.id,
          customerName: customer.name,
          productId: firstItem.productId,
          productName: firstItem.productName,
          itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
          amount,
          grossAmount,
          discountAmount: input.discountAmount,
          returnedAmount: 0,
          paidAmount: input.paidAmount,
          paymentMethod: input.paymentMethod,
          status: statusForBalance(amount, input.paidAmount),
          items,
          dueDate: input.dueDate,
          baseline: false,
        };
        const saleMovements: StockMovementRecord[] = [];
        const updatedProducts = [...state.products];
        for (const item of items) {
          const productIndex = updatedProducts.findIndex(
            (product) => product.id === item.productId,
          );
          const product = updatedProducts[productIndex];
          if (!product) continue;
          const variantIndex = item.variantId
            ? product.variants.findIndex(
                (variant) => variant.id === item.variantId,
              )
            : -1;
          const variant =
            variantIndex >= 0 ? product.variants[variantIndex] : undefined;
          const previousStock = variant?.stock ?? product.stock;
          const variants = variant
            ? product.variants.map((entry, index) =>
                index === variantIndex
                  ? { ...entry, stock: entry.stock - item.quantity }
                  : entry,
              )
            : product.variants;
          const nextProduct: RetailProduct = {
            ...product,
            variants,
            stock: variant
              ? variantStockTotal(variants)
              : product.stock - item.quantity,
            updatedAt: date,
          };
          updatedProducts[productIndex] = nextProduct;
          saleMovements.push(
            makeStockMovement({
              date,
              product: nextProduct,
              variantId: variant?.id,
              variantLabel: item.variantLabel,
              type: "sale",
              quantityChange: -item.quantity,
              previousStock,
              reason: `فروش ${reference}`,
              source: "ثبت فروش",
              relatedRecordId: id,
              reference,
            }),
          );
        }
        const payment =
          input.paidAmount > 0
            ? makePayment({
                date,
                direction: "in",
                kind: "sale",
                amount: input.paidAmount,
                method: input.paymentMethod,
                description: `دریافت بابت فروش ${reference}`,
                reference: `دریافت-${reference}`,
                customerId: customer.id,
                relatedSaleId: id,
              })
            : null;
        const cashMovement = payment ? cashMovementForPayment(payment) : null;
        set({
          sales: [sale, ...state.sales],
          products: updatedProducts,
          stockMovements: [...saleMovements, ...state.stockMovements],
          payments: payment ? [payment, ...state.payments] : state.payments,
          cashMovements: cashMovement
            ? [cashMovement, ...state.cashMovements]
            : state.cashMovements,
        });
        return ok(sale);
      },
      addSalePayment: (saleId, amount, method, date) => {
        if (!Number.isFinite(amount) || amount <= 0)
          return fail("مبلغ دریافت باید بیشتر از صفر باشد.");
        if (!isDateKey(date)) return fail("تاریخ دریافت معتبر نیست.");
        const state = get();
        const existing = state.sales.find((sale) => sale.id === saleId);
        if (!existing) return fail("فاکتور فروش پیدا نشد.");
        if (isSaleVoided(existing))
          return fail("فاکتور باطل‌شده قابل دریافت وجه نیست.");
        const outstanding = getSaleOutstanding(existing, state.returns);
        if (amount > outstanding)
          return fail("مبلغ دریافت از ماندهٔ طلب بیشتر است.");
        const updated = syncSaleBalance(
          { ...existing, paidAmount: existing.paidAmount + amount },
          state.returns,
        );
        const payment = makePayment({
          date,
          direction: "in",
          kind: "sale-settlement",
          amount,
          method,
          description: `وصول طلب ${existing.reference}`,
          reference: makeReference("و", date),
          customerId: existing.customerId,
          relatedSaleId: existing.id,
        });
        const cashMovement = cashMovementForPayment(payment);
        set({
          sales: state.sales.map((sale) =>
            sale.id === saleId ? updated : sale,
          ),
          payments: [payment, ...state.payments],
          cashMovements: cashMovement
            ? [cashMovement, ...state.cashMovements]
            : state.cashMovements,
        });
        return ok(updated);
      },
      createPurchase: (input) => {
        if (!isDateKey(input.date)) return fail("تاریخ خرید معتبر نیست.");
        if (input.items.length === 0)
          return fail("حداقل یک قلم کالا به خرید اضافه کنید.");
        if (
          !Number.isFinite(input.additionalCosts) ||
          input.additionalCosts < 0
        )
          return fail("هزینهٔ جانبی معتبر نیست.");
        if (!Number.isFinite(input.paidAmount) || input.paidAmount < 0)
          return fail("مبلغ پرداخت‌شده معتبر نیست.");
        if (input.dueDate && !isDateKey(input.dueDate))
          return fail("سررسید واردشده معتبر نیست.");
        const state = get();
        const supplier = state.suppliers.find(
          (item) => item.id === input.supplierId && item.active,
        );
        if (!supplier) return fail("تأمین‌کنندهٔ انتخاب‌شده پیدا نشد.");
        let itemsTotal = 0;
        for (const item of input.items) {
          if (!Number.isInteger(item.quantity) || item.quantity <= 0)
            return fail("تعداد خرید باید عدد صحیح مثبت باشد.");
          if (!Number.isFinite(item.unitCost) || item.unitCost < 0)
            return fail("بهای خرید هر قلم معتبر نیست.");
          const product = state.products.find(
            (entry) => entry.id === item.productId && entry.active,
          );
          if (!product)
            return fail("یکی از کالاهای خرید فعال نیست یا پیدا نشد.");
          const variant = variantForProduct(product, item.variantId);
          if (product.variants.length > 0 && !variant) {
            return fail("برای کالای گونه‌دار، گونهٔ دقیق را انتخاب کنید.");
          }
          if (item.variantId && !variant)
            return fail("گونهٔ انتخاب‌شده پیدا نشد.");
          itemsTotal += item.quantity * item.unitCost;
        }
        const amount = Math.round(itemsTotal + input.additionalCosts);
        if (amount <= 0) return fail("مبلغ نهایی خرید باید بیشتر از صفر باشد.");
        if (input.paidAmount > amount)
          return fail("پرداخت نمی‌تواند از مبلغ خرید بیشتر باشد.");
        const reference = makeReference("خ", input.date);
        const id = makeId("purchase");
        const lineAdditionalCosts = allocateAdditionalCostPerUnit(
          input.items.map((item) => ({
            quantity: item.quantity,
            unitCost: item.unitCost,
            lineTotal: item.quantity * item.unitCost,
          })),
          input.additionalCosts,
        );
        const items: PurchaseItem[] = [];
        for (const [itemIndex, item] of input.items.entries()) {
          const product = state.products.find(
            (entry) => entry.id === item.productId && entry.active,
          );
          if (!product)
            return fail("یکی از کالاهای خرید فعال نیست یا پیدا نشد.");
          const variant = variantForProduct(product, item.variantId);
          const lineTotal = item.quantity * item.unitCost;
          items.push({
            id: item.id ?? makeId("purchase-line"),
            productId: product.id,
            productName: product.name,
            variantId: variant?.id,
            variantCode: variant?.code,
            variantLabel: variant
              ? formatVariantAttributes(variant.attributes)
              : undefined,
            quantity: item.quantity,
            unitCost: item.unitCost,
            additionalCostPerUnit: lineAdditionalCosts[itemIndex] ?? 0,
            lineTotal,
          });
        }
        const purchase: RetailPurchase = {
          id,
          reference,
          date: input.date,
          supplierId: supplier.id,
          supplierName: supplier.name,
          description: items
            .map((item) =>
              item.variantLabel
                ? `${item.productName} (${item.variantLabel})`
                : item.productName,
            )
            .join("، "),
          amount,
          paidAmount: input.paidAmount,
          status: statusForBalance(amount, input.paidAmount),
          paymentMethod: input.paymentMethod,
          items,
          additionalCosts: input.additionalCosts,
          received: input.received,
          receivedAt: input.received ? input.date : undefined,
          dueDate: input.dueDate,
          baseline: false,
        };
        const stockUpdate = input.received
          ? applyReceivedItems(
              state.products,
              items,
              input.additionalCosts,
              purchase,
              input.date,
            )
          : {
              products: state.products,
              movements: [] as StockMovementRecord[],
            };
        if (stockUpdate.error) return fail(stockUpdate.error);
        const payment =
          input.paidAmount > 0
            ? makePayment({
                date: input.date,
                direction: "out",
                kind: "purchase",
                amount: input.paidAmount,
                method: input.paymentMethod,
                description: `پرداخت خرید ${reference}`,
                reference: `پرداخت-${reference}`,
                supplierId: supplier.id,
                relatedPurchaseId: id,
              })
            : null;
        const cashMovement = payment ? cashMovementForPayment(payment) : null;
        set({
          purchases: [purchase, ...state.purchases],
          products: stockUpdate.products,
          stockMovements: [...stockUpdate.movements, ...state.stockMovements],
          payments: payment ? [payment, ...state.payments] : state.payments,
          cashMovements: cashMovement
            ? [cashMovement, ...state.cashMovements]
            : state.cashMovements,
        });
        return ok(purchase);
      },
      receivePurchase: (purchaseId, date) => {
        if (!isDateKey(date)) return fail("تاریخ دریافت معتبر نیست.");
        const state = get();
        const existing = state.purchases.find(
          (purchase) => purchase.id === purchaseId,
        );
        if (!existing) return fail("سفارش خرید پیدا نشد.");
        if (existing.received)
          return fail(
            "این خرید قبلاً دریافت شده است؛ موجودی دوباره افزایش نیافت.",
          );
        const stockUpdate = applyReceivedItems(
          state.products,
          existing.items,
          existing.additionalCosts,
          existing,
          date,
        );
        if (stockUpdate.error) return fail(stockUpdate.error);
        const updated = { ...existing, received: true, receivedAt: date };
        set({
          purchases: state.purchases.map((purchase) =>
            purchase.id === purchaseId ? updated : purchase,
          ),
          products: stockUpdate.products,
          stockMovements: [...stockUpdate.movements, ...state.stockMovements],
        });
        return ok(updated);
      },
      addPurchasePayment: (purchaseId, amount, method, date) => {
        if (!Number.isFinite(amount) || amount <= 0)
          return fail("مبلغ پرداخت باید بیشتر از صفر باشد.");
        if (!isDateKey(date)) return fail("تاریخ پرداخت معتبر نیست.");
        const state = get();
        const existing = state.purchases.find(
          (purchase) => purchase.id === purchaseId,
        );
        if (!existing) return fail("سفارش خرید پیدا نشد.");
        const outstanding = Math.max(0, existing.amount - existing.paidAmount);
        if (amount > outstanding)
          return fail("مبلغ پرداخت از ماندهٔ بدهی بیشتر است.");
        const updated = syncPurchaseBalance({
          ...existing,
          paidAmount: existing.paidAmount + amount,
        });
        const payment = makePayment({
          date,
          direction: "out",
          kind: "supplier-settlement",
          amount,
          method,
          description: `پرداخت بدهی ${existing.reference}`,
          reference: makeReference("ب", date),
          supplierId: existing.supplierId,
          relatedPurchaseId: existing.id,
        });
        const cashMovement = cashMovementForPayment(payment);
        set({
          purchases: state.purchases.map((purchase) =>
            purchase.id === purchaseId ? updated : purchase,
          ),
          payments: [payment, ...state.payments],
          cashMovements: cashMovement
            ? [cashMovement, ...state.cashMovements]
            : state.cashMovements,
        });
        return ok(updated);
      },
      createExpense: (input) => {
        if (!isDateKey(input.date)) return fail("تاریخ هزینه معتبر نیست.");
        if (!input.description.trim()) return fail("شرح هزینه الزامی است.");
        if (!Number.isFinite(input.amount) || input.amount <= 0)
          return fail("مبلغ هزینه باید بیشتر از صفر باشد.");
        const category = get().settings.expenseCategories.find(
          (item) => item.id === input.categoryId,
        );
        if (!category) return fail("دسته‌بندی هزینه پیدا نشد.");
        const id = makeId("expense");
        const reference = makeReference("ه", input.date);
        const expense: RetailExpense = {
          id,
          reference,
          date: input.date,
          categoryId: input.categoryId,
          categoryLabel: category.label,
          description: input.description.trim(),
          amount: Math.round(input.amount),
          paymentMethod: input.paymentMethod,
          notes: input.notes.trim(),
        };
        const payment = makePayment({
          date: input.date,
          direction: "out",
          kind: "expense",
          amount: expense.amount,
          method: input.paymentMethod,
          description: expense.description,
          reference: `پرداخت-${reference}`,
          relatedExpenseId: expense.id,
        });
        const cashMovement = cashMovementForPayment(payment);
        set({
          expenses: [expense, ...get().expenses],
          payments: [payment, ...get().payments],
          cashMovements: cashMovement
            ? [cashMovement, ...get().cashMovements]
            : get().cashMovements,
        });
        return ok(expense);
      },
      deleteExpense: (expenseId) => {
        const state = get();
        const today = getTodayDateKey();
        const expense = state.expenses.find((item) => item.id === expenseId);
        if (!expense) return fail("هزینه پیدا نشد.");
        const relatedPayments = state.payments.filter(
          (payment) =>
            payment.relatedExpenseId === expenseId &&
            payment.kind === "expense",
        );
        const reversals = relatedPayments.map((payment) =>
          makePayment({
            date: today,
            direction: "in",
            kind: "reversal",
            amount: payment.amount,
            method: payment.method,
            description: `برگشت ثبت هزینهٔ حذف‌شده ${expense.reference}`,
            reference: makeReference("اصلاح", today),
            relatedExpenseId: expenseId,
          }),
        );
        const cashReversals = reversals
          .map(cashMovementForPayment)
          .filter(
            (movement): movement is CashMovementRecord => movement !== null,
          );
        set({
          expenses: state.expenses.filter((item) => item.id !== expenseId),
          payments: [...reversals, ...state.payments],
          cashMovements: [...cashReversals, ...state.cashMovements],
        });
        return ok(expense);
      },
      createCustomer: (input) => {
        if (!input.name.trim()) return fail("نام مشتری الزامی است.");
        const customer: RetailCustomer = {
          id: makeId("customer"),
          name: input.name.trim(),
          phone: input.phone.trim(),
          group: input.group,
          address: input.address.trim(),
          notes: input.notes.trim(),
          createdAt: getTodayDateKey(),
          active: true,
        };
        set({ customers: [...get().customers, customer] });
        return ok(customer);
      },
      updateCustomer: (id, input) => {
        if (!input.name.trim()) return fail("نام مشتری الزامی است.");
        const state = get();
        const existing = state.customers.find((customer) => customer.id === id);
        if (!existing) return fail("مشتری پیدا نشد.");
        const updated = {
          ...existing,
          name: input.name.trim(),
          phone: input.phone.trim(),
          group: input.group,
          address: input.address.trim(),
          notes: input.notes.trim(),
        };
        set({
          customers: state.customers.map((customer) =>
            customer.id === id ? updated : customer,
          ),
        });
        return ok(updated);
      },
      deleteCustomer: (id) => {
        const state = get();
        const existing = state.customers.find(
          (customer) => customer.id === id && customer.active,
        );
        if (!existing) return fail("مشتری فعال پیدا نشد.");
        const archived = { ...existing, active: false };
        set({
          customers: state.customers.map((customer) =>
            customer.id === id ? archived : customer,
          ),
        });
        return ok(archived);
      },
      createSupplier: (input) => {
        if (!input.name.trim()) return fail("نام تأمین‌کننده الزامی است.");
        const supplier: RetailSupplier = {
          id: makeId("supplier"),
          name: input.name.trim(),
          phone: input.phone.trim(),
          email: input.email.trim(),
          address: input.address.trim(),
          notes: input.notes.trim(),
          createdAt: getTodayDateKey(),
          active: true,
        };
        set({ suppliers: [...get().suppliers, supplier] });
        return ok(supplier);
      },
      updateSupplier: (id, input) => {
        if (!input.name.trim()) return fail("نام تأمین‌کننده الزامی است.");
        const state = get();
        const existing = state.suppliers.find((supplier) => supplier.id === id);
        if (!existing) return fail("تأمین‌کننده پیدا نشد.");
        const updated = {
          ...existing,
          name: input.name.trim(),
          phone: input.phone.trim(),
          email: input.email.trim(),
          address: input.address.trim(),
          notes: input.notes.trim(),
        };
        set({
          suppliers: state.suppliers.map((supplier) =>
            supplier.id === id ? updated : supplier,
          ),
        });
        return ok(updated);
      },
      createReturn: (input) => {
        if (!isDateKey(input.date)) return fail("تاریخ مرجوعی معتبر نیست.");
        if (!input.reason.trim()) return fail("علت مرجوعی را وارد کنید.");
        if (input.items.length === 0)
          return fail("حداقل یک قلم برای مرجوعی انتخاب کنید.");
        const state = get();
        const sale = state.sales.find((item) => item.id === input.saleId);
        if (!sale) return fail("فاکتور فروش پیدا نشد.");
        if (isSaleVoided(sale))
          return fail("برای فاکتور باطل‌شده امکان ثبت مرجوعی نیست.");
        const previousReturns = state.returns.filter(
          (record) => record.saleId === sale.id,
        );
        const returnItems: ReturnRecord["items"] = [];
        const restockMovements: StockMovementRecord[] = [];
        let totalReturnValue = 0;
        const updatedProducts = [...state.products];
        const returnedByLine = new Map<string, number>();
        const lineKey = (productId: string, variantId?: string) =>
          `${productId}::${variantId ?? "product"}`;
        for (const returned of previousReturns) {
          for (const item of returned.items) {
            const key = lineKey(item.productId, item.variantId);
            returnedByLine.set(
              key,
              (returnedByLine.get(key) ?? 0) + item.quantity,
            );
          }
        }
        for (const selection of input.items) {
          if (
            !Number.isInteger(selection.quantity) ||
            selection.quantity <= 0
          ) {
            return fail("تعداد مرجوعی باید عدد صحیح مثبت باشد.");
          }
          const product = state.products.find(
            (item) => item.id === selection.productId,
          );
          if (!product) return fail("کالای مرجوعی پیدا نشد.");
          const variant = variantForProduct(product, selection.variantId);
          if (product.variants.length > 0 && !variant) {
            return fail("گونهٔ دقیق کالای فروخته‌شده برای مرجوعی پیدا نشد.");
          }
          if (selection.variantId && !variant)
            return fail("گونهٔ انتخاب‌شده پیدا نشد.");
          const key = lineKey(product.id, variant?.id);
          const soldItems = sale.items.filter(
            (item) =>
              item.productId === product.id && item.variantId === variant?.id,
          );
          const soldQuantity = soldItems.reduce(
            (sum, item) => sum + item.quantity,
            0,
          );
          const alreadyReturned = returnedByLine.get(key) ?? 0;
          if (selection.quantity > soldQuantity - alreadyReturned) {
            return fail(
              "تعداد مرجوعی نمی‌تواند از تعداد فروخته‌شدهٔ همان گونهٔ باقی‌مانده بیشتر باشد.",
            );
          }
          const soldNet = soldItems.reduce(
            (sum, item) => sum + item.lineTotal,
            0,
          );
          const unitReturnValue = soldQuantity > 0 ? soldNet / soldQuantity : 0;
          const lineAmount = Math.round(unitReturnValue * selection.quantity);
          totalReturnValue += lineAmount;
          const variantCode = variant?.code ?? soldItems[0]?.variantCode;
          const variantLabel =
            soldItems[0]?.variantLabel ??
            (variant ? formatVariantAttributes(variant.attributes) : undefined);
          returnItems.push({
            productId: product.id,
            productName: product.name,
            variantId: variant?.id,
            variantCode,
            variantLabel,
            quantity: selection.quantity,
            unitPrice: unitReturnValue,
            amount: lineAmount,
            restocked: selection.restocked,
          });
          if (selection.restocked) {
            const productIndex = updatedProducts.findIndex(
              (item) => item.id === product.id,
            );
            const currentProduct = updatedProducts[productIndex];
            if (!currentProduct) return fail("کالای مرجوعی پیدا نشد.");
            const currentVariant = variantForProduct(
              currentProduct,
              variant?.id,
            );
            if (variant && !currentVariant)
              return fail("گونهٔ کالای مرجوعی پیدا نشد.");
            const previousStock = currentVariant?.stock ?? currentProduct.stock;
            const variants = currentVariant
              ? currentProduct.variants.map((entry) =>
                  entry.id === currentVariant.id
                    ? { ...entry, stock: entry.stock + selection.quantity }
                    : entry,
                )
              : currentProduct.variants;
            const updatedProduct: RetailProduct = {
              ...currentProduct,
              variants,
              stock: currentVariant
                ? variantStockTotal(variants)
                : currentProduct.stock + selection.quantity,
              updatedAt: input.date,
            };
            updatedProducts[productIndex] = updatedProduct;
            restockMovements.push(
              makeStockMovement({
                date: input.date,
                product: updatedProduct,
                variantId: currentVariant?.id,
                variantLabel,
                type: "return",
                quantityChange: selection.quantity,
                previousStock,
                reason: `مرجوعی ${sale.reference}؛ ${input.reason.trim()}`,
                source: "مرجوعی مشتری",
                relatedRecordId: sale.id,
              }),
            );
          }
          returnedByLine.set(key, alreadyReturned + selection.quantity);
        }
        const availablePaid = getSaleNetPaidAmount(sale, previousReturns);
        const refundAmount = Math.min(totalReturnValue, availablePaid);
        const receivableReduction = Math.max(
          0,
          totalReturnValue - refundAmount,
        );
        const id = makeId("return");
        const reference = makeReference("م", input.date);
        const record: ReturnRecord = {
          id,
          reference,
          date: input.date,
          saleId: sale.id,
          saleReference: sale.reference,
          customerId: sale.customerId,
          customerName: sale.customerName,
          items: returnItems,
          amount: totalReturnValue,
          refundAmount,
          receivableReduction,
          refundMethod: input.refundMethod,
          reason: input.reason.trim(),
        };
        const updatedSale = syncSaleBalance(
          {
            ...sale,
            returnedAmount: sale.returnedAmount + totalReturnValue,
          },
          [...state.returns, record],
        );
        const refundPayment =
          refundAmount > 0
            ? makePayment({
                date: input.date,
                direction: "out",
                kind: "refund",
                amount: refundAmount,
                method: input.refundMethod,
                description: `بازپرداخت مرجوعی ${reference}`,
                reference: `بازپرداخت-${reference}`,
                customerId: sale.customerId,
                relatedSaleId: sale.id,
                relatedReturnId: id,
              })
            : null;
        const cashMovement = refundPayment
          ? cashMovementForPayment(refundPayment)
          : null;
        set({
          sales: state.sales.map((item) =>
            item.id === sale.id ? updatedSale : item,
          ),
          products: updatedProducts,
          returns: [record, ...state.returns],
          stockMovements: [...restockMovements, ...state.stockMovements],
          payments: refundPayment
            ? [refundPayment, ...state.payments]
            : state.payments,
          cashMovements: cashMovement
            ? [cashMovement, ...state.cashMovements]
            : state.cashMovements,
        });
        return ok(record);
      },
      voidSale: (saleId, reason, date) => {
        if (!isDateKey(date)) return fail("تاریخ ابطال معتبر نیست.");
        if (!reason.trim()) return fail("دلیل ابطال را وارد کنید.");
        const state = get();
        const sale = state.sales.find((item) => item.id === saleId);
        if (!sale) return fail("فاکتور فروش پیدا نشد.");
        if (isSaleVoided(sale)) {
          return fail(
            "این فاکتور قبلاً باطل شده است؛ اثر آن دوباره برگشت داده نشد.",
          );
        }
        const relatedReturns = state.returns.filter(
          (record) => record.saleId === saleId,
        );
        if (relatedReturns.length > 0 || sale.returnedAmount > 0) {
          return fail(
            "فاکتور دارای مرجوعی ثبت‌شده قابل ابطال نیست؛ مرجوعی‌ها باید با سند خودشان پیگیری شوند.",
          );
        }
        const updatedProducts = [...state.products];
        const movements: StockMovementRecord[] = [];
        for (const item of sale.items) {
          const productIndex = updatedProducts.findIndex(
            (product) => product.id === item.productId,
          );
          const product = updatedProducts[productIndex];
          if (!product)
            return fail("یکی از کالاهای فاکتور برای برگشت موجودی پیدا نشد.");
          const variantIndex = item.variantId
            ? product.variants.findIndex(
                (variant) => variant.id === item.variantId,
              )
            : -1;
          const variant =
            variantIndex >= 0 ? product.variants[variantIndex] : undefined;
          if (item.variantId && !variant)
            return fail("گونهٔ یکی از کالاهای فاکتور پیدا نشد.");
          const previousStock = variant?.stock ?? product.stock;
          const variants = variant
            ? product.variants.map((entry, index) =>
                index === variantIndex
                  ? { ...entry, stock: entry.stock + item.quantity }
                  : entry,
              )
            : product.variants;
          const updatedProduct: RetailProduct = {
            ...product,
            variants,
            stock: variant
              ? variantStockTotal(variants)
              : product.stock + item.quantity,
            updatedAt: date,
          };
          updatedProducts[productIndex] = updatedProduct;
          movements.push(
            makeStockMovement({
              date,
              product: updatedProduct,
              variantId: variant?.id,
              variantLabel: item.variantLabel,
              type: "correction",
              quantityChange: item.quantity,
              previousStock,
              reason: `ابطال فاکتور ${sale.reference}؛ ${reason.trim()}`,
              source: "ابطال فروش",
              relatedRecordId: sale.id,
              reference: sale.reference,
            }),
          );
        }
        const netPaid = getSaleNetPaidAmount(sale, state.returns);
        const reversal =
          netPaid > 0
            ? makePayment({
                date,
                direction: "out",
                kind: "reversal",
                amount: netPaid,
                method: sale.paymentMethod,
                description: `برگشت وجه ابطال فاکتور ${sale.reference}؛ ${reason.trim()}`,
                reference: makeReference("ابطال", date),
                customerId: sale.customerId,
                relatedSaleId: sale.id,
              })
            : null;
        const cashMovement = reversal ? cashMovementForPayment(reversal) : null;
        const voidedSale: RetailSale = {
          ...sale,
          status: statusForBalance(0, 0),
          voidedAt: date,
          voidReason: reason.trim(),
        };
        set({
          sales: state.sales.map((item) =>
            item.id === saleId ? voidedSale : item,
          ),
          products: updatedProducts,
          stockMovements: [...movements, ...state.stockMovements],
          payments: reversal ? [reversal, ...state.payments] : state.payments,
          cashMovements: cashMovement
            ? [cashMovement, ...state.cashMovements]
            : state.cashMovements,
        });
        return ok(voidedSale);
      },
      createPurchaseReturn: (input) => {
        if (!isDateKey(input.date))
          return fail("تاریخ مرجوعی خرید معتبر نیست.");
        if (!input.reason.trim())
          return fail("دلیل مرجوعی به تأمین‌کننده را وارد کنید.");
        if (input.items.length === 0)
          return fail("حداقل یک قلم برای مرجوعی انتخاب کنید.");
        const state = get();
        const purchase = state.purchases.find(
          (item) => item.id === input.purchaseId,
        );
        if (!purchase) return fail("خرید پیدا نشد.");
        if (!purchase.received) {
          return fail(
            "مرجوعی فقط برای خریدی ممکن است که کالای آن دریافت شده باشد.",
          );
        }
        const alreadyReturned = getPurchaseReturnedQuantities(
          purchase.id,
          state.purchaseReturns,
        );
        const returnedByLine = new Map<string, number>(alreadyReturned);
        const updatedProducts = [...state.products];
        const movements: StockMovementRecord[] = [];
        const items: PurchaseReturnRecord["items"] = [];
        let totalAmount = 0;
        for (const selection of input.items) {
          if (
            !Number.isInteger(selection.quantity) ||
            selection.quantity <= 0
          ) {
            return fail("تعداد مرجوعی باید عدد صحیح مثبت باشد.");
          }
          const productIndex = updatedProducts.findIndex(
            (product) => product.id === selection.productId,
          );
          const product = updatedProducts[productIndex];
          if (!product) return fail("کالای مرجوعی پیدا نشد.");
          const variant = variantForProduct(product, selection.variantId);
          if (product.variants.length > 0 && !variant) {
            return fail("گونهٔ دقیق کالای خریداری‌شده برای مرجوعی پیدا نشد.");
          }
          if (selection.variantId && !variant)
            return fail("گونهٔ انتخاب‌شده پیدا نشد.");
          const key = `${product.id}::${variant?.id ?? "product"}`;
          const purchaseLines = purchase.items.filter(
            (line) =>
              line.productId === product.id && line.variantId === variant?.id,
          );
          const receivedQuantity = purchaseLines.reduce(
            (sum, line) => sum + line.quantity,
            0,
          );
          const eligible = receivedQuantity - (returnedByLine.get(key) ?? 0);
          if (eligible <= 0) {
            return fail(
              `همهٔ تعداد «${product.name}» در این خرید قبلاً به تأمین‌کننده مرجوع شده است.`,
            );
          }
          if (selection.quantity > eligible) {
            return fail(
              `تعداد مرجوعی «${product.name}» از مقدار قابل مرجوعی (${eligible}) بیشتر است.`,
            );
          }
          const availableStock = variant?.stock ?? product.stock;
          if (selection.quantity > availableStock) {
            return fail(
              `موجودی فعلی «${product.name}» برای این مرجوعی کافی نیست؛ ابتدا موجودی را بررسی کنید.`,
            );
          }
          const costBase = purchaseLines.reduce(
            (sum, line) =>
              sum +
              line.quantity * (line.unitCost + line.additionalCostPerUnit),
            0,
          );
          const unitCost =
            receivedQuantity > 0 ? costBase / receivedQuantity : 0;
          const lineAmount = Math.round(unitCost * selection.quantity);
          totalAmount += lineAmount;
          items.push({
            productId: product.id,
            productName: product.name,
            variantId: variant?.id,
            variantCode: variant?.code ?? purchaseLines[0]?.variantCode,
            variantLabel:
              purchaseLines[0]?.variantLabel ??
              (variant
                ? formatVariantAttributes(variant.attributes)
                : undefined),
            quantity: selection.quantity,
            unitCost,
            amount: lineAmount,
          });
          const previousStock = availableStock;
          const variants = variant
            ? product.variants.map((entry) =>
                entry.id === variant.id
                  ? { ...entry, stock: entry.stock - selection.quantity }
                  : entry,
              )
            : product.variants;
          const updatedProduct: RetailProduct = {
            ...product,
            variants,
            stock: variant
              ? variantStockTotal(variants)
              : product.stock - selection.quantity,
            updatedAt: input.date,
          };
          updatedProducts[productIndex] = updatedProduct;
          movements.push(
            makeStockMovement({
              date: input.date,
              product: updatedProduct,
              variantId: variant?.id,
              variantLabel: items[items.length - 1]?.variantLabel,
              type: "return",
              quantityChange: -selection.quantity,
              previousStock,
              reason: `مرجوعی به تأمین‌کننده ${purchase.reference}؛ ${input.reason.trim()}`,
              source: "مرجوعی خرید",
              relatedRecordId: purchase.id,
              reference: purchase.reference,
            }),
          );
          returnedByLine.set(
            key,
            (returnedByLine.get(key) ?? 0) + selection.quantity,
          );
        }
        if (totalAmount > purchase.amount) {
          return fail(
            "ارزش مرجوعی نمی‌تواند از مبلغ باقی‌ماندهٔ خرید بیشتر باشد.",
          );
        }
        const creditBefore = Math.max(0, purchase.paidAmount - purchase.amount);
        const nextAmount = purchase.amount - totalAmount;
        const creditAfter = Math.max(0, purchase.paidAmount - nextAmount);
        const supplierCredit = Math.max(0, creditAfter - creditBefore);
        const updatedPurchase = syncPurchaseBalance({
          ...purchase,
          amount: nextAmount,
        });
        const record: PurchaseReturnRecord = {
          id: makeId("purchase-return"),
          reference: makeReference("مخ", input.date),
          date: input.date,
          purchaseId: purchase.id,
          purchaseReference: purchase.reference,
          supplierId: purchase.supplierId,
          supplierName: purchase.supplierName,
          items,
          amount: totalAmount,
          supplierCredit,
          reason: input.reason.trim(),
        };
        set({
          purchaseReturns: [record, ...state.purchaseReturns],
          purchases: state.purchases.map((item) =>
            item.id === purchase.id ? updatedPurchase : item,
          ),
          products: updatedProducts,
          stockMovements: [...movements, ...state.stockMovements],
        });
        return ok(record);
      },
      openCashSession: (openingAmount, date) => {
        if (!isDateKey(date)) return fail("تاریخ آغاز صندوق معتبر نیست.");
        if (!Number.isFinite(openingAmount) || openingAmount < 0)
          return fail("موجودی آغازین باید نامنفی باشد.");
        const state = get();
        if (state.cashSessions.some((session) => !session.closedAt)) {
          return fail("یک نوبت صندوق هم‌اکنون باز است.");
        }
        const session: CashSessionRecord = {
          id: makeId("cash-session"),
          openedAt: date,
          openedTime: currentTime(),
          openingAmount: Math.round(openingAmount),
        };
        set({ cashSessions: [session, ...state.cashSessions] });
        return ok(session);
      },
      closeCashSession: (actualAmount, date) => {
        if (!isDateKey(date)) return fail("تاریخ بستن صندوق معتبر نیست.");
        if (!Number.isFinite(actualAmount) || actualAmount < 0)
          return fail("موجودی شمارش‌شده باید نامنفی باشد.");
        const state = get();
        const sessionIndex = state.cashSessions.findIndex(
          (session) => !session.closedAt,
        );
        if (sessionIndex < 0) return fail("نوبت بازی برای بستن وجود ندارد.");
        const session = state.cashSessions[sessionIndex];
        if (!session) return fail("نوبت صندوق پیدا نشد.");
        const netMovements = state.cashMovements
          .filter((movement) => {
            if (movement.date < session.openedAt || movement.date > date)
              return false;
            if (
              movement.date === session.openedAt &&
              movement.time < session.openedTime
            )
              return false;
            return true;
          })
          .reduce(
            (sum, movement) =>
              sum +
              (movement.direction === "in"
                ? movement.amount
                : -movement.amount),
            0,
          );
        const expectedClosing = session.openingAmount + netMovements;
        const closed: CashSessionRecord = {
          ...session,
          closedAt: date,
          closedTime: currentTime(),
          expectedClosing,
          actualClosing: Math.round(actualAmount),
          difference: Math.round(actualAmount) - expectedClosing,
        };
        const sessions = [...state.cashSessions];
        sessions[sessionIndex] = closed;
        set({ cashSessions: sessions });
        return ok(closed);
      },
      createCampaign: (input) => {
        const campaign: CampaignRecord = {
          ...input,
          id: makeId("campaign"),
          status: "draft",
          createdAt: getTodayDateKey(),
        };
        set({ campaigns: [campaign, ...get().campaigns] });
        return campaign;
      },
      simulateCampaign: (campaignId) => {
        const state = get();
        const campaign = state.campaigns.find((item) => item.id === campaignId);
        if (!campaign) return fail("پویش پیدا نشد.");
        const updated: CampaignRecord = {
          ...campaign,
          status: "simulation-requested",
          simulatedAt: getTodayDateKey(),
        };
        set({
          campaigns: state.campaigns.map((item) =>
            item.id === campaignId ? updated : item,
          ),
        });
        return ok(updated);
      },
      updateSettings: (settings) => {
        const current = get().settings;
        const next = { ...current, ...settings };
        if (!next.storeName.trim()) return fail("نام فروشگاه الزامی است.");
        if (
          !Number.isInteger(next.minimumStockDefault) ||
          next.minimumStockDefault < 0
        ) {
          return fail("حداقل موجودی پیش‌فرض باید عدد صحیح نامنفی باشد.");
        }
        if (
          !Number.isFinite(next.taxRatePercent) ||
          next.taxRatePercent < 0 ||
          next.taxRatePercent > 100
        ) {
          return fail("نرخ برآورد مالیات باید بین صفر تا صد باشد.");
        }
        if (next.expenseCategories.length === 0)
          return fail("حداقل یک دسته‌بندی هزینه لازم است.");
        const categoryLabels = new Map(
          next.expenseCategories.map((category) => [
            category.id,
            category.label,
          ]),
        );
        const expenses = get().expenses.map((expense) => {
          const categoryLabel = categoryLabels.get(expense.categoryId);
          return categoryLabel && categoryLabel !== expense.categoryLabel
            ? { ...expense, categoryLabel }
            : expense;
        });
        set({ settings: next, expenses });
        return ok(next);
      },
      restoreRetailData: (data) => {
        const normalized = normalizePersistedRetailData(data);
        if (!normalized) return fail("ساختار دادهٔ پشتیبان معتبر نیست.");
        const health = getStorageHealth(RETAIL_STORAGE_KEY);
        if (health.readFailure || health.writeBlocked) {
          return fail(
            "ذخیرهٔ قبلی قابل خواندن نیست؛ برای جلوگیری از جایگزینی دادهٔ ناشناخته، بازیابی متوقف شد.",
          );
        }
        const previous = getPersistedData(get());
        set({ ...normalized, settings: { ...normalized.settings } });
        const writeHealth = getStorageHealth(RETAIL_STORAGE_KEY);
        if (
          writeHealth.readFailure ||
          writeHealth.writeFailure ||
          writeHealth.writeBlocked
        ) {
          set(previous);
          return fail(
            "نسخهٔ پشتیبان در مرورگر ذخیره نشد؛ داده‌های فعلی در حافظه حفظ شدند.",
          );
        }
        return ok(getPersistedData(get()));
      },
      resetRetailData: () => set(createInitialRetailData()),
      initializeEmptyRetailData: () => {
        const settings = get().settings;
        set({
          ...createEmptyRetailData(),
          settings: {
            ...settings,
            expenseCategories: settings.expenseCategories.map((category) => ({
              ...category,
            })),
          },
        });
      },
    }),
    {
      name: "retail-dashboard-records-v1",
      version: 2,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (state) => getPersistedData(state),
      migrate: (persisted, _version) => {
        const normalized = normalizePersistedRetailData(persisted);
        if (!normalized) {
          reportStorageReadFailure(RETAIL_STORAGE_KEY, "invalid");
          throw new Error("Retail store data could not be migrated safely.");
        }
        return normalized;
      },
      merge: (persisted, current) => {
        if (persisted === undefined || persisted === null) return current;
        const normalized = normalizePersistedRetailData(persisted);
        if (!normalized) {
          reportStorageReadFailure(RETAIL_STORAGE_KEY, "invalid");
          return current;
        }
        return { ...current, ...normalized };
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error) reportStorageReadFailure(RETAIL_STORAGE_KEY, "parse");
      },
    },
  ),
);
