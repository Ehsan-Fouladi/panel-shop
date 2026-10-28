import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterInput } from "@/components/records/FilterInput";
import { Pagination } from "@/components/records/Pagination";
import { SectionCard } from "@/components/records/SectionCard";
import { EmptyState, MetricCard } from "@/components/records/Shared";
import { usePagination } from "@/components/records/usePagination";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDateLabel } from "@/lib/date";
import { formatNumber } from "@/lib/formatters";
import { compareNewestFirst } from "@/lib/retail-data";
import {
  movementTypeLabel,
  StockAdjustmentDialog,
} from "@/pages/products/ProductsPages";
import { useAppStore } from "@/store/app-store";
import { useRetailStore } from "@/store/retail-store";
import type { RetailProduct, StockMovementType } from "@/types/retail";

const PAGE_SIZE = 12;

export function StockMovementsPage() {
  const movements = useRetailStore((state) => state.stockMovements);
  const products = useRetailStore((state) => state.products);
  const calendarMode = useAppStore((state) => state.calendarMode);
  const [query, setQuery] = useState("");
  const [productId, setProductId] = useState("all");
  const [type, setType] = useState("all");
  const [adjustProduct, setAdjustProduct] = useState<RetailProduct | null>(
    null,
  );
  const types: StockMovementType[] = [
    "opening",
    "purchase",
    "sale",
    "return",
    "adjustment-in",
    "adjustment-out",
    "correction",
  ];
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return movements
      .filter(
        (movement) =>
          (productId === "all" || movement.productId === productId) &&
          (type === "all" || movement.type === type) &&
          (!normalized ||
            `${movement.reference} ${movement.productName} ${movement.variantLabel ?? ""} ${movement.reason} ${movement.source}`
              .toLocaleLowerCase()
              .includes(normalized)),
      )
      .sort(compareNewestFirst);
  }, [movements, productId, query, type]);
  const incoming = movements
    .filter((movement) => movement.quantityChange > 0)
    .reduce((sum, movement) => sum + movement.quantityChange, 0);
  const outgoing = movements
    .filter((movement) => movement.quantityChange < 0)
    .reduce((sum, movement) => sum + Math.abs(movement.quantityChange), 0);
  const { page, pageCount, visible, setPage } = usePagination(
    filtered,
    PAGE_SIZE,
  );
  const openAdjust = () => {
    const product =
      products.find((item) => item.id === productId) ??
      products.find((item) => item.active);
    if (!product) return;
    setAdjustProduct(product);
  };
  const relatedPath = (movement: (typeof movements)[number]) => {
    if (!movement.relatedRecordId) return undefined;
    if (movement.type === "sale") return `/sales/${movement.relatedRecordId}`;
    if (movement.type === "purchase")
      return `/purchases/${movement.relatedRecordId}`;
    return undefined;
  };
  return (
    <div className="workspace-page mx-auto grid w-full max-w-[1560px] min-w-0 content-start gap-4 p-4 sm:gap-5 sm:p-5 xl:p-6">
      <PageHeader
        title="گردش موجودی"
        description="دفتر حسابرسی تغییرات کالا؛ سوابق قبلی حذف نمی‌شوند و هر اصلاح با ردیف تازه ثبت می‌شود."
        action={
          <Button onClick={openAdjust} variant="primary">
            <Plus aria-hidden="true" size={15} /> اصلاح موجودی
          </Button>
        }
      />
      <div className="metric-grid grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
        <MetricCard label="تعداد رویدادها" value={movements.length} />
        <MetricCard
          label="ورودی ثبت‌شده"
          value={`${formatNumber(incoming)} واحد`}
          tone="positive"
        />
        <MetricCard
          label="خروجی ثبت‌شده"
          value={`${formatNumber(outgoing)} واحد`}
          tone="warning"
        />
        <MetricCard
          label="کالاهای فعال"
          value={products.filter((product) => product.active).length}
        />
      </div>
      <div className="data-note rounded-xl border border-info/20 bg-info/5 px-3 py-2 text-xs leading-6 text-muted-foreground">
        <span>دفتر آغازین نمونه</span>
        <p>
          موجودی کالاهای نمونه از ماندهٔ افتتاحیه شروع می‌شود؛ فروش‌ها و خریدهای
          تاریخی واردشده در سوابق، به‌صورت خودکار دوباره روی موجودی اعمال
          نمی‌شوند.
        </p>
      </div>
      <SectionCard
        title="دفتر گردش کالا"
        description={`${formatNumber(filtered.length)} رویداد مطابق فیلترها`}
      >
        <div className="list-toolbar flex flex-col min-w-0 gap-3 rounded-2xl border border-border bg-card-raised/50 p-3">
          <FilterInput
            id="stock-movement-search"
            label="جست‌وجوی گردش کالا"
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            placeholder="نام کالا، دلیل یا شمارهٔ مرتبط"
            value={query}
          />
          <div className="flex max-md:flex-col gap-3">
            <Select
              onValueChange={(value) => {
                setProductId(value);
                setPage(1);
              }}
              value={productId}
            >
              <SelectTrigger aria-label="فیلتر کالا">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همهٔ کالاها</SelectItem>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              onValueChange={(value) => {
                setType(value);
                setPage(1);
              }}
              value={type}
            >
              <SelectTrigger aria-label="فیلتر نوع گردش">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همهٔ انواع رویداد</SelectItem>
                {types.map((item) => (
                  <SelectItem key={item} value={item}>
                    {movementTypeLabel(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {visible.length ? (
          <div className="data-table-scroll min-w-0 overflow-x-auto rounded-2xl border border-border">
            <table className="data-table w-full min-w-[680px] border-collapse text-right text-sm [&_thead]:bg-muted/60 [&_th]:whitespace-nowrap [&_th]:px-3 [&_th]:py-3 [&_th]:text-right [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground [&_tbody_tr]:border-t [&_tbody_tr]:border-border/70 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-muted/30 [&_td]:px-3 [&_td]:py-3 [&_td]:align-middle">
              <thead>
                <tr>
                  <th>تاریخ</th>
                  <th>کالا</th>
                  <th>نوع رویداد</th>
                  <th>تغییر</th>
                  <th>موجودی قبل</th>
                  <th>موجودی پس از</th>
                  <th>دلیل</th>
                  <th>مرجع</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((movement) => {
                  const path = relatedPath(movement);
                  return (
                    <tr key={movement.id}>
                      <td>
                        {getDateLabel(movement.date, calendarMode, true)}
                        <span className="table-subline mt-1 block text-[11px] leading-4 text-muted-foreground">
                          {movement.time}
                        </span>
                      </td>
                      <td>
                        <Link
                          className="table-primary-link font-medium text-primary transition-colors hover:text-primary-hover hover:underline"
                          to={`/products/${movement.productId}`}
                        >
                          {movement.productName}
                        </Link>
                        {movement.variantLabel && (
                          <span className="table-subline mt-1 block text-[11px] leading-4 text-muted-foreground">
                            {movement.variantLabel}
                          </span>
                        )}
                      </td>
                      <td>{movementTypeLabel(movement.type)}</td>
                      <td
                        className={
                          movement.quantityChange > 0
                            ? "positive-text font-medium text-success"
                            : movement.quantityChange < 0
                              ? "negative-text font-medium text-destructive"
                              : ""
                        }
                      >
                        {movement.quantityChange > 0 ? "+" : ""}
                        {formatNumber(movement.quantityChange)}
                      </td>
                      <td>{formatNumber(movement.previousStock)}</td>
                      <td>{formatNumber(movement.resultingStock)}</td>
                      <td>
                        {movement.reason}
                        <span className="table-subline mt-1 block text-[11px] leading-4 text-muted-foreground">
                          {movement.source}
                        </span>
                      </td>
                      <td>
                        {path ? (
                          <Link
                            className="text-link font-medium text-primary transition-colors hover:text-primary-hover hover:underline"
                            to={path}
                          >
                            {movement.reference}
                          </Link>
                        ) : (
                          movement.reference
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="گردشی پیدا نشد"
            description="فیلتر دیگری انتخاب کنید یا یک اصلاح موجودی با دلیل ثبت کنید."
          />
        )}
        <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
      </SectionCard>
      {adjustProduct && (
        <StockAdjustmentDialog
          direction="both"
          onOpenChange={(open) => {
            if (!open) setAdjustProduct(null);
          }}
          open
          product={adjustProduct}
        />
      )}
    </div>
  );
}
