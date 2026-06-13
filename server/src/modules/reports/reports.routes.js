import { Router } from 'express';
import { validate, dayField, monthField, z } from '../../lib/validate.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { currentMonth, monthBounds } from '../../lib/dates.js';
import {
  getOverview,
  getSpendingByCategory,
  getTrend,
  getDailySpend,
  getTopPayees,
  getBudgetProgress,
  getLedgerRange,
} from './reports.service.js';

/** Most report endpoints take a range; default it to the current month. */
const rangeSchema = z
  .object({
    from: dayField.optional(),
    to: dayField.optional(),
  })
  .transform((value) => {
    const bounds = monthBounds(currentMonth());
    return { from: value.from ?? bounds.start, to: value.to ?? bounds.end };
  })
  .refine((value) => value.from <= value.to, {
    message: 'Must be on or after the start date',
    path: ['to'],
  });

export const reportRoutes = Router();

reportRoutes.use(requireAuth);

reportRoutes.get('/overview', validate({ query: z.object({ month: monthField.optional() }) }), (req, res) => {
  res.json(getOverview(req.user.id, req.validatedQuery.month));
});

reportRoutes.get(
  '/by-category',
  validate({
    query: z
      .object({
        from: dayField.optional(),
        to: dayField.optional(),
        direction: z.enum(['in', 'out']).default('out'),
      })
      .transform((value) => {
        const bounds = monthBounds(currentMonth());
        return { ...value, from: value.from ?? bounds.start, to: value.to ?? bounds.end };
      }),
  }),
  (req, res) => {
    res.json(getSpendingByCategory(req.user.id, req.validatedQuery));
  }
);

reportRoutes.get(
  '/trend',
  validate({
    query: z.object({
      month: monthField.optional(),
      months: z.coerce.number().int().min(1).max(36).default(12),
    }),
  }),
  (req, res) => {
    res.json(getTrend(req.user.id, req.validatedQuery));
  }
);

reportRoutes.get('/daily', validate({ query: rangeSchema }), (req, res) => {
  res.json(getDailySpend(req.user.id, req.validatedQuery));
});

reportRoutes.get(
  '/top-payees',
  validate({
    query: z
      .object({
        from: dayField.optional(),
        to: dayField.optional(),
        limit: z.coerce.number().int().min(1).max(50).default(10),
      })
      .transform((value) => {
        const bounds = monthBounds(currentMonth());
        return { ...value, from: value.from ?? bounds.start, to: value.to ?? bounds.end };
      }),
  }),
  (req, res) => {
    res.json(getTopPayees(req.user.id, req.validatedQuery));
  }
);

reportRoutes.get(
  '/budget-progress',
  validate({ query: z.object({ month: monthField.optional() }) }),
  (req, res) => {
    res.json(getBudgetProgress(req.user.id, req.validatedQuery.month));
  }
);

reportRoutes.get('/range', (req, res) => {
  res.json(getLedgerRange(req.user.id));
});
