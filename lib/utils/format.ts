import { OrderStatus } from '@/types/api';

/**
 * Format integer paise into Indian Rupee format (e.g. 12000 paise -> "₹120")
 */
export function formatRupees(paise: number): string {
  const rupees = Math.floor(paise / 100);
  // Format according to Indian numbering system (e.g. 1,00,000)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

/**
 * Normalizes 10-digit Indian phone number
 */
export function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/\D/g, '');
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return cleaned.slice(2);
  }
  return cleaned;
}

/**
 * Formats time string (HH:MM or RFC3339) into friendly AM/PM time (e.g. "1:00 pm")
 */
export function formatTime(timeStr?: string): string {
  if (!timeStr) return '';
  if (timeStr.includes('T') || timeStr.includes('-')) {
    const d = new Date(timeStr);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).toLowerCase();
  }
  // HH:MM format
  const [hourStr, minuteStr] = timeStr.split(':');
  let h = parseInt(hourStr, 10);
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${minuteStr}${ampm}`;
}

/**
 * Formats slot range like "1:00–1:30pm"
 */
export function formatSlotRange(start: string, end: string): string {
  return `${formatTime(start)}–${formatTime(end)}`;
}

/**
 * Status descriptions and copy matching HLD and Frontend Spec
 */
export const STATUS_COPY: Record<
  OrderStatus,
  { label: string; headline: string; sub: string; badgeBg: string; badgeText: string }
> = {
  PLACED: {
    label: 'Placed',
    headline: 'Order placed',
    sub: 'Waiting for the kitchen to accept.',
    badgeBg: 'bg-primary-100 text-primary-800',
    badgeText: 'text-primary-800',
  },
  ACCEPTED: {
    label: 'Accepted',
    headline: 'Accepted',
    sub: 'The kitchen has your order.',
    badgeBg: 'bg-primary-200 text-primary-900',
    badgeText: 'text-primary-900',
  },
  PREPARING: {
    label: 'Preparing',
    headline: 'Your rolls are on the grill',
    sub: 'We are handcrafting your meal fresh.',
    badgeBg: 'bg-primary-500 text-white',
    badgeText: 'text-primary-600',
  },
  READY: {
    label: 'Ready',
    headline: 'Ready',
    sub: 'Packed and waiting to go out.',
    badgeBg: 'bg-success-bg text-success',
    badgeText: 'text-success',
  },
  OUT_FOR_DELIVERY: {
    label: 'Out for Delivery',
    headline: 'On the way',
    sub: 'Arriving at your drop point shortly.',
    badgeBg: 'bg-info-bg text-info',
    badgeText: 'text-info',
  },
  DELIVERED: {
    label: 'Delivered',
    headline: 'Delivered',
    sub: 'Hope it hit the spot.',
    badgeBg: 'bg-success text-white',
    badgeText: 'text-success',
  },
  CANCELLED_BY_USER: {
    label: 'Cancelled',
    headline: 'Cancelled',
    sub: 'You cancelled this order.',
    badgeBg: 'bg-error-bg text-error',
    badgeText: 'text-error',
  },
  CANCELLED_BY_ADMIN: {
    label: 'Cancelled by kitchen',
    headline: 'Cancelled by kitchen',
    sub: 'The kitchen was unable to fulfill this order.',
    badgeBg: 'bg-error-bg text-error',
    badgeText: 'text-error',
  },
};

export function isTerminalStatus(status?: OrderStatus): boolean {
  return (
    status === 'DELIVERED' ||
    status === 'CANCELLED_BY_USER' ||
    status === 'CANCELLED_BY_ADMIN'
  );
}

