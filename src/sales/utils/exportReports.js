// src/sales/utils/exportReports.js
import * as XLSX from "xlsx-js-style";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import dayjs from "dayjs";

const currency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const date = (value) =>
  value ? dayjs(value).format("DD MMM YYYY, hh:mm A") : "—";

const categories = (order) =>
  [
    ...new Set(
      (order.items || []).map((item) => item.category).filter(Boolean),
    ),
  ].join(", ") || "Uncategorised";

/** One item per line — same in Excel and PDF */
const itemsOrdered = (order) =>
  (order.items || [])
    .map((item) => {
      const name = item.name || item.productName || item.title || "Item";
      const qty = item.quantity || 1;
      return `${name} ×${qty}`;
    })
    .join("\n") || "—";

const rows = (orders) =>
  orders.map((order) => ({
    "Order ID": order.ref || order.id,
    Customer: order.customerName || "Walk-in customer",
    Phone: order.customerPhone || "—",
    Category: categories(order),
    "Items Ordered": itemsOrdered(order),
    Channel: order.channel || "Direct",
    Status: order.status || "pending",
    Quantity:
      order.totalQuantity ||
      order.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) ||
      0,
    Amount: Number(order.totalAmount || 0),
    Date: date(order.orderDate || order.createdAt),
  }));

const fileStamp = () => dayjs().format("YYYY-MM-DD");

/* ── shared border helpers ─────────────────────────────────── */
const thinGray = { style: "thin", color: { rgb: "C8C8D0" } };
const thinLight = { style: "thin", color: { rgb: "E0E0E8" } };

const headerBorder = {
  top: thinGray,
  bottom: thinGray,
  left: thinGray,
  right: thinGray,
};

const bodyBorder = {
  top: thinLight,
  bottom: thinLight,
  left: thinLight,
  right: thinLight,
};

/** Bold + light-gray header, wrap + borders on body (mirrors PDF table) */
function styleSheet(sheet, { headerFill = "E8E8ED" } = {}) {
  if (!sheet || !sheet["!ref"]) return;

  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const headerRow = range.s.r;

  // Header row
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: headerRow, c });
    if (!sheet[addr]) continue;
    sheet[addr].s = {
      font: { bold: true, sz: 11, color: { rgb: "1F1832" } },
      fill: { patternType: "solid", fgColor: { rgb: headerFill } },
      alignment: {
        vertical: "center",
        horizontal: "left",
        wrapText: true,
      },
      border: headerBorder,
    };
  }

  // Body rows
  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!sheet[addr]) continue;

      // Alternate row tint (like PDF alternateRowStyles)
      const isAlt = (r - headerRow) % 2 === 0;
      sheet[addr].s = {
        font: { sz: 10, color: { rgb: "1C1B29" } },
        fill: isAlt
          ? { patternType: "solid", fgColor: { rgb: "F6F5FD" } }
          : undefined,
        alignment: {
          vertical: "top",
          horizontal: "left",
          wrapText: true,
        },
        border: bodyBorder,
      };
    }
  }
}

export function exportSalesExcel(orders, analytics) {
  const workbook = XLSX.utils.book_new();

  const summary = [
    { Metric: "Generated on", Value: dayjs().format("DD MMM YYYY, hh:mm A") },
    { Metric: "Revenue", Value: analytics?.totalRevenue || 0 },
    { Metric: "Orders", Value: analytics?.totalOrders || 0 },
    { Metric: "Items sold", Value: analytics?.totalQuantity || 0 },
    { Metric: "Customers", Value: analytics?.totalCustomers || 0 },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summary);
  const ordersSheet = XLSX.utils.json_to_sheet(rows(orders));

  summarySheet["!cols"] = [{ wch: 18 }, { wch: 28 }];
  ordersSheet["!cols"] = [
    { wch: 14 }, // Order ID
    { wch: 22 }, // Customer
    { wch: 15 }, // Phone
    { wch: 28 }, // Category
    { wch: 42 }, // Items Ordered
    { wch: 12 }, // Channel
    { wch: 12 }, // Status
    { wch: 10 }, // Quantity
    { wch: 14 }, // Amount
    { wch: 22 }, // Date
  ];

  // Header taller; body rows tall enough for multi-line items
  const orderCount = orders.length;
  ordersSheet["!rows"] = Array.from({ length: orderCount + 1 }, (_, i) =>
    i === 0 ? { hpt: 24 } : { hpt: 40 },
  );
  summarySheet["!rows"] = [{ hpt: 24 }];

  styleSheet(summarySheet);
  styleSheet(ordersSheet);

  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
  XLSX.utils.book_append_sheet(workbook, ordersSheet, "Orders");

  XLSX.writeFile(workbook, `niyaa-sales-report-${fileStamp()}.xlsx`);
}

export function exportSalesPdf(orders, analytics, title = "Sales report") {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  // Header banner
  doc.setFillColor(31, 25, 70);
  doc.rect(0, 0, 842, 86, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(21);
  doc.text("Niyaa · Sales Report", 42, 38);
  doc.setFontSize(10);
  doc.text(
    `${title} · Generated ${dayjs().format("DD MMM YYYY, hh:mm A")}`,
    42,
    58,
  );

  // KPI strip
  doc.setTextColor(28, 27, 41);
  doc.setFontSize(11);
  doc.text(
    `Revenue  ${currency(analytics?.totalRevenue || 0)}     Orders  ${analytics?.totalOrders || 0}     Units  ${analytics?.totalQuantity || 0}     Customers  ${analytics?.totalCustomers || 0}`,
    42,
    116,
  );

  autoTable(doc, {
    startY: 140,
    head: [
      [
        "Order",
        "Customer",
        "Phone",
        "Category",
        "Items Ordered",
        "Channel",
        "Status",
        "Units",
        "Amount",
        "Date",
      ],
    ],
    body: rows(orders).map((row) => [
      row["Order ID"],
      row.Customer,
      row.Phone,
      row.Category,
      row["Items Ordered"],
      row.Channel,
      row.Status,
      row.Quantity,
      "Rs. " + Number(row.Amount).toLocaleString("en-IN"),
      row.Date,
    ]),
    styles: {
      fontSize: 7.5,
      cellPadding: 6,
      overflow: "linebreak",
      valign: "top",
      lineWidth: 0.4,
      lineColor: [180, 180, 190],
    },
    headStyles: {
      fillColor: [108, 92, 231],
      textColor: 255,
      fontSize: 8,
      fontStyle: "bold",
      lineWidth: 0.4,
      lineColor: [108, 92, 231],
    },
    alternateRowStyles: { fillColor: [246, 245, 253] },
    tableLineWidth: 0.4,
    tableLineColor: [180, 180, 190],
    columnStyles: {
      0: { cellWidth: 58 },
      1: { cellWidth: 85 },
      2: { cellWidth: 70 },
      3: { cellWidth: 95 },
      4: { cellWidth: 140 },
      5: { cellWidth: 55 },
      6: { cellWidth: 55 },
      7: { cellWidth: 40 },
      8: { cellWidth: 65 },
      9: { cellWidth: 85 },
    },
    margin: { left: 28, right: 28 },
  });

  doc.save(`niyaa-sales-report-${fileStamp()}.pdf`);
}