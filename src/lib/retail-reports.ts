import type { DateKey } from "@/lib/date";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import {
  formatVariantAttributes,
  identificationFormatLabel,
} from "@/lib/product-variants";
import {
  getFinancialSummary,
  getNetSaleAmount,
  getPurchaseOutstanding,
  getPurchaseReturnedAmount,
  getRestockedReturnCostsByProduct,
  getSaleNetPaidAmount,
  getSaleOutstanding,
  getSupplierCreditTotal,
  isSaleVoided,
} from "@/lib/retail-data";
import type { RetailData } from "@/types/retail";

export type ReportId =
  | "sales"
  | "product-performance"
  | "inventory"
  | "stock-movements"
  | "purchases"
  | "supplier-balances"
  | "expenses"
  | "profit-loss"
  | "receivables"
  | "customer-activity"
  | "returns"
  | "cash-movements";

export interface ReportColumn {
  key: string;
  label: string;
}

export type ReportRow = Record<string, string | number>;

export interface ReportResult {
  columns: ReportColumn[];
  rows: ReportRow[];
  summary: string;
  definition: string;
}

const reportDefinitions: Record<ReportId, string> = {
  sales:
    "بازه بر اساس تاریخ فاکتور است؛ مرجوعی و خالص هر سطر، جمع مرجوعی‌های ثبت‌شده تا امروز و خالص همان فاکتور را نشان می‌دهد. فاکتورهای باطل‌شده با مبلغ خالص صفر و وضعیت «باطل‌شده» می‌مانند.",
  "product-performance":
    "فروش و بهای اقلام بر اساس تاریخ فاکتور و مرجوعی بر اساس تاریخ رویداد است؛ بهای کالای برگشتی فقط در صورت بازگشت به موجودی و با بهای ثبت‌شده هنگام فروش کسر می‌شود.",
  inventory:
    "تصویر موجودی و ارزش آن در زمان حاضر؛ فیلتر بازهٔ تاریخ بر این گزارش اثری ندارد.",
  "stock-movements": "بازه بر اساس تاریخ ثبت هر رویداد گردش موجودی است.",
  purchases:
    "بازه بر اساس تاریخ ثبت سفارش خرید است؛ پرداخت، دریافت و مرجوعی به تأمین‌کننده وضعیت و مبلغ فعلی همان سفارش را تغییر می‌دهند.",
  "supplier-balances":
    "خریدها بر اساس تاریخ سفارش در بازه انتخاب می‌شوند؛ ماندهٔ بدهی پس از پرداخت‌ها و مرجوعی‌های خرید است و اعتبار مرجوعی، طلب فروشگاه از تأمین‌کننده است که به‌صورت خودکار بازپرداخت نقدی نمی‌شود.",
  expenses:
    "بازه بر اساس تاریخ ثبت هزینه است؛ هزینهٔ حذف‌شده در جمع هزینه‌های عملیاتی باقی نمی‌ماند.",
  "profit-loss":
    "فروش، تخفیف و بهای فروش بر اساس تاریخ فاکتور؛ مرجوعی بر اساس تاریخ ثبت مرجوعی است. بهای مرجوعی فقط برای اقلام بازگشته به موجودی در تاریخ رویداد برگشت داده می‌شود.",
  receivables:
    "فاکتورها بر اساس تاریخ فروش در بازه انتخاب می‌شوند؛ مانده پس از همهٔ مرجوعی‌ها و پرداخت‌ها، ماندهٔ فعلی است.",
  "customer-activity":
    "فاکتورها بر اساس تاریخ فروش در بازه انتخاب می‌شوند؛ جمع خرید خالص، مرجوعی‌های ثبت‌شده تا امروز را از همان فاکتورها کم می‌کند.",
  returns:
    "بازه بر اساس تاریخ ثبت مرجوعی است؛ تاریخ فاکتور اصلی جداگانه نمایش داده می‌شود.",
  "cash-movements":
    "بازه بر اساس تاریخ رویداد نقدی است؛ پرداخت کارت و انتقال بانکی در صندوق نقدی نیستند.",
};

const columns: Record<ReportId, ReportColumn[]> = {
  sales: [
    { key: "date", label: "تاریخ فاکتور" },
    { key: "reference", label: "فاکتور" },
    { key: "customer", label: "مشتری" },
    { key: "items", label: "تعداد اقلام" },
    { key: "gross", label: "ناخالص" },
    { key: "discount", label: "تخفیف" },
    { key: "returns", label: "مرجوعی تا امروز" },
    { key: "net", label: "خالص فاکتور تا امروز" },
    { key: "paid", label: "پرداخت خالص پس از بازپرداخت" },
    { key: "outstanding", label: "ماندهٔ فعلی" },
    { key: "state", label: "وضعیت ثبت" },
  ],
  "product-performance": [
    { key: "product", label: "کالا" },
    { key: "sku", label: "SKU داخلی" },
    { key: "units", label: "واحد خالص دوره" },
    { key: "sales", label: "فروش خالص دوره" },
    { key: "cost", label: "بهای تمام‌شدهٔ خالص" },
    { key: "grossProfit", label: "سود ناخالص دوره" },
  ],
  inventory: [
    { key: "product", label: "کالا" },
    { key: "sku", label: "SKU داخلی" },
    { key: "barcode", label: "شناسهٔ بارکد یا QR" },
    { key: "category", label: "دسته‌بندی" },
    { key: "stock", label: "موجودی کل" },
    { key: "variants", label: "موجودی گونه‌ها" },
    { key: "minimum", label: "حداقل" },
    { key: "unitCost", label: "بهای واحد" },
    { key: "stockValue", label: "ارزش موجودی" },
    { key: "status", label: "وضعیت" },
  ],
  "stock-movements": [
    { key: "date", label: "تاریخ" },
    { key: "product", label: "کالا" },
    { key: "variant", label: "گونه" },
    { key: "type", label: "نوع" },
    { key: "change", label: "تغییر" },
    { key: "before", label: "پیش از" },
    { key: "after", label: "پس از" },
    { key: "reason", label: "دلیل" },
    { key: "reference", label: "مرجع" },
  ],
  purchases: [
    { key: "date", label: "تاریخ" },
    { key: "reference", label: "خرید" },
    { key: "supplier", label: "تأمین‌کننده" },
    { key: "items", label: "اقلام" },
    { key: "total", label: "مبلغ" },
    { key: "paid", label: "پرداخت‌شده" },
    { key: "outstanding", label: "بدهی" },
    { key: "returned", label: "مرجوعی به تأمین‌کننده" },
    { key: "received", label: "دریافت" },
  ],
  "supplier-balances": [
    { key: "supplier", label: "تأمین‌کننده" },
    { key: "phone", label: "تلفن" },
    { key: "purchases", label: "خریدها" },
    { key: "total", label: "جمع خرید" },
    { key: "paid", label: "پرداخت‌شده" },
    { key: "outstanding", label: "ماندهٔ بدهی" },
    { key: "credit", label: "اعتبار مرجوعی خرید" },
  ],
  expenses: [
    { key: "date", label: "تاریخ" },
    { key: "reference", label: "شماره" },
    { key: "description", label: "شرح" },
    { key: "category", label: "دسته‌بندی" },
    { key: "method", label: "روش پرداخت" },
    { key: "amount", label: "مبلغ" },
  ],
  "profit-loss": [
    { key: "metric", label: "شاخص" },
    { key: "amount", label: "مبلغ" },
    { key: "definition", label: "تعریف" },
  ],
  receivables: [
    { key: "customer", label: "مشتری" },
    { key: "reference", label: "فاکتور" },
    { key: "date", label: "تاریخ" },
    { key: "due", label: "سررسید" },
    { key: "total", label: "مبلغ خالص" },
    { key: "paid", label: "پرداخت خالص پس از بازپرداخت" },
    { key: "outstanding", label: "ماندهٔ فعلی" },
  ],
  "customer-activity": [
    { key: "customer", label: "مشتری" },
    { key: "phone", label: "شماره تماس" },
    { key: "group", label: "گروه" },
    { key: "salesCount", label: "فاکتورها" },
    { key: "total", label: "خرید خالص فاکتورها تا امروز" },
    { key: "outstanding", label: "ماندهٔ طلب فعلی" },
  ],
  returns: [
    { key: "date", label: "تاریخ مرجوعی" },
    { key: "reference", label: "مرجوعی" },
    { key: "sale", label: "فاکتور اصلی" },
    { key: "saleDate", label: "تاریخ فاکتور اصلی" },
    { key: "customer", label: "مشتری" },
    { key: "items", label: "اقلام" },
    { key: "amount", label: "ارزش مرجوعی" },
    { key: "refund", label: "بازپرداخت" },
    { key: "reason", label: "دلیل" },
  ],
  "cash-movements": [
    { key: "date", label: "تاریخ" },
    { key: "time", label: "زمان" },
    { key: "type", label: "نوع" },
    { key: "direction", label: "جهت" },
    { key: "description", label: "شرح" },
    { key: "amount", label: "مبلغ نقدی" },
    { key: "reference", label: "مرجع" },
  ],
};

function within(date: DateKey, start: DateKey, end: DateKey): boolean {
  return date >= start && date <= end;
}

function fmt(value: number): string {
  return formatCurrency(value);
}

function fmtCount(value: number): string {
  return formatNumber(value);
}

function movementLabel(type: string): string {
  const labels: Record<string, string> = {
    opening: "افتتاحیه",
    purchase: "رسید خرید",
    sale: "فروش",
    return: "مرجوعی",
    "adjustment-in": "افزایش دستی",
    "adjustment-out": "کاهش دستی",
    correction: "اصلاح",
  };
  return labels[type] ?? type;
}

function groupLabel(group: string): string {
  return group === "vip"
    ? "ویژه"
    : group === "walk-in"
      ? "فروش حضوری"
      : "معمولی";
}

export function buildReport(
  data: RetailData,
  reportId: ReportId,
  start: DateKey,
  end: DateKey,
): ReportResult {
  let rows: ReportRow[] = [];
  switch (reportId) {
    case "sales":
      rows = data.sales
        .filter((sale) => within(sale.date, start, end))
        .map((sale) => ({
          date: sale.date,
          reference: sale.reference,
          customer: sale.customerName,
          items: fmtCount(sale.itemCount),
          gross: fmt(sale.grossAmount),
          discount: fmt(sale.discountAmount),
          returns: fmt(sale.returnedAmount),
          net: fmt(getNetSaleAmount(sale)),
          paid: fmt(getSaleNetPaidAmount(sale, data.returns)),
          outstanding: fmt(getSaleOutstanding(sale, data.returns)),
          state: isSaleVoided(sale) ? `باطل‌شده در ${sale.voidedAt}` : "معتبر",
        }));
      break;
    case "product-performance": {
      const sales = data.sales.filter(
        (sale) => !isSaleVoided(sale) && within(sale.date, start, end),
      );
      const returns = data.returns.filter((record) =>
        within(record.date, start, end),
      );
      const salesByProduct = new Map<
        string,
        { units: number; amount: number; cost: number }
      >();
      const returnsByProduct = new Map<
        string,
        { units: number; amount: number }
      >();
      for (const sale of sales) {
        for (const item of sale.items) {
          const current = salesByProduct.get(item.productId) ?? {
            units: 0,
            amount: 0,
            cost: 0,
          };
          current.units += item.quantity;
          current.amount += item.lineTotal;
          current.cost += item.unitCost * item.quantity;
          salesByProduct.set(item.productId, current);
        }
      }
      for (const record of returns) {
        for (const item of record.items) {
          const current = returnsByProduct.get(item.productId) ?? {
            units: 0,
            amount: 0,
          };
          current.units += item.quantity;
          current.amount += item.amount;
          returnsByProduct.set(item.productId, current);
        }
      }
      const returnCostByProduct = getRestockedReturnCostsByProduct(
        data,
        returns,
      );
      rows = data.products
        .filter((product) => product.active)
        .map((product) => {
          const sold = salesByProduct.get(product.id) ?? {
            units: 0,
            amount: 0,
            cost: 0,
          };
          const returned = returnsByProduct.get(product.id) ?? {
            units: 0,
            amount: 0,
          };
          const units = sold.units - returned.units;
          const salesAmount = sold.amount - returned.amount;
          const cost = sold.cost - (returnCostByProduct.get(product.id) ?? 0);
          return {
            product: product.name,
            sku: product.sku,
            units: fmtCount(units),
            sales: fmt(salesAmount),
            cost: fmt(cost),
            grossProfit: fmt(salesAmount - cost),
          };
        })
        .filter(
          (row) =>
            row.units !== fmtCount(0) ||
            row.cost !== fmt(0) ||
            row.sales !== fmt(0),
        );
      break;
    }
    case "inventory":
      rows = data.products
        .filter((product) => product.active)
        .map((product) => ({
          product: product.name,
          sku: product.sku || "ثبت نشده",
          barcode: product.barcode
            ? `${identificationFormatLabel(product.barcodeFormat)}: ${product.barcode}`
            : "ثبت نشده",
          category: product.category,
          stock: `${fmtCount(product.stock)} ${product.unit}`,
          variants: product.variants.length
            ? product.variants
                .map(
                  (variant) =>
                    `${formatVariantAttributes(variant.attributes)} · کد داخلی ${variant.code} · SKU ${variant.sku || "—"}${variant.barcode ? ` · ${identificationFormatLabel(variant.barcodeFormat)}: ${variant.barcode}` : ""}: ${fmtCount(variant.stock)} ${product.unit}`,
                )
                .join("؛ ")
            : "بدون گونه",
          minimum: `${fmtCount(product.minimumStock)} ${product.unit}`,
          unitCost: fmt(product.purchaseCost),
          stockValue: fmt(product.purchaseCost * product.stock),
          status:
            product.stock <= 0
              ? "ناموجود"
              : product.stock <= product.minimumStock
                ? "کم‌موجود"
                : "موجود",
        }));
      break;
    case "stock-movements":
      rows = data.stockMovements
        .filter((movement) => within(movement.date, start, end))
        .map((movement) => ({
          date: movement.date,
          product: movement.productName,
          variant: movement.variantLabel || "—",
          type: movementLabel(movement.type),
          change: `${movement.quantityChange > 0 ? "+" : ""}${fmtCount(movement.quantityChange)}`,
          before: fmtCount(movement.previousStock),
          after: fmtCount(movement.resultingStock),
          reason: movement.reason,
          reference: movement.reference,
        }));
      break;
    case "purchases":
      rows = data.purchases
        .filter((purchase) => within(purchase.date, start, end))
        .map((purchase) => ({
          date: purchase.date,
          reference: purchase.reference,
          supplier: purchase.supplierName,
          items: fmtCount(purchase.items.length),
          total: fmt(purchase.amount),
          paid: fmt(purchase.paidAmount),
          outstanding: fmt(getPurchaseOutstanding(purchase)),
          returned: fmt(
            getPurchaseReturnedAmount(purchase.id, data.purchaseReturns),
          ),
          received: purchase.received ? "دریافت‌شده" : "در انتظار دریافت",
        }));
      break;
    case "supplier-balances":
      rows = data.suppliers
        .filter((supplier) => supplier.active)
        .map((supplier) => {
          const purchases = data.purchases.filter(
            (purchase) =>
              purchase.supplierId === supplier.id &&
              within(purchase.date, start, end),
          );
          return {
            supplier: supplier.name,
            phone: supplier.phone,
            purchases: fmtCount(purchases.length),
            total: fmt(
              purchases.reduce((sum, purchase) => sum + purchase.amount, 0),
            ),
            paid: fmt(
              purchases.reduce((sum, purchase) => sum + purchase.paidAmount, 0),
            ),
            outstanding: fmt(
              purchases.reduce(
                (sum, purchase) => sum + getPurchaseOutstanding(purchase),
                0,
              ),
            ),
            credit: fmt(
              getSupplierCreditTotal(supplier.id, data.purchaseReturns),
            ),
          };
        });
      break;
    case "expenses":
      rows = data.expenses
        .filter((expense) => within(expense.date, start, end))
        .map((expense) => ({
          date: expense.date,
          reference: expense.reference,
          description: expense.description,
          category: expense.categoryLabel,
          method:
            expense.paymentMethod === "cash"
              ? "نقدی"
              : expense.paymentMethod === "card"
                ? "کارت‌خوان"
                : "انتقال بانکی",
          amount: fmt(expense.amount),
        }));
      break;
    case "profit-loss": {
      const summary = getFinancialSummary(data, start, end);
      rows = [
        {
          metric: "فروش ناخالص",
          amount: fmt(summary.grossSales),
          definition: "ارزش فاکتورهای صادرشده در بازه، پیش از تخفیف",
        },
        {
          metric: "تخفیف",
          amount: fmt(summary.discounts),
          definition: "تخفیف فاکتورهای صادرشده در بازه",
        },
        {
          metric: "مرجوعی",
          amount: fmt(summary.returns),
          definition: "مرجوعی‌هایی که تاریخ رویدادشان در بازه است",
        },
        {
          metric: "فروش خالص",
          amount: fmt(summary.netSales),
          definition:
            "مبلغ فروش پس از تخفیفِ فاکتورهای بازه، منهای مرجوعی‌های ثبت‌شده در بازه",
        },
        {
          metric: "بهای کالای فروخته‌شده",
          amount: fmt(summary.costOfGoodsSold),
          definition:
            "بهای ذخیره‌شده هنگام فروش؛ فقط بهای اقلام بازگشته به موجودی در تاریخ مرجوعی کسر می‌شود",
        },
        {
          metric: "سود ناخالص",
          amount: fmt(summary.grossProfit),
          definition: "فروش خالص منهای بهای کالای فروخته‌شده",
        },
        {
          metric: "هزینه‌های عملیاتی",
          amount: fmt(summary.operatingExpenses),
          definition: "بدون هزینهٔ خرید موجودی",
        },
        {
          metric: "سود خالص",
          amount: fmt(summary.netProfit),
          definition: "سود ناخالص منهای هزینه‌های عملیاتی",
        },
      ];
      break;
    }
    case "receivables":
      rows = data.sales
        .filter(
          (sale) =>
            within(sale.date, start, end) &&
            getSaleOutstanding(sale, data.returns) > 0,
        )
        .map((sale) => ({
          customer: sale.customerName,
          reference: sale.reference,
          date: sale.date,
          due: sale.dueDate ?? "تعیین نشده",
          total: fmt(getNetSaleAmount(sale)),
          paid: fmt(getSaleNetPaidAmount(sale, data.returns)),
          outstanding: fmt(getSaleOutstanding(sale, data.returns)),
        }));
      break;
    case "customer-activity":
      rows = data.customers
        .filter((customer) => customer.active)
        .map((customer) => {
          const sales = data.sales.filter(
            (sale) =>
              sale.customerId === customer.id && within(sale.date, start, end),
          );
          return {
            customer: customer.name,
            phone: customer.phone,
            group: groupLabel(customer.group),
            salesCount: fmtCount(sales.length),
            total: fmt(
              sales.reduce((sum, sale) => sum + getNetSaleAmount(sale), 0),
            ),
            outstanding: fmt(
              sales.reduce(
                (sum, sale) => sum + getSaleOutstanding(sale, data.returns),
                0,
              ),
            ),
          };
        })
        .filter((row) => row.salesCount !== "۰");
      break;
    case "returns":
      rows = data.returns
        .filter((record) => within(record.date, start, end))
        .map((record) => ({
          date: record.date,
          reference: record.reference,
          sale: record.saleReference,
          saleDate:
            data.sales.find((sale) => sale.id === record.saleId)?.date ?? "—",
          customer: record.customerName,
          items: record.items
            .map(
              (item) =>
                `${item.productName}${item.variantLabel ? ` · ${item.variantLabel}` : ""} × ${item.quantity}`,
            )
            .join("، "),
          amount: fmt(record.amount),
          refund: fmt(record.refundAmount),
          reason: record.reason,
        }));
      break;
    case "cash-movements":
      rows = data.cashMovements
        .filter((movement) => within(movement.date, start, end))
        .map((movement) => ({
          date: movement.date,
          time: movement.time,
          type: movement.category,
          direction: movement.direction === "in" ? "ورودی" : "خروجی",
          description: movement.description,
          amount: fmt(movement.amount),
          reference: movement.reference,
        }));
      break;
  }
  const summary = `${fmtCount(rows.length)} ردیف · بازهٔ ${start} تا ${end}`;
  return {
    columns: columns[reportId],
    rows,
    summary,
    definition: reportDefinitions[reportId],
  };
}

export function serializeCsv(
  result: ReportResult,
  reportTitle: string,
): string {
  const escapeCsvValue = (value: string | number): string =>
    `"${String(value).replaceAll('"', '""')}"`;
  const header = result.columns
    .map((column) => escapeCsvValue(column.label))
    .join(",");
  const body = result.rows
    .map((row) =>
      result.columns
        .map((column) => escapeCsvValue(row[column.key] ?? ""))
        .join(","),
    )
    .join("\r\n");
  return `\uFEFF${escapeCsvValue(reportTitle)}\r\n${header}\r\n${body}\r\n`;
}
