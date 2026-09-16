import React from 'react';
import { OrderStatus } from '@/types/api';
import { STATUS_COPY } from '@/lib/utils/format';

export function FoodTypeBadge({ isVeg, className = '' }: { isVeg: boolean; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-4 h-4 border rounded-sm p-[1px] flex-shrink-0 ${
        isVeg ? 'border-veg' : 'border-nonveg'
      } ${className}`}
      aria-label={isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
      title={isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
    >
      <span
        className={`w-2 h-2 rounded-full ${isVeg ? 'bg-veg' : 'bg-nonveg'}`}
      />
    </span>
  );
}

export function StatusBadge({ status, className = '' }: { status: OrderStatus; className?: string }) {
  const config = STATUS_COPY[status] || {
    label: status,
    badgeBg: 'bg-surface text-ink',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-pill text-xs font-semibold uppercase tracking-wider ${config.badgeBg} ${className}`}
    >
      {config.label}
    </span>
  );
}

