import type {
  ProductIdentificationFormat,
  ProductVariantAttribute,
  RetailProduct,
  RetailProductVariant,
} from "@/types/retail";

/** Canonical Unicode normalization only: case and whitespace are meaningful code content. */
export function normalizeIdentificationCode(
  value: string | null | undefined,
): string {
  return typeof value === "string" ? value.normalize("NFC") : "";
}

/** Existing payloads in the `barcode` field predate format selection and mean linear barcode. */
export function normalizeIdentificationFormat(
  format: unknown,
  code: string | null | undefined,
): ProductIdentificationFormat | undefined {
  if (!normalizeIdentificationCode(code)) return undefined;
  return format === "qr" ? "qr" : "linear";
}

export function validateIdentificationCode(
  value: string | undefined,
  format: ProductIdentificationFormat | string | undefined,
): string | null {
  const code = normalizeIdentificationCode(value);
  if (!code) return null;
  if (code.length > 8192) return "کد شناسایی نمی‌تواند بیش از ۸۱۹۲ نویسه باشد.";
  if (format !== undefined && format !== "linear" && format !== "qr") {
    return "نوع کد شناسایی معتبر نیست.";
  }
  return null;
}

export function identificationFormatLabel(
  format: ProductIdentificationFormat | undefined,
): string {
  return format === "qr" ? "QR" : "بارکد خطی";
}

export function normalizeVariantAttributes(
  attributes: ProductVariantAttribute[] | undefined,
): ProductVariantAttribute[] {
  return (attributes ?? [])
    .map(({ name, value }) => ({ name: name.trim(), value: value.trim() }))
    .filter(({ name, value }) => name && value);
}

export function parseVariantAttributesText(text: string): {
  attributes: ProductVariantAttribute[];
  error?: string;
} {
  const parts = text
    .split(/[;,،؛·\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const attributes: ProductVariantAttribute[] = [];
  for (const part of parts) {
    const separatorIndex = [
      part.indexOf(":"),
      part.indexOf("="),
      part.indexOf("："),
    ]
      .filter((index) => index >= 0)
      .reduce(
        (first, index) => Math.min(first, index),
        Number.POSITIVE_INFINITY,
      );
    if (separatorIndex <= 0 || separatorIndex === part.length - 1) {
      return {
        attributes: [],
        error: "مشخصه‌ها را به صورت «نام: مقدار» وارد کنید.",
      };
    }
    const name = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();
    if (!name || !value) {
      return { attributes: [], error: "نام و مقدار هر مشخصه الزامی است." };
    }
    attributes.push({ name, value });
  }
  if (attributes.length === 0) {
    return { attributes: [], error: "برای هر گونه حداقل یک مشخصه وارد کنید." };
  }
  const names = new Set<string>();
  for (const attribute of attributes) {
    const key = attribute.name.toLocaleLowerCase();
    if (names.has(key))
      return { attributes: [], error: "نام مشخصه را در یک گونه تکرار نکنید." };
    names.add(key);
  }
  return { attributes };
}

export function formatVariantAttributes(
  attributes: ProductVariantAttribute[] | undefined,
): string {
  return normalizeVariantAttributes(attributes)
    .map(({ name, value }) => `${name}: ${value}`)
    .join(" · ");
}

export function variantSignature(
  attributes: ProductVariantAttribute[] | undefined,
): string {
  return normalizeVariantAttributes(attributes)
    .map(
      ({ name, value }) =>
        `${name.toLocaleLowerCase()}\u001f${value.toLocaleLowerCase()}`,
    )
    .sort()
    .join("\u001e");
}

export function variantLookupText(variant: RetailProductVariant): string {
  return [
    variant.code,
    variant.sku,
    variant.barcode,
    formatVariantAttributes(variant.attributes),
  ]
    .filter(Boolean)
    .join(" ");
}

export function productLookupText(product: RetailProduct): string {
  return [
    product.name,
    product.brand,
    product.sku,
    product.barcode,
    product.id,
    product.category,
    product.unit,
    ...(product.variants ?? []).map(variantLookupText),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
}

export interface ProductCodeMatch {
  product: RetailProduct;
  variant?: RetailProductVariant;
}

function normalizeLegacyLookupCode(value: string | undefined): string {
  return value?.normalize("NFC").trim().toLocaleLowerCase() ?? "";
}

export function findProductCodeMatches(
  products: RetailProduct[],
  rawCode: string,
): ProductCodeMatch[] {
  const identificationCode = normalizeIdentificationCode(rawCode);
  if (!identificationCode) return [];
  const legacyCode = normalizeLegacyLookupCode(rawCode);
  const matches = new Map<string, ProductCodeMatch>();
  const addMatch = (product: RetailProduct, variant?: RetailProductVariant) => {
    const targetVariant =
      variant ??
      (product.variants.length === 1 ? product.variants[0] : undefined);
    const key = `${product.id}::${targetVariant?.id ?? "product"}`;
    if (!matches.has(key))
      matches.set(key, { product, variant: targetVariant });
  };

  for (const product of products) {
    if (!product.active) continue;
    for (const variant of product.variants ?? []) {
      if (normalizeIdentificationCode(variant.barcode) === identificationCode) {
        addMatch(product, variant);
      }
    }
    if (normalizeIdentificationCode(product.barcode) === identificationCode) {
      addMatch(product);
    }

    if (!legacyCode) continue;
    for (const variant of product.variants ?? []) {
      if (
        [variant.code, variant.sku].some(
          (value) => normalizeLegacyLookupCode(value) === legacyCode,
        )
      ) {
        addMatch(product, variant);
      }
    }
    if (
      [product.sku, product.id].some(
        (value) => normalizeLegacyLookupCode(value) === legacyCode,
      )
    ) {
      addMatch(product);
    }
  }
  return Array.from(matches.values());
}
