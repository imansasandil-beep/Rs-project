import './States.css';

/**
 * Shown when a list is legitimately empty. Always offers the action that would
 * fill it — an empty screen with no way forward is a dead end.
 */
export function EmptyState({ icon, title, message, action }) {
  return (
    <div className="empty">
      {icon && <div className="empty__icon">{icon}</div>}
      <h3 className="empty__title">{title}</h3>
      {message && <p className="empty__message">{message}</p>}
      {action && <div className="empty__action">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="empty empty--error" role="alert">
      <div className="empty__icon" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          width="28"
          height="28"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5v5.5M12 16.2v.3" strokeLinecap="round" />
        </svg>
      </div>
      <h3 className="empty__title">Could not load this</h3>
      <p className="empty__message">{error?.message ?? 'Something went wrong.'}</p>
      {onRetry && (
        <div className="empty__action">
          <button type="button" className="btn btn--secondary btn--md" onClick={onRetry}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

export function Spinner({ label = 'Loading' }) {
  return (
    <div className="spinner-wrap" role="status">
      <span className="spinner" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/**
 * Placeholder blocks matching the shape of the content being loaded, so the
 * layout does not jump when real data arrives.
 */
export function Skeleton({ rows = 3, height = 44 }) {
  return (
    <div className="skeleton" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton__row" style={{ height }} />
      ))}
    </div>
  );
}

/** Renders whichever of loading / error / empty / content applies. */
export function AsyncContent({ loading, error, onRetry, isEmpty, empty, skeleton, children }) {
  if (loading) return skeleton ?? <Spinner />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (isEmpty) return empty ?? null;
  return children;
}
