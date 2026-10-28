import {
  addDays,
  compareDateKeys,
  type DateKey,
  daysBetween,
  getDateKeyRange,
  getTodayDateKey,
  parseDateKey,
} from "@/lib/date";

const SAMPLE_DATA_ANCHOR_DATE = getTodayDateKey();

export type TransactionStatus = "completed" | "partial" | "pending";
export type RecordKind =
  | "product"
  | "sale"
  | "purchase"
  | "expense"
  | "payment"
  | "customer"
  | "supplier";
export type ExpenseCategoryId =
  | "rent"
  | "utilities"
  | "salary"
  | "transport"
  | "maintenance"
  | "marketing"
  | "supplies"
  | "maker1"
  | "super1";

export interface ProductRecord {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  stock: number;
  minimumStock: number;
}

export interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
}

export interface SupplierRecord {
  id: string;
  name: string;
  phone: string;
}

export interface SaleRecord {
  id: string;
  reference: string;
  date: DateKey;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  itemCount: number;
  amount: number;
  paidAmount: number;
  paymentMethod: string;
  status: TransactionStatus;
}

export interface ExpenseRecord {
  id: string;
  reference: string;
  date: DateKey;
  categoryId: ExpenseCategoryId;
  categoryLabel: string;
  description: string;
  amount: number;
  paymentMethod: string;
}

export interface PurchaseRecord {
  id: string;
  reference: string;
  date: DateKey;
  supplierId: string;
  supplierName: string;
  description: string;
  amount: number;
  paidAmount: number;
  status: TransactionStatus;
}

export interface CustomerPaymentRecord {
  id: string;
  reference: string;
  date: DateKey;
  customerId: string;
  customerName: string;
  amount: number;
  method: string;
  relatedSaleId: string;
}

export interface RecordDetail {
  label: string;
  value: string;
}

export interface SearchRecord {
  id: string;
  kind: RecordKind;
  kindLabel: string;
  title: string;
  subtitle: string;
  dateKey?: DateKey;
  amount?: number;
  status?: TransactionStatus;
  reference?: string;
  details: RecordDetail[];
}

export interface DashboardTransaction extends SearchRecord {
  kind: "sale" | "purchase" | "expense" | "payment";
  dateKey: DateKey;
  amount: number;
  status: TransactionStatus;
  direction: "incoming" | "outgoing";
}

export interface DashboardNotification {
  id: string;
  title: string;
  description: string;
  record: SearchRecord;
}

export const products: ProductRecord[] = [
  {
    id: "prd-001",
    name: "قهوه عربیکا ۲۵۰ گرمی",
    sku: "CF-250-01",
    category: "نوشیدنی",
    unit: "بسته",
    stock: 3,
    minimumStock: 8,
  },
  {
    id: "prd-002",
    name: "چای سیلان ۵۰۰ گرمی",
    sku: "TE-500-02",
    category: "نوشیدنی",
    unit: "بسته",
    stock: 5,
    minimumStock: 10,
  },
  {
    id: "prd-003",
    name: "روغن زیتون فرابکر",
    sku: "OL-750-03",
    category: "مواد غذایی",
    unit: "بطری",
    stock: 12,
    minimumStock: 6,
  },
  {
    id: "prd-004",
    name: "عسل کوهستان ۴۵۰ گرمی",
    sku: "HN-450-04",
    category: "مواد غذایی",
    unit: "شیشه",
    stock: 2,
    minimumStock: 6,
  },
  {
    id: "prd-005",
    name: "شکلات تلخ ۷۰٪",
    sku: "CH-100-05",
    category: "تنقلات",
    unit: "عدد",
    stock: 18,
    minimumStock: 8,
  },
  {
    id: "prd-006",
    name: "برنج هاشمی ۱۰ کیلویی",
    sku: "RC-10K-06",
    category: "مواد غذایی",
    unit: "کیسه",
    stock: 9,
    minimumStock: 5,
  },
  {
    id: "prd-007",
    name: "خرما مضافتی ۷۰۰ گرمی",
    sku: "DT-700-07",
    category: "مواد غذایی",
    unit: "بسته",
    stock: 4,
    minimumStock: 7,
  },
  {
    id: "prd-008",
    name: "بیسکویت کره‌ای",
    sku: "CK-300-08",
    category: "تنقلات",
    unit: "جعبه",
    stock: 24,
    minimumStock: 10,
  },
];

export const customers: CustomerRecord[] = [
  { id: "cus-001", name: "سارا احمدی", phone: "۰۹۱۲ ۳۴۵ ۶۷۸۹" },
  { id: "cus-002", name: "آرمان رضایی", phone: "۰۹۳۵ ۶۷۸ ۱۲۳۴" },
  { id: "cus-003", name: "نرگس کاظمی", phone: "۰۹۱۰ ۲۴۶ ۸۱۳۵" },
  { id: "cus-004", name: "فروش حضوری", phone: "بدون شماره تماس" },
  { id: "cus-005", name: "مهدی نادری", phone: "۰۹۱۹ ۴۵۶ ۷۸۱۲" },
];

export const suppliers: SupplierRecord[] = [
  { id: "sup-001", name: "پخش بهارستان", phone: "۰۲۱ ۴۴۲۲ ۱۱۸۰" },
  { id: "sup-002", name: "تأمین کالای آریا", phone: "۰۲۱ ۸۸۷۶ ۴۲۱۰" },
  { id: "sup-003", name: "بازرگانی سپهر", phone: "۰۲۱ ۳۳۱۱ ۷۷۲۰" },
];

const paymentMethods = ["نقدی", "کارت‌خوان", "انتقال بانکی"];
const productById = new Map(products.map((product) => [product.id, product]));
const customerById = new Map(
  customers.map((customer) => [customer.id, customer]),
);
const supplierById = new Map(
  suppliers.map((supplier) => [supplier.id, supplier]),
);

const expenseSchedule: Array<{
  day: number;
  categoryId: ExpenseCategoryId;
  categoryLabel: string;
  description: string;
  baseAmount: number;
}> = [
  {
    day: 2,
    categoryId: "rent",
    categoryLabel: "اجاره",
    description: "اجاره فروشگاه",
    baseAmount: 56_000_000,
  },
  {
    day: 6,
    categoryId: "utilities",
    categoryLabel: "قبوض و خدمات",
    description: "آب، برق و اینترنت",
    baseAmount: 9_400_000,
  },
  {
    day: 12,
    categoryId: "salary",
    categoryLabel: "حقوق و دستمزد",
    description: "پرداخت حقوق کارکنان",
    baseAmount: 38_000_000,
  },
  {
    day: 18,
    categoryId: "transport",
    categoryLabel: "حمل‌ونقل",
    description: "هزینه ارسال و جابه‌جایی",
    baseAmount: 6_800_000,
  },
  {
    day: 23,
    categoryId: "maintenance",
    categoryLabel: "نگهداری",
    description: "سرویس و نگهداری فروشگاه",
    baseAmount: 5_500_000,
  },
  {
    day: 27,
    categoryId: "marketing",
    categoryLabel: "بازاریابی",
    description: "چاپ و تبلیغات محلی",
    baseAmount: 4_200_000,
  },
];

function roundToHundredThousand(value: number): number {
  return Math.round(value / 100_000) * 100_000;
}

function makeSales(): SaleRecord[] {
  const firstDate = addDays(SAMPLE_DATA_ANCHOR_DATE, -730);
  const dates = getDateKeyRange(firstDate, SAMPLE_DATA_ANCHOR_DATE);
  const records: SaleRecord[] = [];
  let sequence = 0;

  for (const date of dates) {
    const { year, month, day } = parseDateKey(date);
    const weekday = new Date(`${date}T12:00:00.000Z`).getUTCDay();
    const isToday = date === SAMPLE_DATA_ANCHOR_DATE;
    const isOpenDay = weekday !== 5;
    const hasSale = isToday || (isOpenDay && (day + month) % 4 !== 0);
    const salesThatDay = hasSale ? ((day + month) % 11 === 0 ? 2 : 1) : 0;

    for (let dayIndex = 0; dayIndex < salesThatDay; dayIndex += 1) {
      const product = products[sequence % products.length];
      const customer = customers[(sequence * 3 + dayIndex) % customers.length];
      const baseAmount =
        8_500_000 +
        ((day * 913_000 + month * 1_287_000 + sequence * 319_000) % 19_000_000);
      const trend = 1 + Math.max(0, year - 2025) * 0.075 + (month - 1) * 0.003;
      const amount = roundToHundredThousand(baseAmount * trend);
      const status: TransactionStatus =
        sequence % 17 === 0
          ? "pending"
          : sequence % 5 === 0
            ? "partial"
            : "completed";
      const paidAmount =
        status === "pending"
          ? 0
          : status === "partial"
            ? roundToHundredThousand(amount * 0.68)
            : amount;

      records.push({
        id: `sale-${String(sequence + 1).padStart(4, "0")}`,
        reference: `ف-${year}-${String(sequence + 1).padStart(4, "0")}`,
        date,
        customerId: customer.id,
        customerName: customer.name,
        productId: product.id,
        productName: product.name,
        itemCount: 1 + ((sequence + dayIndex) % 4),
        amount,
        paidAmount,
        paymentMethod: paymentMethods[sequence % paymentMethods.length],
        status,
      });
      sequence += 1;
    }
  }

  return records;
}

function makeExpenses(): ExpenseRecord[] {
  const records: ExpenseRecord[] = [];
  const { year: anchorYear, month: anchorMonth } = parseDateKey(
    SAMPLE_DATA_ANCHOR_DATE,
  );

  for (let monthOffset = -24; monthOffset <= 0; monthOffset += 1) {
    const monthDate = new Date(
      Date.UTC(anchorYear, anchorMonth - 1 + monthOffset, 1, 12),
    );
    const year = monthDate.getUTCFullYear();
    const month = monthDate.getUTCMonth() + 1;
    const monthDays = new Date(Date.UTC(year, month, 0, 12)).getUTCDate();

    for (const [index, item] of expenseSchedule.entries()) {
      if (item.day > monthDays) continue;
      const date = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(item.day).padStart(2, "0")}`;
      if (compareDateKeys(date, SAMPLE_DATA_ANCHOR_DATE) > 0) continue;

      const fluctuation = ((year * 17 + month * 13 + index * 23) % 9) - 4;
      const amount = roundToHundredThousand(
        item.baseAmount * (1 + fluctuation * 0.018),
      );
      records.push({
        id: `expense-${year}-${String(month).padStart(2, "0")}-${index + 1}`,
        reference: `ه-${year}-${String(month).padStart(2, "0")}-${index + 1}`,
        date,
        categoryId: item.categoryId,
        categoryLabel: item.categoryLabel,
        description: item.description,
        amount,
        paymentMethod: index % 2 === 0 ? "انتقال بانکی" : "کارت‌خوان",
      });
    }
  }

  return records;
}

function makePurchases(): PurchaseRecord[] {
  const records: PurchaseRecord[] = [];
  const { year: anchorYear, month: anchorMonth } = parseDateKey(
    SAMPLE_DATA_ANCHOR_DATE,
  );
  let sequence = 0;

  for (let monthOffset = -17; monthOffset <= 0; monthOffset += 1) {
    const monthDate = new Date(
      Date.UTC(anchorYear, anchorMonth - 1 + monthOffset, 1, 12),
    );
    const year = monthDate.getUTCFullYear();
    const month = monthDate.getUTCMonth() + 1;
    const dates = [4, 15];

    for (const day of dates) {
      const date = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (compareDateKeys(date, SAMPLE_DATA_ANCHOR_DATE) > 0) continue;

      const supplier = suppliers[sequence % suppliers.length];
      const amount = roundToHundredThousand(
        62_000_000 + ((year + month * 5 + sequence * 11) % 47) * 1_000_000,
      );
      const status: TransactionStatus =
        sequence % 4 === 0 ? "partial" : "completed";
      const paidAmount =
        status === "partial" ? roundToHundredThousand(amount * 0.72) : amount;

      records.push({
        id: `purchase-${String(sequence + 1).padStart(3, "0")}`,
        reference: `خ-${year}-${String(sequence + 1).padStart(3, "0")}`,
        date,
        supplierId: supplier.id,
        supplierName: supplier.name,
        description: "تأمین کالای فروشگاه",
        amount,
        paidAmount,
        status,
      });
      sequence += 1;
    }
  }

  return records;
}

function makeCustomerPayments(sales: SaleRecord[]): CustomerPaymentRecord[] {
  return sales
    .filter((sale, index) => sale.status === "partial" && index % 11 === 0)
    .map((sale, index) => {
      const date = addDays(sale.date, 2 + (index % 4));
      const outstanding = sale.amount - sale.paidAmount;
      const amount = Math.min(
        outstanding,
        roundToHundredThousand(sale.amount * 0.12),
      );
      return {
        id: `payment-${sale.id}`,
        reference: `پ-${sale.reference}`,
        date,
        customerId: sale.customerId,
        customerName: sale.customerName,
        amount,
        method: index % 2 === 0 ? "کارت‌خوان" : "انتقال بانکی",
        relatedSaleId: sale.id,
      };
    })
    .filter(
      (payment) => compareDateKeys(payment.date, SAMPLE_DATA_ANCHOR_DATE) <= 0,
    );
}

export const sales = makeSales();
export const expenses = makeExpenses();
export const purchases = makePurchases();
export const customerPayments = makeCustomerPayments(sales);

function productSearchRecord(product: ProductRecord): SearchRecord {
  return {
    id: product.id,
    kind: "product",
    kindLabel: "کالا",
    title: product.name,
    subtitle: `${product.category} · کد ${product.sku}`,
    details: [
      { label: "کد کالا", value: product.sku },
      { label: "دسته‌بندی", value: product.category },
      { label: "موجودی فعلی", value: `${product.stock} ${product.unit}` },
      {
        label: "حداقل موجودی",
        value: `${product.minimumStock} ${product.unit}`,
      },
    ],
  };
}

function saleSearchRecord(sale: SaleRecord): SearchRecord {
  return {
    id: sale.id,
    kind: "sale",
    kindLabel: "فروش",
    title: sale.reference,
    subtitle: `${sale.customerName} · ${sale.productName}`,
    dateKey: sale.date,
    amount: sale.amount,
    status: sale.status,
    reference: sale.reference,
    details: [
      { label: "مشتری", value: sale.customerName },
      { label: "کالا", value: sale.productName },
      { label: "تعداد اقلام", value: String(sale.itemCount) },
      { label: "پرداخت اولیه", value: `${sale.paidAmount} تومان` },
      { label: "روش پرداخت", value: sale.paymentMethod },
    ],
  };
}

function purchaseSearchRecord(purchase: PurchaseRecord): SearchRecord {
  return {
    id: purchase.id,
    kind: "purchase",
    kindLabel: "خرید",
    title: purchase.reference,
    subtitle: `${purchase.supplierName} · ${purchase.description}`,
    dateKey: purchase.date,
    amount: purchase.amount,
    status: purchase.status,
    reference: purchase.reference,
    details: [
      { label: "تأمین‌کننده", value: purchase.supplierName },
      { label: "شرح", value: purchase.description },
      { label: "پرداخت‌شده", value: `${purchase.paidAmount} تومان` },
    ],
  };
}

function expenseSearchRecord(expense: ExpenseRecord): SearchRecord {
  return {
    id: expense.id,
    kind: "expense",
    kindLabel: "هزینه جاری",
    title: expense.description,
    subtitle: `${expense.categoryLabel} · ${expense.reference}`,
    dateKey: expense.date,
    amount: expense.amount,
    status: "completed",
    reference: expense.reference,
    details: [
      { label: "دسته‌بندی", value: expense.categoryLabel },
      { label: "شرح", value: expense.description },
      { label: "روش پرداخت", value: expense.paymentMethod },
    ],
  };
}

function paymentSearchRecord(payment: CustomerPaymentRecord): SearchRecord {
  return {
    id: payment.id,
    kind: "payment",
    kindLabel: "دریافت طلب",
    title: payment.reference,
    subtitle: `${payment.customerName} · تسویه بخشی از طلب`,
    dateKey: payment.date,
    amount: payment.amount,
    status: "completed",
    reference: payment.reference,
    details: [
      { label: "مشتری", value: payment.customerName },
      { label: "روش دریافت", value: payment.method },
      { label: "فروش مرتبط", value: payment.relatedSaleId },
    ],
  };
}

const productRecords = products.map(productSearchRecord);
const saleRecords = sales.map(saleSearchRecord);
const purchaseRecords = purchases.map(purchaseSearchRecord);
const expenseRecords = expenses.map(expenseSearchRecord);
const paymentRecords = customerPayments.map(paymentSearchRecord);
const customerRecords: SearchRecord[] = customers.map((customer) => ({
  id: customer.id,
  kind: "customer",
  kindLabel: "مشتری",
  title: customer.name,
  subtitle: customer.phone,
  details: [
    { label: "نام", value: customer.name },
    { label: "شماره تماس", value: customer.phone },
    {
      label: "تعداد خریدها",
      value: String(
        sales.filter((sale) => sale.customerId === customer.id).length,
      ),
    },
  ],
}));
const supplierRecords: SearchRecord[] = suppliers.map((supplier) => ({
  id: supplier.id,
  kind: "supplier",
  kindLabel: "تأمین‌کننده",
  title: supplier.name,
  subtitle: supplier.phone,
  details: [
    { label: "نام تأمین‌کننده", value: supplier.name },
    { label: "شماره تماس", value: supplier.phone },
    {
      label: "تعداد خریدها",
      value: String(
        purchases.filter((purchase) => purchase.supplierId === supplier.id)
          .length,
      ),
    },
  ],
}));

export const searchRecords: SearchRecord[] = [
  ...productRecords,
  ...saleRecords,
  ...purchaseRecords,
  ...expenseRecords,
  ...paymentRecords,
  ...customerRecords,
  ...supplierRecords,
];

function toDashboardTransaction(
  record: SearchRecord,
  direction: "incoming" | "outgoing",
): DashboardTransaction {
  if (
    record.kind === "product" ||
    record.kind === "customer" ||
    record.kind === "supplier"
  ) {
    throw new Error(
      "Only transaction records can be rendered in the activity list.",
    );
  }
  if (record.dateKey === undefined || record.amount === undefined) {
    throw new Error("A transaction needs both a date and an amount.");
  }

  return {
    ...record,
    kind: record.kind,
    dateKey: record.dateKey,
    amount: record.amount,
    status: record.status ?? "completed",
    direction,
  };
}

export const dashboardTransactions: DashboardTransaction[] = [
  ...saleRecords.map((record) => toDashboardTransaction(record, "incoming")),
  ...purchaseRecords.map((record) =>
    toDashboardTransaction(record, "outgoing"),
  ),
  ...expenseRecords.map((record) => toDashboardTransaction(record, "outgoing")),
  ...paymentRecords.map((record) => toDashboardTransaction(record, "incoming")),
].sort((left, right) => compareDateKeys(right.dateKey, left.dateKey));

export const recentTransactions = dashboardTransactions.slice(0, 6);

export function searchDashboardRecords(
  query: string,
  limit = 7,
  sourceRecords: SearchRecord[] = searchRecords,
): SearchRecord[] {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length < 2) return [];

  return sourceRecords
    .filter((record) => {
      const haystack = normalizeSearchText(
        [
          record.title,
          record.subtitle,
          record.reference ?? "",
          record.kindLabel,
        ].join(" "),
      );
      return haystack.includes(normalizedQuery);
    })
    .slice(0, limit);
}

function normalizeSearchText(value: string): string {
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("fa-IR")
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)))
    .replace(/\s+/g, " ")
    .trim();
}

export function getLowStockProducts(): ProductRecord[] {
  return products.filter((product) => product.stock <= product.minimumStock);
}

export function getNotifications(): DashboardNotification[] {
  return getLowStockProducts().map((product) => ({
    id: `low-stock-${product.id}`,
    title: `${product.name} به حداقل موجودی رسیده است`,
    description: `موجودی ${product.stock} ${product.unit} است؛ حداقل تعریف‌شده ${product.minimumStock} ${product.unit} است.`,
    record: productSearchRecord(product),
  }));
}

export function getSalesForDate(dateKey: DateKey): SaleRecord[] {
  return sales.filter((sale) => sale.date === dateKey);
}

export function getCashReceivedForDate(dateKey: DateKey): number {
  const salePayments = getSalesForDate(dateKey).reduce(
    (total, sale) => total + sale.paidAmount,
    0,
  );
  const debtCollections = customerPayments
    .filter((payment) => payment.date === dateKey)
    .reduce((total, payment) => total + payment.amount, 0);
  return salePayments + debtCollections;
}

export function getTransactionsForDate(
  dateKey: DateKey,
): DashboardTransaction[] {
  return dashboardTransactions.filter(
    (transaction) => transaction.dateKey === dateKey,
  );
}

export function getPreviousDayKey(dateKey: DateKey): DateKey {
  return addDays(dateKey, -1);
}

export function isDateInRange(
  dateKey: DateKey,
  start: DateKey,
  end: DateKey,
): boolean {
  return (
    compareDateKeys(dateKey, start) >= 0 && compareDateKeys(dateKey, end) <= 0
  );
}

export function getCustomerById(id: string): CustomerRecord | undefined {
  return customerById.get(id);
}

export function getSupplierById(id: string): SupplierRecord | undefined {
  return supplierById.get(id);
}

export function getProductById(id: string): ProductRecord | undefined {
  return productById.get(id);
}

export function getSampleRangeEnd(): DateKey {
  return SAMPLE_DATA_ANCHOR_DATE;
}

export function getReceivableCount(): number {
  return sales.filter((sale) => sale.amount > sale.paidAmount).length;
}

export function getDateDifferenceLabel(start: DateKey, end: DateKey): number {
  return daysBetween(start, end) + 1;
}

export const expenseCategories: Array<{
  id: ExpenseCategoryId;
  label: string;
  color: string;
}> = [
  { id: "rent", label: "اجاره", color: "var(--chart-1)" },
  { id: "salary", label: "حقوق و دستمزد", color: "var(--chart-2)" },
  { id: "utilities", label: "قبوض و خدمات", color: "var(--chart-3)" },
  { id: "transport", label: "حمل‌ونقل", color: "var(--chart-4)" },
  { id: "maintenance", label: "نگهداری", color: "var(--chart-5)" },
  { id: "marketing", label: "بازاریابی", color: "var(--chart-6)" },
  { id: "supplies", label: "ملزومات", color: "var(--chart-7)" },
  { id: "maker1", label: "پرداخت", color: "var(--chart-8)" },
  { id: "super1", label: "برگشتی", color: "var(--chart-9)" },
];

export function getExpenseRecords(
  start: DateKey,
  end: DateKey,
): ExpenseRecord[] {
  return expenses.filter((expense) => isDateInRange(expense.date, start, end));
}

export function getSalesRecords(start: DateKey, end: DateKey): SaleRecord[] {
  return sales.filter((sale) => isDateInRange(sale.date, start, end));
}

export function getCustomerName(id: string): string {
  return customerById.get(id)?.name ?? "فروش حضوری";
}

export function getSupplierName(id: string): string {
  return supplierById.get(id)?.name ?? "تأمین‌کننده";
}

export function getProductName(id: string): string {
  return productById.get(id)?.name ?? "کالای ثبت‌شده";
}

export function getAnnualSalesCount(dateKey: DateKey): number {
  const { year } = parseDateKey(dateKey);
  return sales.filter((sale) => sale.date.startsWith(String(year))).length;
}

export function getRecentActivityCount(): number {
  return recentTransactions.length;
}
