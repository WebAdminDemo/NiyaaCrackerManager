// src/sales/components/TopProductsBarChart.jsx
import React, { useMemo } from "react";
import { Card } from "react-bootstrap";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const PRODUCT_COLORS = [
  "#2196F3",
  "#FF4B16",
  "#FFD21F",
  "#00B894",
  "#6C5CE7",
  "#D63384",
];

const currency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;

  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className="top-products-tooltip">
      <div className="tooltip-label">{item.fullName}</div>
      <div className="tooltip-value">{currency(item.revenue)}</div>
    </div>
  );
};

const TopProductsBarChart = ({ products }) => {
  // Show the top six products.
  const data = useMemo(() => {
    const safeProducts = Array.isArray(products) ? products : [];

    return safeProducts.slice(0, 6).map((product) => {
      const fullName = product.name || "Unnamed product";

      return {
        fullName,
        name:
          fullName.length > 15
            ? `${fullName.slice(0, 15)}…`
            : fullName,
        revenue: Number(product.revenue || 0),
      };
    });
  }, [products]);

  return (
    <Card className="chart-container top-products-chart">
      <Card.Body>
        <div className="chart-heading">
          <div>
            <p className="chart-eyebrow">PRODUCT PERFORMANCE</p>
            <h6>Top products by revenue</h6>
          </div>
          {data.length > 0 && (
            <span className="chart-meta">Top {data.length}</span>
          )}
        </div>

        {!data.length ? (
          <div className="sales-chart-empty">
            No product revenue data available
          </div>
        ) : (
          <div className="top-products-chart-area">
            <ResponsiveContainer width="100%" height={285}>
              <BarChart
                layout="horizontal"
                data={data}
                margin={{ top: 12, right: 12, left: 4, bottom: 12 }}
                barCategoryGap="18%"
              >
                <CartesianGrid
                  stroke="var(--sd-border)"
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  tick={{
                    fill: "var(--sd-text-3)",
                    fontSize: 11,
                  }}
                  height={42}
                />

                <YAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  width={50}
                  tick={{
                    fill: "var(--sd-text-3)",
                    fontSize: 11,
                  }}
                  tickFormatter={(value) =>
                    value >= 1000
                      ? `₹${Math.round(value / 1000)}K`
                      : `₹${value}`
                  }
                />

                <Tooltip
                  cursor={{ fill: "var(--sd-chart-hover)" }}
                  content={<CustomTooltip />}
                />

                <Bar
                  dataKey="revenue"
                  radius={[9, 9, 2, 2]}
                  barSize={34}
                  isAnimationActive
                  animationBegin={0}
                  animationDuration={550}
                  animationEasing="ease-out"
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={entry.fullName}
                      fill={PRODUCT_COLORS[index % PRODUCT_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default TopProductsBarChart;
