/**
 * Every date the ledger stores is a calendar day (`YYYY-MM-DD`) or a calendar
 * month (`YYYY-MM`) as a plain string. A transaction happened on a day, not at
 * an instant, so timezones are deliberately kept out of the data model.
 */

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^\d{4}-\d{2}$/;

export function isDay(value) {
  if (typeof value !== 'string' || !DAY_PATTERN.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1) return false;
  return d <= daysInMonth(y, m);
}

export function isMonth(value) {
  if (typeof value !== 'string' || !MONTH_PATTERN.test(value)) return false;
  const month = Number(value.slice(5));
  return month >= 1 && month <= 12;
}

export function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Today in the server's local timezone, as `YYYY-MM-DD`. */
export function today(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** The `YYYY-MM` a day belongs to. */
export function monthOf(day) {
  return day.slice(0, 7);
}

export function currentMonth(now = new Date()) {
  return monthOf(today(now));
}

/** Inclusive first and last day of a `YYYY-MM`. */
export function monthBounds(month) {
  const [year, m] = month.split('-').map(Number);
  return { start: `${month}-01`, end: `${month}-${String(daysInMonth(year, m)).padStart(2, '0')}` };
}

/** Shifts a `YYYY-MM` by whole months, forwards or backwards. */
export function addMonths(month, delta) {
  const [year, m] = month.split('-').map(Number);
  const total = year * 12 + (m - 1) + delta;
  return `${String(Math.floor(total / 12)).padStart(4, '0')}-${String((total % 12) + 1).padStart(2, '0')}`;
}

/** Shifts a `YYYY-MM-DD` by whole days. */
export function addDays(day, delta) {
  const [y, m, d] = day.split('-').map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + delta));
  return shifted.toISOString().slice(0, 10);
}

/** The `count` months ending at `month`, oldest first. */
export function lastMonths(month, count) {
  return Array.from({ length: count }, (_, i) => addMonths(month, i - (count - 1)));
}
