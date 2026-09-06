import { useState, useMemo } from "react";
import { Container, Row, Col, Spinner, Alert, Button } from "react-bootstrap";
import { motion } from "framer-motion";
import dayjs from "dayjs";

import { useSalesAnalytics } from "./hooks/useSalesAnalytics";
import SalesFilters from "./components/SalesFilters";
import KpiCards from "./components/KpiCards";
import RevenueAreaChart from "./components/RevenueAreaChart";
import CategoryDonutChart from "./components/CategoryDonutChart";
import ChannelPieChart from "./components/ChannelPieChart";
import TopProductsBarChart from "./components/TopProductsBarChart";
import CustomerAnalytics from "./components/CustomerAnalytics";
import RecentOrdersTable from "./components/RecentOrdersTable";
import OrderDetailsModal from "./components/OrderDetailsModal";
import { exportSalesExcel, exportSalesPdf } from "./utils/exportReports";

import "./sales.css";

const rangeFor = (period, year, month) => {
  const now = dayjs();
  if (period === "all") return {};
  const base =
    period === "custom"
      ? dayjs(`${year}-${String(month).padStart(2, "0")}-01`)
      : now;
  const ranges = {
    today: [base.startOf("day"), base.endOf("day")],
    week: [base.startOf("week"), base.endOf("week")],
    lastMonth: [
      base.subtract(1, "month").startOf("month"),
      base.subtract(1, "month").endOf("month"),
    ],
    month: [base.startOf("month"), base.endOf("month")],
    custom: [base.startOf("month"), base.endOf("month")],
  };
  const [from, to] = ranges[period] || ranges.month;
  return { from: from.format("YYYY-MM-DD"), to: to.format("YYYY-MM-DD") };
};

const SalesDashboard = () => {
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
  const [page, setPage] = useState(1);
  const [showOrderModal, setShowOrderModal] = useState(false);

  const requestFilters = useMemo(
    () => ({ ...rangeFor(period, customYear, customMonth), ...filters }),
    [period, customYear, customMonth, filters],
  );

  const { orders, analytics, loading, error, refresh, updateStatus } =
    useSalesAnalytics(requestFilters);

  const categories = useMemo(
    () =>
      [
        ...new Set(
          orders
            .flatMap((order) => order.items?.map((item) => item.category) || [])
            .filter(Boolean),
        ),
      ].sort(),
    [orders],
  );
  const channels = useMemo(
    () =>
      [...new Set(orders.map((order) => order.channel).filter(Boolean))].sort(),
    [orders],
  );

  const hasActiveFilters = useMemo(
    () =>
      filters.search || filters.status || filters.category || filters.channel,
    [filters],
  );

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ search: "", status: "", category: "", channel: "" });
    setPeriod("month");
    setPage(1);
  };

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    if (newPeriod === "custom") {
      setCustomYear(dayjs().year());
      setCustomMonth(dayjs().month() + 1);
    }
  };

  const openOrderModal = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const closeOrderModal = () => {
    setShowOrderModal(false);
    setSelectedOrder(null);
  };

  const dateLabel =
    period === "all"
      ? "All-time performance"
      : period === "custom"
        ? `${dayjs()
            .month(customMonth - 1)
            .format("MMMM")} ${customYear}`
        : period === "today"
          ? "Today"
          : period === "week"
            ? "This week"
            : period === "lastMonth"
              ? "Last month"
              : "This month";

  if (loading && !analytics) {
    return (
      <div className="sales-loading">
        <Spinner animation="border" />
        <span>Loading sales intelligence…</span>
      </div>
    );
  }
  if (error) {
    return (
      <Alert variant="danger" className="m-4">
        {error}{" "}
        <Button variant="link" onClick={refresh}>
          Try again
        </Button>
      </Alert>
    );
  }

  return (
    <Container fluid className="sales-dashboard py-4">
      <motion.header
        className="sales-hero"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div>
          <p className="eyebrow">NIYAA · SALES INTELLIGENCE</p>
          <h1>Sales at a glance</h1>
          <p>
            A live view of revenue, customer demand, and fulfilment momentum.
          </p>
        </div>
        <div className="sales-hero__actions">
          <Button
            variant="light"
            onClick={() => exportSalesExcel(orders, analytics)}
            disabled={!orders.length}
          >
            <i className="bi bi-file-earmark-spreadsheet me-2" />
            Excel
          </Button>
          <Button
            variant="outline-light"
            onClick={() => exportSalesPdf(orders, analytics, dateLabel)}
            disabled={!orders.length}
          >
            <i className="bi bi-file-earmark-pdf me-2" />
            PDF
          </Button>
        </div>
      </motion.header>

      <SalesFilters
        period={period}
        customYear={customYear}
        customMonth={customMonth}
        filters={filters}
        categories={categories}
        channels={channels}
        onPeriodChange={handlePeriodChange}
        onCustomDateChange={(year, month) => {
          setCustomYear(year);
          setCustomMonth(month);
          setPeriod("custom");
        }}
        onFilterChange={updateFilter}
      />

      <div className="sales-results-bar">
        <span>
          <i className="bi bi-funnel" /> {dateLabel} · {orders.length} visible
          orders
        </span>
        {hasActiveFilters && (
          <motion.button
            className="btn btn-outline-secondary reset-filters-btn"
            onClick={clearFilters}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <i className="bi bi-arrow-counterclockwise me-1" />
            Reset filters
          </motion.button>
        )}
      </div>

      <KpiCards analytics={analytics} />

      <Row className="g-3 sales-visuals">
        <Col xl={8}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <RevenueAreaChart orders={orders} />
          </motion.div>
        </Col>
        <Col xl={4}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <CategoryDonutChart data={analytics?.categoryRevenue || []} />
          </motion.div>
        </Col>
      </Row>

      <Row className="g-3 mt-2">
        <Col lg={4}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <ChannelPieChart data={analytics?.channelDistribution || {}} />
          </motion.div>
        </Col>
        <Col lg={8}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
          >
            <TopProductsBarChart products={analytics?.topProducts || []} />
          </motion.div>
        </Col>
      </Row>

      <Row className="g-3 mt-2">
        <Col lg={6}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <CustomerAnalytics topCustomers={analytics?.topCustomers || []} />
          </motion.div>
        </Col>
        <Col lg={6}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
          >
            <div className="category-revenue-list">
              <h6 className="fw-bold">Category Revenue</h6>
              <ul>
                {(analytics?.categoryRevenue || [])
                  .slice(0, 5)
                  .map(([cat, rev]) => (
                    <li key={cat}>
                      <span>{cat}</span>
                      <span>₹{rev.toLocaleString()}</span>
                    </li>
                  ))}
              </ul>
            </div>
          </motion.div>
        </Col>
      </Row>

      <RecentOrdersTable
        orders={orders}
        onViewOrder={openOrderModal}
        limit={6}
        page={page}
        onPageChange={setPage}
      />

      <OrderDetailsModal
        show={showOrderModal}
        onHide={closeOrderModal}
        order={selectedOrder}
        onStatusChange={updateStatus}
      />
    </Container>
  );
};

export default SalesDashboard;
