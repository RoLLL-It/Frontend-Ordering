'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCartStore } from '@/lib/store/cart';
import { formatRupees } from '@/lib/utils/format';
import { ShoppingCart } from 'lucide-react';

export function StickyCartBar() {
  const pathname = usePathname();
  const { count, subtotalPaise } = useCartStore();

  const totalCount = count();
  const subtotal = subtotalPaise();

  if (
    totalCount === 0 ||
    pathname === '/cart' ||
    pathname === '/checkout' ||
    pathname.startsWith('/admin') ||
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/register'
  ) {
    return null;
  }

  return (
    <div
      className="fixed bottom-14 md:bottom-4 left-0 right-0 z-20 px-4 pointer-events-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-md mx-auto pointer-events-auto">
        <div className="bg-primary-900 text-cream rounded-card p-3 shadow-sticky flex items-center justify-between border border-primary-800">
          <div className="flex items-center gap-2.5 pl-1.5">
            <ShoppingCart className="w-5 h-5 text-primary-400" />
            <span className="text-sm font-semibold tracking-wide">
              {totalCount} item{totalCount > 1 ? 's' : ''} ·{' '}
              <span className="tabular-nums font-bold text-white">
                {formatRupees(subtotal)}
              </span>
            </span>
          </div>

          <Link
            href="/cart"
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 active:scale-95 text-white font-semibold text-sm rounded-btn transition-transform shadow-sm"
          >
            View cart
          </Link>
        </div>
      </div>
    </div>
  );
}

