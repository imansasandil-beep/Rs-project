import { z, nameField } from '../../lib/validate.js';
import { toMinorUnits } from '../../lib/money.js';

export const accountType = z.enum(['cash', 'bank', 'card', 'wallet', 'savings']);

/**
 * Unlike a transaction amount, an opening balance may be zero or negative — a
 * credit card usually starts life owing money.
 */
const openingBalanceField = z.union([z.string(), z.number()]).transform((value, ctx) => {
  try {
    return toMinorUnits(value);
  } catch (err) {
    ctx.addIssue({ code: 'custom', message: err.message });
    return z.NEVER;
  }
});

export const listAccountsSchema = z.object({
  includeArchived: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export const createAccountSchema = z.object({
  name: nameField,
  type: accountType,
  openingBalance: openingBalanceField.default(0),
});

export const updateAccountSchema = z
  .object({
    name: nameField.optional(),
    type: accountType.optional(),
    openingBalance: openingBalanceField.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');

export const archiveAccountSchema = z.object({
  archived: z.boolean(),
});
