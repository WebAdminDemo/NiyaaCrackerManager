
import * as XLSX from "xlsx-js-style";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import dayjs from "dayjs";

const fileStamp = () => dayjs().format("YYYY-MM-DD");

const numberText = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const money = (value) => `Rs. ${numberText(value)}`;

const statusText = (value) =>
  String(value || "pending")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getBrand = (item) => String(item?.brand || "").trim();

/**
 * Returns the discount exactly as it was saved on the ORDER ITEM.
 * The product/catalog discount is never used when an order-item discount
 * has been saved. This is important because editing an order must not
 * change the catalog product discount.
 */
const getDiscountType = (item) => {
  const value =
    item?.discountType ??
    item?.discount_type;

  if (value === "value" || value === "percent") {
    return value;
  }

  // Backward compatibility for older order rows that only stored
  // discount_percent.
  return "percent";
};

const getDiscountValue = (item) => {
  const type = getDiscountType(item);

  if (type === "value") {
    const savedValue =
      item?.discountValue ??
      item?.discount_value;

    if (
      savedValue !== null &&
      savedValue !== undefined &&
      String(savedValue).trim() !== ""
    ) {
      return Math.max(0, Number(savedValue) || 0);
    }

    const amount =
      item?.discount_amount ??
      item?.discountAmount;

    return Math.max(0, Number(amount) || 0);
  }

  const savedValue =
    item?.discountValue ??
    item?.discount_value;

  if (
    savedValue !== null &&
    savedValue !== undefined &&
    String(savedValue).trim() !== ""
  ) {
    return Math.max(0, Math.min(100, Number(savedValue) || 0));
  }

  return Math.max(
    0,
    Math.min(
      100,
      Number(
        item?.discount_percent ??
        item?.discountPercent ??
        0,
      ) || 0,
    ),
  );
};

const discountDisplay = (item) => {
  const type = getDiscountType(item);
  const value = getDiscountValue(item);

  return type === "value"
    ? money(value)
    : `${value.toFixed(2)}%`;
};




const getOrderDiscountType = (order) =>
  order?.discountMode === "value" || order?.discount_mode === "value"
    ? "value"
    : "percent";

const getOrderDiscountValue = (order) => {
  const type = getOrderDiscountType(order);
  const raw =
    order?.discountValue ??
    order?.discount_value ??
    (type === "percent"
      ? order?.discountPercent ?? order?.discount_percent ?? 0
      : order?.discountAmount ?? order?.discount_amount ?? 0);
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : 0;
};

const getOrderGrossTotal = (order, items = getItems(order)) => {
  const saved = Number(order?.totalAmount);
  if (Number.isFinite(saved)) return saved;
  return items.reduce(
    (sum, item) => sum + Number(item?.total ?? Number(item?.price || 0) * Number(item?.quantity || 0)),
    0,
  );
};

const getOrderDiscountAmount = (order, grossTotal) => {
  const type = getOrderDiscountType(order);
  const value = getOrderDiscountValue(order);
  if (type === "value") return value;
  return grossTotal * Math.min(100, value) / 100;
};

const getOrderFinalTotal = (order, grossTotal) => {
  const saved = Number(order?.finalAmount ?? order?.final_amount);
  if (Number.isFinite(saved) && (order?.finalAmount != null || order?.final_amount != null)) {
    return saved;
  }
  return grossTotal - getOrderDiscountAmount(order, grossTotal);
};

const orderDiscountDisplay = (order) => {
  const type = getOrderDiscountType(order);
  const value = getOrderDiscountValue(order);
  return type === "value" ? money(value) : `${value.toFixed(2)}%`;
};

const getParty = (order) => ({
  name:
    order?.partyName ||
    order?.customerName ||
    order?.customer?.name ||
    "",
  number:
    order?.partyNumber || order?.customerPhone || order?.customer?.phone || "",
  sector: order?.partySector || order?.location || "",
  country: order?.partyCountry || "",
  state: order?.partyState || "",
  district: order?.partyDistrict || "",
  locality: order?.partyLocality || "",
  pincode: order?.partyPincode || "",
  address:
    order?.partyAddress ||
    order?.customerAddress ||
    order?.customer?.address ||
    "",
});

const getItems = (order) => (Array.isArray(order?.items) ? order.items : []);

const orderRows = (orders = []) =>
  orders.map((order) => {
    const party = getParty(order);
    const items = getItems(order);
    const quantity = items.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    );

    return {
      "Order ID": order.ref || order.id || "",
      "Party Name": party.name,
      "Party Number": party.number,
      "Party Sector": party.sector,
      "Party Country": party.country,
      "Party State": party.state,
      "Party District": party.district,
      "Party Locality": party.locality,
      Pincode: party.pincode,
      "Discount": orderDiscountDisplay(order),
      "After Discount": getOrderFinalTotal(order, getOrderGrossTotal(order, items)),
      "Final Amount": getOrderFinalTotal(order, getOrderGrossTotal(order, items)),
      "Items Ordered":
        items
          .map(
            (item) =>
              `${getBrand(item)} / ${
                item.name || item.productName || item.title || "Item"
              } x${Number(item.quantity || 0)}`,
          )
          .join("\n") || "",
      "Total Quantity": quantity,
      Amount: Number(order.totalAmount || 0),
      Status: statusText(order.status),
      Date:
        order.orderDate || order.createdAt
          ? dayjs(order.orderDate || order.createdAt).format(
              "DD MMM YYYY, hh:mm A",
            )
          : "",
    };
  });

const headerBorder = {
  top: { style: "thin", color: { rgb: "000000" } },
  bottom: { style: "thin", color: { rgb: "000000" } },
  left: { style: "thin", color: { rgb: "000000" } },
  right: { style: "thin", color: { rgb: "000000" } },
};

function styleSheet(sheet) {
  if (!sheet?.["!ref"]) return;

  const range = XLSX.utils.decode_range(sheet["!ref"]);

  for (let c = range.s.c; c <= range.e.c; c += 1) {
    const address = XLSX.utils.encode_cell({ r: range.s.r, c });
    if (!sheet[address]) continue;

    sheet[address].s = {
      font: { bold: true, sz: 10 },
      fill: {
        patternType: "solid",
        fgColor: { rgb: "E8E8ED" },
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: true,
      },
      border: headerBorder,
    };
  }

  for (let r = range.s.r + 1; r <= range.e.r; r += 1) {
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const address = XLSX.utils.encode_cell({ r, c });
      if (!sheet[address]) continue;

      sheet[address].s = {
        font: { sz: 9 },
        alignment: {
          horizontal: "left",
          vertical: "top",
          wrapText: true,
        },
        border: headerBorder,
      };
    }
  }
}

export function exportSalesExcel(orders = [], analytics = null) {
  const workbook = XLSX.utils.book_new();

  const totalRevenue =
    analytics?.totalRevenue ??
    orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

  const totalQuantity = orders.reduce(
    (sum, order) =>
      sum +
      getItems(order).reduce(
        (itemSum, item) => itemSum + Number(item.quantity || 0),
        0,
      ),
    0,
  );

  const summary = [
    {
      Metric: "Generated on",
      Value: dayjs().format("DD MMM YYYY, hh:mm A"),
    },
    {
      Metric: "Revenue",
      Value: Number(totalRevenue || 0),
    },
    {
      Metric: "Orders",
      Value: analytics?.totalOrders ?? orders.length,
    },
    {
      Metric: "Total Quantity",
      Value: analytics?.totalQuantity ?? totalQuantity,
    },
    {
      Metric: "Customers",
      Value:
        analytics?.totalCustomers ??
        new Set(
          orders
            .map((order) => order.partyNumber || order.customerPhone)
            .filter(Boolean),
        ).size,
    },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summary);
  const ordersSheet = XLSX.utils.json_to_sheet(orderRows(orders));

  summarySheet["!cols"] = [{ wch: 22 }, { wch: 30 }];

  ordersSheet["!cols"] = [
    { wch: 18 },
    { wch: 20 },
    { wch: 17 },
    { wch: 18 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 12 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 48 },
    { wch: 16 },
    { wch: 16 },
    { wch: 15 },
    { wch: 24 },
  ];

  summarySheet["!rows"] = [{ hpt: 24 }];
  ordersSheet["!rows"] = Array.from(
    { length: orders.length + 1 },
    (_, index) => (index === 0 ? { hpt: 28 } : { hpt: 48 }),
  );

  styleSheet(summarySheet);
  styleSheet(ordersSheet);

  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
  XLSX.utils.book_append_sheet(workbook, ordersSheet, "Orders");

  XLSX.writeFile(workbook, `niyaa-sales-report-${fileStamp()}.xlsx`);
}

export function exportSalesPdf(
  orders = [],
  analytics = null,
  title = "Sales Orders",
) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 24;

  doc.setFillColor(31, 25, 70);
  doc.rect(0, 0, pageWidth, 76, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.text("NIYAA", margin, 31);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `${title}  |  ${dayjs().format("DD MMM YYYY, hh:mm A")}`,
    margin,
    50,
  );

  const totalRevenue =
    analytics?.totalRevenue ??
    orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

  const totalQuantity = orders.reduce(
    (sum, order) =>
      sum +
      getItems(order).reduce(
        (itemSum, item) => itemSum + Number(item.quantity || 0),
        0,
      ),
    0,
  );

  doc.setTextColor(30, 29, 39);
  doc.setFontSize(9);
  doc.text(
    `Revenue: ${money(totalRevenue)}    Orders: ${
      analytics?.totalOrders ?? orders.length
    }    Total Quantity: ${analytics?.totalQuantity ?? totalQuantity}`,
    margin,
    100,
  );

  const rows = orderRows(orders);

  autoTable(doc, {
    startY: 116,
    margin: { left: margin, right: margin, top: 28, bottom: 28 },
    tableWidth: pageWidth - margin * 2,
    head: [
      [
        "Order ID",
        "Party Name",
        "Party Number",
        "Location",
        "State / District",
        "Items Ordered",
        "Discount / Value",
        "Total Quantity",
        "Amount",
        "Status",
        "Date",
      ],
    ],
    body: rows.map((row) => [
      row["Order ID"],
      row["Party Name"],
      row["Party Number"],
      `${row["Party Sector"]}\n${row["Party Locality"]}\n${row.Pincode}`,
      `${row["Party State"]}\n${row["Party District"]}`,
      row["Items Ordered"],
      row["Discount / Value"],
      String(row["Total Quantity"]),
      money(row.Amount),
      row.Status,
      row.Date,
    ]),
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7,
      cellPadding: 5,
      valign: "middle",
      overflow: "linebreak",
      lineColor: [0, 0, 0],
      lineWidth: 0.35,
      textColor: [20, 20, 25],
    },
    headStyles: {
      fillColor: [45, 45, 55],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
      halign: "center",
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
    },
    columnStyles: {
      0: { cellWidth: 60, halign: "center" },
      1: { cellWidth: 65, halign: "left" },
      2: { cellWidth: 60, halign: "center" },
      3: { cellWidth: 75, halign: "left" },
      4: { cellWidth: 80, halign: "left" },
      5: { cellWidth: 130, halign: "left" },
      6: { cellWidth: 65, halign: "center" },
      7: { cellWidth: 45, halign: "center" },
      8: { cellWidth: 65, halign: "right" },
      9: { cellWidth: 55, halign: "center" },
      10: { cellWidth: 60, halign: "center" },
    },
    alternateRowStyles: {
      fillColor: [248, 248, 250],
    },
  });

  doc.save(`niyaa-sales-report-${fileStamp()}.pdf`);
}

export function exportSingleOrderPdf(order) {
  if (!order) return;

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 34;
  const printableWidth = pageWidth - margin * 2;
  const items = getItems(order);
  const party = getParty(order);
  const orderNumber = order.ref || order.id || "";

  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const grossTotal = getOrderGrossTotal(order, items);
  const discountType = getOrderDiscountType(order);
  const discountValue = getOrderDiscountValue(order);
  const discountAmount = getOrderDiscountAmount(order, grossTotal);
  const finalTotal = getOrderFinalTotal(order, grossTotal);

  const drawFooter = (pageNumber) => {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 34, pageWidth - margin, pageHeight - 34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text("Niyaa Order Management", margin, pageHeight - 20);
    doc.text(`Page ${pageNumber}`, pageWidth - margin, pageHeight - 20, { align: "right" });
  };

  // Niyaa / firecracker theme: white document with deep purple header and orange accent.
  doc.setFillColor(31, 25, 70);
  doc.rect(0, 0, pageWidth, 78, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("NIYAA", margin, 31);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("ORDER INVOICE", margin, 47);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`ORDER ${orderNumber}`, pageWidth - margin, 31, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(
    order.orderDate || order.createdAt
      ? dayjs(order.orderDate || order.createdAt).format("DD MMM YYYY, hh:mm A")
      : "",
    pageWidth - margin,
    47,
    { align: "right" },
  );

  let y = 105;
  doc.setTextColor(20, 20, 25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Order Summary", margin, y);
  y += 20;

  const half = printableWidth / 2;
  const leftX = margin;
  const rightX = margin + half;
  const summaryField = (label, value, x, fieldY, width) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(55, 55, 65);
    doc.text(label.toUpperCase(), x, fieldY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 15, 20);
    const lines = doc.splitTextToSize(String(value || ""), width);
    doc.text(lines, x, fieldY + 12);
  };

  summaryField("Party Name", party.name, leftX, y, half - 16);
  summaryField("Party Number", party.number, rightX, y, half - 16);
  summaryField("Location / Sector", party.sector, leftX, y + 37, half - 16);
  summaryField("Country", party.country, rightX, y + 37, half - 16);
  summaryField("State", party.state, leftX, y + 74, half - 16);
  summaryField("District", party.district, rightX, y + 74, half - 16);
  summaryField("Town / City / Village", party.locality, leftX, y + 111, half - 16);
  summaryField("Pincode", party.pincode, rightX, y + 111, half - 16);

  const addressY = y + 148;
  summaryField("Party Address", party.address, margin, addressY, printableWidth);
  const addressLines = doc.splitTextToSize(String(party.address || ""), printableWidth);
  const afterAddress = addressY + 15 + Math.max(1, addressLines.length) * 11;

  doc.setDrawColor(240, 171, 0);
  doc.setLineWidth(2);
  doc.line(margin, afterAddress + 10, pageWidth - margin, afterAddress + 10);

  const tableStart = afterAddress + 25;
  const tableRows = items.map((item, index) => {
    const quantity = Number(item.quantity || 0);
    const price = Number(item.price || 0);
    const total = Number(item.total ?? price * quantity);
    return [
      String(index + 1),
      getBrand(item),
      item.name || item.productName || item.title || "Item",
      quantity.toLocaleString("en-IN"),
      money(price),
      money(total),
    ];
  });

  // Order-level totals are part of the same bordered table.
  tableRows.push(["", "", "", "", "Grand Total", money(grossTotal)]);
  tableRows.push(["", "", "", "", "Discount", orderDiscountDisplay(order)]);
  tableRows.push(["", "", "", "", "After Discount", money(finalTotal)]);
  tableRows.push(["", "", "", "", "Final Amount", money(finalTotal)]);

  autoTable(doc, {
    startY: tableStart,
    margin: { left: margin, right: margin, top: 28, bottom: 42 },
    tableWidth: printableWidth,
    theme: "grid",
    head: [["#", "Brand", "Product", "Qty", "Unit Price", "Total"]],
    body: tableRows,
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: { top: 6, right: 5, bottom: 6, left: 5 },
      overflow: "linebreak",
      valign: "middle",
      textColor: [15, 15, 18],
      lineColor: [155, 155, 165],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [45, 35, 95],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "center",
      valign: "middle",
      lineColor: [45, 35, 95],
      lineWidth: 0.6,
    },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 25, halign: "center" },
      1: { cellWidth: 75, halign: "left" },
      2: { cellWidth: 175, halign: "left" },
      3: { cellWidth: 48, halign: "center" },
      4: { cellWidth: 82, halign: "right" },
      5: { cellWidth: 85, halign: "right" },
    },
    didParseCell(data) {
      const last = tableRows.length - 1;
      const totalStart = tableRows.length - 4;
      if (data.section === "body" && data.row.index >= totalStart) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = data.row.index === last ? [247, 239, 255] : [252, 250, 255];
        data.cell.styles.lineColor = [120, 120, 130];
        data.cell.styles.lineWidth = 0.55;
        if (data.column.index === 4 || data.column.index === 5) data.cell.styles.halign = "right";
        if (data.column.index === 4 && data.row.index === totalStart + 1) data.cell.styles.textColor = [200, 0, 0];
        if (data.column.index === 4 && data.row.index >= totalStart + 2) data.cell.styles.textColor = [0, 120, 65];
      }
    },
    didDrawPage(data) { drawFooter(data.pageNumber); },
  });

  const tableEnd = doc.lastAutoTable?.finalY || tableStart + 40;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(25, 25, 30);
  doc.text(
    `Total Products: ${items.length}    Total Quantity: ${totalQuantity.toLocaleString("en-IN")}`,
    margin,
    Math.min(tableEnd + 20, pageHeight - 48),
  );

  const safeOrderNumber = String(orderNumber).replace(/[^a-zA-Z0-9_-]/g, "_");
  doc.save(`niyaa-order-${safeOrderNumber}-${fileStamp()}.pdf`);
}

