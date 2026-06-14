import { Router } from 'express';
import express from 'express';
import { validate, z } from '../../lib/validate.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { today } from '../../lib/dates.js';
import { badRequest } from '../../lib/errors.js';
import { listTransactionsSchema } from './transactions.schemas.js';
import { exportTransactionsCsv, importTransactionsCsv } from './transactions.csv.js';

const importQuerySchema = z.object({
  createMissing: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  dryRun: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export const csvRoutes = Router();

csvRoutes.use(requireAuth);

csvRoutes.get('/export', validate({ query: listTransactionsSchema }), (req, res) => {
  const { limit, offset, ...filters } = req.validatedQuery;
  const csv = exportTransactionsCsv(req.user.id, filters);

  res.type('text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="rs-transactions-${today()}.csv"`);
  // Excel opens UTF-8 as the local codepage unless the file starts with a BOM,
  // which mangles any non-ASCII payee name.
  res.send(`﻿${csv}`);
});

csvRoutes.post(
  '/import',
  // The body arrives as a raw upload, not JSON, so it needs its own parser.
  express.text({ type: ['text/csv', 'text/plain'], limit: '5mb' }),
  validate({ query: importQuerySchema }),
  (req, res) => {
    if (typeof req.body !== 'string' || req.body.trim() === '') {
      throw badRequest('Send the CSV file as the request body with Content-Type: text/csv');
    }
    res.json(importTransactionsCsv(req.user.id, req.body, req.validatedQuery));
  }
);
