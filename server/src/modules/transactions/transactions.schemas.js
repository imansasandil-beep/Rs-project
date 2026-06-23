import { z, idField, amountField, dayField, nameField, noteField } from '../../lib/validate.js';

export const direction = z.enum(['in', 'out']);

export const listTransactionsSchema = z
  .object({
    accountId: idField.optional(),
    categoryId: idField.optional(),
    direction: direction.optional(),
    from: dayField.optional(),
    to: dayField.optional(),
    search: z.string().trim().min(1).max(100).optional(),
    minAmount: amountField.optional(),
    maxAmount: amountField.optional(),
    uncategorized: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => value === 'true'),
    includeTransfers: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .refine((f) => !f.from || !f.to || f.from <= f.to, {
    message: 'Must be on or after the start date',
    path: ['to'],
  })
  .refine(
    (f) => f.minAmount === undefined || f.maxAmount === undefined || f.minAmount <= f.maxAmount,
    {
      message: 'Must be at least the minimum amount',
      path: ['maxAmount'],
    }
  );

export const createTransactionSchema = z.object({
  accountId: idField,
  categoryId: idField.nullish(),
  direction,
  amount: amountField,
  occurredOn: dayField,
  payee: nameField.nullish(),
  note: noteField.nullish(),
});

export const updateTransactionSchema = z
  .object({
    accountId: idField.optional(),
    categoryId: idField.nullish(),
    direction: direction.optional(),
    amount: amountField.optional(),
    occurredOn: dayField.optional(),
    payee: nameField.nullish(),
    note: noteField.nullish(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');

export const createTransferSchema = z
  .object({
    fromAccountId: idField,
    toAccountId: idField,
    amount: amountField,
    occurredOn: dayField,
    note: noteField.nullish(),
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: 'Must be a different account than the source',
    path: ['toAccountId'],
  });
