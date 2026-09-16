'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { reviewsApi } from '@/lib/api/reviews';
import { StarRating } from '@/components/ui/StarRating';
import { ArrowLeft } from 'lucide-react';

export default function PublicReviewsPage() {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  const { data: summary } = useQuery({
    queryKey: ['reviews', 'summary'],
    queryFn: () => reviewsApi.getSummary(),
  });

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['reviews', selectedRating],
    queryFn: () => reviewsApi.getReviews(1, selectedRating || undefined),
  });

  const dist = summary?.distribution || { 5: 38, 4: 12, 3: 5, 2: 1, 1: 1 };
  const maxCount = Math.max(...Object.values(dist), 1);

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-16 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link
          href="/home"
          className="p-1.5 rounded-full text-ink hover:bg-cream-light transition-colors"
          aria-label="Back to home"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">
          Reviews
        </h1>
      </div>

      {/* Ratings Aggregate & Distribution (PDF Page 10) */}
      <div className="bg-surface rounded-card border border-line p-5 shadow-card space-y-4">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-4xl sm:text-5xl font-bold text-ink">
            {summary?.average || 4.6}
          </span>
          <div>
            <StarRating value={summary?.average || 4.6} readOnly size="sm" />
            <p className="text-xs text-ink-muted mt-0.5">
              {summary?.total || 57} verified reviews
            </p>
          </div>
        </div>

        {/* Distribution Bars */}
        <div className="space-y-2 pt-2 border-t border-line/60">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = dist[star as keyof typeof dist] || 0;
            const percentage = (count / maxCount) * 100;
            const isSelected = selectedRating === star;

            return (
              <button
                key={star}
                type="button"
                onClick={() =>
                  setSelectedRating(isSelected ? null : star)
                }
                className={`w-full flex items-center gap-3 text-xs group py-0.5 rounded focus:outline-none ${
                  isSelected ? 'font-bold' : ''
                }`}
              >
                <span className="w-3 text-right font-medium text-ink">
                  {star}
                </span>

                <div className="flex-1 h-2.5 bg-cream rounded-pill overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-pill transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <span className="w-6 text-left text-ink-muted tabular-nums">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {selectedRating && (
          <div className="flex items-center justify-between pt-2 text-xs">
            <span className="text-ink font-medium">
              Filtering by {selectedRating} stars
            </span>
            <button
              type="button"
              onClick={() => setSelectedRating(null)}
              className="text-primary-600 font-bold underline"
            >
              Clear filter
            </button>
          </div>
        )}
      </div>

      {/* Reviews List (PDF Page 10) */}
      <div className="space-y-3">
        {isLoading && (
          <div className="py-8 text-center text-xs text-ink-muted">
            Loading reviews...
          </div>
        )}

        {reviews.map((rev) => {
          const initial = rev.reviewer_name.charAt(0);

          return (
            <div
              key={rev.id}
              className="bg-surface rounded-card border border-line p-4 shadow-card space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary-900 text-cream flex items-center justify-center font-bold text-xs select-none">
                    {initial}
                  </div>
                  <span className="font-semibold text-ink text-sm">
                    {rev.reviewer_name}
                  </span>
                </div>
                <span className="text-xs text-ink-subtle">
                  {new Date(rev.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </div>

              <StarRating value={rev.rating} readOnly size="sm" />

              {rev.comment && (
                <p className="text-sm text-ink leading-relaxed">
                  {rev.comment}
                </p>
              )}

              {rev.items && rev.items.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {rev.items.map((it, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-pill bg-cream text-ink-muted text-xs font-medium border border-line"
                    >
                      {it}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Load More Button (PDF Page 10) */}
      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={() => {}}
          className="px-6 py-2.5 bg-surface border border-line-strong hover:bg-cream-light text-ink font-semibold text-sm rounded-btn shadow-sm transition-colors"
        >
          Load more
        </button>
      </div>
    </div>
  );
}

