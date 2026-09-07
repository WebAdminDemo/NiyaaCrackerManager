import { Badge, Button, Card, Pagination, Table } from "react-bootstrap";
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

const itemsOrdered = (order) =>
  (order.items || [])
    .map(
      (item) =>
        `${item.name || item.productName || item.title || "Item"} ×${item.quantity || 1}`,
    )
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
    <Card className="orders-table-card recent-orders-table">
      <div className="orders-table-toolbar recent-orders-toolbar">
        <div>
          <strong>{sortedOrders.length.toLocaleString("en-IN")}</strong>
          <span> recent orders</span>
        </div>

        <div className="orders-table-toolbar__right">
          <span className="recent-orders-toolbar-label">
            Latest order activity
          </span>
        </div>
      </div>

      <div className="table-responsive recent-orders-table-responsive">
        <Table hover className="align-middle mb-0 sales-all-orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Category</th>
              <th>Items Ordered</th>
              <th>Channel</th>
              <th>Amount</th>
              <th>Items</th>
              <th>Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {visibleOrders.map((order) => {
              const status = String(order.status || "pending").toLowerCase();
              const quantity =
                order.totalQuantity ??
                (order.items || []).reduce(
                  (sum, item) => sum + Number(item.quantity || 0),
                  0,
                );

              return (
                <tr key={order.id}>
                  <td>
                    <code className="order-ref">
                      {order.ref || String(order.id).slice(-8)}
                    </code>
                  </td>

                  <td>
                    <strong>{customerName(order)}</strong>
                    <small className="d-block text-muted order-phone">
                      {customerPhone(order)}
                    </small>
                  </td>

                  <td>
                    <span className="table-category-text">
                      {categoryText(order)}
                    </span>
                  </td>

                  <td className="items-ordered-cell">
                    <span className="items-ordered-list">
                      {itemsOrdered(order)}
                    </span>
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

                  <td>{Number(quantity || 0).toLocaleString("en-IN")}</td>

                  <td>
                    {order.createdAt || order.orderDate
                      ? dayjs(order.createdAt || order.orderDate).format(
                          "DD MMM YYYY",
                        )
                      : "—"}
                  </td>

                  <td>
                    <Badge
                      bg={statusColor[status] || "secondary"}
                      className={`status-badge status-badge--${status}`}
                    >
                      {order.status || "pending"}
                    </Badge>
                  </td>

                  <td>
                    <Button
                      variant="outline-primary"
                      className="order-view-text-btn"
                      size="sm"
                      onClick={() => onViewOrder?.(order)}
                    >
                      View order
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>

      {pageCount > 1 && (
        <div className="orders-pagination recent-orders-pagination">
          <span>
            Showing {first}–{last} of {sortedOrders.length} entries
          </span>

          <div className="orders-pagination__controls">
            <Button
              variant="light"
              disabled={currentPage === 1}
              onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
            >
              Previous
            </Button>

            {Array.from({ length: pageCount }, (_, index) => index + 1)
              .slice(
                Math.max(0, currentPage - 3),
                Math.min(pageCount, currentPage + 2),
              )
              .map((pageNumber) => (
                <Button
                  key={pageNumber}
                  variant={pageNumber === currentPage ? "primary" : "light"}
                  className={pageNumber === currentPage ? "is-active" : ""}
                  onClick={() => onPageChange?.(pageNumber)}
                >
                  {pageNumber}
                </Button>
              ))}

            <Button
              variant="light"
              disabled={currentPage === pageCount}
              onClick={() =>
                onPageChange?.(Math.min(pageCount, currentPage + 1))
              }
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default RecentOrdersTable;
