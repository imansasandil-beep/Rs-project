import { Router } from 'express';
import { authRoutes } from './modules/auth/auth.routes.js';
import { categoryRoutes } from './modules/categories/categories.routes.js';
import { accountRoutes } from './modules/accounts/accounts.routes.js';
import { transactionRoutes } from './modules/transactions/transactions.routes.js';
import { budgetRoutes } from './modules/budgets/budgets.routes.js';
import { reportRoutes } from './modules/reports/reports.routes.js';

/** Single place every module's router gets mounted under /api. */
export function createRouter() {
  const router = Router();

  router.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: Math.round(process.uptime()) });
  });

  router.use('/auth', authRoutes);
  router.use('/accounts', accountRoutes);
  router.use('/categories', categoryRoutes);
  router.use('/transactions', transactionRoutes);
  router.use('/budgets', budgetRoutes);
  router.use('/reports', reportRoutes);

  return router;
}
