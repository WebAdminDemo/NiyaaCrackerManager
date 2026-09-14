
import { useCallback, useMemo, useState } from "react";
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
import {
  exportSalesExcel,
  exportSalesPdf,
  exportSingleOrderPdf,
} from "./utils/exportReports";
import { salesApi } from "./salesApi";
import "./sales.css";

const PAGE_SIZE = 10;

const statusColor = {
  order_received: "info",
  pending: "warning",
  processing: "info",
  packaging: "secondary",
  shipped: "primary",
  delivered: "success",
  cancelled: "danger",
};

const statusLabel = (value) =>
  String(value || "order_received")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

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
    from: start ? start.toISOString() : undefined,
    to: end ? end.toISOString() : undefined,
  };
};

const partyDetails = (order) => ({
  name: order.partyName || order.customerName || "",
  number: order.partyNumber || order.customerPhone || "",
  sector: order.partySector || order.location || "",
  country: order.partyCountry || "",
  state: order.partyState || "",
  district: order.partyDistrict || "",
  locality: order.partyLocality || "",
  pincode: order.partyPincode || "",
  address:
    order.partyAddress ||
    order.customerAddress ||
    order.customer?.address ||
    "",
});

const itemsOrdered = (order) => {
  const items = order.items || [];

  if (!items.length) return "";

  return items
    .map((item) => {
      const brand =
        item.brand ||
        (Array.isArray(item.brands) && item.brands.length
          ? item.brands[0]
          : "");

      const name = item.name || item.productName || item.title || "";

      return [brand, name].filter(Boolean).join(" / ") +
        ` ×${Number(item.quantity || 0).toLocaleString("en-IN")}`;
    })
    .join("\n");
};

const totalQuantity = (order) =>
  Number(
    order.totalQuantity ??
      (order.items || []).reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0,
      ),
  );

const money = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const SalesOrders = () => {
  const { darkMode } = useTheme();

  const [period, setPeriod] = useState("month");
  const [customYear, setCustomYear] = useState(dayjs().year());
  const [customMonth, setCustomMonth] = useState(dayjs().month() + 1);

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    category: "",
    brand: "",
  });

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [initialEditMode, setInitialEditMode] = useState(false);
  const [page, setPage] = useState(1);

  const dateRange = useMemo(
    () => getPeriodDates(period, customYear, customMonth),
    [period, customYear, customMonth],
  );

  const apiFilters = useMemo(
    () => ({ ...dateRange, ...filters }),
    [dateRange, filters],
  );

  const { orders, loading, refreshing, error, refresh, updateStatus } =
    useSalesAnalytics(apiFilters, {
      includeAnalytics: false,
    });

  const categories = useMemo(() => {
    const values = new Set();

    orders.forEach((order) =>
      order.items?.forEach((item) => {
        if (item.category) values.add(item.category);
      }),
    );

    return Array.from(values).sort();
  }, [orders]);

  const brands = useMemo(() => {
    const values = new Set();

    orders.forEach((order) =>
      order.items?.forEach((item) => {
        const brand = item.brand || item.brands?.[0];
        if (brand) values.add(brand);
      }),
    );

    return Array.from(values).sort();
  }, [orders]);

  const pageCount = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));

  const currentPage = Math.min(page, pageCount);

  const visibleOrders = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;

    return orders.slice(start, start + PAGE_SIZE);
  }, [orders, currentPage]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
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

  const openOrder = useCallback((order, editMode = false) => {
    setSelectedOrder(order);
    setInitialEditMode(editMode);
    setShowModal(true);
  }, []);

  const closeOrder = useCallback(() => {
    setShowModal(false);
    setSelectedOrder(null);
    setInitialEditMode(false);
  }, []);

  const handleOrderSave = useCallback(
    async (orderId, details, items) => {
      const updated = await salesApi.updateOrder(orderId, details, items);

      setSelectedOrder(updated);
      await refresh(true);
      return updated;
    },
    [refresh],
  );

  const handleStatusUpdate = useCallback(
    async (orderId, newStatus) => {
      const updated = await updateStatus(orderId, newStatus);
      setSelectedOrder(updated);
      return updated;
    },
    [updateStatus],
  );

  const clearFilters = useCallback(() => {
    setFilters({
      search: "",
      status: "",
      category: "",
      brand: "",
    });
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
          <p>Review, edit and print customer orders.</p>
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

      <SalesFilters
        period={period}
        customYear={customYear}
        customMonth={customMonth}
        filters={filters}
        categories={categories}
        brandsStatus={brands}
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
            <div className="orders-export-actions">
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => exportSalesPdf(orders, null, "Sales Orders")}
                disabled={!orders.length}
              >
                <i className="bi bi-file-earmark-pdf me-1" />
                Print PDF
              </Button>

              <Button
                variant="outline-success"
                size="sm"
                onClick={() => exportSalesExcel(orders, null)}
                disabled={!orders.length}
              >
                <i className="bi bi-file-earmark-excel me-1" />
                Print Excel
              </Button>
            </div>

            {refreshing && (
              <span className="sales-refreshing">
                <Spinner size="sm" animation="border" /> Updating...
              </span>
            )}

            {(filters.search ||
              filters.status ||
              filters.category ||
              filters.brand ||
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
            Some data could not be refreshed. Showing the last successful
            result.
          </div>
        )}

        <div className="table-responsive">
          <Table hover className="align-middle mb-0 sales-all-orders-table">
            <thead>
              <tr>
                <th>Edit</th>
                <th>Order ID</th>
                <th>Party Details</th>
                <th>Brand</th>
                <th>Category</th>
                <th>Items Ordered</th>
                <th>Total Quantity</th>
                <th>Amount</th>
                <th>Ordered Date</th>
                <th>Status</th>
                <th>View Order</th>
                <th>PDF</th>
              </tr>
            </thead>

            <tbody>
              {visibleOrders.map((order) => {
                const status = String(
                  order.status || "order_received",
                ).toLowerCase();
                const party = partyDetails(order);

                return (
                  <tr key={order.id}>
                    <td className="order-action-cell">
                      <Button
                        variant="outline-primary"
                        className="order-edit-btn"
                        size="sm"
                        onClick={() => openOrder(order, true)}
                        title="Edit order"
                        aria-label={`Edit order ${order.ref || order.id}`}
                      >
                        <i className="bi bi-pencil-square" />
                      </Button>
                    </td>

                    <td>
                      <code className="order-ref">
                        {order.ref || String(order.id).slice(-8)}
                      </code>
                    </td>

                    <td className="party-details-cell">
                      <div>
                        {party.name && (
                          <strong>Party Name: {party.name}</strong>
                        )}
                        {party.number && (
                          <span>Party Contact: {party.number}</span>
                        )}
                        {party.sector && <span>Location: {party.sector}</span>}
                        {party.country && <span>Country: {party.country}</span>}
                        {party.state && <span>State: {party.state}</span>}
                        {party.district && (
                          <span>District: {party.district}</span>
                        )}
                        {party.locality && (
                          <span>Town/City/Village: {party.locality}</span>
                        )}
                        {party.pincode && <span>Pincode: {party.pincode}</span>}
                        {party.address && (
                          <span className="party-address-line">
                            Address: {party.address}
                          </span>
                        )}
                      </div>
                    </td>
                      <td>
                      <span className="text-center table-category-text">
                        {[
                          ...new Set(
                            (order.items || [])
                              .map(
                                (item) =>
                                  item.brand ||
                                  (Array.isArray(item.brands)
                                    ? item.brands[0]
                                    : ""),
                              )
                              .filter(Boolean),
                          ),
                        ].join(", ")}
                      </span>
                    </td>
                    <td>
                      <span className="table-category-text">
                        {[
                          ...new Set(
                            (order.items || [])
                              .map((item) => item.category)
                              .filter(Boolean),
                          ),
                        ].join(", ")}
                      </span>
                    </td>

                    <td className="items-ordered-cell">
                      <span className="items-ordered-list">
                        {itemsOrdered(order)}
                      </span>
                    </td>

                    <td className="text-center total-quantity-cell">
                      <strong>
                        {totalQuantity(order).toLocaleString("en-IN")}
                      </strong>
                    </td>

                    <td className="amount">{money(order.totalAmount)}</td>

                    <td>
                      {order.orderDate || order.createdAt
                        ? dayjs(order.orderDate || order.createdAt).format(
                            "DD MMM YYYY",
                          )
                        : ""}
                    </td>

                    <td>
                      <Badge
                        bg={statusColor[status] || "secondary"}
                        className={`status-badge status-badge--${status}`}
                      >
                        {statusLabel(status)}
                      </Badge>
                    </td>

                    <td className="order-action-cell">
                      <Button
                        variant="outline-secondary"
                        className="order-view-text-btn"
                        size="sm"
                        onClick={() => openOrder(order, false)}
                      >
                        <i className="bi bi-eye me-1" />
                        View Order
                      </Button>
                    </td>

                    <td className="order-action-cell">
                      <Button
                        variant="outline-danger"
                        className="order-pdf-btn"
                        size="sm"
                        onClick={() => exportSingleOrderPdf(order)}
                        title="Print order PDF"
                        aria-label={`Print PDF for ${order.ref || order.id}`}
                      >
                        <i className="bi bi-file-earmark-pdf" />
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
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, orders.length)} of{" "}
              {orders.length} entries
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
        onOrderSave={handleOrderSave}
        onStatusChange={handleStatusUpdate}
        initialEditMode={initialEditMode}
      />
    </Container>
  );
};

export default SalesOrders;
