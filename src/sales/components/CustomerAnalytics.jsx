import React, { useMemo } from "react";
import { Card } from "react-bootstrap";
import dayjs from "dayjs";
import { buildCustomers } from "./KpiDetailsModal";

const CustomerAnalytics = ({ orders = [] }) => {
  const customers = useMemo(
    () => buildCustomers(orders).slice(0, 10),
    [orders],
  );

  return (
    <Card className="customer-analytics">
      <Card.Body>
        <div className="chart-heading">
          <div>
            <p className="chart-eyebrow">Customer value</p>
            <h6>Top 10 customers</h6>
          </div>
          <span className="chart-meta">By purchase value</span>
        </div>

        {!customers.length ? (
          <div className="sales-chart-empty sales-chart-empty--small">
            No customer data available
          </div>
        ) : (
          <div className="customer-list">
            {customers.map((customer, index) => (
              <div className="customer-row" key={customer.key}>
                <div className={`customer-rank ${index < 3 ? "customer-rank--top" : ""}`}>
                  {index + 1}
                </div>

                <div className="customer-main">
                  <strong title={customer.name}>{customer.name}</strong>
                  <span>{customer.phone}</span>
                  <small>
                    {customer.orders} {customer.orders === 1 ? "order" : "orders"}
                    {customer.lastOrder
                      ? ` · ${dayjs(customer.lastOrder).format("DD MMM YYYY")}`
                      : ""}
                  </small>
                </div>

                <div className="customer-value">
                  <strong>
                    ₹{Number(customer.revenue || 0).toLocaleString("en-IN")}
                  </strong>
                  <span>{customer.units.toLocaleString("en-IN")} units</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default CustomerAnalytics;
