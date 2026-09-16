'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Star } from 'lucide-react';

export default function WelcomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/home');
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <main className="min-h-screen bg-cream flex flex-col items-center justify-between p-6 sm:p-8 max-w-md mx-auto text-center animate-in fade-in duration-300">
      <div className="w-full flex-1 flex flex-col items-center justify-center py-6">
        {/* Hero Logo Card */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 mb-6">
          <Image
            src="/logo.png"
            alt="Roll-IT - A roll that makes you feel whole"
            fill
            sizes="(max-width: 640px) 256px, 288px"
            className="object-contain drop-shadow-sm"
            priority
          />
        </div>

        {/* Brand Copy */}
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight mb-3 leading-tight">
          Fresh rolls, <br />
          straight to your desk.
        </h1>

        <p className="text-base sm:text-lg text-ink-muted max-w-xs font-medium">
          Made to order and delivered to LJ, TTECH and Strata.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="w-full flex flex-col gap-3.5 pb-6">
        <Link
          href="/register"
          className="w-full h-13 min-h-[52px] flex items-center justify-center bg-primary-500 hover:bg-primary-600 active:scale-[0.98] text-white font-semibold text-lg rounded-btn shadow-md transition-all duration-150"
        >
          Get started
        </Link>

        <Link
          href="/login"
          className="w-full h-13 min-h-[52px] flex items-center justify-center bg-surface border border-line-strong hover:bg-cream-light active:scale-[0.98] text-ink font-semibold text-lg rounded-btn shadow-sm transition-all duration-150"
        >
          Log in
        </Link>

        <Link
          href="/reviews"
          className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 pt-2 transition-colors"
        >
          <Star className="w-4 h-4 fill-primary-500 text-primary-500" />
          <span>4.6 from 57 reviews</span>
        </Link>
      </div>
    </main>
  );
}

