'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginFormData } from '@/lib/validation/schemas';
import { useAuth } from '@/components/providers/AuthProvider';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Eye, EyeOff, AlertCircle } from 'lucide-react';

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || undefined;
  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: 'heet@example.com',
      password: 'password123',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await login(data, next);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Email/phone or password is incorrect.'
      );
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

      {/* Hero Logo */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative w-36 h-36 mb-2">
          <Image
            src="/logo.png"
            alt="Roll-IT"
            fill
            sizes="144px"
            className="object-contain"
            priority
          />
        </div>
        <h1 className="font-display text-3xl font-bold text-ink tracking-tight text-center">
          Welcome back
        </h1>
        <p className="text-base text-ink-muted mt-1">Log in to order.</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email or phone"
          placeholder="heet@example.com"
          autoComplete="username"
          error={errors.identifier?.message}
          {...register('identifier')}
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="•••••••••"
          autoComplete="current-password"
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

        {/* Generic Error Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="flex items-center gap-2 p-3 bg-error-bg text-error rounded-card border border-error/20 text-sm font-medium animate-in fade-in"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          isLoading={isSubmitting}
          className="w-full mt-2"
        >
          Log in
        </Button>
      </form>

      {/* Footer Links */}
      <div className="mt-6 flex flex-col items-center gap-3 text-sm">
        <button
          type="button"
          disabled
          className="text-ink-subtle hover:underline cursor-not-allowed"
          title="Contact kitchen to reset your password"
        >
          Forgot password? Contact the kitchen.
        </button>

        <p className="text-ink-muted">
          New here?{' '}
          <Link
            href="/register"
            className="font-semibold text-primary-600 hover:text-primary-700 underline"
          >
            Create an account
          </Link>
        </p>

        {/* Quick demo credentials toggle */}
        <div className="mt-4 p-3 bg-cream-light border border-line rounded-card text-xs text-ink-muted text-center w-full">
          <p className="font-semibold text-ink mb-1">Demo Accounts available:</p>
          <p>Customer: <span className="font-mono">heet@example.com</span> / any password</p>
          <p>Staff: <span className="font-mono">ramesh@rollit.app</span> / any password</p>
          <p>Admin: <span className="font-mono">admin@rollit.app</span> / any password</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-sm font-semibold text-ink-muted">
          Loading login...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

