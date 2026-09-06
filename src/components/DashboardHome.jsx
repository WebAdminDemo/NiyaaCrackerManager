import { useMemo, memo } from 'react';
import { Row, Col, Card, Spinner } from 'react-bootstrap';

const DashboardHome = memo(function DashboardHome({
  totalProducts = 0,
  totalCategories = 0,
  outOfStock = 0,
  loading = false,
  onNavigateToProducts,
  onShowCategories,
  onShowOutOfStock,
}) {
  const stats = useMemo(
    () => [
      {
        key: 'total-products',
        label: 'Total Products',
        value: totalProducts,
        icon: 'bi-box',
        color: 'primary',
        onClick: onNavigateToProducts,
      },
      {
        key: 'categories',
        label: 'Categories',
        value: totalCategories,
        icon: 'bi-tags',
        color: 'success',
        onClick: onShowCategories,
      },
      {
        key: 'out-of-stock',
        label: 'Out of Stock',
        value: outOfStock,
        icon: 'bi-exclamation-triangle',
        color: 'danger',
        onClick: onShowOutOfStock,
      },
    ],
    [totalProducts, totalCategories, outOfStock, onNavigateToProducts, onShowCategories, onShowOutOfStock]
  );

  return (
    <>
      <div className="d-flex align-items-center gap-2 mb-4">
        <i className="bi bi-house-door fs-4 text-primary-custom" aria-hidden="true"></i>
        <span className="pt-3"><h4 className="mb-0 fw-semibold">Dashboard</h4></span>
      </div>
      <Row className="g-3">
        {stats.map((stat) => (
          <Col xs={6} md={4} lg={3} key={stat.key}>
            <Card
              className="stat-card stat-card-light h-100 clickable-stat"
              onClick={stat.onClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  stat.onClick?.();
                }
              }}
            >
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="text-muted small fw-medium">{stat.label}</div>
                    <div className="h2 fw-bold mt-1 mb-0">
                      {loading ? (
                        <Spinner animation="border" size="sm" role="status" aria-label="Loading" />
                      ) : (
                        stat.value
                      )}
                    </div>
                  </div>
                  <div
                    className={`text-${stat.color} opacity-75`}
                    style={{ fontSize: '2.4rem', lineHeight: 1 }}
                    aria-hidden="true"
                  >
                    <i className={`bi ${stat.icon}`}></i>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );
});

export default DashboardHome;