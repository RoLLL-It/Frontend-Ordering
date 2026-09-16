import { z } from 'zod';

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name is too short')
      .max(60, 'Name cannot exceed 60 characters'),
    email: z
      .string()
      .email('Enter a valid email')
      .transform((s) => s.toLowerCase()),
    phone: z
      .string()
      .transform((s) => s.replace(/\D/g, '').replace(/^91/, ''))
      .refine(
        (s) => /^[6-9]\d{9}$/.test(s),
        'Enter a valid 10-digit mobile number'
      ),
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Za-z]/, 'Must include a letter')
      .regex(/\d/, 'Must include a number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Enter your email or phone'),
  password: z.string().min(1, 'Enter your password'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const reviewSchema = z.object({
  rating: z.number().min(1, 'Please select a rating').max(5),
  comment: z.string().max(500, 'Comment cannot exceed 500 characters').optional().default(''),
});

export type ReviewFormData = z.infer<typeof reviewSchema>;

