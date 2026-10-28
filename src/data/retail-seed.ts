import {
  expenseCategories,
  customerPayments as sampleCustomerPayments,
  customers as sampleCustomers,
  expenses as sampleExpenses,
  products as sampleProducts,
  purchases as samplePurchases,
  sales as sampleSales,
  suppliers as sampleSuppliers,
} from "@/data/dashboard-data";
import { addDays, getTodayDateKey } from "@/lib/date";
import type {
  CashMovementRecord,
  PaymentMethod,
  PaymentRecord,
  RetailData,
  RetailExpense,
  RetailProduct,
  RetailPurchase,
  RetailSale,
  RetailSettings,
} from "@/types/retail";
import { statusForBalance } from "@/types/retail";

const productPriceDefaults: Record<string, { cost: number; price: number }> = {
  "prd-001": { cost: 11_400_000, price: 14_800_000 },
  "prd-002": { cost: 7_200_000, price: 9_600_000 },
  "prd-003": { cost: 9_300_000, price: 12_400_000 },
  "prd-004": { cost: 14_400_000, price: 18_500_000 },
  "prd-005": { cost: 4_500_000, price: 6_400_000 },
  "prd-006": { cost: 43_000_000, price: 52_000_000 },
  "prd-007": { cost: 6_300_000, price: 8_800_000 },
  "prd-008": { cost: 3_600_000, price: 5_200_000 },
};

function paymentMethodFromLabel(label: string): PaymentMethod {
  if (label === "نقدی") return "cash";
  if (label === "کارت‌خوان") return "card";
  return "transfer";
}

function timeFor(index: number): string {
  const hour = 9 + (index % 9);
  const minute = (index * 13) % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function createDefaultSettings(storeName: string): RetailSettings {
  return {
    storeName,
    currency: "تومان",
    minimumStockDefault: 5,
    // Legacy persisted values retained for schema and backup compatibility; not used for estimates.
    taxRatePercent: 9,
    taxBasis: "net-sales",
    expenseCategories: expenseCategories.map(({ id, label }) => ({
      id,
      label,
    })),
    receiptFooter: "از خرید شما سپاسگزاریم.",
    showSkuOnReceipt: true,
    calendarMode: "jalali",
  };
}

export function createEmptyRetailData(): RetailData {
  return {
    products: [],
    sales: [],
    purchases: [],
    customers: [],
    suppliers: [],
    expenses: [],
    payments: [],
    stockMovements: [],
    cashMovements: [],
    returns: [],
    purchaseReturns: [],
    cashSessions: [],
    campaigns: [],
    settings: createDefaultSettings("فروشگاه من"),
  };
}

export function createInitialRetailData(): RetailData {
  const today = getTodayDateKey();
  const products: RetailProduct[] = sampleProducts.map((product) => {
    const defaults = productPriceDefaults[product.id] ?? {
      cost: 1_000_000,
      price: 1_300_000,
    };
    return {
      ...product,
      brand: "",
      barcode: "",
      variants: [],
      purchaseCost: defaults.cost,
      sellingPrice: defaults.price,
      description: "",
      active: true,
      createdAt: addDays(today, -730),
      updatedAt: today,
    };
  });
  const productById = new Map(products.map((product) => [product.id, product]));

  const extraPaymentsBySale = new Map<string, number>();
  for (const payment of sampleCustomerPayments) {
    extraPaymentsBySale.set(
      payment.relatedSaleId,
      (extraPaymentsBySale.get(payment.relatedSaleId) ?? 0) + payment.amount,
    );
  }

  const sales: RetailSale[] = sampleSales.map((sale, index) => {
    const product = productById.get(sale.productId);
    const extraPaid = extraPaymentsBySale.get(sale.id) ?? 0;
    const paidAmount = Math.min(sale.amount, sale.paidAmount + extraPaid);
    const quantity = Math.max(1, sale.itemCount);
    const unitPrice = sale.amount / quantity;
    const unitCost = Math.min(
      product?.purchaseCost ?? unitPrice * 0.68,
      Math.max(1, Math.round((unitPrice * 0.68) / 100) * 100),
    );
    return {
      ...sale,
      paymentMethod: paymentMethodFromLabel(sale.paymentMethod),
      items: [
        {
          id: `seed-sale-line-${sale.id}`,
          productId: sale.productId,
          productName: sale.productName,
          quantity,
          unitPrice,
          unitCost,
          discountAmount: 0,
          lineTotal: sale.amount,
        },
      ],
      grossAmount: sale.amount,
      discountAmount: 0,
      returnedAmount: 0,
      paidAmount,
      status: statusForBalance(sale.amount, paidAmount),
      dueDate: paidAmount < sale.amount ? addDays(sale.date, 14) : undefined,
      time: timeFor(index),
      baseline: true,
    };
  });

  const salesById = new Map(sales.map((sale) => [sale.id, sale]));
  const payments: PaymentRecord[] = [];
  for (const sale of sales) {
    const basePaid =
      sampleSales.find((record) => record.id === sale.id)?.paidAmount ?? 0;
    if (basePaid > 0) {
      payments.push({
        id: `seed-sale-payment-${sale.id}`,
        reference: `دریافت-${sale.reference}`,
        date: sale.date,
        time: sale.time,
        direction: "in",
        kind: "sale",
        amount: basePaid,
        method: sale.paymentMethod,
        description: `پرداخت اولیهٔ ${sale.reference}`,
        customerId: sale.customerId,
        relatedSaleId: sale.id,
      });
    }
  }
  for (const payment of sampleCustomerPayments) {
    const sale = salesById.get(payment.relatedSaleId);
    if (!sale) continue;
    payments.push({
      id: `seed-customer-payment-${payment.id}`,
      reference: payment.reference,
      date: payment.date,
      time: timeFor(sales.findIndex((record) => record.id === sale.id) + 1),
      direction: "in",
      kind: "sale-settlement",
      amount: payment.amount,
      method: paymentMethodFromLabel(payment.method),
      description: `دریافت بخشی از طلب ${sale.reference}`,
      customerId: payment.customerId,
      relatedSaleId: payment.relatedSaleId,
    });
  }

  const purchases: RetailPurchase[] = samplePurchases.map((purchase, index) => {
    const product = products[index % products.length];
    const quantity = 5 + (index % 7);
    return {
      ...purchase,
      paymentMethod: index % 2 === 0 ? "card" : "transfer",
      items: [
        {
          id: `seed-purchase-line-${purchase.id}`,
          productId: product?.id ?? products[0]?.id ?? "",
          productName: product?.name ?? "کالای فروشگاه",
          quantity,
          unitCost: purchase.amount / quantity,
          additionalCostPerUnit: 0,
          lineTotal: purchase.amount,
        },
      ],
      additionalCosts: 0,
      received: true,
      receivedAt: purchase.date,
      dueDate:
        purchase.paidAmount < purchase.amount
          ? addDays(purchase.date, 21)
          : undefined,
      baseline: true,
    };
  });

  for (const purchase of purchases) {
    if (purchase.paidAmount <= 0) continue;
    payments.push({
      id: `seed-purchase-payment-${purchase.id}`,
      reference: `پرداخت-${purchase.reference}`,
      date: purchase.date,
      time: timeFor(Number(purchase.id.slice(-3)) || 1),
      direction: "out",
      kind: "purchase",
      amount: purchase.paidAmount,
      method: purchase.paymentMethod,
      description: `پرداخت خرید ${purchase.reference}`,
      supplierId: purchase.supplierId,
      relatedPurchaseId: purchase.id,
    });
  }

  const expenses: RetailExpense[] = sampleExpenses.map((expense) => ({
    ...expense,
    paymentMethod: paymentMethodFromLabel(expense.paymentMethod),
    notes: "",
  }));
  for (const expense of expenses) {
    payments.push({
      id: `seed-expense-payment-${expense.id}`,
      reference: `پرداخت-${expense.reference}`,
      date: expense.date,
      time: "12:00",
      direction: "out",
      kind: "expense",
      amount: expense.amount,
      method: expense.paymentMethod,
      description: expense.description,
      relatedExpenseId: expense.id,
    });
  }

  const cashMovements: CashMovementRecord[] = payments
    .filter((payment) => payment.method === "cash")
    .map((payment) => ({
      id: `cash-${payment.id}`,
      reference: payment.reference,
      date: payment.date,
      time: payment.time,
      direction: payment.direction === "in" ? "in" : "out",
      category:
        payment.kind === "sale"
          ? "sale"
          : payment.kind === "sale-settlement"
            ? "customer-payment"
            : payment.kind === "purchase"
              ? "purchase"
              : payment.kind === "supplier-settlement"
                ? "supplier-payment"
                : payment.kind === "expense"
                  ? "expense"
                  : payment.kind === "refund"
                    ? "refund"
                    : "adjustment",
      amount: payment.amount,
      method: payment.method,
      description: payment.description,
      relatedSaleId: payment.relatedSaleId,
      relatedPurchaseId: payment.relatedPurchaseId,
      relatedExpenseId: payment.relatedExpenseId,
    }));

  const customerTotals = new Map<string, number>();
  for (const sale of sales) {
    customerTotals.set(
      sale.customerId,
      (customerTotals.get(sale.customerId) ?? 0) + sale.amount,
    );
  }
  const highestCustomerId = [...customerTotals.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0];
  const customers = sampleCustomers.map((customer) => ({
    ...customer,
    group:
      customer.id === "cus-004"
        ? ("walk-in" as const)
        : customer.id === highestCustomerId
          ? ("vip" as const)
          : ("regular" as const),
    address: "",
    notes: "",
    createdAt: addDays(today, -730),
    active: true,
  }));
  const suppliers = sampleSuppliers.map((supplier) => ({
    ...supplier,
    email: "",
    address: "",
    notes: "",
    createdAt: addDays(today, -730),
    active: true,
  }));

  const stockMovements = products.map((product) => ({
    id: `opening-${product.id}`,
    reference: "افتتاحیهٔ موجودی",
    date: today,
    time: "08:00",
    productId: product.id,
    productName: product.name,
    type: "opening" as const,
    quantityChange: product.stock,
    previousStock: 0,
    resultingStock: product.stock,
    reason:
      "موجودی افتتاحیهٔ دادهٔ نمونه؛ سوابق پیشین در دفتر کالا ثبت نشده‌اند.",
    source: "ثبت افتتاحیه",
  }));

  return {
    products,
    sales,
    purchases,
    customers,
    suppliers,
    expenses,
    payments: payments.map((payment) => payment),
    stockMovements,
    cashMovements,
    returns: [],
    purchaseReturns: [],
    cashSessions: [],
    campaigns: [],
    settings: createDefaultSettings("فروشگاه نمونه"),
  };
}
