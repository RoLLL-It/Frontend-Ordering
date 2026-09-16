'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, RegisterFormData } from '@/lib/validation/schemas';
import { useAuth } from '@/components/providers/AuthProvider';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const { register: registerUser } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    defaultValues: {
      name: 'Heet Chovatiya',
      email: 'heet@example.com',
      phone: '9876543210',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await registerUser(data);
    } catch (err: any) {
      if (err.code === 'EMAIL_TAKEN') {
        setError('email', {
          message: 'This email is already registered. Log in instead?',
        });
      } else if (err.code === 'PHONE_TAKEN') {
        setError('phone', {
          message: 'This phone number is already registered.',
        });
      } else {
        setErrorMessage(err.message || 'Could not register. Try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full animate-in fade-in duration-200">
      {/* Back Button */}
      <div className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center justify-center p-2 rounded-full text-ink hover:bg-cream-light transition-colors"
          aria-label="Back to welcome page"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-ink tracking-tight">
          Create your account
        </h1>
        <p className="text-base text-ink-muted mt-1">Takes about a minute.</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Full name"
          placeholder="Heet Chovatiya"
          autoComplete="name"
          error={errors.name?.message}
          {...register('name')}
        />

        <Input
          label="Email"
          type="email"
          placeholder="heet@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Mobile number"
          type="tel"
          inputMode="numeric"
          prefixText="+91"
          placeholder="98765 43210"
          autoComplete="tel"
          error={errors.phone?.message}
          {...register('phone')}
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••"
          autoComplete="new-password"
          helperText="Must include a letter and a number"
          error={errors.password?.message}
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-1.5 text-ink-muted hover:text-ink focus:outline-none"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          }
          {...register('password')}
        />

        <Input
          label="Confirm password"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        {errorMessage && (
          <div
            role="alert"
            className="flex items-center gap-2 p-3 bg-error-bg text-error rounded-card border border-error/20 text-sm font-medium"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          isLoading={isSubmitting}
          className="w-full mt-3"
        >
          Create account
        </Button>
      </form>

      {/* Footer */}
      <div className="mt-6 text-center text-sm text-ink-muted">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-semibold text-primary-600 hover:text-primary-700 underline"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}

