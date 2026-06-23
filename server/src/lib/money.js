/**
 * Money is an integer number of cents everywhere past the request boundary.
 * The client talks in whole rupees ("1250.50"), the database stores 125050,
 * and nothing in between ever sees a float it could round badly.
 */

/** Largest amount we accept: ~90 trillion rupees, comfortably inside 2^53. */
export const MAX_MINOR_UNITS = 9_007_199_254_740_00;

const AMOUNT_PATTERN = /^-?\d{1,15}(\.\d{1,2})?$/;

/**
 * Parses a user-supplied rupee amount into integer cents.
 *
 * @param {string|number} input
 * @returns {number} cents
 * @throws {RangeError} when the input is not a clean 2-decimal amount
 */
export function toMinorUnits(input) {
  const text = typeof input === 'number' ? String(input) : String(input ?? '').trim();

  if (!AMOUNT_PATTERN.test(text)) {
    throw new RangeError(`"${input}" is not an amount with at most two decimal places`);
  }

  const negative = text.startsWith('-');
  const [rupees, cents = ''] = text.replace('-', '').split('.');
  const minor = Number(rupees) * 100 + Number(cents.padEnd(2, '0'));

  if (minor > MAX_MINOR_UNITS) {
    throw new RangeError(`Amount ${input} is larger than this ledger supports`);
  }
  return negative ? -minor : minor;
}

/**
 * Renders cents back as a plain decimal string. Deliberately unlocalized —
 * grouping and the currency symbol are the client's job.
 *
 * @param {number} minor
 * @returns {string} e.g. "1250.50"
 */
export function toMajorUnits(minor) {
  const negative = minor < 0;
  const abs = Math.abs(Math.trunc(minor));
  const text = `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
  return negative ? `-${text}` : text;
}

/** Adds cents without letting a stray float sneak in. */
export function sumMinorUnits(values) {
  return values.reduce((total, value) => total + Math.trunc(value), 0);
}

/**
 * Splits `minor` into `parts` whole-cent shares, distributing the remainder to
 * the earliest shares so the result always adds back up to the original.
 */
export function splitMinorUnits(minor, parts) {
  if (!Number.isInteger(parts) || parts < 1)
    throw new RangeError('parts must be a positive integer');
  const base = Math.trunc(minor / parts);
  const remainder = minor - base * parts;
  return Array.from(
    { length: parts },
    (_, i) => base + (i < Math.abs(remainder) ? Math.sign(remainder) : 0)
  );
}
