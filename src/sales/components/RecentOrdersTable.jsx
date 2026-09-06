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
  [...new Set((order.items || []).map((item) => item.category).filter(Boolean))].join(", ") ||
  "Uncategorised";

const itemsOrdered = (order) =>
  (order.items || [])
    .map((item) => `${item.name || item.productName || item.title || "Item"} ×${item.quantity || 1}`)
    .join("\n") || "—";

const customerName = (order) =>
  order.customer?.name || order.customerName || "Walk-in customer";

const customerPhone = (order) =>
  order.customer?.phone || order.customerPhone || "—";

const RecentOrdersTable = ({
  orders = [],
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

  const first = (currentPage - 1) * limit + 1;
  const last = Math.min(currentPage * limit, sortedOrders.length);

  return (
    <section className="sales-table-card recent-orders-table">
      <div className="sales-table-card__heading">
        <div>
          <p className="eyebrow">ORDER ACTIVITY</p>
          <h2>Recent orders</h2>
        </div>
        <span>{sortedOrders.length} results</span>
      </div>

      <div className="table-responsive">
        <Table hover className="align-middle mb-0 sales-orders-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Category</th>
              <th>Items ordered</th>
              <th>Channel</th>
              <th>Amount</th>
              <th>Items</th>
              <th>Date</th>
              <th>Status</th>
              <th>View</th>
            </tr>
          </thead>
          <tbody>
            {visibleOrders.map((order) => (
              <tr key={order.id}>
                <td>
                  <code className="order-ref">
                    {order.ref || String(order.id).slice(-8)}
                  </code>
                </td>
                <td>
                  <strong>{customerName(order)}</strong>
                  <small className="d-block text-muted">
                    {customerPhone(order)}
                  </small>
                </td>
                <td>
                  <span className="category-stack">{categoryText(order)}</span>
                </td>
                <td className="items-ordered-cell">
                  <span className="items-ordered-list">{itemsOrdered(order)}</span>
                </td>
                <td>
                  <span className="channel-pill">
                    <i className="bi bi-broadcast" />
                    {order.channel || "Direct"}
                  </span>
                </td>
                <td className="amount">
                  ₹{Number(order.totalAmount || 0).toLocaleString("en-IN")}
                </td>
                <td>
                  {Number(
                    order.totalQuantity ??
                      (order.items || []).reduce(
                        (sum, item) => sum + Number(item.quantity || 0),
                        0,
                      ),
                  ).toLocaleString("en-IN")}
                </td>
                <td>
                  {order.createdAt || order.orderDate
                    ? dayjs(order.createdAt || order.orderDate).format("DD MMM YYYY")
                    : "—"}
                </td>
                <td>
                  <Badge bg={statusColor[order.status?.toLowerCase()] || "secondary"}>
                    {order.status || "pending"}
                  </Badge>
                </td>
                <td>
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
        <div className="sales-pagination">
          <span>
            Showing {first}-{last} of {sortedOrders.length} entries
          </span>
          <Pagination>
            <Pagination.Prev
              disabled={currentPage === 1}
              onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
            />
            {Array.from({ length: pageCount }, (_, index) => (
              <Pagination.Item
                key={index + 1}
                active={currentPage === index + 1}
                onClick={() => onPageChange?.(index + 1)}
              >
                {index + 1}
              </Pagination.Item>
            ))}
            <Pagination.Next
              disabled={currentPage === pageCount}
              onClick={() => onPageChange?.(Math.min(pageCount, currentPage + 1))}
            />
          </Pagination>
        </div>
      )}
    </section>
  );
};

export default RecentOrdersTable;
