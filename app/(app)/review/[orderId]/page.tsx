'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api/orders';
import { reviewsApi } from '@/lib/api/reviews';
import { formatRupees } from '@/lib/utils/format';
import { StarRating } from '@/components/ui/StarRating';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/providers/ToastProvider';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export default function GiveReviewPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('Best roll on campus.');

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getOrder(orderId),
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      reviewsApi.createReview({
        order_id: orderId,
        rating,
        comment,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      toastSuccess('Thanks for your review!');
      router.push('/reviews');
    },
    onError: (err: any) => {
      toastError(err.message || 'Could not submit review.');
    },
  });

  if (isLoading) {
    return (
      <div className="py-20 text-center text-ink-muted text-sm">
        Loading order details...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-16 text-center max-w-sm mx-auto">
        <AlertCircle className="w-10 h-10 text-error mx-auto mb-2" />
        <p className="text-base font-semibold text-ink">Order not found</p>
        <Link
          href="/orders"
          className="text-sm text-primary-600 font-semibold underline mt-2 block"
        >
          Return to orders
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-16 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link
          href={`/orders/${order.id}`}
          className="p-1.5 rounded-full text-ink hover:bg-cream-light transition-colors"
          aria-label="Back to order"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">
          Rate your order
        </h1>
      </div>

      {/* Order Summary Card (PDF Page 9) */}
      <div className="bg-surface rounded-card border border-line p-4 shadow-card">
        <div className="flex items-center justify-between text-xs font-mono font-bold text-ink-muted mb-1">
          <span>{order.short_code}</span>
          <span className="font-sans font-semibold text-ink">
            {(order.items || []).reduce((sum, i) => sum + i.quantity, 0)} items ·{' '}
            <span className="tabular-nums font-bold">
              {formatRupees(order.total_paise)}
            </span>
          </span>
        </div>
        <p className="text-sm font-medium text-ink truncate">
          {(order.items || []).map((i) => i.name_snapshot).join(', ')}
        </p>
      </div>

      {/* Interactive Star Rating (PDF Page 9) */}
      <div className="bg-surface rounded-card border border-line p-6 shadow-card text-center space-y-4">
        <h2 className="font-display text-2xl font-bold text-ink">
          How was it?
        </h2>

        <div className="py-2">
          <StarRating
            value={rating}
            onChange={(r) => setRating(r)}
            size="lg"
            showLabel
          />
        </div>
      </div>

      {/* Comment Textarea (PDF Page 9) */}
      <div className="bg-surface rounded-card border border-line p-4 shadow-card space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-ink-muted">
          <span>Tell us more (optional)</span>
          <span>{comment.length}/500</span>
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 500))}
          placeholder="What did you love about the roll? Was the spice level right?"
          rows={4}
          className="w-full p-3 bg-cream-light border border-line rounded-sm text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none placeholder:text-ink-subtle"
        />

        <p className="text-xs text-ink-subtle text-center pt-1">
          You can edit this for the next 24 hours.
        </p>
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <Button
          size="lg"
          isLoading={submitMutation.isPending}
          disabled={rating === 0}
          onClick={() => submitMutation.mutate()}
          className="w-full shadow-md"
        >
          Submit review
        </Button>
      </div>
    </div>
  );
}

