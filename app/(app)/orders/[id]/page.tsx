'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api/orders';
import { formatRupees, formatSlotRange, STATUS_COPY, isTerminalStatus } from '@/lib/utils/format';
import { OrderStatusStepper } from '@/components/order/OrderStatusStepper';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/providers/ToastProvider';
import {
  ArrowLeft,
  Clock,
  RotateCw,
  Star,
  AlertCircle,
  PartyPopper,
} from 'lucide-react';

function OrderStatusContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const isNew = searchParams.get('new') === 'true';
  const id = params.id as string;

  const queryClient = useQueryClient();
  const { error: toastError, success: toastSuccess } = useToast();

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  // Poll order every 15s until terminal (Spec §4.8)
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getOrder(id),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data || isTerminalStatus(data.status)) return false;
      return 15_000;
    },
    refetchIntervalInBackground: false,
  });

  // Countdown timer for cancel deadline
  useEffect(() => {
    if (!order?.cancel_deadline_at || !order.can_cancel) {
      setSecondsRemaining(null);
      return;
    }

    const updateTimer = () => {
      const deadline = new Date(order.cancel_deadline_at).getTime();
      const diff = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setSecondsRemaining(diff);
      if (diff <= 0) {
        queryClient.invalidateQueries({ queryKey: ['order', id] });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [order?.cancel_deadline_at, order?.can_cancel, id, queryClient]);

  // Cancel order mutation
  const cancelMutation = useMutation({
    mutationFn: () => ordersApi.cancelOrder(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(['order', id], updated);
      toastSuccess('Order cancelled successfully.');
      setCancelModalOpen(false);
    },
    onError: (err: any) => {
      toastError(err.message || 'Could not cancel order.');
      setCancelModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
  });

  if (isLoading) {
    return (
      <div className="py-20 text-center flex flex-col items-center">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold text-ink-muted">Tracking your order...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="py-16 text-center max-w-sm mx-auto">
        <AlertCircle className="w-12 h-12 text-error mx-auto mb-3" />
        <h1 className="font-display text-2xl font-bold text-ink mb-1">
          Order not found
        </h1>
        <p className="text-sm text-ink-muted mb-6">
          We couldn&apos;t find an order matching this identifier.
        </p>
        <Link
          href="/orders"
          className="px-5 py-2.5 bg-primary-500 text-white rounded-btn font-semibold text-sm"
        >
          View all orders
        </Link>
      </div>
    );
  }

  const copy = STATUS_COPY[order.status];
  const formattedCountdown =
    secondsRemaining !== null
      ? `${Math.floor(secondsRemaining / 60)}:${(secondsRemaining % 60)
          .toString()
          .padStart(2, '0')}`
      : null;

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-16 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/orders"
            className="p-1.5 rounded-full text-ink hover:bg-cream-light transition-colors"
            aria-label="Back to orders"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">
            Order {order.short_code}
          </h1>
        </div>
      </div>

      {/* Success banner if arrived from checkout */}
      {isNew && (
        <div className="flex items-center gap-2.5 p-3.5 bg-success-bg border border-success/30 rounded-card text-success text-sm font-semibold animate-in slide-in-from-top-2">
          <PartyPopper className="w-5 h-5 flex-shrink-0" />
          <span>Order placed! We&apos;re preparing your meal.</span>
        </div>
      )}

      {/* Hero Status Banner (PDF Page 8) */}
      <div className="bg-primary-900 text-cream rounded-card p-5 shadow-card border border-primary-800 text-center">
        <span className="text-xs font-bold uppercase tracking-widest text-primary-300">
          {order.status}
        </span>

        <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1 mb-1">
          {copy.headline}
        </h2>

        <p className="text-sm text-primary-200 mb-3">
          Arriving{' '}
          {formatSlotRange(order.slot.start_time, order.slot.end_time)} at{' '}
          {order.location.code}
        </p>

        <div className="py-2">
          <OrderStatusStepper status={order.status} isDark />
        </div>
      </div>

      {/* Cancel Order Action with Live Timer (PDF Page 8) */}
      {order.can_cancel && secondsRemaining !== null && secondsRemaining > 0 && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setCancelModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-surface border border-line-strong hover:border-error hover:text-error text-ink text-sm font-semibold rounded-pill transition-colors shadow-sm"
          >
            <span>Cancel order</span>
            <span className="text-xs bg-cream px-2 py-0.5 rounded-full text-ink font-mono flex items-center gap-1">
              <Clock className="w-3 h-3 text-primary-500" />
              {formattedCountdown}
            </span>
          </button>
        </div>
      )}

      {/* Rate Order Prompt if delivered */}
      {order.can_review && (
        <div className="p-4 bg-cream-light border border-primary-300 rounded-card shadow-sm flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-ink text-sm">How was your roll?</h3>
            <p className="text-xs text-ink-muted">Help the kitchen with your rating</p>
          </div>
          <Link
            href={`/review/${order.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold text-xs rounded-btn shadow-sm"
          >
            <Star className="w-3.5 h-3.5 fill-white" />
            <span>Rate order</span>
          </Link>
        </div>
      )}

      {/* ITEMS section (PDF Page 8) */}
      <section className="bg-surface rounded-card border border-line p-4 sm:p-5 shadow-card space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
          ITEMS
        </h3>

        <div className="space-y-2 pb-2 border-b border-line">
          {order.items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-sm text-ink"
            >
              <span>
                {item.quantity}× {item.name_snapshot}
              </span>
              <span className="font-semibold tabular-nums">
                {formatRupees(item.line_total_paise)}
              </span>
            </div>
          ))}
        </div>

        {order.notes && (
          <div className="p-2.5 bg-cream-light border border-line rounded-sm text-xs text-ink-muted italic">
            Note: {order.notes}
          </div>
        )}

        <div className="flex items-baseline justify-between pt-1">
          <span className="font-bold text-ink text-base">Total</span>
          <span className="font-display text-2xl font-bold text-ink tabular-nums">
            {formatRupees(order.total_paise)}
          </span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-line text-xs font-semibold">
          <span className="text-ink-muted">Cash on delivery</span>
          <span
            className={`px-2 py-0.5 rounded-pill uppercase tracking-wider ${
              order.payment_status === 'PAID'
                ? 'bg-success-bg text-success'
                : 'bg-warning-bg text-warning'
            }`}
          >
            {order.payment_status}
          </span>
        </div>
      </section>

      {/* TIMELINE section (PDF Page 8) */}
      <section className="bg-surface rounded-card border border-line p-4 sm:p-5 shadow-card space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
          TIMELINE
        </h3>

        <div className="space-y-2">
          {order.timeline.map((event, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-sm"
            >
              <span className="font-medium text-ink capitalize">
                {event.status.replace(/_/g, ' ').toLowerCase()}
              </span>
              <span className="text-ink-muted text-xs">{event.at}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer live polling indicator */}
      {!isTerminalStatus(order.status) && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-ink-subtle pt-2">
          <RotateCw className="w-3.5 h-3.5 animate-spin text-primary-500" />
          <span>Updating automatically</span>
        </div>
      )}

      {/* Cancellation Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel this order?"
        description="Are you sure? Once cancelled, your delivery slot will be released."
      >
        <div className="flex items-center justify-end gap-3 mt-4">
          <Button
            variant="secondary"
            onClick={() => setCancelModalOpen(false)}
          >
            Keep order
          </Button>
          <Button
            variant="danger"
            isLoading={cancelMutation.isPending}
            onClick={() => cancelMutation.mutate()}
          >
            Yes, cancel order
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default function OrderStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-sm font-semibold text-ink-muted">
          Loading order status...
        </div>
      }
    >
      <OrderStatusContent />
    </Suspense>
  );
}

