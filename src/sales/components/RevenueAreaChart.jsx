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
    const safeOrders = Array.isArray(orders) ? orders : [];
    if (safeOrders.length === 0) return [];

    const dailyMap = {};
    safeOrders.forEach((order) => {
      // Use orderDate or createdAt
      const date = dayjs(order.orderDate || order.createdAt).format(
        "YYYY-MM-DD",
      );
      if (!dailyMap[date]) {
        dailyMap[date] = { date, revenue: 0 };
      }
      dailyMap[date].revenue += order.totalAmount || 0;
    });

    return Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [orders]);

  if (data.length === 0) {
    return (
      <Card className="chart-container">
        <Card.Body>
          <h6 className="fw-bold mb-3">Daily Revenue</h6>
          <div className="text-center text-muted py-5">
            <small>No revenue data available for this period</small>
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="chart-container">
      <Card.Body>
        <h6 className="fw-bold mb-3">Daily Revenue</h6>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6c5ce7" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6c5ce7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              tickFormatter={(d) => dayjs(d).format("DD MMM")}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => `₹${v / 1000}k`}
            />
            <Tooltip
              formatter={(value) => [`₹${value.toLocaleString()}`, "Revenue"]}
              labelFormatter={(label) => dayjs(label).format("DD MMM YYYY")}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#6c5ce7"
              strokeWidth={2}
              fill="url(#colorRevenue)"
              fillOpacity={1}
              cursor="pointer"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card.Body>
    </Card>
  );
};

export default RevenueAreaChart;
