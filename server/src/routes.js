import { Router } from 'express';
import { healthRoutes } from './modules/health/health.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { categoryRoutes } from './modules/categories/categories.routes.js';
import { accountRoutes } from './modules/accounts/accounts.routes.js';
import { transactionRoutes } from './modules/transactions/transactions.routes.js';
import { budgetRoutes } from './modules/budgets/budgets.routes.js';
import { reportRoutes } from './modules/reports/reports.routes.js';

/** Single place every module's router gets mounted under /api. */
export function createRouter() {
  const router = Router();

  router.use('/health', healthRoutes);
  router.use('/auth', authRoutes);
  router.use('/accounts', accountRoutes);
  router.use('/categories', categoryRoutes);
  router.use('/transactions', transactionRoutes);
  router.use('/budgets', budgetRoutes);
  router.use('/reports', reportRoutes);

  return router;
}
