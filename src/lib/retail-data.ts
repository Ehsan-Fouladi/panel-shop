import type {
  DashboardTransaction,
  RecordDetail,
  SearchRecord,
} from "@/data/dashboard-data";
import {
  compareDateKeys,
  type DateKey,
  getDateKeyRange,
  getTodayDateKey,
} from "@/lib/date";
import { formatCurrency } from "@/lib/formatters";
import {
  formatVariantAttributes,
  identificationFormatLabel,
} from "@/lib/product-variants";
import type {
  CashMovementCategory,
  CashMovementRecord,
  PaymentRecord,
  PurchaseReturnRecord,
  RetailData,
  RetailExpense,
  RetailPurchase,
  RetailSale,
  ReturnRecord,
} from "@/types/retail";
import { statusForBalance } from "@/types/retail";

export interface FinancialSummary {
  grossSales: number;
  discounts: number;
  returns: number;
  netSales: number;
  costOfGoodsSold: number;
  grossProfit: number;
  operatingExpenses: number;
  netProfit: number;
  receivables: number;
  payables: number;
  inventoryValue: number;
}

export function isSaleVoided(sale: Pick<RetailSale, "voidedAt">): boolean {
  return typeof sale.voidedAt === "string" && sale.voidedAt.length > 0;
}

export function getNetSaleAmount(
  sale: Pick<RetailSale, "amount" | "returnedAmount" | "voidedAt">,
): number {
  if (isSaleVoided(sale)) return 0;
  return Math.max(0, sale.amount - sale.returnedAmount);
}

export function getReturnedQuantityByLine(
  saleId: string,
  returnRecords: ReturnRecord[],
): Map<string, number> {
  const quantities = new Map<string, number>();
  for (const record of returnRecords) {
    if (record.saleId !== saleId) continue;
    for (const item of record.items) {
      const key = `${item.productId}::${item.variantId ?? "product"}`;
      quantities.set(key, (quantities.get(key) ?? 0) + item.quantity);
    }
  }
  return quantities;
}

export function getPurchaseReturnedQuantities(
  purchaseId: string,
  purchaseReturns: PurchaseReturnRecord[] | undefined,
): Map<string, number> {
  const quantities = new Map<string, number>();
  for (const record of purchaseReturns ?? []) {
    if (record.purchaseId !== purchaseId) continue;
    for (const item of record.items) {
      const key = `${item.productId}::${item.variantId ?? "product"}`;
      quantities.set(key, (quantities.get(key) ?? 0) + item.quantity);
    }
  }
  return quantities;
}

export function getPurchaseReturnedAmount(
  purchaseId: string,
  purchaseReturns: PurchaseReturnRecord[] | undefined,
): number {
  return (purchaseReturns ?? [])
    .filter((record) => record.purchaseId === purchaseId)
    .reduce((sum, record) => sum + record.amount, 0);
}

export function getSupplierCreditTotal(
  supplierId: string,
  purchaseReturns: PurchaseReturnRecord[] | undefined,
): number {
  return (purchaseReturns ?? [])
    .filter((record) => record.supplierId === supplierId)
    .reduce((sum, record) => sum + record.supplierCredit, 0);
}

export function getDailySalesSummary(
  sales: RetailSale[],
  date: DateKey,
): { sales: number; count: number } {
  const dailySales = sales.filter(
    (sale) => sale.date === date && !isSaleVoided(sale),
  );
  return {
    sales: dailySales.reduce(
      (total, sale) => total + getNetSaleAmount(sale),
      0,
    ),
    count: dailySales.length,
  };
}

export function isDueDateOverdue(
  dueDate: DateKey | undefined,
  today: DateKey = getTodayDateKey(),
) {
  return dueDate !== undefined && dueDate < today;
}

export function getSaleRefundedAmount(
  saleId: string,
  returnRecords: ReturnRecord[],
): number {
  return returnRecords
    .filter((record) => record.saleId === saleId)
    .reduce((sum, record) => sum + record.refundAmount, 0);
}

export function getSaleNetPaidAmount(
  sale: RetailSale,
  returnRecords: ReturnRecord[],
): number {
  if (isSaleVoided(sale)) return 0;
  return Math.max(
    0,
    sale.paidAmount - getSaleRefundedAmount(sale.id, returnRecords),
  );
}

export function getSaleOutstanding(
  sale: RetailSale,
  returnRecords: ReturnRecord[],
): number {
  return Math.max(
    0,
    getNetSaleAmount(sale) - getSaleNetPaidAmount(sale, returnRecords),
  );
}

export function getPurchaseOutstanding(purchase: RetailPurchase): number {
  return Math.max(0, purchase.amount - purchase.paidAmount);
}

export function getSaleStatus(sale: RetailSale, returnRecords: ReturnRecord[]) {
  if (isSaleVoided(sale)) return statusForBalance(0, 0);
  return statusForBalance(
    getNetSaleAmount(sale),
    getSaleNetPaidAmount(sale, returnRecords),
  );
}

export function getPurchaseStatus(purchase: RetailPurchase) {
  return statusForBalance(purchase.amount, purchase.paidAmount);
}

export function getCustomerReceivable(
  data: RetailData,
  customerId: string,
): number {
  return data.sales
    .filter((sale) => sale.customerId === customerId)
    .reduce((sum, sale) => sum + getSaleOutstanding(sale, data.returns), 0);
}

export function getSupplierPayable(
  data: RetailData,
  supplierId: string,
): number {
  return data.purchases
    .filter((purchase) => purchase.supplierId === supplierId)
    .reduce((sum, purchase) => sum + getPurchaseOutstanding(purchase), 0);
}

export function getRestockedReturnCostsByProduct(
  data: RetailData,
  returnRecords: ReturnRecord[],
): Map<string, number> {
  const salesById = new Map(data.sales.map((sale) => [sale.id, sale]));
  const costsByProductId = new Map<string, number>();
  for (const record of returnRecords) {
    const sale = salesById.get(record.saleId);
    if (!sale) continue;
    for (const returned of record.items) {
      if (!returned.restocked) continue;
      const soldItems = sale.items.filter(
        (item) =>
          item.productId === returned.productId &&
          item.variantId === returned.variantId,
      );
      const soldQuantity = soldItems.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      const soldCost = soldItems.reduce(
        (sum, item) => sum + item.unitCost * item.quantity,
        0,
      );
      const costPerUnit = soldQuantity > 0 ? soldCost / soldQuantity : 0;
      costsByProductId.set(
        returned.productId,
        (costsByProductId.get(returned.productId) ?? 0) +
          costPerUnit * returned.quantity,
      );
    }
  }
  return costsByProductId;
}

export function getHourlySaleTotals(
  sales: RetailSale[],
  date: DateKey,
): number[] {
  const dailySales = sales.filter((sale) => sale.date === date);
  return Array.from({ length: 24 }, (_, hour) =>
    dailySales
      .filter((sale) => Number(sale.time.slice(0, 2)) === hour)
      .reduce((sum, sale) => sum + getNetSaleAmount(sale), 0),
  );
}

export function getFinancialChartDomain(
  rows: Array<{ sales: number; expenses: number }>,
): [number, number] {
  const minimum = Math.min(0, ...rows.map((row) => row.sales));
  const maximum = Math.max(
    0,
    ...rows.flatMap((row) => [row.sales, row.expenses]),
  );
  return minimum === maximum ? [minimum, minimum + 1] : [minimum, maximum];
}

export function getFinancialSummary(
  data: RetailData,
  start: DateKey,
  end: DateKey,
): FinancialSummary {
  const sales = data.sales.filter(
    (sale) => !isSaleVoided(sale) && sale.date >= start && sale.date <= end,
  );
  const expenses = data.expenses.filter(
    (expense) => expense.date >= start && expense.date <= end,
  );
  const returns = data.returns.filter(
    (record) => record.date >= start && record.date <= end,
  );
  const restockedReturnCost = [
    ...getRestockedReturnCostsByProduct(data, returns).values(),
  ].reduce((sum, cost) => sum + cost, 0);
  const grossSales = sales.reduce((sum, sale) => sum + sale.grossAmount, 0);
  const discounts = sales.reduce((sum, sale) => sum + sale.discountAmount, 0);
  const returnedSales = returns.reduce((sum, record) => sum + record.amount, 0);
  const netSales =
    sales.reduce((sum, sale) => sum + sale.amount, 0) - returnedSales;
  const soldCost = sales.reduce(
    (sum, sale) =>
      sum +
      sale.items.reduce(
        (itemSum, item) => itemSum + item.unitCost * item.quantity,
        0,
      ),
    0,
  );
  const costOfGoodsSold = soldCost - restockedReturnCost;
  const operatingExpenses = expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );
  const grossProfit = netSales - costOfGoodsSold;
  const netProfit = grossProfit - operatingExpenses;
  const receivables = data.sales.reduce(
    (sum, sale) => sum + getSaleOutstanding(sale, data.returns),
    0,
  );
  const payables = data.purchases.reduce(
    (sum, purchase) => sum + getPurchaseOutstanding(purchase),
    0,
  );
  const inventoryValue = data.products.reduce(
    (sum, product) => sum + product.stock * product.purchaseCost,
    0,
  );

  return {
    grossSales,
    discounts,
    returns: returnedSales,
    netSales,
    costOfGoodsSold,
    grossProfit,
    operatingExpenses,
    netProfit,
    receivables,
    payables,
    inventoryValue,
  };
}

export function getCashTotals(
  movements: CashMovementRecord[],
  start?: DateKey,
  end?: DateKey,
): { inflows: number; outflows: number; net: number } {
  const included = movements.filter(
    (movement) =>
      (start === undefined || movement.date >= start) &&
      (end === undefined || movement.date <= end),
  );
  const inflows = included
    .filter((movement) => movement.direction === "in")
    .reduce((sum, movement) => sum + movement.amount, 0);
  const outflows = included
    .filter((movement) => movement.direction === "out")
    .reduce((sum, movement) => sum + movement.amount, 0);
  return { inflows, outflows, net: inflows - outflows };
}

function details(items: Array<[string, string]>): RecordDetail[] {
  return items.map(([label, value]) => ({ label, value }));
}

function saleSearchRecord(
  sale: RetailSale,
  returnRecords: ReturnRecord[],
): SearchRecord {
  return {
    id: sale.id,
    kind: "sale",
    kindLabel: "فروش",
    title: sale.reference,
    subtitle: `${sale.customerName} · ${sale.items
      .map(
        (item) =>
          `${item.productName}${item.variantLabel ? ` (${item.variantLabel})` : ""}`,
      )
      .slice(0, 2)
      .join("، ")}`,
    dateKey: sale.date,
    amount: getNetSaleAmount(sale),
    status: getSaleStatus(sale, returnRecords),
    reference: sale.reference,
    details: details([
      ["مشتری", sale.customerName],
      ["تعداد اقلام", String(sale.itemCount)],
      [
        "وضعیت ثبت",
        isSaleVoided(sale) ? `باطل‌شده در ${sale.voidedAt}` : "معتبر",
      ],
      [
        "پرداخت خالص پس از بازپرداخت",
        formatCurrency(getSaleNetPaidAmount(sale, returnRecords)),
      ],
      ["ماندهٔ طلب", formatCurrency(getSaleOutstanding(sale, returnRecords))],
      ["روش پرداخت", paymentMethodLabel(sale.paymentMethod)],
    ]),
  };
}

function purchaseSearchRecord(
  purchase: RetailPurchase,
  data: RetailData,
): SearchRecord {
  return {
    id: purchase.id,
    kind: "purchase",
    kindLabel: "خرید",
    title: purchase.reference,
    subtitle: `${purchase.supplierName} · ${purchase.description}`,
    dateKey: purchase.date,
    amount: purchase.amount,
    status: getPurchaseStatus(purchase),
    reference: purchase.reference,
    details: details([
      ["تأمین‌کننده", purchase.supplierName],
      ["شرح", purchase.description],
      ["پرداخت‌شده", formatCurrency(purchase.paidAmount)],
      ["ماندهٔ بدهی", formatCurrency(getPurchaseOutstanding(purchase))],
      ["وضعیت دریافت", purchase.received ? "دریافت‌شده" : "در انتظار دریافت"],
      [
        "مرجوعی به تأمین‌کننده",
        formatCurrency(
          getPurchaseReturnedAmount(purchase.id, data.purchaseReturns),
        ),
      ],
    ]),
  };
}

function expenseSearchRecord(expense: RetailExpense): SearchRecord {
  return {
    id: expense.id,
    kind: "expense",
    kindLabel: "هزینهٔ جاری",
    title: expense.description,
    subtitle: `${expense.categoryLabel} · ${expense.reference}`,
    dateKey: expense.date,
    amount: expense.amount,
    status: "completed",
    reference: expense.reference,
    details: details([
      ["دسته‌بندی", expense.categoryLabel],
      ["شرح", expense.description],
      ["روش پرداخت", paymentMethodLabel(expense.paymentMethod)],
    ]),
  };
}

function paymentSearchRecord(payment: PaymentRecord): SearchRecord {
  return {
    id: payment.id,
    kind: "payment",
    kindLabel: payment.direction === "in" ? "دریافت" : "پرداخت",
    title: payment.reference,
    subtitle: payment.description,
    dateKey: payment.date,
    amount: payment.amount,
    status: "completed",
    reference: payment.reference,
    details: details([
      ["نوع رویداد", paymentKindLabel(payment.kind)],
      ["روش", paymentMethodLabel(payment.method)],
      ["تاریخ", payment.date],
      ...(payment.relatedSaleId
        ? [["فروش مرتبط", payment.relatedSaleId] as [string, string]]
        : []),
      ...(payment.relatedPurchaseId
        ? [["خرید مرتبط", payment.relatedPurchaseId] as [string, string]]
        : []),
    ]),
  };
}

export function buildRetailSearchRecords(data: RetailData): SearchRecord[] {
  const productRecords: SearchRecord[] = data.products
    .filter((product) => product.active)
    .map((product) => ({
      id: product.id,
      kind: "product",
      kindLabel: "کالا",
      title: product.name,
      subtitle: `${product.brand ? `${product.brand} · ` : ""}${product.category} · SKU داخلی ${product.sku || "ثبت نشده"}`,
      details: details([
        ["SKU داخلی", product.sku || "ثبت نشده"],
        ["مرجع کالا", product.id],
        [
          "شناسهٔ محصول",
          product.barcode
            ? `${identificationFormatLabel(product.barcodeFormat)}: ${product.barcode}`
            : "ثبت نشده",
        ],
        ["برند", product.brand || "ثبت نشده"],
        ["دسته‌بندی", product.category],
        ["موجودی فعلی", `${product.stock} ${product.unit}`],
        [
          "گونه‌ها",
          product.variants.length
            ? product.variants
                .map(
                  (variant) =>
                    `${formatVariantAttributes(variant.attributes)} · کد داخلی ${variant.code} · SKU ${variant.sku || "—"}${variant.barcode ? ` · ${identificationFormatLabel(variant.barcodeFormat)}: ${variant.barcode}` : ""} · ${variant.stock} ${product.unit}`,
                )
                .join("؛ ")
            : "بدون گونه",
        ],
        ["قیمت فروش", formatCurrency(product.sellingPrice)],
      ]),
    }));
  const customerRecords: SearchRecord[] = data.customers
    .filter((customer) => customer.active)
    .map((customer) => ({
      id: customer.id,
      kind: "customer",
      kindLabel: "مشتری",
      title: customer.name,
      subtitle: customer.phone,
      details: details([
        ["نام", customer.name],
        ["شماره تماس", customer.phone || "ثبت نشده"],
        ["گروه", customerGroupLabel(customer.group)],
        [
          "ماندهٔ طلب",
          formatCurrency(getCustomerReceivable(data, customer.id)),
        ],
      ]),
    }));
  const supplierRecords: SearchRecord[] = data.suppliers
    .filter((supplier) => supplier.active)
    .map((supplier) => ({
      id: supplier.id,
      kind: "supplier",
      kindLabel: "تأمین‌کننده",
      title: supplier.name,
      subtitle: supplier.phone,
      details: details([
        ["نام تأمین‌کننده", supplier.name],
        ["شماره تماس", supplier.phone || "ثبت نشده"],
        ["ماندهٔ بدهی", formatCurrency(getSupplierPayable(data, supplier.id))],
      ]),
    }));
  const otherPayments = data.payments
    .filter(
      (payment) =>
        payment.kind === "sale-settlement" ||
        payment.kind === "supplier-settlement",
    )
    .map(paymentSearchRecord);
  return [
    ...productRecords,
    ...data.sales.map((sale) => saleSearchRecord(sale, data.returns)),
    ...data.purchases.map((purchase) => purchaseSearchRecord(purchase, data)),
    ...data.expenses.map(expenseSearchRecord),
    ...otherPayments,
    ...customerRecords,
    ...supplierRecords,
  ];
}

export function buildRetailDashboardTransactions(
  data: RetailData,
): DashboardTransaction[] {
  const transactions: DashboardTransaction[] = [
    ...data.sales
      .filter((sale) => !isSaleVoided(sale))
      .map((sale) => ({
        id: sale.id,
        kind: "sale" as const,
        kindLabel: "فروش",
        title: sale.reference,
        subtitle: `${sale.customerName} · ${sale.items
          .map(
            (item) =>
              `${item.productName}${item.variantLabel ? ` (${item.variantLabel})` : ""}`,
          )
          .slice(0, 2)
          .join("، ")}`,
        dateKey: sale.date,
        amount: Math.max(0, sale.amount - sale.returnedAmount),
        status: getSaleStatus(sale, data.returns),
        reference: sale.reference,
        details: [],
        direction: "incoming" as const,
      })),
    ...data.purchases.map((purchase) => ({
      id: purchase.id,
      kind: "purchase" as const,
      kindLabel: "خرید",
      title: purchase.reference,
      subtitle: `${purchase.supplierName} · ${purchase.description}`,
      dateKey: purchase.date,
      amount: purchase.amount,
      status: getPurchaseStatus(purchase),
      reference: purchase.reference,
      details: [],
      direction: "outgoing" as const,
    })),
    ...data.expenses.map((expense) => ({
      id: expense.id,
      kind: "expense" as const,
      kindLabel: "هزینهٔ جاری",
      title: expense.description,
      subtitle: `${expense.categoryLabel} · ${expense.reference}`,
      dateKey: expense.date,
      amount: expense.amount,
      status: "completed" as const,
      reference: expense.reference,
      details: [],
      direction: "outgoing" as const,
    })),
    ...data.payments
      .filter(
        (payment) =>
          payment.kind === "sale-settlement" ||
          payment.kind === "supplier-settlement" ||
          payment.kind === "refund",
      )
      .map((payment) => ({
        id: payment.id,
        kind: "payment" as const,
        kindLabel: paymentKindLabel(payment.kind),
        title: payment.reference,
        subtitle: payment.description,
        dateKey: payment.date,
        amount: payment.amount,
        status: "completed" as const,
        reference: payment.reference,
        details: [],
        direction:
          payment.direction === "in"
            ? ("incoming" as const)
            : ("outgoing" as const),
      })),
  ];
  return transactions.sort((left, right) => {
    const dateOrder = compareDateKeys(right.dateKey, left.dateKey);
    return dateOrder === 0 ? right.id.localeCompare(left.id) : dateOrder;
  });
}

export function getRetailNotifications(
  data: RetailData,
  today: DateKey = getTodayDateKey(),
): Array<{
  id: string;
  title: string;
  description: string;
  record: SearchRecord;
}> {
  const lowStock = data.products
    .filter(
      (product) => product.active && product.stock <= product.minimumStock,
    )
    .map((product) => ({
      id: `low-stock-${product.id}`,
      title: `${product.name} به حداقل موجودی رسیده است`,
      description: `موجودی ${product.stock} ${product.unit} است؛ حداقل تعریف‌شده ${product.minimumStock} ${product.unit} است.`,
      record: {
        id: product.id,
        kind: "product" as const,
        kindLabel: "کالا",
        title: product.name,
        subtitle: `${product.category} · کد ${product.sku}`,
        details: details([
          ["موجودی فعلی", `${product.stock} ${product.unit}`],
          ["حداقل موجودی", `${product.minimumStock} ${product.unit}`],
        ]),
      },
    }));
  const overdueSales = data.sales
    .filter(
      (sale) =>
        isDueDateOverdue(sale.dueDate, today) &&
        getSaleOutstanding(sale, data.returns) > 0,
    )
    .slice(0, 5)
    .map((sale) => ({
      id: `overdue-${sale.id}`,
      title: `طلب سررسیدگذشته از ${sale.customerName}`,
      description: `${sale.reference} · مانده ${formatCurrency(getSaleOutstanding(sale, data.returns))}`,
      record: saleSearchRecord(sale, data.returns),
    }));
  return [...lowStock, ...overdueSales].slice(0, 12);
}

export function paymentMethodLabel(method: string): string {
  if (method === "cash") return "نقدی";
  if (method === "card") return "کارت‌خوان";
  if (method === "transfer") return "انتقال بانکی";
  return method;
}

export function paymentKindLabel(kind: string): string {
  switch (kind) {
    case "sale":
      return "پرداخت فروش";
    case "sale-settlement":
      return "وصول طلب";
    case "purchase":
      return "پرداخت خرید";
    case "supplier-settlement":
      return "پرداخت بدهی تأمین‌کننده";
    case "expense":
      return "پرداخت هزینه";
    case "refund":
      return "بازپرداخت مرجوعی";
    case "reversal":
      return "اصلاح پرداخت";
    default:
      return kind;
  }
}

export function customerGroupLabel(group: string): string {
  if (group === "walk-in") return "فروش حضوری";
  if (group === "vip") return "ویژه";
  return "معمولی";
}

export function buildFinancialRangeTotals(
  data: RetailData,
  start: DateKey,
  end: DateKey,
): Array<{ date: DateKey; sales: number; expenses: number }> {
  return getDateKeyRange(start, end).map((date) => ({
    date,
    sales: data.sales
      .filter((sale) => sale.date === date)
      .reduce(
        (sum, sale) => sum + Math.max(0, sale.amount - sale.returnedAmount),
        0,
      ),
    expenses: data.expenses
      .filter((expense) => expense.date === date)
      .reduce((sum, expense) => sum + expense.amount, 0),
  }));
}

export function getPaymentTotalsForDate(
  payments: PaymentRecord[],
  date: DateKey,
): { received: number; refunded: number; paidOut: number; reversed: number } {
  return payments
    .filter((payment) => payment.date === date)
    .reduce(
      (totals, payment) => {
        if (payment.kind === "refund") totals.refunded += payment.amount;
        else if (payment.kind === "reversal") totals.reversed += payment.amount;
        else if (payment.direction === "in") totals.received += payment.amount;
        else totals.paidOut += payment.amount;
        return totals;
      },
      { received: 0, refunded: 0, paidOut: 0, reversed: 0 },
    );
}

export function returnCashMovementCategory(
  category: CashMovementCategory,
): string {
  const labels: Record<CashMovementCategory, string> = {
    sale: "فروش نقدی",
    "customer-payment": "وصول طلب",
    purchase: "پرداخت خرید",
    "supplier-payment": "پرداخت بدهی تأمین‌کننده",
    expense: "هزینهٔ جاری",
    refund: "بازپرداخت",
    reversal: "برگشت اصلاحی",
    adjustment: "اصلاح صندوق",
  };
  return labels[category];
}

export function returnReasonSummary(record: ReturnRecord): string {
  return record.items
    .map(
      (item) =>
        `${item.productName}${item.variantLabel ? ` · ${item.variantLabel}` : ""} × ${item.quantity}`,
    )
    .join("، ");
}

export function findRelatedPayment(
  payments: PaymentRecord[],
  relatedSaleId?: string,
  relatedPurchaseId?: string,
): PaymentRecord[] {
  return payments.filter(
    (payment) =>
      (relatedSaleId !== undefined &&
        payment.relatedSaleId === relatedSaleId) ||
      (relatedPurchaseId !== undefined &&
        payment.relatedPurchaseId === relatedPurchaseId),
  );
}

export function getCashMovementLabel(movement: CashMovementRecord): string {
  return returnCashMovementCategory(movement.category);
}

export function compareNewestFirst(
  left: { date: DateKey; time?: string },
  right: { date: DateKey; time?: string },
): number {
  const dateOrder = compareDateKeys(right.date, left.date);
  if (dateOrder !== 0) return dateOrder;
  return (right.time ?? "").localeCompare(left.time ?? "");
}
