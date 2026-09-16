'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api/orders';
import { formatRupees, formatSlotRange, isTerminalStatus } from '@/lib/utils/format';
import { StatusBadge } from '@/components/ui/Badge';
import { ArrowRight, ShoppingBag, Star, ChevronRight } from 'lucide-react';

export default function OrdersListPage() {
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');

  const { data: allOrders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.getOrders(),
    refetchInterval: activeTab === 'active' ? 30_000 : false,
  });

  const activeOrders = allOrders.filter((o) => !isTerminalStatus(o.status));
  const pastOrders = allOrders.filter((o) => isTerminalStatus(o.status));

  const displayOrders = activeTab === 'active' ? activeOrders : pastOrders;

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-12 animate-in fade-in duration-200">
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">
        My Orders
      </h1>

      {/* Tabs */}
      <div className="flex border-b border-line">
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`flex-1 pb-3 text-sm font-semibold border-b-2 text-center transition-colors ${
            activeTab === 'active'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          Active Orders ({activeOrders.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('past')}
          className={`flex-1 pb-3 text-sm font-semibold border-b-2 text-center transition-colors ${
            activeTab === 'past'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          Past Orders ({pastOrders.length})
        </button>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="h-28 bg-surface rounded-card border border-line animate-pulse p-4"
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && displayOrders.length === 0 && (
        <div className="py-14 text-center">
          <div className="w-16 h-16 rounded-full bg-cream-light border border-line flex items-center justify-center text-ink-muted mx-auto mb-3">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="font-display text-xl font-bold text-ink mb-1">
            {activeTab === 'active' ? 'No active orders' : 'No past orders yet'}
          </h2>
          <p className="text-xs text-ink-muted mb-5">
            {activeTab === 'active'
              ? 'Hungry? Your favorite rolls are ready to order.'
              : 'Once you place orders, you can view your history here.'}
          </p>
          <Link
            href="/menu"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm rounded-btn transition-colors"
          >
            <span>Browse menu</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Orders List */}
      <div className="space-y-3">
        {displayOrders.map((order) => (
          <div
            key={order.id}
            className="bg-surface rounded-card border border-line p-4 shadow-card hover:border-line-strong transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono font-bold text-xs tracking-wider text-ink">
                {order.short_code}
              </span>
              <StatusBadge status={order.status} />
            </div>

            <p className="text-sm font-semibold text-ink line-clamp-1">
              {order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
            </p>

            <div className="flex items-center justify-between text-xs text-ink-muted mt-2 pt-2 border-t border-line/50">
              <span>
                {formatSlotRange(order.slot.start_time, order.slot.end_time)} ·{' '}
                {order.location.code}
              </span>
              <span className="font-bold text-ink text-sm tabular-nums">
                {formatRupees(order.total_paise)}
              </span>
            </div>

            <div className="flex items-center justify-between mt-3 pt-2">
              {order.can_review ? (
                <Link
                  href={`/review/${order.id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 px-2.5 py-1 rounded-pill"
                >
                  <Star className="w-3.5 h-3.5 fill-primary-500 text-primary-500" />
                  <span>Rate this order</span>
                </Link>
              ) : (
                <span className="text-xs text-ink-subtle">
                  {new Date(order.placed_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              )}

              <Link
                href={`/orders/${order.id}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-ink hover:text-primary-600"
              >
                <span>View details</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

