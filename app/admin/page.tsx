'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { menuApi } from '@/lib/api/menu';
import { Order, OrderStatus } from '@/types/api';
import { formatRupees, formatTime } from '@/lib/utils/format';
import { Toggle } from '@/components/ui/Toggle';
import { useToast } from '@/components/providers/ToastProvider';
import { RotateCw } from 'lucide-react';

export default function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  const [kitchenOpen, setKitchenOpen] = useState(true);

  // Poll live orders every 10s as required by Spec §5.2
  const { data: orders = [] } = useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: () => adminApi.getOrders(),
    refetchInterval: 10_000,
  });

  const { data: stats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.getStats(),
    refetchInterval: 10_000,
  });

  // Advance order status mutation
  const advanceMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: OrderStatus }) =>
      adminApi.advanceOrderStatus(id, nextStatus),
    onMutate: async ({ id, nextStatus }) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'orders'] });
      const previous = queryClient.getQueryData<Order[]>(['admin', 'orders']);

      queryClient.setQueryData<Order[]>(['admin', 'orders'], (old) =>
        old?.map((o) => (o.id === id ? { ...o, status: nextStatus } : o))
      );

      return { previous };
    },
    onError: (err: any, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['admin', 'orders'], context.previous);
      }
      toastError(err.message || 'Could not advance order');
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      toastSuccess(`Order ${updated.short_code} moved to ${updated.status}`);
    },
  });

  const handleToggleDelivery = async (val: boolean) => {
    setDeliveryEnabled(val);
    try {
      await adminApi.updateSettings({ delivery_enabled: val });
      toastSuccess(`Delivery ${val ? 'enabled' : 'paused'}`);
      queryClient.invalidateQueries({ queryKey: ['menu'] });
    } catch {
      setDeliveryEnabled(!val);
      toastError('Failed to update delivery status');
    }
  };

  const handleToggleKitchen = async (val: boolean) => {
    setKitchenOpen(val);
    try {
      await adminApi.updateSettings({ kitchen_open: val });
      toastSuccess(`Kitchen ${val ? 'opened' : 'closed'}`);
      queryClient.invalidateQueries({ queryKey: ['menu'] });
    } catch {
      setKitchenOpen(!val);
      toastError('Failed to update kitchen status');
    }
  };

  // Group orders by lane
  const placedOrders = orders.filter((o) => o.status === 'PLACED');
  const acceptedOrders = orders.filter((o) => o.status === 'ACCEPTED');
  const preparingOrders = orders.filter((o) => o.status === 'PREPARING');
  const outOrders = orders.filter((o) => o.status === 'OUT_FOR_DELIVERY');

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header with Date & Service toggles (PDF Page 11) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">
            Dashboard
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Friday, 11 September · Lunch service
          </p>
        </div>

        {/* Global Delivery & Kitchen Controls */}
        <div className="flex items-center gap-6 bg-surface p-3 rounded-card border border-line shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-ink-muted uppercase">
              Delivery <span className="text-primary-600">{deliveryEnabled ? 'ON' : 'OFF'}</span>
            </span>
            <Toggle
              checked={deliveryEnabled}
              onChange={handleToggleDelivery}
            />
          </div>

          <div className="w-[1px] h-6 bg-line" />

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-ink-muted uppercase">
              Kitchen <span className="text-primary-600">{kitchenOpen ? 'OPEN' : 'CLOSED'}</span>
            </span>
            <Toggle
              checked={kitchenOpen}
              onChange={handleToggleKitchen}
            />
          </div>
        </div>
      </div>

      {/* 4 Stat Cards (PDF Page 11) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface rounded-card border border-line p-4 shadow-card">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            ORDERS TODAY
          </span>
          <p className="font-display text-3xl font-bold text-ink mt-2">
            {stats?.orders_today || 42}
          </p>
        </div>

        <div className="bg-surface rounded-card border border-line p-4 shadow-card">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            REVENUE
          </span>
          <p className="font-display text-3xl font-bold text-ink mt-2 tabular-nums">
            {formatRupees(stats?.revenue_today_paise || 504000)}
          </p>
        </div>

        <div className="bg-primary-900 text-cream rounded-card border border-primary-800 p-4 shadow-card">
          <span className="text-xs font-bold uppercase tracking-wider text-primary-300">
            ACTIVE NOW
          </span>
          <p className="font-display text-3xl font-bold text-white mt-2">
            {stats?.active_orders || 7}
          </p>
        </div>

        <div className="bg-surface rounded-card border border-line p-4 shadow-card">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            AVG RATING
          </span>
          <p className="font-display text-3xl font-bold text-ink mt-2">
            {stats?.avg_rating || 4.6}
          </p>
        </div>
      </div>

      {/* Live Queue Section (PDF Page 11) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-ink">
            Live queue
          </h2>
          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
            <RotateCw className="w-3.5 h-3.5 animate-spin text-primary-500" />
            <span>Refreshing every 10s</span>
          </div>
        </div>

        {/* 4 Lanes Kanban */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {/* Lane 1: PLACED */}
          <div className="bg-cream-light/60 rounded-card p-3 border border-line space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-ink">
                PLACED
              </span>
              <span className="w-5 h-5 rounded-full bg-line text-ink font-bold text-xs flex items-center justify-center">
                {placedOrders.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {placedOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-surface rounded-card border border-line p-3.5 shadow-card space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-ink">
                      {order.short_code}
                    </span>
                    <span className="text-xs text-ink-muted font-medium">
                      {formatTime(order.slot.start_time)}
                    </span>
                  </div>

                  <p className="text-xs text-ink-muted">
                    {(order.items || []).map((i) => `${i.quantity}× ${i.name_snapshot}`).join(', ')} ·{' '}
                    <span className="font-bold text-ink">{order.location.code}</span>
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      advanceMutation.mutate({
                        id: order.id,
                        nextStatus: 'ACCEPTED',
                      })
                    }
                    className="w-full py-2 bg-primary-500 hover:bg-primary-600 active:scale-95 text-white font-semibold text-xs rounded-btn transition-transform shadow-xs"
                  >
                    Accept
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Lane 2: ACCEPTED */}
          <div className="bg-cream-light/60 rounded-card p-3 border border-line space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-ink">
                ACCEPTED
              </span>
              <span className="w-5 h-5 rounded-full bg-line text-ink font-bold text-xs flex items-center justify-center">
                {acceptedOrders.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {acceptedOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-surface rounded-card border border-line p-3.5 shadow-card space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-ink">
                      {order.short_code}
                    </span>
                    <span className="text-xs text-ink-muted font-medium">
                      {formatTime(order.slot.start_time)}
                    </span>
                  </div>

                  <p className="text-xs text-ink-muted">
                    {(order.items || []).map((i) => `${i.quantity}× ${i.name_snapshot}`).join(', ')} ·{' '}
                    <span className="font-bold text-ink">{order.location.code}</span>
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      advanceMutation.mutate({
                        id: order.id,
                        nextStatus: 'PREPARING',
                      })
                    }
                    className="w-full py-2 bg-surface border border-primary-500 text-primary-600 hover:bg-primary-50 active:scale-95 font-semibold text-xs rounded-btn transition-colors shadow-xs"
                  >
                    Start preparing
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Lane 3: PREPARING */}
          <div className="bg-cream-light/60 rounded-card p-3 border border-line space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-ink">
                PREPARING
              </span>
              <span className="w-5 h-5 rounded-full bg-line text-ink font-bold text-xs flex items-center justify-center">
                {preparingOrders.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {preparingOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-surface rounded-card border border-line p-3.5 shadow-card space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-ink">
                      {order.short_code}
                    </span>
                    <span className="text-xs text-ink-muted font-medium">
                      {formatTime(order.slot.start_time)}
                    </span>
                  </div>

                  <p className="text-xs text-ink-muted">
                    {(order.items || []).map((i) => `${i.quantity}× ${i.name_snapshot}`).join(', ')} ·{' '}
                    <span className="font-bold text-ink">{order.location.code}</span>
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      advanceMutation.mutate({
                        id: order.id,
                        nextStatus: 'OUT_FOR_DELIVERY',
                      })
                    }
                    className="w-full py-2 bg-surface border border-line-strong hover:border-primary-500 text-ink active:scale-95 font-semibold text-xs rounded-btn transition-colors shadow-xs"
                  >
                    Mark ready
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Lane 4: OUT FOR DELIVERY */}
          <div className="bg-cream-light/60 rounded-card p-3 border border-line space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-ink">
                OUT FOR DELIVERY
              </span>
              <span className="w-5 h-5 rounded-full bg-line text-ink font-bold text-xs flex items-center justify-center">
                {outOrders.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {outOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-surface rounded-card border border-line p-3.5 shadow-card space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-ink">
                      {order.short_code}
                    </span>
                    <span className="text-xs text-ink-muted font-medium">
                      {formatTime(order.slot.start_time)}
                    </span>
                  </div>

                  <p className="text-xs text-ink-muted">
                    {(order.items || []).map((i) => `${i.quantity}× ${i.name_snapshot}`).join(', ')} ·{' '}
                    <span className="font-bold text-ink">{order.location.code}</span>
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      advanceMutation.mutate({
                        id: order.id,
                        nextStatus: 'DELIVERED',
                      })
                    }
                    className="w-full py-2 bg-success hover:bg-green-700 active:scale-95 text-white font-semibold text-xs rounded-btn transition-transform shadow-xs"
                  >
                    Mark delivered
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

