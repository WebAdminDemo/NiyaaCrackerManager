// src/sales/components/RecentOrdersTable.jsx
import { Badge, Button, Pagination, Table } from "react-bootstrap";
import dayjs from "dayjs";

const statusColor = {
  pending: "warning",
  processing: "info",
  packaging: "secondary",
  shipped: "primary",
  delivered: "success",
  cancelled: "danger",
};

const categoryText = (order) =>
  [
    ...new Set(
      (order.items || []).map((item) => item.category).filter(Boolean),
    ),
  ].join(", ") || "Uncategorised";

/** Same format as Excel / PDF: "Item name ×qty" one per line */
const itemsOrdered = (order) => {
  const list = order.items || [];
  if (!list.length) return "—";
  return list
    .map((item) => {
      const name = item.name || item.productName || item.title || "Item";
      const qty = item.quantity || 1;
      return `${name} ×${qty}`;
    })
    .join("\n");
};

const customerName = (order) =>
  order.customer?.name || order.customerName || "Walk-in customer";

const customerPhone = (order) =>
  order.customer?.phone || order.customerPhone || "—";

const RecentOrdersTable = ({
  orders,
  onViewOrder,
  limit = 8,
  page = 1,
  onPageChange,
}) => {
  const sortedOrders = [...orders].sort(
    (a, b) =>
      dayjs(b.createdAt || b.orderDate).valueOf() -
      dayjs(a.createdAt || a.orderDate).valueOf(),
  );
  const pageCount = Math.max(1, Math.ceil(sortedOrders.length / limit));
  const currentPage = Math.min(page, pageCount);
  const visibleOrders = sortedOrders.slice(
    (currentPage - 1) * limit,
    currentPage * limit,
  );

  if (!sortedOrders.length) {
    return (
      <div className="sales-empty-state">
        <i className="bi bi-inbox" />
        <p>No orders match these filters.</p>
        <span>Try a different date range or clear a filter.</span>
      </div>
    );
  }

  return (
    <section className="sales-table-card recent-orders-table">
      <div className="sales-table-card__heading">
        <div>
          <p className="eyebrow">Order activity</p>
          <h2>Recent orders</h2>
        </div>
        <span>{sortedOrders.length} results</span>
      </div>

      <div className="table-responsive">
        <Table
          bordered
          hover
          className="align-middle mb-0 sales-orders-table sales-orders-table--bordered"
        >
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Category</th>
              <th>Items Ordered</th>
              <th>Channel</th>
              <th>Amount</th>
              <th>Items</th>
              <th>Date</th>
              <th>Status</th>
              <th aria-label="Action" />
            </tr>
          </thead>
          <tbody>
            {visibleOrders.map((order) => (
              <tr key={order.id}>
                <td data-label="Order">
                  <code>{order.ref || String(order.id).slice(-8)}</code>
                </td>
                <td data-label="Customer">
                  <strong>{customerName(order)}</strong>
                  <small className="d-block text-muted">
                    {customerPhone(order)}
                  </small>
                </td>
                <td data-label="Category">
                  <span className="category-stack">{categoryText(order)}</span>
                </td>
                <td data-label="Items Ordered" className="items-ordered-cell">
                  <span className="items-ordered-list">
                    {itemsOrdered(order)}
                  </span>
                </td>
                <td data-label="Channel">
                  <span className="channel-pill">
                    <i className="bi bi-broadcast" />
                    {order.channel || "Direct"}
                  </span>
                </td>
                <td data-label="Amount" className="amount">
                  ₹{Number(order.totalAmount || 0).toLocaleString("en-IN")}
                </td>
                <td data-label="Items">{order.totalQuantity || 0}</td>
                <td data-label="Date">
                  {order.createdAt || order.orderDate
                    ? dayjs(order.createdAt || order.orderDate).format(
                        "DD MMM YYYY",
                      )
                    : "—"}
                </td>
                <td data-label="Status">
                  <Badge
                    bg={statusColor[order.status?.toLowerCase()] || "secondary"}
                  >
                    {order.status || "pending"}
                  </Badge>
                </td>
                <td data-label="">
                  <Button
                    variant="link"
                    className="order-view-btn"
                    onClick={() => onViewOrder(order)}
                    aria-label={`View ${order.ref || "order"}`}
                  >
                    <i className="bi bi-arrow-up-right" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {pageCount > 1 && (
        <Pagination className="sales-pagination">
          {Array.from({ length: pageCount }, (_, index) => (
            <Pagination.Item
              key={index + 1}
              active={currentPage === index + 1}
              onClick={() => onPageChange?.(index + 1)}
            >
              {index + 1}
            </Pagination.Item>
          ))}
        </Pagination>
      )}

      <style>{`
        .sales-orders-table--bordered {
          border-collapse: collapse;
          width: 100%;
        }
        .sales-orders-table--bordered th,
        .sales-orders-table--bordered td {
          border: 1px solid #E0E0E8 !important;
          vertical-align: top;
          padding: 0.75rem 0.85rem;
        }
        .sales-orders-table--bordered thead th {
          font-weight: 700 !important;
          background: #F6F5FD;
          color: #1C1B29;
          font-size: 0.8rem;
          letter-spacing: 0.02em;
          white-space: nowrap;
        }
        .sales-orders-table--bordered tbody td {
          font-size: 0.875rem;
          color: #1C1B29;
        }
        .sales-orders-table--bordered tbody tr:nth-child(even) {
          background: #FAFAFC;
        }
        .items-ordered-cell {
          min-width: 160px;
          max-width: 240px;
        }
        .items-ordered-list {
          display: block;
          white-space: pre-line;
          line-height: 1.45;
          font-size: 0.82rem;
          color: #1C1B29;
        }
        .sales-orders-table--bordered code {
          font-size: 0.8rem;
          background: #F0EEFC;
          color: #4B3F9A;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
        }
        .sales-orders-table--bordered .amount {
          font-weight: 600;
          white-space: nowrap;
        }
      `}</style>
    </section>
  );
};

export default RecentOrdersTable;