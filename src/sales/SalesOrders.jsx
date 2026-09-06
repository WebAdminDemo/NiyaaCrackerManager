// src/sales/SalesOrders.jsx
import React, { useCallback, useMemo, useState } from "react";
import {
  Container,
  Card,
  Table,
  Badge,
  Button,
  Spinner,
  Alert,
} from "react-bootstrap";
import dayjs from "dayjs";
import { useTheme } from "../context/ThemeContext";
import { useSalesAnalytics } from "./hooks/useSalesAnalytics";
import SalesFilters from "./components/SalesFilters";
import OrderDetailsModal from "./components/OrderDetailsModal";
import "./sales.css";

const PAGE_SIZE = 10;

const statusColor = {
  pending: "warning",
  processing: "info",
  packaging: "secondary",
  shipped: "primary",
  delivered: "success",
  cancelled: "danger",
};

const getPeriodDates = (period, customYear, customMonth) => {
  const now = dayjs();
  const selectedMonth = dayjs(
    `${customYear}-${String(customMonth).padStart(2, "0")}-01`,
  );

  let start = null;
  let end = null;

  switch (period) {
    case "today":
      start = now.startOf("day");
      end = now.endOf("day");
      break;
    case "week":
      start = now.startOf("week");
      end = now.endOf("week");
      break;
    case "month":
      start = now.startOf("month");
      end = now.endOf("month");
      break;
    case "lastMonth":
      start = now.subtract(1, "month").startOf("month");
      end = now.subtract(1, "month").endOf("month");
      break;
    case "custom":
      start = selectedMonth.startOf("month");
      end = selectedMonth.endOf("month");
      break;
    default:
      break;
  }

  return {
    startDate: start ? start.toISOString() : undefined,
    endDate: end ? end.toISOString() : undefined,
  };
};

const categoryText = (order) =>
  [
    ...new Set(
      (order.items || []).map((item) => item.category).filter(Boolean),
    ),
  ].join(", ") || "Uncategorised";

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

const SalesOrders = () => {
  const { darkMode } = useTheme();
  const [period, setPeriod] = useState("month");
  const [customYear, setCustomYear] = useState(dayjs().year());
  const [customMonth, setCustomMonth] = useState(dayjs().month() + 1);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    category: "",
    channel: "",
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);

  const dateRange = useMemo(
    () => getPeriodDates(period, customYear, customMonth),
    [period, customYear, customMonth],
  );

  const apiFilters = useMemo(
    () => ({ ...dateRange, ...filters }),
    [dateRange, filters],
  );

  const {
    orders,
    loading,
    refreshing,
    error,
    refresh,
    updateStatus,
  } = useSalesAnalytics(apiFilters, { includeAnalytics: false });

  const categories = useMemo(() => {
    const values = new Set();
    orders.forEach((order) =>
      order.items?.forEach((item) => {
        if (item.category) values.add(item.category);
      }),
    );
    return Array.from(values).sort();
  }, [orders]);

  const channels = useMemo(
    () =>
      [...new Set(orders.map((order) => order.channel).filter(Boolean))].sort(),
    [orders],
  );

  const pageCount = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleOrders = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return orders.slice(start, start + PAGE_SIZE);
  }, [orders, currentPage]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }, []);

  const handlePeriodChange = useCallback((value) => {
    setPeriod(value);
    setPage(1);

    if (value === "custom") {
      setCustomYear(dayjs().year());
      setCustomMonth(dayjs().month() + 1);
    }
  }, []);

  const handleCustomDateChange = useCallback((year, month) => {
    setCustomYear(year);
    setCustomMonth(month);
    setPeriod("custom");
    setPage(1);
  }, []);

  const openOrder = useCallback((order) => {
    setSelectedOrder(order);
    setShowModal(true);
  }, []);

  const closeOrder = useCallback(() => {
    setShowModal(false);
    setSelectedOrder(null);
  }, []);

  const handleStatusUpdate = useCallback(
    async (orderId, newStatus) => {
      const updated = await updateStatus(orderId, newStatus);
      setSelectedOrder(updated);
      return updated;
    },
    [updateStatus],
  );

  const clearFilters = useCallback(() => {
    setFilters({ search: "", status: "", category: "", channel: "" });
    setPeriod("month");
    setCustomYear(dayjs().year());
    setCustomMonth(dayjs().month() + 1);
    setPage(1);
  }, []);

  if (loading && !orders.length) {
    return (
      <Container
        fluid
        className="py-4 sales-orders-page"
        data-sales-theme={darkMode ? "dark" : "light"}
      >
        <div className="sales-loading">
          <Spinner animation="border" />
          <span>Loading orders...</span>
        </div>
      </Container>
    );
  }

  if (error && !orders.length) {
    return (
      <Container
        fluid
        className="py-4 sales-orders-page"
        data-sales-theme={darkMode ? "dark" : "light"}
      >
        <Alert variant="danger">
          <div>{error}</div>
          <Button variant="link" onClick={() => refresh(true)}>
            Try again
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container
      fluid
      className="py-4 sales-orders-page"
      data-sales-theme={darkMode ? "dark" : "light"}
    >
      <div className="orders-page-header">
        <div>
          <p className="orders-page-eyebrow">ORDER MANAGEMENT</p>
          <h4>All Orders</h4>
          <p>Search, review and update customer orders.</p>
        </div>

        <Button
          variant="outline-primary"
          className="orders-refresh-btn"
          onClick={() => refresh(true)}
          disabled={refreshing}
        >
          <i className="bi bi-arrow-clockwise me-1" />
          Refresh
        </Button>
      </div>

      {/* Filters use the same controls as the Sales dashboard. */}
      <SalesFilters
        period={period}
        customYear={customYear}
        customMonth={customMonth}
        filters={filters}
        categories={categories}
        channels={channels}
        onPeriodChange={handlePeriodChange}
        onCustomDateChange={handleCustomDateChange}
        onFilterChange={handleFilterChange}
      />

      <Card className="orders-table-card">
        <div className="orders-table-toolbar">
          <div>
            <strong>{orders.length.toLocaleString("en-IN")}</strong>
            <span> orders found</span>
          </div>

          <div className="orders-table-toolbar__right">
            {refreshing && (
              <span className="sales-refreshing">
                <Spinner size="sm" animation="border" /> Updating...
              </span>
            )}

            {(filters.search ||
              filters.status ||
              filters.category ||
              filters.channel ||
              period !== "month") && (
              <button
                type="button"
                className="orders-clear-btn"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {error && orders.length > 0 && (
          <div className="orders-inline-warning">
            Some data could not be refreshed. Showing the last successful result.
          </div>
        )}

        <div className="table-responsive">
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
                  order.totalQuantity ||
                  order.items?.reduce(
                    (sum, item) => sum + Number(item.quantity || 0),
                    0,
                  ) ||
                  0;

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
                        {order.channel || "Direct"}
                      </span>
                    </td>
                    <td className="amount">
                      ₹
                      {Number(order.totalAmount || 0).toLocaleString("en-IN")}
                    </td>
                    <td>{quantity.toLocaleString("en-IN")}</td>
                    <td>
                      {order.orderDate || order.createdAt
                        ? dayjs(order.orderDate || order.createdAt).format(
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
                        onClick={() => openOrder(order)}
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

        {orders.length === 0 && (
          <div className="sales-orders-empty">
            <i className="bi bi-inbox" />
            <strong>No orders found</strong>
            <span>Try changing the selected filters.</span>
          </div>
        )}

        {orders.length > 0 && (
          <div className="orders-pagination">
            <span>
              Showing {((currentPage - 1) * PAGE_SIZE) + 1}–
              {Math.min(currentPage * PAGE_SIZE, orders.length)} of {orders.length} entries
            </span>

            <div className="orders-pagination__controls">
              <Button
                variant="light"
                disabled={currentPage === 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
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
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </Button>
                ))}

              <Button
                variant="light"
                disabled={currentPage === pageCount}
                onClick={() =>
                  setPage((value) => Math.min(pageCount, value + 1))
                }
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      <OrderDetailsModal
        show={showModal}
        onHide={closeOrder}
        order={selectedOrder}
        onStatusChange={handleStatusUpdate}
      />
    </Container>
  );
};

export default SalesOrders;
