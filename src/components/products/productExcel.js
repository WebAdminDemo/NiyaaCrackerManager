import * as XLSX from 'xlsx';

export const PRODUCT_EXCEL_COLUMNS = [
  'rowid','sku','category','name','contents','price','discountPercent','discountAmount','amount','currency',
  'taxRate','image','tags','stockQuantity','minOrderQty','maxOrderQty','status','backorderAllowed','active',
  'crmProductId','lastUpdated','source','descriptionVideo','updatedAt','uiFlags_featured','uiFlags_hidden',
];

const HEADER_ALIASES = {
  rowid:'rowid',id:'rowid',sku:'sku',category:'category',name:'name',productname:'name',contents:'contents',
  price:'price',discountpercent:'discountPercent',discount:'discountPercent',discountamount:'discountAmount',
  amount:'amount',saleamount:'amount',currency:'currency',taxrate:'taxRate',image:'image',imageurl:'image',
  tags:'tags',stockquantity:'stockQuantity',stock:'stockQuantity',minorderqty:'minOrderQty',
  minimumorderquantity:'minOrderQty',maxorderqty:'maxOrderQty',maximumorderquantity:'maxOrderQty',status:'status',
  backorderallowed:'backorderAllowed',active:'active',crmproductid:'crmProductId',lastupdated:'lastUpdated',
  lastupdatedat:'lastUpdated',source:'source',descriptionvideo:'descriptionVideo',updatedat:'updatedAt',
  uiflagsfeatured:'uiFlags_featured',featured:'uiFlags_featured',uiflagshidden:'uiFlags_hidden',hidden:'uiFlags_hidden',
};

const isBlank = v => v === undefined || v === null || String(v).trim() === '';
const normalizeHeader = v => String(v ?? '').trim().replace(/[\s_\-./()]+/g,'').toLowerCase();
const nullableNumber = v => {
  if (isBlank(v) || String(v).trim().toLowerCase() === 'null') return null;
  const n = Number(String(v).replace(/,/g,''));
  return Number.isFinite(n) ? n : null;
};
const booleanOr = (v, fallback=false) => {
  if (isBlank(v)) return fallback;
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  if (['true','1','yes','y','active'].includes(s)) return true;
  if (['false','0','no','n','inactive'].includes(s)) return false;
  return fallback;
};
const nullableText = v => {
  if (v === null || String(v ?? '').trim().toLowerCase() === 'null') return null;
  return isBlank(v) ? '' : String(v).trim();
};
const parseTags = v => {
  if (v === null || String(v ?? '').trim().toLowerCase() === 'null') return null;
  if (Array.isArray(v)) return v.filter(x => !isBlank(x)).map(String);
  if (isBlank(v)) return [];
  const s = String(v).trim();
  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed)) return parsed.filter(x => !isBlank(x)).map(String);
    if (parsed === null) return null;
  } catch (_) {}
  return s.split(',').map(x => x.trim()).filter(Boolean);
};
const dateValue = v => {
  if (v === null || String(v ?? '').trim().toLowerCase() === 'null') return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString();
  if (typeof v === 'number' && v > 0) {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return new Date(Date.UTC(d.y,d.m-1,d.d,d.H||0,d.M||0,Math.floor(d.S||0))).toISOString();
  }
  if (!isBlank(v)) {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
    return String(v).trim();
  }
  return null;
};

export function normalizeProductForExcel(product={}) {
  const flags = product.uiFlags ?? {};
  return {
    rowid:product.rowid ?? product.id ?? '', sku:product.sku ?? '', category:product.category ?? '', name:product.name ?? '',
    contents:product.contents ?? '', price:product.price ?? '', discountPercent:product.discountPercent ?? product.discount_percent ?? 0,
    discountAmount:product.discountAmount ?? '', amount:product.amount ?? '', currency:product.currency ?? '', taxRate:product.taxRate ?? 0,
    image:product.image ?? '', tags:Array.isArray(product.tags) ? JSON.stringify(product.tags) : (product.tags ?? ''),
    stockQuantity:product.stockQuantity ?? null, minOrderQty:product.minOrderQty ?? null, maxOrderQty:product.maxOrderQty ?? null,
    status:product.status ?? '', backorderAllowed:product.backorderAllowed ?? false, active:product.active ?? true,
    crmProductId:product.crmProductId ?? null, lastUpdated:product.lastUpdated ?? product.last_updated ?? null,
    source:product.source ?? '', descriptionVideo:product.descriptionVideo ?? null, updatedAt:product.updatedAt ?? product.updated_at ?? null,
    uiFlags_featured:flags.featured ?? false, uiFlags_hidden:flags.hidden ?? false,
  };
}

export function exportProductsToExcel(products=[]) {
  const ws = XLSX.utils.json_to_sheet(products.map(normalizeProductForExcel), {header:PRODUCT_EXCEL_COLUMNS});
  ws['!cols'] = PRODUCT_EXCEL_COLUMNS.map(c => ({wch:Math.min(Math.max(c.length+2,12),30)}));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Products');
  XLSX.writeFile(wb,`products_${new Date().toISOString().slice(0,10)}.xlsx`);
}

export function parseProductsExcel(file) {
  return new Promise((resolve,reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Unable to read the Excel file.'));
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result,{type:'array',cellDates:true});
        const name = wb.SheetNames[0]; if (!name) throw new Error('The Excel file does not contain a worksheet.');
        const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[name],{defval:null,raw:true});
        if (!rawRows.length) throw new Error('The Excel worksheet is empty.');
        const rows = rawRows.map((raw,i) => {
          const m={}; Object.entries(raw).forEach(([h,v])=>{const k=HEADER_ALIASES[normalizeHeader(h)]; if(k)m[k]=v;});
          const rowNumber=i+2, rowid=String(m.rowid ?? '').trim(), productName=String(m.name ?? '').trim(), category=String(m.category ?? '').trim();
          if(!rowid) throw new Error(`Row ${rowNumber}: rowid is required.`);
          if(!productName) throw new Error(`Row ${rowNumber}: name is required.`);
          if(!category) throw new Error(`Row ${rowNumber}: category is required.`);
          const dp=nullableNumber(m.discountPercent); const discountPercent=dp===null?0:dp;
          if(discountPercent<0||discountPercent>100) throw new Error(`Row ${rowNumber}: discountPercent must be between 0 and 100.`);
          const statusRaw=nullableText(m.status), status=(statusRaw===null||statusRaw==='')?'in_stock':statusRaw.toLowerCase();
          if(!['in_stock','no_stock'].includes(status)) throw new Error(`Row ${rowNumber}: status must be in_stock or no_stock.`);
          return {
            rowid,sku:nullableText(m.sku),category,name:productName,contents:nullableText(m.contents),price:nullableNumber(m.price),
            discountPercent,discountAmount:nullableNumber(m.discountAmount),amount:nullableNumber(m.amount),currency:nullableText(m.currency),
            taxRate:nullableNumber(m.taxRate),image:nullableText(m.image),tags:parseTags(m.tags),stockQuantity:nullableNumber(m.stockQuantity),
            minOrderQty:nullableNumber(m.minOrderQty),maxOrderQty:nullableNumber(m.maxOrderQty),status,
            backorderAllowed:booleanOr(m.backorderAllowed,false),active:booleanOr(m.active,true),crmProductId:nullableText(m.crmProductId),
            lastUpdated:dateValue(m.lastUpdated),source:nullableText(m.source),descriptionVideo:nullableText(m.descriptionVideo),updatedAt:dateValue(m.updatedAt),
            uiFlags:{featured:booleanOr(m.uiFlags_featured,false),hidden:booleanOr(m.uiFlags_hidden,false)},
          };
        });
        const ids=new Set(); rows.forEach((r,i)=>{if(ids.has(r.rowid))throw new Error(`Duplicate rowid "${r.rowid}" found at Excel row ${i+2}.`);ids.add(r.rowid);});
        resolve(rows);
      } catch(err){reject(err instanceof Error?err:new Error('Invalid Excel file.'));}
    };
    reader.readAsArrayBuffer(file);
  });
}
