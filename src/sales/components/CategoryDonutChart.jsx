import React, { useMemo } from "react";
import { Card } from "react-bootstrap";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = [
  "#2196F3",
  "#FF4B16",
  "#FFD21F",
  "#00B894",
  "#6C5CE7",
  "#D63384",
];

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const compact = (value) => {
  const num = Number(value || 0);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return money(num);
};

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;

  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className="category-pie-tooltip">
      <div className="category-pie-tooltip__title">
        <span className={`category-pie-tooltip__dot category-pie-color-${item.index % COLORS.length}`} />
        <span>{item.name}</span>
      </div>
      <strong>{money(item.value)}</strong>
      <small>{item.percentage.toFixed(1)}% of revenue</small>
    </div>
  );
};

const CategoryDonutChart = ({ data }) => {
  const chartData = useMemo(() => {
    const rows = Array.isArray(data)
      ? data
          .map(([name, value], index) => ({
            name: String(name || "Uncategorised"),
            value: Number(value) || 0,
            index,
          }))
          .filter((item) => item.value > 0)
          .sort((a, b) => b.value - a.value)
          .slice(0, 6)
      : [];

    const total = rows.reduce((sum, item) => sum + item.value, 0);

    return rows.map((item, index) => ({
      ...item,
      index,
      percentage: total ? (item.value / total) * 100 : 0,
    }));
  }, [data]);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="chart-container category-pie-chart">
      <Card.Body>
        <div className="chart-heading">
          <div>
            <p className="chart-eyebrow">Revenue mix</p>
            <h6>Category performance</h6>
          </div>
          {chartData.length > 0 && (
            <span className="category-pie-total">{compact(total)}</span>
          )}
        </div>

        {!chartData.length ? (
          <div className="sales-chart-empty">No category revenue data available</div>
        ) : (
          <>
            <div className="category-pie-chart-area">
              <ResponsiveContainer width="100%" height={255}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius="78%"
                    innerRadius={0}
                    startAngle={90}
                    endAngle={-270}
                    paddingAngle={0}
                    stroke="var(--sd-bg-card)"
                    strokeWidth={2}
                    isAnimationActive
                    animationBegin={80}
                    animationDuration={850}
                    animationEasing="ease-out"
                  >
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={COLORS[entry.index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} cursor={false} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="category-pie-list">
              {chartData.map((entry) => (
                <div className="category-pie-row" key={entry.name} title={entry.name}>
                  <span
                    className={`category-pie-color category-pie-color-${entry.index % COLORS.length}`}
                  />
                  <span className="category-pie-name">{entry.name}</span>
                  <strong className="category-pie-value">{compact(entry.value)}</strong>
                  <span className="category-pie-percent">
                    {entry.percentage.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default CategoryDonutChart;
