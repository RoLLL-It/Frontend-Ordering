'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/components/providers/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api/orders';
import { menuApi } from '@/lib/api/menu';
import { reviewsApi } from '@/lib/api/reviews';
import { formatRupees, formatSlotRange } from '@/lib/utils/format';
import { OrderStatusStepper } from '@/components/order/OrderStatusStepper';
import { FoodTypeBadge } from '@/components/ui/Badge';
import { ArrowRight, Star, AlertTriangle } from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();
  const firstName = user?.name ? user.name.split(' ')[0] : 'there';

  // Active orders query (polls every 30s)
  const { data: activeOrders } = useQuery({
    queryKey: ['orders', 'active'],
    queryFn: () => ordersApi.getOrders('active'),
    refetchInterval: 30_000,
  });

  // Menu items query
  const { data: menuData } = useQuery({
    queryKey: ['menu'],
    queryFn: () => menuApi.getMenu(),
  });

  // Reviews query
  const { data: reviewsSummary } = useQuery({
    queryKey: ['reviews', 'summary'],
    queryFn: () => reviewsApi.getSummary(),
  });

  const latestActiveOrder = activeOrders?.[0];

  // Popular items
  const popularItems =
    menuData?.categories.flatMap((cat) => cat.items).slice(0, 4) || [];

  return (
    <div className="space-y-6 pb-6 animate-in fade-in duration-200">
      {/* Greeting */}
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight">
          Hey {firstName} 👋
        </h1>
        <p className="text-base text-ink-muted mt-1">
          {menuData?.kitchen_open !== false
            ? "Kitchen's open till 9:00pm."
            : "Kitchen's currently closed."}
        </p>
      </div>

      {/* Announcement banner if any */}
      {menuData?.announcement && (
        <div className="flex items-center gap-2 p-3 bg-warning-bg border border-warning/20 rounded-card text-warning text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{menuData.announcement}</span>
        </div>
      )}

      {/* Active Order Card (PDF Page 4) */}
      {latestActiveOrder && (
        <div className="bg-primary-900 text-cream rounded-card p-4 sm:p-5 shadow-card border border-primary-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold tracking-wider text-primary-300">
              {latestActiveOrder.short_code}
            </span>
            <span className="px-2.5 py-0.5 rounded-pill text-xs font-bold uppercase tracking-wider bg-primary-500 text-white">
              {latestActiveOrder.status}
            </span>
          </div>

          <h2 className="font-display text-xl sm:text-2xl font-bold text-white mb-1">
            Arriving{' '}
            {formatSlotRange(
              latestActiveOrder.slot.start_time,
              latestActiveOrder.slot.end_time
            )}{' '}
            at {latestActiveOrder.location.code}
          </h2>

          <div className="my-2">
            <OrderStatusStepper status={latestActiveOrder.status} isDark />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-primary-800 text-sm mt-2">
            <span className="text-primary-200">
              {(latestActiveOrder.items || []).reduce((acc, i) => acc + i.quantity, 0)}{' '}
              items ·{' '}
              <span className="font-bold text-white tabular-nums">
                {formatRupees(latestActiveOrder.total_paise)}
              </span>
            </span>

            <Link
              href={`/orders/${latestActiveOrder.id}`}
              className="inline-flex items-center gap-1 font-semibold text-primary-400 hover:text-white transition-colors"
            >
              <span>Track order</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Popular right now (PDF Page 4) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-2xl font-bold text-ink">
            Popular right now
          </h2>
          <Link
            href="/menu"
            className="text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            See all
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {popularItems.map((item) => (
            <Link
              key={item.id}
              href="/menu"
              className="flex flex-col bg-surface rounded-card border border-line p-3 shadow-card hover:border-line-strong hover:shadow-card-hover transition-all group"
            >
              <div className="relative w-full aspect-[4/3] rounded-sm overflow-hidden bg-cream-light mb-2.5">
                <Image
                  src={item.image_url || '/logo.png'}
                  alt={item.name}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>

              <div className="flex items-center gap-1.5 mb-1">
                <FoodTypeBadge isVeg={item.is_veg} />
                <h3 className="font-semibold text-ink text-sm truncate">
                  {item.name}
                </h3>
              </div>

              <div className="flex items-center justify-between text-xs mt-auto pt-1">
                <span className="font-bold text-ink text-sm tabular-nums">
                  {formatRupees(item.price_paise)}
                </span>
                <div className="flex items-center gap-1 text-ink-subtle">
                  <Star className="w-3 h-3 fill-primary-500 text-primary-500" />
                  <span className="font-semibold text-ink">
                    {item.rating_avg.toFixed(1)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Big Action: Browse full menu */}
      <div>
        <Link
          href="/menu"
          className="w-full min-h-[52px] flex items-center justify-center bg-primary-500 hover:bg-primary-600 active:scale-[0.98] text-white font-semibold text-lg rounded-btn shadow-md transition-all"
        >
          Browse full menu
        </Link>
      </div>

      {/* What people say */}
      <div className="bg-surface rounded-card border border-line p-4 sm:p-5 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">
              What people say
            </h2>
            <p className="text-xs text-ink-muted">From real campus foodies</p>
          </div>
          <Link
            href="/reviews"
            className="flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            <Star className="w-4 h-4 fill-primary-500 text-primary-500" />
            <span>{reviewsSummary?.average || 4.6}</span>
            <span className="text-ink-muted font-normal">
              ({reviewsSummary?.total || 57})
            </span>
          </Link>
        </div>

        <div className="text-sm text-ink-muted italic border-l-2 border-primary-500 pl-3 py-1">
          “Best roll on campus. Delivery was right on time.”
          <span className="block not-italic font-semibold text-ink mt-1 text-xs">
            — Heet C. (LJ Campus)
          </span>
        </div>
      </div>
    </div>
  );
}

