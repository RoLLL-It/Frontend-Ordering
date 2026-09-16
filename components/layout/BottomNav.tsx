'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, UtensilsCrossed, ShoppingBag, User } from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Home', href: '/home', icon: Home },
    { label: 'Menu', href: '/menu', icon: UtensilsCrossed },
    { label: 'Orders', href: '/orders', icon: ShoppingBag },
    { label: 'Profile', href: '/reviews', icon: User },
  ];

  // Hide on admin routes, checkout, and auth pages
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname === '/' ||
    pathname === '/checkout'
  ) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur border-t border-line md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/home' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full text-xs font-medium transition-colors ${
                isActive
                  ? 'text-primary-600 font-semibold'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

