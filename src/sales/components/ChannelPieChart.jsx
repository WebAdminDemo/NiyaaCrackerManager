// src/sales/components/ChannelPieChart.jsx
import React from "react";
import { Card } from "react-bootstrap";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = [
  "#6c5ce7",
  "#00b894",
  "#fdcb6e",
  "#e17055",
  "#0984e3",
  "#fd79a8",
  "#a29bfe",
  "#00cec9",
];

/**
 * Orders-by-channel donut.
 *
 * Matches CategoryDonutChart: no in-slice labels (avoids overflow on
 * long channel names / narrow viewports). Category names live in a
 * legend below the chart; each row truncates with ellipsis (full name
 * on hover via `title`). A running total sits in the donut's center hole.
 */
const ChannelPieChart = ({ data }) => {
  const chartData = Object.entries(data || {}).map(([name, value]) => ({
    name,
    value: Number(value) || 0,
  }));

  const total = chartData.reduce((sum, entry) => sum + entry.value, 0);

  if (!chartData.length) {
    return (
      <Card className="chart-container">
        <Card.Body>
          <h6 className="fw-bold mb-3">Orders by Channel</h6>
          <div className="text-center text-muted py-4">
            <small>No channel data available</small>
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="chart-container donut-chart-container">
      <Card.Body>
        <h6 className="fw-bold mb-3">Orders by Channel</h6>

        <div className="donut-chart-wrap">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="62%"
                outerRadius="88%"
                dataKey="value"
                nameKey="name"
                paddingAngle={2}
                isAnimationActive
                // No in-slice `label` — names live in the legend below.
              >
                {chartData.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value} orders`, name]} />
            </PieChart>
          </ResponsiveContainer>

          <div className="donut-center-label" aria-hidden="true">
            <span className="donut-center-value">{total.toLocaleString("en-IN")}</span>
            <span className="donut-center-caption">Total</span>
          </div>
        </div>

        <ul className="donut-legend">
          {chartData
            .slice()
            .sort((a, b) => b.value - a.value)
            .map((entry) => {
              const pct = total ? Math.round((entry.value / total) * 100) : 0;
              const colorIndex = chartData.findIndex((d) => d.name === entry.name);
              return (
                <li
                  key={entry.name}
                  className="donut-legend-item"
                  title={`${entry.name} — ${entry.value} orders`}
                >
                  <span
                    className="donut-legend-dot"
                    style={{ background: COLORS[colorIndex % COLORS.length] }}
                  />
                  <span className="donut-legend-name">{entry.name}</span>
                  <span className="donut-legend-pct">{pct}%</span>
                </li>
              );
            })}
        </ul>
      </Card.Body>
    </Card>
  );
};

export default ChannelPieChart;