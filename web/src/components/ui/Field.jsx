import { useId } from 'react';
import './Field.css';

/**
 * Label, control and error message wired together. `aria-describedby` and
 * `aria-invalid` mean a screen reader announces the error with the input
 * instead of leaving it as unrelated red text somewhere on the page.
 */
export function Field({ label, error, hint, required = false, children, className = '' }) {
  const id = useId();
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ');

  return (
    <div className={`field ${error ? 'field--invalid' : ''} ${className}`.trim()}>
      <label className="field__label" htmlFor={id}>
        {label}
        {required && (
          <span className="field__required" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy || undefined,
        required,
      })}

      {hint && !error && (
        <p className="field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field__error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ className = '', ...rest }) {
  return <input className={`input ${className}`.trim()} {...rest} />;
}

export function Select({ className = '', children, ...rest }) {
  return (
    <div className="select-wrap">
      <select className={`input select ${className}`.trim()} {...rest}>
        {children}
      </select>
      <svg className="select__arrow" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

export function Textarea({ className = '', rows = 3, ...rest }) {
  return <textarea className={`input textarea ${className}`.trim()} rows={rows} {...rest} />;
}

/**
 * A money input. Kept as free text with `inputMode="decimal"` rather than
 * `type="number"`, which on many browsers lets a scroll wheel silently change
 * the amount and hides typos behind spinner arrows.
 */
export function AmountInput({ currencySymbol = 'Rs', className = '', ...rest }) {
  return (
    <div className="amount-input">
      <span className="amount-input__symbol" aria-hidden="true">
        {currencySymbol}
      </span>
      <input
        className={`input amount-input__control ${className}`.trim()}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.00"
        {...rest}
      />
    </div>
  );
}
