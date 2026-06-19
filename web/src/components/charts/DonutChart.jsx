import { useState } from 'react';
import './charts.css';

const SIZE = 160;
const STROKE = 22;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Category split as a ring. Drawn with stroke-dasharray on a single circle per
 * slice rather than arc paths — no trigonometry, and each slice stays a plain
 * element that can be hovered and focused.
 *
 * @param {{label: string, value: number, color: string}[]} props.data
 */
export function DonutChart({ data, total, centerLabel, centerValue, formatValue = String }) {
  const [active, setActive] = useState(null);

  const sum = total ?? data.reduce((acc, slice) => acc + slice.value, 0);
  if (sum <= 0) return <p className="chart__empty">Nothing to show yet.</p>;

  let offset = 0;
  const slices = data.map((slice) => {
    const fraction = slice.value / sum;
    const current = { ...slice, fraction, offset };
    offset += fraction;
    return current;
  });

  const highlighted = active === null ? null : slices[active];

  return (
    <div className="donut">
      <div className="donut__figure">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} role="img" aria-label={`${centerLabel}: ${centerValue}`}>
          {/* -90deg so the first slice starts at twelve o'clock. */}
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            {slices.map((slice, index) => (
              <circle
                key={slice.label}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={slice.color}
                strokeWidth={active === index ? STROKE + 4 : STROKE}
                strokeDasharray={`${slice.fraction * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                strokeDashoffset={-slice.offset * CIRCUMFERENCE}
                className="donut__slice"
                opacity={active === null || active === index ? 1 : 0.35}
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
              />
            ))}
          </g>
        </svg>

        <div className="donut__center">
          <span className="donut__center-label">{highlighted ? highlighted.label : centerLabel}</span>
          <span className="donut__center-value">
            {highlighted ? formatValue(highlighted.value) : centerValue}
          </span>
        </div>
      </div>

      <ul className="donut__legend">
        {slices.map((slice, index) => (
          <li key={slice.label}>
            <button
              type="button"
              className={`donut__legend-item ${active === index ? 'is-active' : ''}`}
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
            >
              <span className="donut__swatch" style={{ background: slice.color }} aria-hidden="true" />
              <span className="donut__legend-label">{slice.label}</span>
              <span className="donut__legend-value">{formatValue(slice.value)}</span>
              <span className="donut__legend-share">{(slice.fraction * 100).toFixed(0)}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
