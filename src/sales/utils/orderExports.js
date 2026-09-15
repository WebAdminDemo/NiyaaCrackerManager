import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import dayjs from "dayjs";

const n = (v) => Number(v || 0);
const money = (v) =>
  `₹${n(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const itemsOf = (o) => (Array.isArray(o?.items) ? o.items : []);
const nameOf = (o) =>
  o?.customer?.name || o?.customerName || "";
const phoneOf = (o) => o?.customer?.phone || o?.customerPhone || "";
const addressOf = (o) =>
  o?.customer?.address || o?.customerAddress || o?.address || "";
const qtyOf = (o) =>
  Number(o?.totalQuantity ?? itemsOf(o).reduce((s, i) => s + n(i.quantity), 0));
const discountTypeOf = (o) => o?.discountMode === "value" || o?.discount_mode === "value" ? "value" : "percent";
const discountValueOf = (o) => {
  const type = discountTypeOf(o);
  const raw = o?.discountValue ?? o?.discount_value ?? (type === "value" ? o?.discountAmount ?? o?.discount_amount : o?.discountPercent ?? o?.discount_percent);
  const v = Number(raw ?? 0);
  return Number.isFinite(v) && v > 0 ? v : 0;
};
const discountAmountOf = (o) => {
  const saved = Number(o?.discountAmount ?? o?.discount_amount);
  if (Number.isFinite(saved) && saved !== 0) return saved;
  const v = discountValueOf(o);
  return discountTypeOf(o) === "value" ? v : n(o?.totalAmount) * Math.min(100, v) / 100;
};
const finalOf = (o) => {
  const saved = Number(o?.finalAmount ?? o?.final_amount);
  return Number.isFinite(saved) && (saved !== 0 || discountAmountOf(o) !== 0) ? saved : n(o?.totalAmount) - discountAmountOf(o);
};
const discountTextOf = (o) => discountTypeOf(o) === "value" ? `Val / ${money(discountAmountOf(o))}` : `${discountValueOf(o).toFixed(2)}% / ${money(discountAmountOf(o))}`;
const rows = (orders) =>
  orders.map((o) => ({
    "Order ID": o.ref || o.id || "",
    "Party Name": nameOf(o),
    "Party Number": phoneOf(o),
    "Party Address": addressOf(o),
    Category:
      [
        ...new Set(
          itemsOf(o)
            .map((i) => i.category)
            .filter(Boolean),
        ),
      ].join(", ") || "Uncategorised",
    Products:
      itemsOf(o)
        .map((i) => `${i.name || i.productName || "Item"} ×${n(i.quantity)}`)
        .join("\n") || "",
    "Grand Total Products": itemsOf(o).length,
    "Grand Total Quantity": qtyOf(o),
    Channel: o.channel || "Direct",
    Status: o.status || "pending",
    "Grand Total Pricing": n(o.totalAmount),
    "Discount": discountTextOf(o),
    "After Discount": finalOf(o),
    "Final Price": finalOf(o),
    Date:
      o.orderDate || o.createdAt
        ? dayjs(o.orderDate || o.createdAt).format("DD MMM YYYY, hh:mm A")
        : "",
  }));

export function exportOrdersToExcel(orders = []) {
  const wb = XLSX.utils.book_new();
  const summary = XLSX.utils.json_to_sheet([
    {
      "Generated On": dayjs().format("DD MMM YYYY, hh:mm A"),
      Orders: orders.length,
      "Grand Total Quantity": orders.reduce((s, o) => s + qtyOf(o), 0),
      "Grand Total Pricing": orders.reduce((s, o) => s + n(o.totalAmount), 0),
    },
  ]);
  const sheet = XLSX.utils.json_to_sheet(rows(orders));
  summary["!cols"] = [{ wch: 22 }, { wch: 12 }, { wch: 22 }, { wch: 24 }];
  sheet["!cols"] = [
    { wch: 16 },
    { wch: 22 },
    { wch: 16 },
    { wch: 34 },
    { wch: 26 },
    { wch: 48 },
    { wch: 22 },
    { wch: 22 },
    { wch: 14 },
    { wch: 14 },
    { wch: 22 },
    { wch: 24 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, summary, "Summary");
  XLSX.utils.book_append_sheet(wb, sheet, "Orders");
  XLSX.writeFile(wb, `niyaa-orders-${dayjs().format("YYYY-MM-DD-HHmm")}.xlsx`);
}

export function createOrderPdf(order, { download = true, print = false } = {}) {
  if (!order) return null;
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" }),
    W = doc.internal.pageSize.getWidth(),
    left = 42,
    right = W - 42;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("NIYAA ORDER", left, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Order ID: ${order.ref || order.id || ""}`, left, 70);
  doc.text(
    `Placed: ${order.orderDate || order.createdAt ? dayjs(order.orderDate || order.createdAt).format("DD MMM YYYY, hh:mm A") : ""}`,
    left,
    85,
  );
  doc.text(
    `Status: ${String(order.status || "pending").toUpperCase()}`,
    right,
    70,
    { align: "right" },
  );
  doc.text(`Channel: ${order.channel || "Direct"}`, right, 85, {
    align: "right",
  });
  doc.setDrawColor(210, 210, 220);
  doc.line(left, 98, right, 98);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("PARTY DETAILS", left, 120);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Party Name: ${nameOf(order)}`, left, 140);
  doc.text(`Party Number: ${phoneOf(order)}`, left, 156);
  const al = doc.splitTextToSize(`Party Address: ${addressOf(order)}`, W - 84);
  doc.text(al, left, 172);
  const start = 190 + Math.max(0, (al.length - 1) * 13),
    items = itemsOf(order);
  autoTable(doc, {
    startY: start,
    head: [["Product", "Category", "Qty", "Unit Price", "Total"]],
    body: items.map((i) => {
      const q = n(i.quantity),
        p = n(i.price),
        t = n(i.total ?? q * p);
      return [
        i.name || i.productName || "Item",
        i.category || "Uncategorised",
        q,
        money(p),
        money(t),
      ];
    }),
    theme: "grid",
    styles: {
      fontSize: 8.5,
      cellPadding: 6,
      overflow: "linebreak",
      valign: "top",
    },
    headStyles: {
      fillColor: [108, 92, 231],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [247, 246, 252] },
    margin: { left, right: 42 },
  });
  const y = (doc.lastAutoTable?.finalY || start + 40) + 22,
    total =
      n(order.totalAmount) ||
      items.reduce((s, i) => s + n(i.total ?? n(i.price) * n(i.quantity)), 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text(`Grand Total Products: ${items.length}`, right, y, {
    align: "right",
  });
  doc.text(`Grand Total Quantity: ${qtyOf(order)}`, right, y + 17, {
    align: "right",
  });
  doc.setFontSize(14);
  doc.text(`Grand Total Pricing: ${money(total)}`, right, y + 42, {
    align: "right",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(110, 105, 125);
  doc.text(
    "Generated from Niyaa Order Management",
    left,
    doc.internal.pageSize.getHeight() - 28,
  );
  const filename = `Order_${String(order.ref || order.id || "order").replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
  if (download) doc.save(filename);
  if (print) {
    const url = doc.output("bloburl");
    window.open(url, "_blank", "noopener,noreferrer");
  }
  return doc;
}

export function exportOrdersToPdf(orders = []) {
  if (!orders.length) return;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("NIYAA ORDERS REPORT", 32, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `Generated ${dayjs().format("DD MMM YYYY, hh:mm A")} • Orders ${orders.length} • Quantity ${orders.reduce((s, o) => s + qtyOf(o), 0)} • Pricing ${money(orders.reduce((s, o) => s + n(o.totalAmount), 0))}`,
    32,
    50,
  );
  autoTable(doc, {
    startY: 65,
    head: [
      [
        "Order ID",
        "Party Name",
        "Party Number",
        "Party Address",
        "Products",
        "Qty",
        "Status",
        "Grand Total Pricing",
        "Date",
      ],
    ],
    body: rows(orders).map((r) => [
      r["Order ID"],
      r["Party Name"],
      r["Party Number"],
      r["Party Address"],
      r.Products,
      r["Grand Total Quantity"],
      r.Status,
      money(r["Grand Total Pricing"]),
      r.Date,
    ]),
    theme: "grid",
    styles: {
      fontSize: 7.2,
      cellPadding: 4,
      overflow: "linebreak",
      valign: "top",
    },
    headStyles: {
      fillColor: [108, 92, 231],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [247, 246, 252] },
    margin: { left: 24, right: 24 },
  });
  doc.save(`niyaa-orders-${dayjs().format("YYYY-MM-DD-HHmm")}.pdf`);
}
