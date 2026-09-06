// src/sales/components/KpiCards.jsx
import React from "react";
import { Row, Col, Card } from "react-bootstrap";
import { motion } from "framer-motion";
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
} from "lucide-react";

const METRICS = [
  {
    key: "totalRevenue",
    label: "Revenue",
    icon: IndianRupee,
    accent: "#16A34A",
    tint: "#EAF9EF",
    format: (v) => `₹${Number(v).toLocaleString("en-IN")}`,
  },
  {
    key: "totalOrders",
    label: "Orders",
    icon: Package,
    accent: "#2563EB",
    tint: "#EAF2FE",
    format: (v) => Number(v).toLocaleString("en-IN"),
  },
  {
    key: "totalCustomers",
    label: "Customers",
    icon: Users,
    accent: "#7C3AED",
    tint: "#F2ECFE",
    format: (v) => Number(v).toLocaleString("en-IN"),
  },
  {
    key: "totalQuantity",
    label: "Units Sold",
    icon: ShoppingCart,
    accent: "#D97706",
    tint: "#FDF3E7",
    format: (v) => Number(v).toLocaleString("en-IN"),
  },
];

const STATUS_CONFIG = {
  pending: { label: "Pending", icon: Clock, color: "#B45309", bg: "#FEF6E7" },
  processing: { label: "Processing", icon: RefreshCw, color: "#1D4ED8", bg: "#EAF2FE" },
  packaging: { label: "Packaging", icon: PackageCheck, color: "#6D28D9", bg: "#F2ECFE" },
  shipped: { label: "Shipped", icon: Truck, color: "#0F766E", bg: "#E7F7F4" },
  delivered: { label: "Delivered", icon: CheckCircle2, color: "#15803D", bg: "#EAF9EF" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "#B91C1C", bg: "#FDEDED" },
};

const cardMotion = {
  whileHover: { y: -3, boxShadow: "0 12px 24px -12px rgba(15, 23, 42, 0.18)" },
  transition: { duration: 0.2, ease: "easeOut" },
};

const MetricCard = ({ label, value, icon: Icon, accent, tint }) => (
  <motion.div {...cardMotion} style={{ height: "100%" }}>
    <Card className="border-0 shadow-sm rounded-4 h-100 metric-card">
      <Card.Body className="d-flex align-items-center justify-content-between">
        <div>
          <div className="metric-label">{label}</div>
          <div className="metric-value">{value}</div>
        </div>
        <div className="metric-icon" style={{ background: tint, color: accent }}>
          <Icon size={20} strokeWidth={2.25} />
        </div>
      </Card.Body>
    </Card>
  </motion.div>
);

const StatusPill = ({ status, count }) => {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <Col xs={4} md={2}>
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        style={{ height: "100%" }}
      >
        <Card
          className="border-0 h-100 status-pill"
          style={{ background: cfg.bg }}
        >
          <Card.Body className="d-flex flex-column align-items-center text-center py-3">
            <Icon size={18} strokeWidth={2.25} color={cfg.color} />
            <div className="status-label" style={{ color: cfg.color }}>
              {cfg.label}
            </div>
            <div className="status-count" style={{ color: cfg.color }}>
              {count || 0}
            </div>
          </Card.Body>
        </Card>
      </motion.div>
    </Col>
  );
};

const KpiCards = ({ analytics }) => {
  if (!analytics) return null;

  const {
    totalRevenue = 0,
    totalOrders = 0,
    totalQuantity = 0,
    totalCustomers = 0,
    statusCounts = {},
  } = analytics;

  const values = { totalRevenue, totalOrders, totalQuantity, totalCustomers };

  return (
    <>
      <Row className="g-3 mb-3 kpi-cards">
        {METRICS.map((m) => (
          <Col xs={6} md={3} key={m.key}>
            <MetricCard
              label={m.label}
              value={m.format(values[m.key])}
              icon={m.icon}
              accent={m.accent}
              tint={m.tint}
            />
          </Col>
        ))}
      </Row>

      <Row className="g-2 mb-3 kpi-cards">
        {Object.keys(STATUS_CONFIG).map((status) => (
          <StatusPill
            key={status}
            status={status}
            count={statusCounts[status]}
          />
        ))}
      </Row>
    </>
  );
};

export default KpiCards;