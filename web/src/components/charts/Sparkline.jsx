import './charts.css';

const WIDTH = 300;
const HEIGHT = 72;
const PADDING = 4;

/**
 * A compact trend line with a soft fill underneath. `preserveAspectRatio="none"`
 * lets it stretch to any container width while the viewBox keeps the maths simple.
 *
 * @param {number[]} props.values
 */
export function Sparkline({ values, color = 'var(--accent)', label = 'Trend' }) {
  if (values.length < 2) return <div className="sparkline sparkline--empty" />;

  const peak = Math.max(...values);
  const floor = Math.min(...values, 0);
  const span = peak - floor || 1;

  const points = values.map((value, index) => {
    const x = PADDING + (index / (values.length - 1)) * (WIDTH - PADDING * 2);
    const y = HEIGHT - PADDING - ((value - floor) / span) * (HEIGHT - PADDING * 2);
    return [x, y];
  });

  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${points.at(-1)[0].toFixed(1)} ${HEIGHT} L${points[0][0].toFixed(1)} ${HEIGHT} Z`;
  const gradientId = `spark-${label.replace(/\W/g, '')}`;

  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={points.at(-1)[0]} cy={points.at(-1)[1]} r="3" fill={color} />
    </svg>
  );
}

/**
 * A labelled progress bar. Goes amber as the cap approaches and red past it, so
 * the colour alone answers "am I over?".
 */
export function ProgressBar({ value, max, label, caption, captionTone, formatValue = String }) {
  const ratio = max > 0 ? value / max : 0;
  const tone = ratio > 1 ? 'over' : ratio >= 0.85 ? 'near' : 'under';
  // The bar shows what has been spent; the caption may be warning about where
  // the month is heading. They can legitimately disagree, so the caption is
  // allowed its own colour rather than inheriting a reassuring green.
  const messageTone = captionTone ?? tone;

  return (
    <div className="progress">
      <div className="progress__top">
        <span className="progress__label">{label}</span>
        <span className="progress__value">
          {formatValue(value)} <span className="progress__max">/ {formatValue(max)}</span>
        </span>
      </div>

      <div
        className={`progress__track progress__track--${tone}`}
        role="progressbar"
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        {/* Clamped so a big overspend cannot overflow its container. */}
        <div className="progress__fill" style={{ width: `${Math.min(100, ratio * 100)}%` }} />
      </div>

      {caption && <p className={`progress__caption progress__caption--${messageTone}`}>{caption}</p>}
    </div>
  );
}
