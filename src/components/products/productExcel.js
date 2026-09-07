import * as XLSX from 'xlsx';

export const PRODUCT_EXCEL_COLUMNS = [
  'rowid',
  'sku',
  'category',
  'name',
  'contents',
  'price',
  'discountPercent',
  'discountAmount',
  'amount',
  'currency',
  'taxRate',
  'image',
  'tags',
  'stockQuantity',
  'minOrderQty',
  'maxOrderQty',
  'status',
  'backorderAllowed',
  'active',
  'crmProductId',
  'lastUpdated',
  'source',
  'descriptionVideo',
  'updatedAt',
  'uiFlags_featured',
  'uiFlags_hidden',
];

const HEADER_ALIASES = {
  rowid: 'rowid',
  id: 'rowid',
  sku: 'sku',
  category: 'category',
  name: 'name',
  productname: 'name',
  contents: 'contents',
  price: 'price',
  discountpercent: 'discountPercent',
  discount: 'discountPercent',
  discountamount: 'discountAmount',
  amount: 'amount',
  saleamount: 'amount',
  currency: 'currency',
  taxrate: 'taxRate',
  image: 'image',
  imageurl: 'image',
  tags: 'tags',
  stockquantity: 'stockQuantity',
  stock: 'stockQuantity',
  minorderqty: 'minOrderQty',
  minimumorderquantity: 'minOrderQty',
  maxorderqty: 'maxOrderQty',
  maximumorderquantity: 'maxOrderQty',
  status: 'status',
  backorderallowed: 'backorderAllowed',
  active: 'active',
  crmproductid: 'crmProductId',
  lastupdated: 'lastUpdated',
  lastupdatedat: 'lastUpdated',
  source: 'source',
  descriptionvideo: 'descriptionVideo',
  updatedat: 'updatedAt',
  uiflagsfeatured: 'uiFlags_featured',
  featured: 'uiFlags_featured',
  uiflagshidden: 'uiFlags_hidden',
  hidden: 'uiFlags_hidden',
};

const normalizeHeader = (value) =>
  String(value ?? '')
    .trim()
    .replace(/[\s_\-./()]+/g, '')
    .toLowerCase();

const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';

const toNullableNumber = (value) => {
  if (isBlank(value)) return null;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};

const toNumber = (value, fallback = 0) => {
  const n = toNullableNumber(value);
  return n === null ? fallback : n;
};

const toBoolean = (value, fallback = false) => {
  if (isBlank(value)) return fallback;
  if (typeof value === 'boolean') return value;
  const text = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'active', 'in_stock'].includes(text)) return true;
  if (['false', '0', 'no', 'n', 'inactive', 'no_stock'].includes(text)) return false;
  return fallback;
};

const parseTags = (value) => {
  if (Array.isArray(value)) return value.filter((v) => !isBlank(v)).map(String);
  if (isBlank(value)) return [];
  const text = String(value).trim();
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.filter((v) => !isBlank(v)).map(String);
  } catch (_) {
    // Excel normally stores tags as comma-separated text.
  }
  return text
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
};

const excelDateToISOString = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 19);
  if (typeof value === 'number' && value > 0) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, Math.floor(parsed.S || 0))).toISOString().slice(0, 19);
    }
  }
  if (!isBlank(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 19);
    return String(value).trim();
  }
  return null;
};

export function normalizeProductForExcel(product = {}) {
  const uiFlags = product.uiFlags || {};
  return {
    rowid: product.rowid ?? product.id ?? '',
    sku: product.sku ?? '',
    category: product.category ?? '',
    name: product.name ?? '',
    contents: product.contents ?? '',
    price: product.price ?? '',
    discountPercent: product.discountPercent ?? product.discount_percent ?? 0,
    discountAmount: product.discountAmount ?? '',
    amount: product.amount ?? 0,
    currency: product.currency ?? 'INR',
    taxRate: product.taxRate ?? 0,
    image: product.image ?? '',
    tags: Array.isArray(product.tags) ? product.tags.join(', ') : (product.tags ?? ''),
    stockQuantity: product.stockQuantity ?? '',
    minOrderQty: product.minOrderQty ?? 1,
    maxOrderQty: product.maxOrderQty ?? '',
    status: product.status ?? 'in_stock',
    backorderAllowed: product.backorderAllowed ?? false,
    active: product.active ?? true,
    crmProductId: product.crmProductId ?? '',
    lastUpdated: product.lastUpdated ?? product.last_updated ?? '',
    source: product.source ?? 'manual',
    descriptionVideo: product.descriptionVideo ?? '',
    updatedAt: product.updatedAt ?? product.updated_at ?? '',
    uiFlags_featured: Boolean(uiFlags.featured),
    uiFlags_hidden: Boolean(uiFlags.hidden),
  };
}

export function exportProductsToExcel(products = []) {
  const rows = products.map(normalizeProductForExcel);
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: PRODUCT_EXCEL_COLUMNS });
  worksheet['!cols'] = PRODUCT_EXCEL_COLUMNS.map((column) => ({
    wch: Math.min(Math.max(column.length + 2, 12), 28),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
  XLSX.writeFile(workbook, `products_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function parseProductsExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Unable to read the Excel file.'));
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target.result, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error('The Excel file does not contain a worksheet.');

        const sheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
        if (!rawRows.length) throw new Error('The Excel worksheet is empty.');

        const rows = rawRows.map((raw, index) => {
          const mapped = {};
          Object.entries(raw).forEach(([header, value]) => {
            const key = HEADER_ALIASES[normalizeHeader(header)];
            if (key) mapped[key] = value;
          });

          const rowNumber = index + 2;
          const rowid = String(mapped.rowid ?? '').trim();
          const name = String(mapped.name ?? '').trim();
          const category = String(mapped.category ?? '').trim();

          if (!rowid) throw new Error(`Row ${rowNumber}: rowid is required.`);
          if (!name) throw new Error(`Row ${rowNumber}: name is required.`);
          if (!category) throw new Error(`Row ${rowNumber}: category is required.`);

          const discountPercent = toNumber(mapped.discountPercent, 0);
          if (discountPercent < 0 || discountPercent > 100) {
            throw new Error(`Row ${rowNumber}: discountPercent must be between 0 and 100.`);
          }

          const status = String(mapped.status || 'in_stock').trim().toLowerCase();
          if (!['in_stock', 'no_stock'].includes(status)) {
            throw new Error(`Row ${rowNumber}: status must be in_stock or no_stock.`);
          }

          const product = {
            rowid,
            sku: String(mapped.sku ?? '').trim(),
            category,
            name,
            contents: String(mapped.contents ?? '').trim(),
            price: toNumber(mapped.price, 0),
            discountPercent,
            discount_percent: discountPercent,
            discountAmount: toNumber(mapped.discountAmount, 0),
            amount: toNumber(mapped.amount, 0),
            currency: String(mapped.currency || 'INR').trim() || 'INR',
            taxRate: toNumber(mapped.taxRate, 0),
            image: String(mapped.image ?? '').trim(),
            tags: parseTags(mapped.tags),
            stockQuantity: toNullableNumber(mapped.stockQuantity),
            minOrderQty: toNumber(mapped.minOrderQty, 1),
            maxOrderQty: toNullableNumber(mapped.maxOrderQty),
            status,
            backorderAllowed: toBoolean(mapped.backorderAllowed, false),
            active: toBoolean(mapped.active, true),
            crmProductId: isBlank(mapped.crmProductId) ? null : String(mapped.crmProductId).trim(),
            lastUpdated: excelDateToISOString(mapped.lastUpdated),
            source: String(mapped.source || 'manual').trim() || 'manual',
            descriptionVideo: isBlank(mapped.descriptionVideo) ? null : String(mapped.descriptionVideo).trim(),
            updatedAt: excelDateToISOString(mapped.updatedAt),
            uiFlags: {
              featured: toBoolean(mapped.uiFlags_featured, false),
              hidden: toBoolean(mapped.uiFlags_hidden, false),
            },
          };

          return product;
        });

        const ids = new Set();
        rows.forEach((row, index) => {
          if (ids.has(row.rowid)) throw new Error(`Duplicate rowid "${row.rowid}" found at Excel row ${index + 2}.`);
          ids.add(row.rowid);
        });

        resolve(rows);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Invalid Excel file.'));
      }
    };

    reader.readAsArrayBuffer(file);
  });
}
