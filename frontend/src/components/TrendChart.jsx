import { formatNumber } from "../api/format";

function buildPath(points, width, height) {
  if (points.length === 0) {
    return "";
  }

  return points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width;
      const y = height - point * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function TrendChart({ readings, field, stroke, unit, title }) {
  const values = readings
    .map((reading) => Number(reading[field]))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) {
    return (
      <div className="panel chart-panel">
        <div className="panel__header">
          <h3>{title}</h3>
        </div>
        <div className="empty-state">No trend data yet.</div>
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;
  const normalized = values.map((value) => (value - min) / spread);
  const path = buildPath(normalized, 280, 120);

  return (
    <div className="panel chart-panel">
      <div className="panel__header">
        <h3>{title}</h3>
        <span>{formatNumber(values.at(-1), unit)}</span>
      </div>
      <svg viewBox="0 0 280 120" className="trend-chart" aria-hidden="true">
        <path d={path} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div className="chart-scale">
        <span>{formatNumber(min, unit)}</span>
        <span>{formatNumber(max, unit)}</span>
      </div>
    </div>
  );
}

export default TrendChart;
