import React from 'react';
import { OrderStatus } from '@/types/api';
import { Check } from 'lucide-react';

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'PLACED', label: 'Placed' },
  { status: 'ACCEPTED', label: 'Accepted' },
  { status: 'PREPARING', label: 'Preparing' },
  { status: 'READY', label: 'Ready' },
  { status: 'DELIVERED', label: 'Delivered' },
];

export function OrderStatusStepper({
  status,
  isDark = false,
}: {
  status: OrderStatus;
  isDark?: boolean;
}) {
  const isCancelled =
    status === 'CANCELLED_BY_USER' || status === 'CANCELLED_BY_ADMIN';

  const getStepIndex = (s: OrderStatus): number => {
    if (s === 'PLACED') return 0;
    if (s === 'ACCEPTED') return 1;
    if (s === 'PREPARING') return 2;
    if (s === 'READY') return 3;
    if (s === 'OUT_FOR_DELIVERY') return 3; // maps between ready & delivered
    if (s === 'DELIVERED') return 4;
    return -1;
  };

  const currentIndex = getStepIndex(status);

  if (isCancelled) {
    return (
      <div className="py-2 text-center">
        <span className="inline-block px-3 py-1 bg-error-bg text-error font-semibold text-sm rounded-pill">
          {status === 'CANCELLED_BY_USER'
            ? 'Order Cancelled by You'
            : 'Order Cancelled by Kitchen'}
        </span>
      </div>
    );
  }

  return (
    <div className="w-full py-3">
      <div className="relative flex items-center justify-between">
        {/* Background connector line */}
        <div
          className={`absolute top-1/2 left-4 right-4 -translate-y-1/2 h-[2px] ${
            isDark ? 'bg-primary-800' : 'bg-line'
          } z-0`}
        />

        {/* Progress connector line */}
        <div
          className="absolute top-1/2 left-4 -translate-y-1/2 h-[2px] bg-primary-500 transition-all duration-500 z-0"
          style={{
            width: `${Math.max(0, Math.min(100, (currentIndex / 4) * 100))}%`,
          }}
        />

        {STEPS.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div
              key={step.status}
              className="relative z-10 flex flex-col items-center"
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isCompleted
                    ? 'bg-primary-500 text-white'
                    : isCurrent
                    ? 'bg-primary-500 ring-4 ring-primary-500/30 text-white'
                    : isDark
                    ? 'bg-primary-900 border-2 border-primary-700 text-transparent'
                    : 'bg-surface border-2 border-line-strong text-transparent'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                ) : isCurrent ? (
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                ) : null}
              </div>

              <span
                className={`text-[11px] sm:text-xs mt-1.5 font-medium whitespace-nowrap ${
                  isCurrent
                    ? isDark
                      ? 'text-white font-bold'
                      : 'text-primary-600 font-bold'
                    : isCompleted
                    ? isDark
                      ? 'text-cream font-medium'
                      : 'text-ink font-medium'
                    : isDark
                    ? 'text-primary-400/60'
                    : 'text-ink-subtle'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

