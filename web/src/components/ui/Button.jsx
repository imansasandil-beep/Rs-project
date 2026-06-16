import './Button.css';

/**
 * @param {object} props
 * @param {'primary'|'secondary'|'ghost'|'danger'} [props.variant]
 * @param {'sm'|'md'} [props.size]
 * @param {boolean} [props.loading]  disables and swaps the label for a spinner
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  disabled = false,
  icon = null,
  children,
  className = '',
  ...rest
}) {
  return (
    <button
      type="button"
      className={`btn btn--${variant} btn--${size} ${className}`.trim()}
      disabled={disabled || loading}
      // Screen readers should hear that the button is busy, not just that it
      // stopped responding.
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="btn__spinner" aria-hidden="true" /> : icon}
      {children && <span className="btn__label">{children}</span>}
    </button>
  );
}

/** A button that is only an icon still needs an accessible name. */
export function IconButton({ label, children, className = '', ...rest }) {
  return (
    <Button
      className={`btn--icon ${className}`.trim()}
      variant="ghost"
      aria-label={label}
      title={label}
      {...rest}
    >
      {children}
    </Button>
  );
}
