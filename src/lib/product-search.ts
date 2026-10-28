import type { RetailProduct } from "@/types/retail";

export interface ProductSearchEntry {
  product: RetailProduct;
  normalizedSearchText: string;
}

/** Normalize Persian text and Latin codes consistently for local, case-insensitive search. */
export function normalizeProductSearchText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[\u200C\u200D]/g, " ")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** Build once per active-product list; every row can then filter the same small search index. */
export function createProductSearchEntries(
  products: RetailProduct[],
): ProductSearchEntry[] {
  return products.map((product) => {
    const searchableFields = [
      product.name,
      product.sku,
      product.barcode,
      ...product.variants.flatMap((variant) => [
        variant.sku ?? "",
        variant.barcode ?? "",
      ]),
    ];

    return {
      product,
      normalizedSearchText: normalizeProductSearchText(
        searchableFields.join(" "),
      ),
    };
  });
}

export function filterProductSearchEntries(
  entries: ProductSearchEntry[],
  query: string,
): ProductSearchEntry[] {
  const normalizedQuery = normalizeProductSearchText(query);
  if (!normalizedQuery) return entries;
  return entries.filter((entry) =>
    entry.normalizedSearchText.includes(normalizedQuery),
  );
}
