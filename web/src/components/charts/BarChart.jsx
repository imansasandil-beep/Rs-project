import { useState } from 'react';
import './charts.css';

/**
 * Paired income/expense bars per month. Laid out with CSS grid rather than SVG
 * so the bars reflow on a narrow screen and the labels stay real text.
 *
 * @param {{month: string, income: number, expenses: number, net: number}[]} props.data
 */
export function BarChart({ data, formatValue = String, formatLabel = (m) => m }) {
  const [active, setActive] = useState(null);

  if (data.length === 0) return <p className="chart__empty">No activity in this period.</p>;

  // Scale to the tallest bar, never to zero — an all-empty chart would divide by it.
  const peak = Math.max(1, ...data.flatMap((point) => [point.income, point.expenses]));

  return (
    <div className="bars">
      <div className="bars__plot" style={{ '--columns': data.length }}>
        {data.map((point, index) => (
          <div
            key={point.month}
            className={`bars__group ${active === index ? 'is-active' : ''}`}
            onMouseEnter={() => setActive(index)}
            onMouseLeave={() => setActive(null)}
          >
            {active === index && (
              <div className="bars__tooltip" role="tooltip">
                <strong>{formatLabel(point.month)}</strong>
                <span className="bars__tooltip-row">
                  <span className="bars__dot bars__dot--in" /> In {formatValue(point.income)}
                </span>
                <span className="bars__tooltip-row">
                  <span className="bars__dot bars__dot--out" /> Out {formatValue(point.expenses)}
                </span>
                <span
                  className={`bars__tooltip-net ${point.net >= 0 ? 'is-positive' : 'is-negative'}`}
                >
                  Net {formatValue(point.net)}
                </span>
              </div>
            )}

            <div className="bars__pair">
              <div
                className="bars__bar bars__bar--in"
                style={{ height: `${(point.income / peak) * 100}%` }}
                title={`Income ${formatValue(point.income)}`}
              />
              <div
                className="bars__bar bars__bar--out"
                style={{ height: `${(point.expenses / peak) * 100}%` }}
                title={`Spending ${formatValue(point.expenses)}`}
              />
            </div>

            <span className="bars__label">{formatLabel(point.month)}</span>
          </div>
        ))}
      </div>

      <div className="chart__legend">
        <span>
          <span className="bars__dot bars__dot--in" /> Money in
        </span>
        <span>
          <span className="bars__dot bars__dot--out" /> Money out
        </span>
      </div>
    </div>
  );
}
