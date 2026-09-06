import React, { useCallback, useMemo, useState } from "react";
// Sales dashboard entry point.
import { Container, Row, Col, Spinner, Alert, Button } from "react-bootstrap";
import dayjs from "dayjs";
import { useTheme } from "../context/ThemeContext";

import { useSalesAnalytics } from "./hooks/useSalesAnalytics";
import SalesFilters from "./components/SalesFilters";
import KpiCards from "./components/KpiCards";
import RevenueAreaChart from "./components/RevenueAreaChart";
import CategoryDonutChart from "./components/CategoryDonutChart";
import TopProductsBarChart from "./components/TopProductsBarChart";
import CustomerAnalytics from "./components/CustomerAnalytics";
import RecentOrdersTable from "./components/RecentOrdersTable";
import OrderDetailsModal from "./components/OrderDetailsModal";
import { exportSalesExcel, exportSalesPdf } from "./utils/exportReports";

import "./sales.css";

// Build the selected date range.
const rangeFor = (period, year, month) => {
  if (period === "all") return {};

  const now = dayjs();
  const selectedMonth = dayjs(
    `${year}-${String(month).padStart(2, "0")}-01`,
  );

  let base = period === "custom" ? selectedMonth : now;
  let from;
  let to;

  switch (period) {
    case "today":
      from = base.startOf("day");
      to = base.endOf("day");
      break;
    case "week":
      from = base.startOf("week");
      to = base.endOf("week");
      break;
    case "lastMonth":
      from = base.subtract(1, "month").startOf("month");
      to = base.subtract(1, "month").endOf("month");
      break;
    case "custom":
      from = selectedMonth.startOf("month");
      to = selectedMonth.endOf("month");
      break;
    case "month":
    default:
      from = base.startOf("month");
      to = base.endOf("month");
      break;
  }

  return {
    startDate: from.toISOString(),
    endDate: to.toISOString(),
  };
};

const SalesDashboard = ({
  onNavigateToOrders,
  onViewSoldProducts,
}) => {
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
  const [page, setPage] = useState(1);
  const [showOrderModal, setShowOrderModal] = useState(false);

  // Keep filter values stable between renders.
  const requestFilters = useMemo(
    () => ({
      ...rangeFor(period, customYear, customMonth),
      ...filters,
    }),
    [period, customYear, customMonth, filters],
  );

  const {
    orders,
    analytics,
    loading,
    refreshing,
    error,
    refresh,
    updateStatus,
  } = useSalesAnalytics(requestFilters, { includeAnalytics: true });

  // Build filter options from the loaded orders.
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

  const hasActiveFilters = Boolean(
    filters.search || filters.status || filters.category || filters.channel,
  );

  const updateFilter = useCallback((key, value) => {
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

  const clearFilters = useCallback(() => {
    setFilters({ search: "", status: "", category: "", channel: "" });
    setPeriod("month");
    setCustomYear(dayjs().year());
    setCustomMonth(dayjs().month() + 1);
    setPage(1);
  }, []);

  const dateLabel = useMemo(() => {
    if (period === "all") return "All-time performance";
    if (period === "custom") {
      return `${dayjs()
        .month(customMonth - 1)
        .format("MMMM")} ${customYear}`;
    }
    if (period === "today") return "Today";
    if (period === "week") return "This week";
    if (period === "lastMonth") return "Last month";
    return "This month";
  }, [period, customYear, customMonth]);

  // Open the order details modal.
  const openOrderModal = useCallback((order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  }, []);

  const closeOrderModal = useCallback(() => {
    setShowOrderModal(false);
    setSelectedOrder(null);
  }, []);

  if (loading && !analytics) {
    return (
      <div className="sales-loading">
        <Spinner animation="border" />
        <span>Loading sales intelligence...</span>
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <Alert variant="danger" className="sales-page-alert">
        <div>{error}</div>
        <Button variant="link" onClick={refresh}>
          Try again
        </Button>
      </Alert>
    );
  }

  return (
    <Container fluid className="sales-dashboard py-4" data-sales-theme={darkMode ? "dark" : "light"}>
      <header className="sales-hero">
        <div>
          <p className="eyebrow">NIYAA · SALES INTELLIGENCE</p>
          <h1>Sales at a glance</h1>
          <p>Live revenue, customer demand and fulfilment performance.</p>
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
      </header>

      <SalesFilters
        period={period}
        customYear={customYear}
        customMonth={customMonth}
        filters={filters}
        categories={categories}
        channels={channels}
        onPeriodChange={handlePeriodChange}
        onCustomDateChange={handleCustomDateChange}
        onFilterChange={updateFilter}
      />

      <div className="sales-results-bar">
        <span>
          <i className="bi bi-funnel" /> {dateLabel} · {orders.length} visible orders
        </span>

        <div className="sales-results-actions">
          {refreshing && (
            <span className="sales-refreshing">
              <Spinner size="sm" animation="border" /> Updating...
            </span>
          )}

          {hasActiveFilters && (
            <button className="btn reset-filters-btn" onClick={clearFilters}>
              <i className="bi bi-arrow-counterclockwise me-1" />
              Reset filters
            </button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="warning" className="sales-inline-alert">
          Some data could not be refreshed. Showing the last successful result.
        </Alert>
      )}

      <KpiCards
        analytics={analytics}
        orders={orders}
        onNavigateToOrders={onNavigateToOrders}
        onViewSoldProducts={onViewSoldProducts}
      />

      <Row className="g-3 sales-visuals">
        <Col xl={8}>
          <RevenueAreaChart orders={orders} />
        </Col>
        <Col xl={4}>
          <CategoryDonutChart data={analytics?.categoryRevenue || []} />
        </Col>
      </Row>

      <Row className="g-3 mt-2">
        <Col lg={12}>
          <TopProductsBarChart products={analytics?.topProducts || []} />
        </Col>
        
      </Row>

       <Row className="g-3 mt-2">
        
        <Col lg={12}>
          <CustomerAnalytics orders={orders} />
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
