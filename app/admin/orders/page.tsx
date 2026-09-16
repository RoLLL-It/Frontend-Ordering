'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { useAuth } from '@/components/providers/AuthProvider';
import { Order, OrderStatus } from '@/types/api';
import { formatRupees, formatSlotRange, STATUS_COPY } from '@/lib/utils/format';
import { StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/providers/ToastProvider';
import { RotateCw, XCircle } from 'lucide-react';

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Ingredient out of stock');

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: () => adminApi.getOrders(),
    refetchInterval: 10_000,
  });

  const advanceMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      adminApi.advanceOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      toastSuccess('Order updated');
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to update order');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => {
      if (!cancelModalOrder) throw new Error('No order selected');
      return adminApi.cancelOrder(cancelModalOrder.id, cancelReason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      toastSuccess('Order cancelled by kitchen');
      setCancelModalOrder(null);
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to cancel order');
    },
  });

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'all') return true;
    return o.status === statusFilter;
  });

  const getNextStatusAction = (status: OrderStatus): { label: string; next: OrderStatus } | null => {
    if (status === 'PLACED') return { label: 'Accept', next: 'ACCEPTED' };
    if (status === 'ACCEPTED') return { label: 'Start preparing', next: 'PREPARING' };
    if (status === 'PREPARING') return { label: 'Mark ready', next: 'READY' };
    if (status === 'READY') return { label: 'Out for delivery', next: 'OUT_FOR_DELIVERY' };
    if (status === 'OUT_FOR_DELIVERY') return { label: 'Mark delivered', next: 'DELIVERED' };
    return null;
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">
            Orders Queue
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Monitor and advance active preparation lanes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 bg-surface border border-line rounded-btn text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-xs"
          >
            <option value="all">All statuses ({orders.length})</option>
            <option value="PLACED">Placed</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="PREPARING">Preparing</option>
            <option value="READY">Ready</option>
            <option value="OUT_FOR_DELIVERY">Out for delivery</option>
            <option value="DELIVERED">Delivered</option>
          </select>

          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })}
            className="p-2.5 bg-surface border border-line rounded-btn text-ink hover:bg-cream transition-colors"
            title="Refresh orders"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-ink-muted">
          Loading live orders...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-16 text-center bg-surface rounded-card border border-line">
          <p className="font-semibold text-ink text-base">No orders match filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const action = getNextStatusAction(order.status);

            return (
              <div
                key={order.id}
                className="bg-surface rounded-card border border-line p-4 shadow-card flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-sm text-ink">
                      {order.short_code}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>

                  <div className="text-xs text-ink-muted space-y-0.5 mb-2">
                    <p>
                      <span className="font-semibold text-ink">Customer:</span>{' '}
                      {order.customer_name || 'Campus Student'}
                    </p>
                    <p>
                      <span className="font-semibold text-ink">Slot:</span>{' '}
                      {formatSlotRange(order.slot.start_time, order.slot.end_time)}{' '}
                      at <span className="font-bold text-ink">{order.location.code}</span>
                    </p>
                  </div>

                  <div className="p-2.5 bg-cream-light border border-line rounded-sm space-y-1 text-xs">
                    {order.items.map((i, idx) => (
                      <div key={idx} className="flex justify-between text-ink">
                        <span>
                          {i.quantity}× {i.name}
                        </span>
                        <span className="font-semibold tabular-nums">
                          {formatRupees(i.line_total_paise)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <p className="text-xs text-primary-700 italic mt-2 bg-primary-50 p-2 rounded-sm border border-primary-200">
                      Note: {order.notes}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-line flex items-center justify-between">
                  <span className="font-bold text-ink text-base tabular-nums">
                    {formatRupees(order.total_paise)}
                  </span>

                  <div className="flex items-center gap-2">
                    {isAdmin &&
                      order.status !== 'DELIVERED' &&
                      !order.status.startsWith('CANCELLED') && (
                        <button
                          type="button"
                          onClick={() => setCancelModalOrder(order)}
                          className="p-2 text-ink-subtle hover:text-error rounded-btn transition-colors"
                          title="Cancel order"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}

                    {action && (
                      <button
                        type="button"
                        onClick={() =>
                          advanceMutation.mutate({
                            id: order.id,
                            status: action.next,
                          })
                        }
                        className="px-3.5 py-1.5 bg-primary-500 hover:bg-primary-600 active:scale-95 text-white font-semibold text-xs rounded-btn transition-transform shadow-xs"
                      >
                        {action.label}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Order Modal (Admin Only) */}
      <Modal
        isOpen={!!cancelModalOrder}
        onClose={() => setCancelModalOrder(null)}
        title="Cancel order as Kitchen Admin"
        description={`Provide cancellation reason for ${cancelModalOrder?.short_code}. This will release the booked slot.`}
      >
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1 block">
              Reason for Cancellation
            </label>
            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full h-11 px-3 bg-surface border border-line rounded-sm text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="Ingredient out of stock">Ingredient out of stock</option>
              <option value="Kitchen at overload capacity">Kitchen at overload capacity</option>
              <option value="Delivery point inaccessible">Delivery point inaccessible</option>
              <option value="Customer request">Customer request</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
            <Button
              variant="secondary"
              onClick={() => setCancelModalOrder(null)}
            >
              Close
            </Button>
            <Button
              variant="danger"
              isLoading={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

