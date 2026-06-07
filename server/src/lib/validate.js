import { z } from 'zod';
import { unprocessable } from './errors.js';
import { toMinorUnits } from './money.js';
import { isDay, isMonth } from './dates.js';

/**
 * Parses `value` against `schema`, turning a Zod failure into a 422 whose
 * details are keyed by field path so the client can highlight inputs directly.
 */
export function parseOrThrow(schema, value, label = 'Request') {
  const result = schema.safeParse(value);
  if (result.success) return result.data;

  const details = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_';
    (details[key] ??= []).push(issue.message);
  }
  throw unprocessable(`${label} is not valid`, details);
}

/** Builds middleware that validates and *replaces* one part of the request. */
export function validate({ body, query, params }) {
  return (req, res, next) => {
    try {
      if (params) req.params = parseOrThrow(params, req.params, 'Path');
      if (query) req.validatedQuery = parseOrThrow(query, req.query, 'Query string');
      if (body) req.body = parseOrThrow(body, req.body ?? {}, 'Request body');
      next();
    } catch (err) {
      next(err);
    }
  };
}

/* ---------- Shared field schemas ---------- */

/** A rupee amount from the client, normalized to positive integer cents. */
export const amountField = z
  .union([z.string(), z.number()])
  .transform((value, ctx) => {
    try {
      return toMinorUnits(value);
    } catch (err) {
      ctx.addIssue({ code: 'custom', message: err.message });
      return z.NEVER;
    }
  })
  .refine((cents) => cents > 0, 'Amount must be greater than zero');

export const dayField = z.string().refine(isDay, 'Must be a real calendar date as YYYY-MM-DD');
export const monthField = z.string().refine(isMonth, 'Must be a calendar month as YYYY-MM');

export const idField = z.coerce.number().int().positive('Must be a positive id');
export const idParam = z.object({ id: idField });

export const nameField = z
  .string()
  .trim()
  .min(1, 'Cannot be blank')
  .max(60, 'Cannot be longer than 60 characters');

export const noteField = z.string().trim().max(500, 'Cannot be longer than 500 characters');

/** Lowercased so the unique index on users.email does the work. */
export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'Cannot be longer than 254 characters')
  .pipe(z.email('Must be a valid email address'));

export const hexColorField = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex colour like #22c55e');

export { z };
