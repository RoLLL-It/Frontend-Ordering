import React, { useState } from 'react';
import { Star } from 'lucide-react';

export const RATING_LABELS: Record<number, string> = {
  1: 'Not good',
  2: 'Could be better',
  3: 'Decent',
  4: 'Really good',
  5: 'Loved it',
};

export interface StarRatingProps {
  value: number;
  onChange?: (val: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showNumeric?: boolean;
  count?: number;
}

export function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 'md',
  showLabel = false,
  showNumeric = false,
  count,
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const displayRating = hovered !== null ? hovered : value;

  const starSizeClass =
    size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-9 h-9' : 'w-5 h-5';
  const buttonSizeClass =
    size === 'lg' ? 'w-11 h-11 p-1' : size === 'sm' ? 'w-6 h-6' : 'w-8 h-8';

  if (readOnly) {
    return (
      <div
        className="inline-flex items-center gap-1.5"
        aria-label={`${value} out of 5 stars`}
      >
        <div className="flex items-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`${starSizeClass} ${
                star <= Math.round(value)
                  ? 'fill-primary-500 text-primary-500'
                  : 'text-line-strong'
              }`}
            />
          ))}
        </div>
        {showNumeric && (
          <span className="text-sm font-semibold text-ink tabular-nums">
            {value.toFixed(1)}
            {count !== undefined && (
              <span className="text-ink-muted font-normal ml-1">({count})</span>
            )}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div
        role="radiogroup"
        aria-label="Star rating"
        className="flex items-center gap-1 sm:gap-2"
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= displayRating;
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} star${star > 1 ? 's' : ''}: ${RATING_LABELS[star]}`}
              onClick={() => onChange && onChange(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(null)}
              className={`flex items-center justify-center rounded-sm transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary-500 ${buttonSizeClass}`}
            >
              <Star
                className={`${starSizeClass} transition-colors ${
                  isFilled
                    ? 'fill-primary-500 text-primary-500'
                    : 'text-line-strong hover:text-primary-300'
                }`}
              />
            </button>
          );
        })}
      </div>

      {showLabel && (
        <div className="mt-3 text-base font-semibold text-ink h-6 transition-all duration-150">
          {RATING_LABELS[displayRating] || 'Select rating'}
        </div>
      )}
    </div>
  );
}

