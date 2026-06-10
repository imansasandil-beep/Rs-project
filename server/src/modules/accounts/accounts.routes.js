import { Router } from 'express';
import { validate, idParam } from '../../lib/validate.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { totalBalance } from './accounts.repository.js';
import {
  getAccounts,
  getAccount,
  addAccount,
  editAccount,
  archiveAccount,
  removeAccount,
} from './accounts.service.js';
import {
  listAccountsSchema,
  createAccountSchema,
  updateAccountSchema,
  archiveAccountSchema,
} from './accounts.schemas.js';

export const accountRoutes = Router();

accountRoutes.use(requireAuth);

accountRoutes.get('/', validate({ query: listAccountsSchema }), (req, res) => {
  res.json({
    accounts: getAccounts(req.user.id, req.validatedQuery),
    totalBalance: totalBalance(req.user.id),
  });
});

accountRoutes.post('/', validate({ body: createAccountSchema }), (req, res) => {
  res.status(201).json({ account: addAccount(req.user.id, req.body) });
});

accountRoutes.get('/:id', validate({ params: idParam }), (req, res) => {
  res.json({ account: getAccount(req.user.id, req.params.id) });
});

accountRoutes.patch('/:id', validate({ params: idParam, body: updateAccountSchema }), (req, res) => {
  res.json({ account: editAccount(req.user.id, req.params.id, req.body) });
});

accountRoutes.put(
  '/:id/archived',
  validate({ params: idParam, body: archiveAccountSchema }),
  (req, res) => {
    res.json({ account: archiveAccount(req.user.id, req.params.id, req.body.archived) });
  }
);

accountRoutes.delete('/:id', validate({ params: idParam }), (req, res) => {
  removeAccount(req.user.id, req.params.id);
  res.status(204).end();
});
