import { z } from 'zod';

// Password requirements
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_REQUIREMENTS = {
  minLength: PASSWORD_MIN_LENGTH,
  uppercase: true,
  lowercase: true,
  number: true,
  special: true,
};

// Password validation schema for signup
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character');

// Login schema (less strict - just check it's not empty)
export const loginPasswordSchema = z.string().min(1, 'Password is required');

// Signup schema with strong password
export const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address').max(254),
  password: passwordSchema,
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: loginPasswordSchema,
});

// Check individual password requirements
export function checkPasswordStrength(password: string): {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
  score: number;
} {
  const checks = {
    length: password.length >= PASSWORD_MIN_LENGTH,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;

  return { ...checks, score };
}

// Get strength label
export function getStrengthLabel(score: number): { label: string; color: string } {
  if (score <= 1) return { label: 'Very Weak', color: 'bg-destructive' };
  if (score === 2) return { label: 'Weak', color: 'bg-orange-500' };
  if (score === 3) return { label: 'Fair', color: 'bg-warning' };
  if (score === 4) return { label: 'Good', color: 'bg-lime-500' };
  return { label: 'Strong', color: 'bg-success' };
}
