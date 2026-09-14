export const PRODUCT_STATUS = Object.freeze({
  IN_STOCK: "in_stock",
  NO_STOCK: "no_stock",
});

export const PRODUCT_STATUS_OPTIONS = Object.freeze([
  { value: "", label: "All Status" },
  { value: PRODUCT_STATUS.IN_STOCK, label: "In Stock" },
  { value: PRODUCT_STATUS.NO_STOCK, label: "Out of Stock" },
]);

export const BRAND = Object.freeze({
  STANDARD: "Standard",
  MULTIBRAND: "Multibrand",
});

export const BRAND_STATUS = Object.freeze({
  STANDARD: true,
  MULTIBRAND: false,
  EMPTY: null,
});

export const PRODUCT_BRAND_OPTIONS = Object.freeze([
  { value: "", label: "Select brand" },
  { value: BRAND.STANDARD, label: "Standard" },
  { value: BRAND.MULTIBRAND, label: "Multi-brand" },
]);

export const PRODUCT_BRAND_FILTER_OPTIONS = Object.freeze([
  { value: "", label: "All Brands" },
  { value: BRAND.STANDARD, label: "Standard" },
  { value: BRAND.MULTIBRAND, label: "Multi-brand" },
]);

export function normalizeBrand(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return "";
  if (["standard", "standard fireworks"].includes(text)) return BRAND.STANDARD;
  if (["multibrand", "multi-brand", "multi brand"].includes(text)) return BRAND.MULTIBRAND;
  return "";
}

export function getBrandStatus(value) {
  const brand = normalizeBrand(value);
  if (brand === BRAND.STANDARD) return BRAND_STATUS.STANDARD;
  if (brand === BRAND.MULTIBRAND) return BRAND_STATUS.MULTIBRAND;
  return BRAND_STATUS.EMPTY;
}

export const resolveProductBrand = normalizeBrand;
