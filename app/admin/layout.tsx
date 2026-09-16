'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  CalendarDays,
  Users,
  LogOut,
  ExternalLink,
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isStaff, isAdmin, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Active orders count for badge
  const { data: stats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.getStats(),
    refetchInterval: 10_000,
  });

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/login?next=/admin');
      } else if (!isStaff) {
        router.replace('/home');
      }
    }
  }, [user, isStaff, isLoading, router]);

  if (isLoading || !isStaff) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold text-ink-muted">Verifying staff access...</p>
      </div>
    );
  }

  const navItems = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    {
      label: 'Orders',
      href: '/admin/orders',
      icon: ShoppingBag,
      badge: stats?.active_orders || 7,
    },
    { label: 'Menu', href: '/admin/menu', icon: UtensilsCrossed },
    { label: 'Slots', href: '/admin/slots', icon: CalendarDays },
    ...(isAdmin
      ? [{ label: 'Users', href: '/admin/users', icon: Users }]
      : []),
  ];

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'A';
  const roleLabel = isAdmin ? 'Owner' : 'Staff';

  return (
    <div className="min-h-screen bg-cream flex flex-col md:flex-row">
      {/* Desktop Sidebar (PDF Page 11 & 12) */}
      <aside className="w-64 bg-primary-900 text-cream flex-shrink-0 flex flex-col justify-between hidden md:flex border-r border-primary-800">
        <div>
          {/* Brand */}
          <div className="p-6 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Image
                src="/logo.png"
                alt="Roll-IT"
                width={32}
                height={32}
                className="rounded-full"
              />
              <span className="font-display text-2xl font-bold tracking-tight text-white">
                Roll-<span className="text-primary-400">IT</span>
              </span>
            </div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-primary-300 pl-10">
              ADMIN
            </span>
          </div>

          {/* Nav List */}
          <nav className="px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const isActive =
                item.href === '/admin'
                  ? pathname === '/admin'
                  : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-btn text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-800/80 text-white font-semibold'
                      : 'text-cream/80 hover:bg-primary-800/40 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-primary-300" />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary-500 text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            <div className="pt-4 mt-4 border-t border-primary-800">
              <Link
                href="/home"
                className="flex items-center gap-3 px-3.5 py-2 rounded-btn text-xs font-medium text-cream/70 hover:text-white hover:bg-primary-800/30 transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-primary-400" />
                <span>Customer storefront</span>
              </Link>
            </div>
          </nav>
        </div>

        {/* User Profile Footer (PDF Page 11 & 12) */}
        <div className="p-4 border-t border-primary-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-700 text-cream flex items-center justify-center font-bold text-sm shadow-inner">
              {initial}
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-tight">
                {user?.name || 'Admin'}
              </p>
              <p className="text-xs text-primary-300">{roleLabel}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => logout()}
            className="p-1.5 rounded text-cream/70 hover:text-error transition-colors"
            title="Log out"
            aria-label="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Mobile Top Header for Admin */}
      <div className="md:hidden bg-primary-900 text-cream p-4 flex items-center justify-between border-b border-primary-800">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Roll-IT"
            width={28}
            height={28}
            className="rounded-full"
          />
          <span className="font-display text-xl font-bold text-white">
            Roll-<span className="text-primary-400">IT</span> Admin
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/home"
            className="px-2.5 py-1 text-xs font-semibold bg-primary-800 text-cream rounded-pill"
          >
            Storefront
          </Link>
          <button
            onClick={() => logout()}
            className="p-1.5 text-cream/80 hover:text-error"
            aria-label="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Admin Navigation Bar */}
      <div className="md:hidden bg-primary-800 text-cream flex items-center justify-around py-2 px-1 text-xs overflow-x-auto border-b border-primary-700">
        {navItems.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-pill font-medium whitespace-nowrap ${
                isActive ? 'bg-primary-500 text-white font-bold' : 'text-cream/80'
              }`}
            >
              {item.label}
              {item.badge !== undefined && item.badge > 0 && ` (${item.badge})`}
            </Link>
          );
        })}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

