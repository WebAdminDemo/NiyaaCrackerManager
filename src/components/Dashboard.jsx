import { lazy, Suspense, useState, useMemo, memo, useCallback, useEffect, useRef } from 'react';
import {
  Container,
  Navbar,
  Button,
  Offcanvas,
  Row,
  Col,
  Badge,
  Image,
  Modal,
} from 'react-bootstrap';
import DashboardHome from './DashboardHome';
import ProductsManager from './ProductsManager';
import ThemeToggle from './ThemeToggle';
import AlertModal from './AlertModal';
import { useTheme } from '../context/ThemeContext';
import { getProducts } from './products/productsApi';;

const DASHBOARD_VIEW_KEY = 'dashboardView';
const VALID_VIEWS = ['dashboard', 'products', 'sales', 'orders'];
const SalesDashboard = lazy(() => import('../sales/SalesDashboard'));
const SalesOrders = lazy(() => import('../sales/SalesOrders'));

function getStoredView() {
  try {
    const saved = localStorage.getItem(DASHBOARD_VIEW_KEY);
    return VALID_VIEWS.includes(saved) ? saved : 'dashboard';
  } catch {
    return 'dashboard';
  }
}

function setStoredView(view) {
  try {
    localStorage.setItem(DASHBOARD_VIEW_KEY, view);
  } catch {}
}

function computeStats(products) {
  const total = products.length;
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];
  const outOfStock = products.filter((p) => p.status === 'no_stock').length;
  return { total, categories, outOfStock };
}

const NavButton = memo(function NavButton({ item, active, onClick }) {
  return (
    <Button
      variant={active ? 'primary' : 'outline-primary'}
      className={`mb-2 text-start w-100 d-flex align-items-center gap-2 ${active ? 'active' : ''}`}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
    >
      <i className={`bi ${item.icon} fs-5`} aria-hidden="true"></i>
      <span>{item.label}</span>
    </Button>
  );
});

const Dashboard = memo(function Dashboard() {
  const { darkMode } = useTheme();

  const [view, setView] = useState(() => getStoredView());
  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const [filterCategory, setFilterCategory] = useState(null);
  const [filterStatus, setFilterStatus] = useState(null);

  const [alert, setAlert] = useState({
    show: false,
    title: '',
    message: '',
    variant: 'info',
    confirmText: 'OK',
    onConfirm: null,
    showCancel: false,
    cancelText: 'Cancel',
    onCancel: null,
  });

  const [productStats, setProductStats] = useState({ total: 0, categories: [], outOfStock: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const hasFetchedOnce = useRef(false);

  const closeOffcanvas = useCallback(() => setShowOffcanvas(false), []);
  const toggleOffcanvas = useCallback(() => setShowOffcanvas((p) => !p), []);

  const handleNavClick = useCallback((key) => {
    if (!VALID_VIEWS.includes(key)) return;
    setView(key);
    setShowOffcanvas(false);
  }, []);

  const handleDesktopNavClick = useCallback((key) => {
    if (!VALID_VIEWS.includes(key)) return;
    setView(key);
  }, []);

  useEffect(() => {
    setStoredView(view);
  }, [view]);

  // --- THE FIX ---
  // Previously productStats only got set inside handleProductsLoaded, which is
  // passed to <ProductsManager>. That component only mounts when view === 'products',
  // so refreshing the page while on the dashboard (or landing there directly)
  // left productStats at its initial {0,[],0} state forever.
  // We now fetch stats independently as soon as Dashboard mounts, regardless of view.
  const fetchProductStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await getProducts(); // axios response
      const products = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setProductStats(computeStats(products));
    } catch (err) {
      console.error('Failed to fetch product stats:', err);
      // keep previous stats instead of forcing to 0 on a transient error
    } finally {
      setStatsLoading(false);
      hasFetchedOnce.current = true;
    }
  }, []);

  useEffect(() => {
    fetchProductStats();
  }, [fetchProductStats]);

  const navItems = useMemo(
    () => [
      { key: 'dashboard', label: 'Dashboard', icon: 'bi-grid' },
      { key: 'products', label: 'Products', icon: 'bi-box' },
      { key: 'sales', label: 'Sales', icon: 'bi-graph-up-arrow' },
      { key: 'orders', label: 'Orders', icon: 'bi-receipt-cutoff' },
    ],
    []
  );

  // ProductsManager still reports back its freshest list (e.g. after create/edit/delete)
  // so stats stay in sync without waiting for a full refetch.
  const handleProductsLoaded = useCallback((products) => {
    setProductStats(computeStats(products || []));
  }, []);

  const navigateToProductsWithFilter = useCallback((category, status) => {
    setFilterCategory(category || null);
    setFilterStatus(status || null);
    setView('products');
    setShowOffcanvas(false);
  }, []);

  const clearFilters = useCallback(() => {
    setFilterCategory(null);
    setFilterStatus(null);
  }, []);

  const navigateToProducts = useCallback(() => {
    clearFilters();
    setView('products');
    setShowOffcanvas(false);
  }, [clearFilters]);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showOutOfStockModal, setShowOutOfStockModal] = useState(false);

  const openCategoryModal = useCallback(() => setShowCategoryModal(true), []);
  const closeCategoryModal = useCallback(() => setShowCategoryModal(false), []);
  const openOutOfStockModal = useCallback(() => setShowOutOfStockModal(true), []);
  const closeOutOfStockModal = useCallback(() => setShowOutOfStockModal(false), []);

  const handleCategoryClick = useCallback((cat) => {
    navigateToProductsWithFilter(cat, null);
    closeCategoryModal();
  }, [navigateToProductsWithFilter, closeCategoryModal]);

  const handleViewOutOfStock = useCallback(() => {
    navigateToProductsWithFilter(null, 'no_stock');
    closeOutOfStockModal();
  }, [navigateToProductsWithFilter, closeOutOfStockModal]);

  const showAlert = useCallback((title, message, variant = 'info', confirmText = 'OK') => {
    setAlert({
      show: true,
      title,
      message,
      variant,
      confirmText,
      showCancel: false,
      onConfirm: () => setAlert((prev) => ({ ...prev, show: false })),
    });
  }, []);

  return (
    <>
      <Navbar
        bg={darkMode ? 'dark' : 'white'}
        variant={darkMode ? 'dark' : 'light'}
        className="border-bottom shadow-sm sticky-top"
        style={{ zIndex: 1050 }}
        expand="lg"
      >
        <Container fluid>
          <Navbar.Toggle
            aria-controls="dashboard-offcanvas"
            onClick={toggleOffcanvas}
            className="border-0 d-lg-none"
          />
          <Navbar.Brand className="d-flex align-items-center gap-2">
            <i className="bi bi-box-seam text-lavender" aria-hidden="true"></i>
            <span className="fw-semibold">Niyaa</span>
          </Navbar.Brand>
          <div className="d-flex align-items-center gap-2">
            <ThemeToggle />
            <Image
              src="https://ui-avatars.com/api/?name=Admin&background=6C5CE7&color=fff&size=32"
              roundedCircle
              alt="Admin"
              className="d-none d-sm-inline-block cursor-pointer"
              style={{ width: '32px', height: '32px' }}
              onClick={toggleOffcanvas}
              tabIndex={0}
              role="button"
              aria-label="Open dashboard menu"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleOffcanvas();
                }
              }}
            />
          </div>
        </Container>
      </Navbar>

      <Container fluid className="p-0">
        <Row className="g-0">
          <Col
            lg={2}
            className="d-none d-lg-block sidebar-desktop vh-100 overflow-auto"
            style={{
              background: darkMode ? '#1a1628' : '#ffffff',
              borderRight: `1px solid ${darkMode ? '#2d2d3f' : '#e9e4f0'}`,
            }}
          >
            <div className="d-flex flex-column p-3 h-100">
              {navItems.map((item) => (
                <NavButton
                  key={item.key}
                  item={item}
                  active={view === item.key}
                  onClick={() => handleDesktopNavClick(item.key)}
                />
              ))}
              <div className="mt-auto pt-4">
                <small className="text-muted d-block text-center">
                  <i className="bi bi-database me-1" aria-hidden="true"></i>
                  {productStats.total} products
                </small>
              </div>
            </div>
          </Col>

          <Col xs={12} lg={10} className="main-content">
            {view === 'dashboard' && (
              <DashboardHome
                totalProducts={productStats.total}
                totalCategories={productStats.categories.length}
                outOfStock={productStats.outOfStock}
                loading={statsLoading}
                onNavigateToProducts={navigateToProducts}
                onShowCategories={openCategoryModal}
                onShowOutOfStock={openOutOfStockModal}
              />
            )}

            {view === 'products' && (
              <ProductsManager
                filterCategory={filterCategory}
                filterStatus={filterStatus}
                onProductsLoaded={handleProductsLoaded}
                showAlert={showAlert}
              />
            )}

            {view === 'sales' && (
              <Suspense
                fallback={<div className="p-5 text-center text-muted">Loading sales dashboard...</div>}
              >
                <div className="p-3">
                  <SalesDashboard />
                </div>
              </Suspense>
            )}

            {view === 'orders' && (
              <Suspense fallback={<div className="p-5 text-center text-muted">Loading orders...</div>}>
                <SalesOrders />
              </Suspense>
            )}
          </Col>
        </Row>
      </Container>

      <Modal show={showCategoryModal} onHide={closeCategoryModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Categories</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {productStats.categories.length === 0 ? (
            <p className="text-muted">No categories found.</p>
          ) : (
            <ul className="list-group list-group-flush">
              {productStats.categories.map((cat, idx) => (
                <li
                  key={idx}
                  className="list-group-item d-flex justify-content-between align-items-center clickable-list-item"
                  onClick={() => handleCategoryClick(cat)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCategoryClick(cat);
                    }
                  }}
                >
                  {cat}
                  <Badge bg="secondary" pill>
                    {/* count not available here */}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeCategoryModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showOutOfStockModal} onHide={closeOutOfStockModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Out of Stock Products</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {productStats.outOfStock === 0 ? (
            <p className="text-muted">All products are in stock.</p>
          ) : (
            <>
              <p>Showing {productStats.outOfStock} products out of stock.</p>
              <div className="text-center mt-3">
                <Button variant="primary" onClick={handleViewOutOfStock}>
                  <i className="bi bi-eye me-1"></i> View All Out of Stock
                </Button>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeOutOfStockModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Offcanvas
        id="dashboard-offcanvas"
        show={showOffcanvas}
        onHide={closeOffcanvas}
        placement="start"
        style={{ width: '280px' }}
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>
            <i className="bi bi-box-seam me-2 text-lavender" aria-hidden="true"></i>
            Niyaa
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="d-flex flex-column mt-2">
          {navItems.map((item) => (
            <NavButton
              key={item.key}
              item={item}
              active={view === item.key}
              onClick={() => handleNavClick(item.key)}
            />
          ))}
          <div className="mt-auto pt-4">
            <small className="text-muted d-block text-center">
              <i className="bi bi-database me-1" aria-hidden="true"></i>
              {productStats.total} products
            </small>
          </div>
        </Offcanvas.Body>
      </Offcanvas>

      <AlertModal
        show={alert.show}
        onHide={() => setAlert((prev) => ({ ...prev, show: false }))}
        title={alert.title}
        message={alert.message}
        variant={alert.variant}
        confirmText={alert.confirmText}
        onConfirm={alert.onConfirm}
        showCancel={alert.showCancel}
        cancelText={alert.cancelText}
        onCancel={alert.onCancel}
      />
    </>
  );
});

export default Dashboard;