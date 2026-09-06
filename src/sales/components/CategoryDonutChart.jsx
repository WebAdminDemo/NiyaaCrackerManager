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

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

const formatCompact = (value) => {
  const num = Number(value || 0);
  if (num >= 1_00_00_000) return `₹${(num / 1_00_00_000).toFixed(1)}Cr`;
  if (num >= 1_00_000) return `₹${(num / 1_00_000).toFixed(1)}L`;
  if (num >= 1_000) return `₹${(num / 1_000).toFixed(1)}K`;
  return formatCurrency(num);
};

/**
 * Revenue-by-category donut.
 *
 * FIX: the previous version rendered `${name} ${percent}%` directly on
 * each pie slice via the `label` prop. Long category names had nowhere
 * to go — on desktop they overlapped neighbouring slices, and on mobile
 * (narrower chart, same label length) they ran straight off the card.
 *
 * This version draws a clean, label-free donut and moves category names
 * into a legend below the chart. Each legend row truncates with an
 * ellipsis (full name available on hover via `title`) instead of
 * overflowing, and the list itself wraps/scrolls instead of pushing the
 * layout around. A running total sits in the donut's center hole.
 */
const CategoryDonutChart = ({ data }) => {
  const chartData = Array.isArray(data)
    ? data.map(([name, value]) => ({ name, value: Number(value) || 0 }))
    : [];

  const total = chartData.reduce((sum, entry) => sum + entry.value, 0);

  if (!chartData.length) {
    return (
      <Card className="chart-container">
        <Card.Body>
          <h6 className="fw-bold mb-3">Revenue by Category</h6>
          <div className="text-center text-muted py-4">
            <small>No category revenue data available</small>
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="chart-container donut-chart-container">
      <Card.Body>
        <h6 className="fw-bold mb-3">Revenue by Category</h6>

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
                // No in-slice `label` — names now live in the legend below,
                // which is what prevents the overflow/clipping.
              >
                {chartData.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [formatCurrency(value), name]}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="donut-center-label" aria-hidden="true">
            <span className="donut-center-value">{formatCompact(total)}</span>
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
                  title={`${entry.name} — ${formatCurrency(entry.value)}`}
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

export default CategoryDonutChart;