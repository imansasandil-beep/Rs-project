import { Router } from 'express';
import { validate, idParam, idField, amountField, monthField, z } from '../../lib/validate.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { getBudgets, setBudget, removeBudget, rolloverBudgets } from './budgets.service.js';

const listBudgetsSchema = z.object({ month: monthField.optional() });

const setBudgetSchema = z.object({
  categoryId: idField,
  month: monthField,
  amount: amountField,
});

const rolloverSchema = z.object({
  month: monthField,
  fromMonth: monthField.optional(),
});

export const budgetRoutes = Router();

budgetRoutes.use(requireAuth);

budgetRoutes.get('/', validate({ query: listBudgetsSchema }), (req, res) => {
  res.json(getBudgets(req.user.id, req.validatedQuery.month));
});

budgetRoutes.put('/', validate({ body: setBudgetSchema }), (req, res) => {
  res.json({ budget: setBudget(req.user.id, req.body) });
});

budgetRoutes.post('/rollover', validate({ body: rolloverSchema }), (req, res) => {
  res.json(rolloverBudgets(req.user.id, req.body.month, req.body.fromMonth));
});

budgetRoutes.delete('/:id', validate({ params: idParam }), (req, res) => {
  removeBudget(req.user.id, req.params.id);
  res.status(204).end();
});
