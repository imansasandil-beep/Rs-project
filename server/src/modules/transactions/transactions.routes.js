import { Router } from 'express';
import { validate, idParam, z } from '../../lib/validate.js';
import { requireAuth } from '../../middleware/require-auth.js';
import {
  getTransactions,
  getTransaction,
  addTransaction,
  editTransaction,
  removeTransaction,
  addTransfer,
  getTransfer,
  removeTransfer,
} from './transactions.service.js';
import {
  listTransactionsSchema,
  createTransactionSchema,
  updateTransactionSchema,
  createTransferSchema,
} from './transactions.schemas.js';
import { csvRoutes } from './transactions.csv.routes.js';

const transferParam = z.object({ transferId: z.uuid('Must be a transfer id') });

export const transactionRoutes = Router();

// Mounted before requireAuth's siblings so the CSV router owns its own body parser.
transactionRoutes.use('/csv', csvRoutes);

transactionRoutes.use(requireAuth);

transactionRoutes.get('/', validate({ query: listTransactionsSchema }), (req, res) => {
  res.json(getTransactions(req.user.id, req.validatedQuery));
});

transactionRoutes.post('/', validate({ body: createTransactionSchema }), (req, res) => {
  res.status(201).json({ transaction: addTransaction(req.user.id, req.body) });
});

// Declared before /:id so "transfers" is never parsed as an id.
transactionRoutes.post('/transfers', validate({ body: createTransferSchema }), (req, res) => {
  res.status(201).json(addTransfer(req.user.id, req.body));
});

transactionRoutes.get('/transfers/:transferId', validate({ params: transferParam }), (req, res) => {
  res.json(getTransfer(req.user.id, req.params.transferId));
});

transactionRoutes.delete(
  '/transfers/:transferId',
  validate({ params: transferParam }),
  (req, res) => {
    res.json(removeTransfer(req.user.id, req.params.transferId));
  }
);

transactionRoutes.get('/:id', validate({ params: idParam }), (req, res) => {
  res.json({ transaction: getTransaction(req.user.id, req.params.id) });
});

transactionRoutes.patch(
  '/:id',
  validate({ params: idParam, body: updateTransactionSchema }),
  (req, res) => {
    res.json({ transaction: editTransaction(req.user.id, req.params.id, req.body) });
  }
);

transactionRoutes.delete('/:id', validate({ params: idParam }), (req, res) => {
  res.json(removeTransaction(req.user.id, req.params.id));
});
