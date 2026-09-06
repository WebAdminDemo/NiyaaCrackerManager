// src/sales/SalesOrders.jsx
import React, { useState, useMemo } from "react";
import {
  Container,
  Card,
  Table,
  Badge,
  Button,
  Spinner,
  Alert,
} from "react-bootstrap";
import { motion } from "framer-motion";
import { useSalesAnalytics } from "./hooks/useSalesAnalytics";
import SalesFilters from "./components/SalesFilters";
import OrderDetailsModal from "./components/OrderDetailsModal";
import dayjs from "dayjs";

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
  let start, end;
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
      start = dayjs(`${customYear}-${customMonth}-01`).startOf("month");
      end = dayjs(`${customYear}-${customMonth}-01`).endOf("month");
      break;
    default:
      start = null;
      end = null;
  }
  return {
    startDate: start?.toISOString() || null,
    endDate: end?.toISOString() || null,
  };
};

const categoryText = (order) =>
  [
    ...new Set(
      (order.items || []).map((item) => item.category).filter(Boolean),
    ),
  ].join(", ") || "Uncategorised";

/** Same as Excel / PDF export */
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

  const dateRange = useMemo(
    () => getPeriodDates(period, customYear, customMonth),
    [period, customYear, customMonth],
  );

  const apiFilters = useMemo(
    () => ({ ...dateRange, ...filters }),
    [dateRange, filters],
  );

  const { orders, loading, error, updateStatus } =
    useSalesAnalytics(apiFilters);

  const categories = useMemo(() => {
    const cats = new Set();
    orders.forEach((o) =>
      o.items?.forEach((i) => i.category && cats.add(i.category)),
    );
    return Array.from(cats).sort();
  }, [orders]);

  const channels = useMemo(() => {
    const ch = new Set();
    orders.forEach((o) => o.channel && ch.add(o.channel));
    return Array.from(ch).sort();
  }, [orders]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    await updateStatus(orderId, newStatus);
    setShowModal(false);
  };

  const openOrder = (order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Container fluid className="py-4">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4 sales-orders-page">
      <h4 className="fw-bold mb-4">All Orders</h4>

      {/* Filters — uses SalesFilters with solid dropdown styles */}
      <SalesFilters
        period={period}
        customYear={customYear}
        customMonth={customMonth}
        filters={filters}
        categories={categories}
        channels={channels}
        onPeriodChange={setPeriod}
        onCustomDateChange={(y, m) => {
          setCustomYear(y);
          setCustomMonth(m);
        }}
        onFilterChange={(key, value) =>
          setFilters((prev) => ({ ...prev, [key]: value }))
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="shadow-sm border-0 mt-3">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span className="text-muted small">
                {orders.length} result{orders.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="table-responsive">
              <Table
                bordered
                hover
                className="align-middle mb-0 sales-all-orders-table"
              >
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
                  {orders.map((order) => (
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
                      <td>{categoryText(order)}</td>
                      <td className="items-ordered-cell">
                        <span className="items-ordered-list">
                          {itemsOrdered(order)}
                        </span>
                      </td>
                      <td>{order.channel || "Direct"}</td>
                      <td className="amount">
                        ₹
                        {Number(order.totalAmount || 0).toLocaleString(
                          "en-IN",
                        )}
                      </td>
                      <td>
                        {order.totalQuantity ||
                          order.items?.reduce(
                            (sum, i) => sum + (i.quantity || 0),
                            0,
                          ) ||
                          0}
                      </td>
                      <td>
                        {order.orderDate || order.createdAt
                          ? dayjs(order.orderDate || order.createdAt).format(
                              "DD MMM YYYY",
                            )
                          : "—"}
                      </td>
                      <td>
                        <Badge
                          bg={
                            statusColor[order.status?.toLowerCase()] ||
                            "secondary"
                          }
                        >
                          {order.status || "pending"}
                        </Badge>
                      </td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => openOrder(order)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            {orders.length === 0 && (
              <p className="text-muted text-center py-4 mb-0">
                No orders found for these filters.
              </p>
            )}
          </Card.Body>
        </Card>
      </motion.div>

      <OrderDetailsModal
        show={showModal}
        onHide={() => setShowModal(false)}
        order={selectedOrder}
        onStatusChange={handleStatusUpdate}
      />

      {/* Table design: full borders, bold headers, multi-line items */}
      <style>{`
        .sales-all-orders-table {
          border-collapse: collapse;
          width: 100%;
        }
        .sales-all-orders-table th,
        .sales-all-orders-table td {
          border: 1px solid #E0E0E8 !important;
          vertical-align: top;
          padding: 0.75rem 0.85rem;
        }
        .sales-all-orders-table thead th {
          font-weight: 700 !important;
          background: #F6F5FD;
          color: #1C1B29;
          font-size: 0.8rem;
          letter-spacing: 0.02em;
          white-space: nowrap;
        }
        .sales-all-orders-table tbody td {
          font-size: 0.875rem;
          color: #1C1B29;
        }
        .sales-all-orders-table tbody tr:nth-child(even) {
          background: #FAFAFC;
        }
        .sales-all-orders-table .order-ref {
          font-size: 0.8rem;
          background: #F0EEFC;
          color: #4B3F9A;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
        }
        .sales-all-orders-table .amount {
          font-weight: 600;
          white-space: nowrap;
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
      `}</style>
    </Container>
  );
};

export default SalesOrders;