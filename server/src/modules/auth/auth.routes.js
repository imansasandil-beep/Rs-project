import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { validate } from '../../lib/validate.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { authRateLimit } from '../../middleware/rate-limit.js';
import { toPublicUser, updateUserProfile } from '../users/users.repository.js';
import { register, login, changePassword } from './auth.service.js';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
} from './auth.schemas.js';

export const authRoutes = Router();

authRoutes.post(
  '/register',
  authRateLimit,
  validate({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await register(req.body));
  })
);

authRoutes.post(
  '/login',
  authRateLimit,
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    res.json(await login(req.body));
  })
);

authRoutes.get('/me', requireAuth, (req, res) => {
  res.json({ user: toPublicUser(req.user) });
});

authRoutes.patch('/me', requireAuth, validate({ body: updateProfileSchema }), (req, res) => {
  res.json({ user: toPublicUser(updateUserProfile(req.user.id, req.body)) });
});

authRoutes.post(
  '/me/password',
  requireAuth,
  validate({ body: changePasswordSchema }),
  asyncHandler(async (req, res) => {
    await changePassword({ user: req.user, ...req.body });
    res.status(204).end();
  })
);
