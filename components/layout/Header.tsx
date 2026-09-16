'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/components/providers/AuthProvider';
import { Bell, LogOut, ShieldAlert } from 'lucide-react';

export function Header() {
  const { user, isStaff, logout } = useAuth();

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <header className="sticky top-0 z-30 w-full bg-cream/95 backdrop-blur border-b border-line px-4 sm:px-6 py-3.5 flex items-center justify-between">
      <Link href="/home" className="flex items-center gap-2">
        <Image
          src="/logo.png"
          alt="Roll-IT"
          width={36}
          height={36}
          className="rounded-full object-cover"
          priority
        />
        <span className="font-display text-2xl font-bold text-primary-900 tracking-tight">
          Roll-<span className="text-primary-500">IT</span>
        </span>
      </Link>

      <div className="flex items-center gap-3 sm:gap-4">
        {isStaff && (
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider bg-primary-900 text-cream rounded-pill hover:bg-black transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-primary-400" />
            <span>Admin</span>
          </Link>
        )}

        <button
          type="button"
          className="p-2 rounded-full text-ink-muted hover:text-ink hover:bg-cream-light transition-colors relative"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary-500" />
        </button>

        {user ? (
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-full bg-primary-900 text-cream flex items-center justify-center font-bold text-sm shadow-sm select-none"
              title={user.name}
            >
              {initial}
            </div>
            <button
              onClick={() => logout()}
              type="button"
              className="p-2 text-ink-muted hover:text-error rounded-full transition-colors hidden sm:block"
              title="Log out"
              aria-label="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            Log in
          </Link>
        )}
      </div>
    </header>
  );
}

