import { IconButton } from './ui/Button.jsx';
import { addMonthKey, formatMonth, toMonthKey } from '../lib/format.js';
import './MonthPicker.css';

/**
 * Previous / next stepper for a `YYYY-MM` value. Stepping past the current
 * month is disabled — a ledger has no data in the future, and an empty screen
 * reads as a bug rather than as "nothing has happened yet".
 */
export function MonthPicker({ value, onChange, allowFuture = false }) {
  const thisMonth = toMonthKey();
  const atLatest = !allowFuture && value >= thisMonth;

  return (
    <div className="month-picker">
      <IconButton label="Previous month" onClick={() => onChange(addMonthKey(value, -1))}>
        <svg
          viewBox="0 0 16 16"
          width="15"
          height="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <path d="M10 3 5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </IconButton>

      <span className="month-picker__value">{formatMonth(value)}</span>

      <IconButton
        label="Next month"
        onClick={() => onChange(addMonthKey(value, 1))}
        disabled={atLatest}
      >
        <svg
          viewBox="0 0 16 16"
          width="15"
          height="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <path d="m6 3 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </IconButton>

      {value !== thisMonth && (
        <button type="button" className="month-picker__today" onClick={() => onChange(thisMonth)}>
          This month
        </button>
      )}
    </div>
  );
}
