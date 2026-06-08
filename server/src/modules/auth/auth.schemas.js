import { z, emailField, nameField } from '../../lib/validate.js';

/**
 * Length is the only rule worth enforcing on a password. Composition rules
 * ("one uppercase, one symbol") push people towards `Password1!` and are
 * explicitly discouraged by NIST SP 800-63B.
 */
const passwordField = z
  .string()
  .min(10, 'Must be at least 10 characters')
  .max(200, 'Cannot be longer than 200 characters');

export const registerSchema = z.object({
  email: emailField,
  name: nameField,
  password: passwordField,
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Must be a three-letter currency code')
    .default('LKR'),
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Cannot be blank'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Cannot be blank'),
    newPassword: passwordField,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'Must differ from the current password',
    path: ['newPassword'],
  });

export const updateProfileSchema = z
  .object({
    name: nameField.optional(),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, 'Must be a three-letter currency code')
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');
