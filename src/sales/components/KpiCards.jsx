import React, { useMemo, useState } from "react";
import { Row, Col, Card } from "react-bootstrap";
import {
  IndianRupee,
  Package,
  Users,
  ShoppingCart,
  Clock,
  RefreshCw,
  PackageCheck,
  Truck,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
} from "lucide-react";
import KpiDetailsModal, {
  buildCustomers,
  buildSoldProducts,
} from "./KpiDetailsModal";

const METRICS = [
  {
    key: "totalRevenue",
    label: "Revenue",
    icon: IndianRupee,
    className: "revenue",
    clickable: false,
    format: (value) =>
      `₹${Number(value || 0).toLocaleString("en-IN", {
        maximumFractionDigits: 0,
      })}`,
  },
  {
    key: "totalOrders",
    label: "Orders",
    icon: Package,
    className: "orders",
    clickable: true,
    hint: "Open orders",
    format: (value) => Number(value || 0).toLocaleString("en-IN"),
  },
  {
    key: "totalCustomers",
    label: "Customers",
    icon: Users,
    className: "customers",
    clickable: true,
    hint: "View customers",
    format: (value) => Number(value || 0).toLocaleString("en-IN"),
  },
  {
    key: "totalQuantity",
    label: "Units Sold",
    icon: ShoppingCart,
    className: "units",
    clickable: true,
    hint: "View sold products",
    format: (value) => Number(value || 0).toLocaleString("en-IN"),
  },
];

const STATUS_CONFIG = {
  pending: { label: "Pending", icon: Clock, className: "pending" },
  processing: { label: "Processing", icon: RefreshCw, className: "processing" },
  packaging: { label: "Packaging", icon: PackageCheck, className: "packaging" },
  shipped: { label: "Shipped", icon: Truck, className: "shipped" },
  delivered: { label: "Delivered", icon: CheckCircle2, className: "delivered" },
  cancelled: { label: "Cancelled", icon: XCircle, className: "cancelled" },
};

const KpiCards = ({
  analytics,
  orders = [],
  onNavigateToOrders,
  onViewSoldProducts,
}) => {
  const [modalType, setModalType] = useState(null);

  const customers = useMemo(() => buildCustomers(orders), [orders]);
  const soldProducts = useMemo(() => buildSoldProducts(orders), [orders]);

  const totals = useMemo(
    () => ({
      totalRevenue: Number(analytics?.totalRevenue ?? 0),
      totalOrders: Number(analytics?.totalOrders ?? orders.length),
      totalCustomers: customers.length,
      totalQuantity: Number(
        analytics?.totalQuantity ??
          orders.reduce(
            (sum, order) =>
              sum +
              Number(
                order.totalQuantity ??
                  (order.items || []).reduce(
                    (itemSum, item) =>
                      itemSum + Number(item.quantity || 0),
                    0,
                  ),
              ),
            0,
          ),
      ),
    }),
    [analytics, orders, customers],
  );

  if (!analytics) return null;

  const openMetric = (key) => {
    if (key === "totalOrders") {
      onNavigateToOrders?.();
      return;
    }

    if (key === "totalCustomers") {
      setModalType("customers");
      return;
    }

    if (key === "totalQuantity") {
      setModalType("soldProducts");
    }
  };

  return (
    <>
      <Row className="g-3 mb-3 kpi-cards">
        {METRICS.map(({ key, label, icon: Icon, className, clickable, hint, format }) => (
          <Col xs={6} md={3} key={key}>
            <Card
              className={`metric-card metric-card--${className} h-100 ${clickable ? "metric-card--clickable" : ""}`}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              onClick={clickable ? () => openMetric(key) : undefined}
              onKeyDown={
                clickable
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openMetric(key);
                      }
                    }
                  : undefined
              }
            >
              <Card.Body>
                <div className="metric-card__content">
                  <div className="metric-label">{label}</div>
                  <div className="metric-value">{format(totals[key])}</div>
                  {clickable && (
                    <span className="metric-card__hint">
                      {hint}
                      <ArrowUpRight size={13} />
                    </span>
                  )}
                </div>
                <div className={`metric-icon metric-icon--${className}`}>
                  <Icon size={19} strokeWidth={2.25} />
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Row className="g-2 mb-3 status-cards">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const Icon = config.icon;
          return (
            <Col xs={4} md={2} key={status}>
              <Card className={`status-pill status-pill--${config.className}`}>
                <Card.Body>
                  <Icon size={17} />
                  <div className="status-label">{config.label}</div>
                  <div className="status-count">
                    {analytics.statusCounts?.[status] || 0}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

      <KpiDetailsModal
        type={modalType}
        show={Boolean(modalType)}
        onHide={() => setModalType(null)}
        orders={orders}
        onViewSoldProducts={onViewSoldProducts}
      />
    </>
  );
};

export default KpiCards;
