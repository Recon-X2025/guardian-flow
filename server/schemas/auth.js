import { z } from 'zod';

export const signupSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format').max(255),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password too long'),
    fullName: z.string().min(1, 'Full name is required').max(255).trim(),
  }),
});

export const signinSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format').max(255),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refresh_token: z.string().uuid('Invalid refresh token'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format').max(255),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().uuid('Invalid reset token'),
    new_password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  }),
});
