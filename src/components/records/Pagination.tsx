import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/formatters";

export function Pagination({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <nav
      aria-label="صفحه‌بندی"
      className="pagination-control flex items-center justify-center gap-3 text-xs text-muted-foreground"
    >
      <Button
        aria-label="صفحهٔ قبل"
        disabled={page <= 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        size="icon-sm"
        variant="outline"
      >
        <ChevronRight aria-hidden="true" size={15} />
      </Button>
      <span aria-live="polite">
        صفحهٔ {formatNumber(page)} از {formatNumber(pageCount)}
      </span>
      <Button
        aria-label="صفحهٔ بعد"
        disabled={page >= pageCount}
        onClick={() => onPageChange(Math.min(pageCount, page + 1))}
        size="icon-sm"
        variant="outline"
      >
        <ChevronLeft aria-hidden="true" size={15} />
      </Button>
    </nav>
  );
}
