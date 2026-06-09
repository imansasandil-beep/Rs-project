import { z, nameField, hexColorField } from '../../lib/validate.js';

export const categoryKind = z.enum(['income', 'expense']);

export const listCategoriesSchema = z.object({
  kind: categoryKind.optional(),
  includeArchived: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export const createCategorySchema = z.object({
  name: nameField,
  kind: categoryKind,
  color: hexColorField.optional(),
});

export const updateCategorySchema = z
  .object({
    name: nameField.optional(),
    color: hexColorField.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');

export const archiveCategorySchema = z.object({
  archived: z.boolean(),
});
