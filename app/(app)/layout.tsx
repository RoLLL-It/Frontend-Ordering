'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { StickyCartBar } from '@/components/layout/StickyCartBar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex flex-col justify-center items-center p-6">
        <div className="w-12 h-12 rounded-full border-4 border-primary-200 border-t-primary-500 animate-spin mb-4" />
        <p className="text-sm font-semibold text-ink-muted">Loading your rolls...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header />
      <main className="flex-1 pb-24 md:pb-12 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-4">
        {children}
      </main>
      <StickyCartBar />
      <BottomNav />
    </div>
  );
}

