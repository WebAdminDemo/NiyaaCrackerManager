// src/sales/components/CustomerAnalytics.jsx
import React from "react";
import { Card } from "react-bootstrap";
import dayjs from "dayjs";

const CustomerAnalytics = ({ topCustomers }) => {
  // Safeguard: ensure topCustomers is an array
  const customers = Array.isArray(topCustomers) ? topCustomers : [];

  if (!customers.length) {
    return (
      <Card className="customer-analytics">
        <Card.Body>
          <h6 className="fw-bold">🏆 Best Customers</h6>
          <p className="text-muted small mt-2">No customer data available</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="customer-analytics">
      <Card.Body>
        <h6 className="fw-bold">🏆 Best Customers</h6>
        <ul className="list-unstyled">
          {customers.slice(0, 5).map((c, idx) => (
            <li key={c.phone || idx} className="list-group-item">
              <div>
                <span className="fw-bold me-1">#{idx + 1}</span>
                <strong>{c.name}</strong>
                <span className="text-muted small ms-2">
                  ({c.phone || "No phone"})
                </span>
              </div>
              <div>
                <span className="badge bg-primary me-1">{c.orders} orders</span>
                <span className="badge bg-success">
                  ₹{c.revenue.toLocaleString()}
                </span>
              </div>
              <div className="text-muted small">
                Last order: {dayjs(c.lastOrder).format("DD MMM YYYY")}
              </div>
            </li>
          ))}
        </ul>
      </Card.Body>
    </Card>
  );
};

export default CustomerAnalytics;
