import { Router } from 'express';
import { validate, idParam } from '../../lib/validate.js';
import { requireAuth } from '../../middleware/require-auth.js';
import {
  getCategories,
  getCategory,
  addCategory,
  editCategory,
  archiveCategory,
  removeCategory,
} from './categories.service.js';
import {
  listCategoriesSchema,
  createCategorySchema,
  updateCategorySchema,
  archiveCategorySchema,
} from './categories.schemas.js';

export const categoryRoutes = Router();

categoryRoutes.use(requireAuth);

categoryRoutes.get('/', validate({ query: listCategoriesSchema }), (req, res) => {
  res.json({ categories: getCategories(req.user.id, req.validatedQuery) });
});

categoryRoutes.post('/', validate({ body: createCategorySchema }), (req, res) => {
  res.status(201).json({ category: addCategory(req.user.id, req.body) });
});

categoryRoutes.get('/:id', validate({ params: idParam }), (req, res) => {
  res.json({ category: getCategory(req.user.id, req.params.id) });
});

categoryRoutes.patch(
  '/:id',
  validate({ params: idParam, body: updateCategorySchema }),
  (req, res) => {
    res.json({ category: editCategory(req.user.id, req.params.id, req.body) });
  }
);

categoryRoutes.put(
  '/:id/archived',
  validate({ params: idParam, body: archiveCategorySchema }),
  (req, res) => {
    res.json({ category: archiveCategory(req.user.id, req.params.id, req.body.archived) });
  }
);

categoryRoutes.delete('/:id', validate({ params: idParam }), (req, res) => {
  removeCategory(req.user.id, req.params.id);
  res.status(204).end();
});
