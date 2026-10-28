import type {
  CustomerRecord,
  ExpenseCategoryId,
  ExpenseRecord,
  ProductRecord,
  PurchaseRecord,
  SaleRecord,
  SupplierRecord,
  TransactionStatus,
} from "@/data/dashboard-data";
import type { CalendarMode, DateKey } from "@/lib/date";

export type PaymentMethod = "cash" | "card" | "transfer";
export type CustomerGroup = "walk-in" | "regular" | "vip";
export type StockMovementType =
  | "opening"
  | "purchase"
  | "sale"
  | "return"
  | "adjustment-in"
  | "adjustment-out"
  | "correction";
export type CashMovementDirection = "in" | "out";
export type CashMovementCategory =
  | "sale"
  | "customer-payment"
  | "purchase"
  | "supplier-payment"
  | "expense"
  | "refund"
  | "reversal"
  | "adjustment";
export type PaymentKind =
  | "sale"
  | "sale-settlement"
  | "purchase"
  | "supplier-settlement"
  | "expense"
  | "refund"
  | "reversal";

export type ProductIdentificationFormat = "linear" | "qr";

export interface ProductVariantAttribute {
  name: string;
  value: string;
}

export interface RetailProductVariant {
  id: string;
  /** Automatically generated local identifier for staff lookup; it is not a barcode. */
  code: string;
  attributes: ProductVariantAttribute[];
  stock: number;
  sku?: string;
  barcode?: string;
  /** Format for the existing barcode payload; absent legacy payloads are treated as linear barcodes. */
  barcodeFormat?: ProductIdentificationFormat;
}

export interface RetailProduct extends ProductRecord {
  brand: string;
  barcode: string;
  /** Format for the existing barcode payload; omitted when no identification code is stored. */
  barcodeFormat?: ProductIdentificationFormat;
  variants: RetailProductVariant[];
  purchaseCost: number;
  sellingPrice: number;
  description: string;
  active: boolean;
  createdAt: DateKey;
  updatedAt: DateKey;
}

export interface SaleItem {
  id?: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantCode?: string;
  variantLabel?: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  discountAmount: number;
  lineTotal: number;
}

export interface RetailSale extends Omit<SaleRecord, "paymentMethod"> {
  paymentMethod: PaymentMethod;
  items: SaleItem[];
  grossAmount: number;
  discountAmount: number;
  returnedAmount: number;
  dueDate?: DateKey;
  time: string;
  baseline: boolean;
  /** Set when the invoice is voided through the audited void workflow; the original record stays intact. */
  voidedAt?: DateKey;
  /** Reason entered by the user at void time. */
  voidReason?: string;
}

export interface PurchaseItem {
  id?: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantCode?: string;
  variantLabel?: string;
  quantity: number;
  unitCost: number;
  additionalCostPerUnit: number;
  lineTotal: number;
}

export interface RetailPurchase extends PurchaseRecord {
  paymentMethod: PaymentMethod;
  items: PurchaseItem[];
  additionalCosts: number;
  received: boolean;
  receivedAt?: DateKey;
  dueDate?: DateKey;
  baseline: boolean;
}

export interface RetailCustomer extends CustomerRecord {
  group: CustomerGroup;
  address: string;
  notes: string;
  createdAt: DateKey;
  active: boolean;
}

export interface RetailSupplier extends SupplierRecord {
  email: string;
  address: string;
  notes: string;
  createdAt: DateKey;
  active: boolean;
}

export interface RetailExpense extends Omit<ExpenseRecord, "paymentMethod"> {
  paymentMethod: PaymentMethod;
  notes: string;
}

export interface PaymentRecord {
  id: string;
  reference: string;
  date: DateKey;
  time: string;
  direction: CashMovementDirection;
  kind: PaymentKind;
  amount: number;
  method: PaymentMethod;
  description: string;
  customerId?: string;
  supplierId?: string;
  relatedSaleId?: string;
  relatedPurchaseId?: string;
  relatedExpenseId?: string;
  relatedReturnId?: string;
}

export interface StockMovementRecord {
  id: string;
  reference: string;
  date: DateKey;
  time: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantLabel?: string;
  type: StockMovementType;
  quantityChange: number;
  previousStock: number;
  resultingStock: number;
  reason: string;
  source: string;
  relatedRecordId?: string;
}

export interface CashMovementRecord {
  id: string;
  reference: string;
  date: DateKey;
  time: string;
  direction: CashMovementDirection;
  category: CashMovementCategory;
  amount: number;
  method: PaymentMethod;
  description: string;
  relatedSaleId?: string;
  relatedPurchaseId?: string;
  relatedExpenseId?: string;
  relatedPaymentId?: string;
  relatedReturnId?: string;
}

export interface ReturnItem {
  productId: string;
  productName: string;
  variantId?: string;
  variantCode?: string;
  variantLabel?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  restocked: boolean;
}

export interface ReturnRecord {
  id: string;
  reference: string;
  date: DateKey;
  saleId: string;
  saleReference: string;
  customerId: string;
  customerName: string;
  items: ReturnItem[];
  amount: number;
  refundAmount: number;
  receivableReduction: number;
  refundMethod: PaymentMethod;
  reason: string;
}

export interface PurchaseReturnItem {
  productId: string;
  productName: string;
  variantId?: string;
  variantCode?: string;
  variantLabel?: string;
  quantity: number;
  unitCost: number;
  amount: number;
}

/**
 * Goods returned to a supplier. This is a separate traceable record; the original
 * purchase keeps its own date, payments and history.
 */
export interface PurchaseReturnRecord {
  id: string;
  reference: string;
  date: DateKey;
  purchaseId: string;
  purchaseReference: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseReturnItem[];
  amount: number;
  /** Part of the supplier balance that becomes a supplier credit because the purchase was already paid. */
  supplierCredit: number;
  reason: string;
}

export interface CashSessionRecord {
  id: string;
  openedAt: DateKey;
  openedTime: string;
  openingAmount: number;
  closedAt?: DateKey;
  closedTime?: string;
  expectedClosing?: number;
  actualClosing?: number;
  difference?: number;
  note?: string;
}

export interface CampaignRecord {
  id: string;
  title: string;
  message: string;
  target: "all" | CustomerGroup;
  status: "draft" | "simulation-requested";
  createdAt: DateKey;
  simulatedAt?: DateKey;
}

export interface RetailSettings {
  storeName: string;
  currency: "تومان" | "ریال";
  minimumStockDefault: number;
  /** Legacy persisted fields retained for schema and backup compatibility; not used in financial outputs. */
  taxRatePercent: number;
  /** Legacy persisted field retained for schema and backup compatibility; not used in financial outputs. */
  taxBasis: "net-sales" | "net-profit";
  expenseCategories: Array<{ id: ExpenseCategoryId; label: string }>;
  receiptFooter: string;
  showSkuOnReceipt: boolean;
  calendarMode: CalendarMode;
}

export interface RetailData {
  products: RetailProduct[];
  sales: RetailSale[];
  purchases: RetailPurchase[];
  customers: RetailCustomer[];
  suppliers: RetailSupplier[];
  expenses: RetailExpense[];
  payments: PaymentRecord[];
  stockMovements: StockMovementRecord[];
  cashMovements: CashMovementRecord[];
  returns: ReturnRecord[];
  purchaseReturns: PurchaseReturnRecord[];
  cashSessions: CashSessionRecord[];
  campaigns: CampaignRecord[];
  settings: RetailSettings;
}

export interface OperationResult<T> {
  ok: true;
  value: T;
}

export interface OperationError {
  ok: false;
  error: string;
}

export type OperationOutcome<T> = OperationResult<T> | OperationError;

export function statusForBalance(
  total: number,
  settled: number,
): TransactionStatus {
  if (settled >= total) return "completed";
  return settled > 0 ? "partial" : "pending";
}
