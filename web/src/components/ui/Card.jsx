import './Card.css';

export function Card({ title, subtitle, actions, padded = true, className = '', children }) {
  return (
    <section className={`card ${className}`.trim()}>
      {(title || actions) && (
        <header className="card__header">
          <div className="card__heading">
            {title && <h3 className="card__title">{title}</h3>}
            {subtitle && <p className="card__subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="card__actions">{actions}</div>}
        </header>
      )}
      <div className={padded ? 'card__body' : ''}>{children}</div>
    </section>
  );
}

/**
 * A headline number with an optional change indicator.
 *
 * @param {'up-good'|'up-bad'|'neutral'} [props.tone] whether a rise is good news —
 *   income rising is green, spending rising is red, and the same arrow means both.
 */
export function StatCard({ label, value, change, tone = 'neutral', hint, icon }) {
  const direction = change === null || change === undefined ? null : change >= 0 ? 'up' : 'down';
  const sentiment =
    direction === null || tone === 'neutral'
      ? 'neutral'
      : (direction === 'up') === (tone === 'up-good')
        ? 'good'
        : 'bad';

  return (
    <div className="stat">
      <div className="stat__top">
        <span className="stat__label">{label}</span>
        {icon && <span className="stat__icon">{icon}</span>}
      </div>
      <p className="stat__value">{value}</p>
      {(direction || hint) && (
        <p className={`stat__meta stat__meta--${sentiment}`}>
          {direction && (
            <span aria-hidden="true">{direction === 'up' ? '▲' : '▼'}</span>
          )}
          {direction && `${Math.abs(change).toFixed(Math.abs(change) < 10 ? 1 : 0)}%`}
          {hint && <span className="stat__hint">{hint}</span>}
        </p>
      )}
    </div>
  );
}
