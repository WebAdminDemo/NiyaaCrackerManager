import React, { useMemo } from "react";
import { Card } from "react-bootstrap";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#6C5CE7", "#00B894", "#0984E3", "#E17055", "#F5B301", "#D63384"];

const ChannelPieChart = ({ data }) => {
  const chartData = useMemo(
    () =>
      Object.entries(data || {})
        .map(([name, value]) => ({ name, value: Number(value) || 0 }))
        .filter((entry) => entry.value > 0),
    [data],
  );
  const total = chartData.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <Card className="chart-container channel-chart">
      <Card.Body>
        <div className="chart-heading">
          <div>
            <p className="chart-eyebrow">Order mix</p>
            <h6>Orders by channel</h6>
          </div>
        </div>
        {!chartData.length ? (
          <div className="sales-chart-empty">No channel data available</div>
        ) : (
          <div className="channel-chart-grid">
            <div className="channel-chart-visual">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius="58%"
                    outerRadius="84%"
                    dataKey="value"
                    paddingAngle={3}
                    cornerRadius={6}
                    isAnimationActive="auto"
                    animationDuration={850}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value} orders`, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="radial-center-label">
                <strong>{total.toLocaleString("en-IN")}</strong>
                <span>Total orders</span>
              </div>
            </div>
            <div className="channel-legend">
              {chartData.map((entry, index) => {
                const pct = total ? Math.round((entry.value / total) * 100) : 0;
                return (
                  <div className="channel-legend__item" key={entry.name} title={entry.name}>
                    <span className={`chart-color chart-color-${index}`} />
                    <span className="channel-legend__name">{entry.name}</span>
                    <strong>{pct}%</strong>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default ChannelPieChart;
