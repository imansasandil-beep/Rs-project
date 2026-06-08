import { Router } from 'express';
import { authRoutes } from './modules/auth/auth.routes.js';

/** Single place every module's router gets mounted under /api. */
export function createRouter() {
  const router = Router();

  router.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: Math.round(process.uptime()) });
  });

  router.use('/auth', authRoutes);

  return router;
}
