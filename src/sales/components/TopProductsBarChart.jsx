// src/sales/components/TopProductsBarChart.jsx
import React from "react";
import { Card } from "react-bootstrap";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const currency = (v) =>
  `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="top-products-tooltip">
      <div className="tooltip-label">{label}</div>
      <div className="tooltip-value">{currency(payload[0].value)}</div>
    </div>
  );
};

const TopProductsBarChart = ({ products }) => {
  // Defensive: ensure products is an array, fallback to empty array
  const safeProducts = Array.isArray(products) ? products : [];

  // Take top 6, truncate names, map to chart data
  const data = safeProducts.slice(0, 6).map((p) => ({
    name: p.name?.length > 18 ? `${p.name.slice(0, 18)}…` : p.name || "Unnamed",
    revenue: p.revenue || 0,
  }));

  return (
    <Card className="chart-container border-0 shadow-sm rounded-4">
      <Card.Body>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h6 className="fw-bold mb-0" style={{ color: "#0F172A" }}>
            Top Products by Revenue
          </h6>
          {data.length > 0 && (
            <span className="text-muted" style={{ fontSize: "0.75rem" }}>
              Top {data.length}
            </span>
          )}
        </div>

        {data.length === 0 ? (
          <div className="text-center text-muted py-5">
            <small>No product revenue data available</small>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={230}>
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
              barCategoryGap={10}
            >
              <CartesianGrid horizontal={false} stroke="#EEF1F5" />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: "#64748B" }}
                tickFormatter={(v) => `₹${v}`}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: "#334155" }}
                width={100}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(108, 92, 231, 0.06)" }}
                content={<CustomTooltip />}
              />
              <Bar
                dataKey="revenue"
                fill="#6C5CE7" // brand color (matches dashboard theme)
                radius={[0, 6, 6, 0]} // rounded right corners
                barSize={16}
              />
            </BarChart>
          </ResponsiveContainer>
        )}

        <style>{`
          .top-products-tooltip {
            background: #0F172A;
            color: #fff;
            padding: 6px 10px;
            border-radius: 8px;
            font-size: 0.75rem;
            box-shadow: 0 8px 16px -8px rgba(15, 23, 42, 0.4);
          }
          .tooltip-label {
            font-weight: 600;
            margin-bottom: 2px;
          }
          .tooltip-value {
            color: #C4B5FD;
            font-weight: 700;
          }
        `}</style>
      </Card.Body>
    </Card>
  );
};

export default TopProductsBarChart;