import { Check, ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatNumber } from "@/lib/formatters";
import {
  filterProductSearchEntries,
  type ProductSearchEntry,
} from "@/lib/product-search";
import { cn } from "@/lib/utils";
import type { RetailProduct } from "@/types/retail";

interface ProductComboboxProps {
  id: string;
  entries: ProductSearchEntry[];
  value: string;
  selectedProduct?: RetailProduct;
  onChange: (productId: string) => void;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

export function ProductCombobox({
  id,
  entries,
  value,
  selectedProduct,
  onChange,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: ProductComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const results = useMemo(
    () => filterProductSearchEntries(entries, query),
    [entries, query],
  );

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setQuery("");
  };

  return (
    <Popover onOpenChange={handleOpenChange} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-describedby={ariaDescribedBy}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-invalid={ariaInvalid}
          className={cn(
            "select-trigger h-10 w-full min-w-0 justify-between gap-2 rounded-xl border border-input bg-control px-3 py-2 text-start text-sm font-normal text-foreground outline-none transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
          id={id}
          role="combobox"
          type="button"
        >
          <span className="min-w-0 flex-1 truncate text-start">
            {selectedProduct?.name ?? "انتخاب کالا"}
          </span>
          <ChevronsUpDown
            aria-hidden="true"
            className="shrink-0 text-muted-foreground"
            size={15}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-[min(20rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] overflow-hidden p-0"
        collisionPadding={8}
        side="bottom"
        sideOffset={4}
      >
        <Command label="جست‌وجوی کالای فعال" loop shouldFilter={false}>
          <CommandInput
            aria-label="جست‌وجوی کالا بر اساس نام، SKU یا بارکد/QR"
            autoCapitalize="off"
            autoComplete="off"
            autoFocus
            onValueChange={setQuery}
            placeholder="نام، SKU یا بارکد/QR را جست‌وجو کنید"
            spellCheck={false}
            value={query}
          />
          <CommandList aria-label="کالاهای مطابق با جست‌وجو">
            <CommandEmpty className="px-3 py-6 text-center text-sm text-muted-foreground">
              {entries.length
                ? "کالایی با این عبارت پیدا نشد."
                : "کالای فعالی برای انتخاب وجود ندارد."}
            </CommandEmpty>
            {results.map(({ product }) => {
              const isSelected = product.id === value;
              const details = [
                product.category,
                `SKU: ${product.sku || "—"}`,
                product.barcode
                  ? `شناسهٔ بارکد/QR: ${product.barcode}`
                  : undefined,
                product.variants.length
                  ? `${formatNumber(product.variants.length)} گونه؛ انتخاب گونه جداگانه`
                  : undefined,
                `موجودی ${formatNumber(product.stock)} ${product.unit}`,
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <CommandItem
                  className="flex min-w-0 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-start text-sm data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                  key={product.id}
                  onSelect={() => {
                    if (product.id !== value) onChange(product.id);
                    handleOpenChange(false);
                  }}
                  value={product.id}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-foreground">
                      {product.name}
                    </span>
                    <span className="block truncate text-xs leading-5 text-muted-foreground">
                      {details}
                    </span>
                  </span>
                  <Check
                    aria-hidden="true"
                    className={cn(
                      "shrink-0 text-primary",
                      isSelected ? "opacity-100" : "opacity-0",
                    )}
                    size={16}
                  />
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
