import React, { useMemo } from "react";
import { Card } from "react-bootstrap";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import dayjs from "dayjs";

const RevenueAreaChart = ({ orders }) => {
  const data = useMemo(() => {
    const map = new Map();

    (Array.isArray(orders) ? orders : []).forEach((order) => {
      const dateValue = order.orderDate || order.createdAt;
      if (!dateValue) return;

      const date = dayjs(dateValue).format("YYYY-MM-DD");
      map.set(date, (map.get(date) || 0) + Number(order.totalAmount || 0));
    });

    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({ date, revenue }));
  }, [orders]);

  return (
    <Card className="chart-container">
      <Card.Body>
        <div className="chart-heading">
          <div>
            <p className="chart-eyebrow">REVENUE TREND</p>
            <h6>Daily revenue</h6>
          </div>
          <span className="chart-meta">Selected period</span>
        </div>

        {!data.length ? (
          <div className="sales-chart-empty">No revenue data available</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="salesRevenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6c5ce7" stopOpacity={0.24} />
                  <stop offset="100%" stopColor="#6c5ce7" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--sd-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 9 }}
                tickFormatter={(value) => dayjs(value).format("DD MMM")}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 9 }}
                width={42}
                tickFormatter={(value) =>
                  value >= 1000 ? `₹${Math.round(value / 1000)}K` : `₹${value}`
                }
              />
              <Tooltip
                formatter={(value) => [
                  `₹${Number(value || 0).toLocaleString("en-IN")}`,
                  "Revenue",
                ]}
                labelFormatter={(value) => dayjs(value).format("DD MMM YYYY")}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#6c5ce7"
                strokeWidth={2.5}
                fill="url(#salesRevenueFill)"
                isAnimationActive
                animationDuration={650}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card.Body>
    </Card>
  );
};

export default RevenueAreaChart;
