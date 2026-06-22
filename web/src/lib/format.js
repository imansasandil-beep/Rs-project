/**
 * The API speaks in integer cents. Everything a person reads is produced here,
 * so rounding happens in exactly one place.
 */

const SYMBOLS = { LKR: 'Rs', INR: '₹', USD: '$', EUR: '€', GBP: '£', AUD: 'A$', JPY: '¥' };

export function currencySymbol(currency = 'LKR') {
  return SYMBOLS[currency] ?? currency;
}

/**
 * @param {number} cents
 * @param {object} [options]
 * @param {string} [options.currency]
 * @param {boolean} [options.showSign]  prefix a + on positive values
 * @param {boolean} [options.compact]   1.2M instead of 1,200,000
 * @param {boolean} [options.whole]     drop the cents — headline figures read
 *   better without a ".00" that is the same on every one of them, and the exact
 *   amount is always one click away in the transaction list
 */
export function formatMoney(
  cents,
  { currency = 'LKR', showSign = false, compact = false, whole = false } = {}
) {
  const value = (cents ?? 0) / 100;
  const sign = value < 0 ? '-' : showSign && value > 0 ? '+' : '';

  const fractionDigits = compact || whole ? 0 : 2;
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: compact ? 1 : fractionDigits,
    notation: compact ? 'compact' : 'standard',
  });

  // Non-breaking space: "Rs" must never end up on a different line to its figure.
  return `${sign}${currencySymbol(currency)}\u00a0${formatter.format(Math.abs(value))}`;
}

/** Bare number, no symbol — for table cells that already have a currency header. */
export function formatAmount(cents) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((cents ?? 0) / 100);
}

/** Cents to the plain string an <input> expects. */
export function centsToInput(cents) {
  if (cents === null || cents === undefined) return '';
  return (cents / 100).toFixed(2);
}

export function formatPercent(value, { showSign = false } = {}) {
  if (value === null || value === undefined) return '—';
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${Number(value).toFixed(Math.abs(value) < 10 ? 1 : 0)}%`;
}

const DAY_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const DAY_SHORT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const MONTH_FORMAT = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });
const MONTH_SHORT = new Intl.DateTimeFormat('en-GB', { month: 'short' });

/** `2026-06-27` → `27 Jun 2026`. Parsed as UTC so it never shifts a day. */
export function formatDay(day, { short = false } = {}) {
  if (!day) return '';
  const date = new Date(`${day}T00:00:00Z`);
  return (short ? DAY_SHORT : DAY_FORMAT).format(date);
}

/** `2026-06` → `June 2026`. */
export function formatMonth(month, { short = false } = {}) {
  if (!month) return '';
  const date = new Date(`${month}-01T00:00:00Z`);
  return (short ? MONTH_SHORT : MONTH_FORMAT).format(date);
}

/** "Today", "Yesterday", or the date — how a bank statement reads. */
export function formatRelativeDay(day, now = new Date()) {
  if (!day) return '';
  const todayKey = toDayKey(now);
  if (day === todayKey) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (day === toDayKey(yesterday)) return 'Yesterday';

  return formatDay(day, { short: new Date(`${day}T00:00:00Z`).getUTCFullYear() === now.getFullYear() });
}

export function toDayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function toMonthKey(date = new Date()) {
  return toDayKey(date).slice(0, 7);
}

export function addMonthKey(month, delta) {
  const [year, m] = month.split('-').map(Number);
  const total = year * 12 + (m - 1) + delta;
  return `${String(Math.floor(total / 12)).padStart(4, '0')}-${String((total % 12) + 1).padStart(2, '0')}`;
}

export function monthBounds(month) {
  const [year, m] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(lastDay).padStart(2, '0')}` };
}

export const ACCOUNT_TYPE_LABELS = {
  cash: 'Cash',
  bank: 'Bank account',
  card: 'Credit card',
  wallet: 'Wallet',
  savings: 'Savings',
};
