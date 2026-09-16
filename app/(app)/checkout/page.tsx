'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/store/cart';
import { useQuery } from '@tanstack/react-query';
import { slotsApi } from '@/lib/api/slots';
import { ordersApi } from '@/lib/api/orders';
import { formatRupees, formatTime } from '@/lib/utils/format';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import {
  ArrowLeft,
  CheckCircle2,
  Banknote,
  AlertCircle,
} from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const { error: toastError, success: toastSuccess } = useToast();
  const { items, note, clear } = useCartStore();

  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      router.replace('/cart');
    }
  }, [items, router]);

  // Query Locations
  const { data: locations, isLoading: loadingLocations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => slotsApi.getLocations(),
  });

  // Set default location to LJ if available
  useEffect(() => {
    if (locations && locations.length > 0 && !selectedLocationId) {
      const defaultLoc = locations.find((l) => l.delivery_enabled);
      if (defaultLoc) {
        setSelectedLocationId(defaultLoc.id);
      }
    }
  }, [locations, selectedLocationId]);

  // Query Slots (Refetch every 30s as required by Spec §4.7)
  const {
    data: slots,
    isLoading: loadingSlots,
    refetch: refetchSlots,
  } = useQuery({
    queryKey: ['slots', selectedLocationId],
    queryFn: () => slotsApi.getSlots(selectedLocationId),
    enabled: !!selectedLocationId,
    refetchInterval: 30_000,
  });

  // Set default slot to first available
  useEffect(() => {
    if (slots && slots.length > 0) {
      const avail = slots.find((s) => s.is_available);
      if (avail && !selectedSlotId) {
        setSelectedSlotId(avail.id);
      }
    }
  }, [slots, selectedSlotId]);

  const selectedLocation = locations?.find((l) => l.id === selectedLocationId);
  const selectedSlot = slots?.find((s) => s.id === selectedSlotId);

  // Calculate pricing
  const subtotal = items.reduce(
    (sum, i) => sum + i.pricePaise * i.quantity,
    0
  );
  const deliveryFee = selectedLocation ? selectedLocation.delivery_fee_paise : 0;
  const total = subtotal + deliveryFee;

  // Progressive step indicator
  const currentStep = !selectedLocationId ? 1 : !selectedSlotId ? 2 : 3;

  const handlePlaceOrder = async () => {
    if (!selectedLocationId) {
      toastError('Please select a delivery location');
      return;
    }
    if (!selectedSlotId) {
      toastError('Please select a delivery time slot');
      return;
    }

    setIsSubmitting(true);
    try {
      const order = await ordersApi.createOrder({
        location_id: selectedLocationId,
        slot_id: selectedSlotId,
        items: items.map((i) => ({
          menu_item_id: i.menuItemId,
          quantity: i.quantity,
        })),
        notes: note,
        payment_mode: 'COD',
      });

      toastSuccess('Order placed! We are on it.');
      clear();
      router.replace(`/orders/${order.id}?new=true`);
    } catch (err: any) {
      if (err.code === 'SLOT_FULL') {
        toastError('That slot just filled up. Please select another slot.');
        setSelectedSlotId('');
        refetchSlots();
      } else if (err.code === 'SLOT_EXPIRED') {
        toastError('Ordering for that slot has closed.');
        setSelectedSlotId('');
        refetchSlots();
      } else if (err.code === 'ITEMS_UNAVAILABLE') {
        toastError('Some items in your cart became unavailable.');
        router.push('/cart');
      } else if (err.code === 'DELIVERY_DISABLED') {
        toastError("Delivery is currently paused. Please check back later.");
      } else {
        toastError(err.message || 'Could not place order. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-lg mx-auto pb-24 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/cart"
            className="p-1.5 rounded-full text-ink hover:bg-cream-light transition-colors"
            aria-label="Back to cart"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">
            Checkout
          </h1>
        </div>
        <span className="text-xs font-semibold text-ink-muted bg-cream-light px-2.5 py-1 rounded-pill border border-line">
          Step {currentStep} of 3
        </span>
      </div>

      {/* Step 1: WHERE (PDF Page 7) */}
      <section className="space-y-2.5">
        <div className="flex items-center gap-2">
          {selectedLocationId ? (
            <CheckCircle2 className="w-4 h-4 text-success fill-success/20" />
          ) : (
            <span className="w-4 h-4 rounded-full bg-ink text-white text-[10px] font-bold flex items-center justify-center">
              1
            </span>
          )}
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            WHERE
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {loadingLocations && (
            <div className="col-span-3 text-center py-4 text-xs text-ink-muted">
              Loading locations...
            </div>
          )}

          {locations?.map((loc) => {
            const isSelected = selectedLocationId === loc.id;
            const isDisabled = !loc.delivery_enabled;

            return (
              <button
                key={loc.id}
                type="button"
                disabled={isDisabled}
                onClick={() => {
                  setSelectedLocationId(loc.id);
                  setSelectedSlotId(''); // Reset slot when location changes
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-card border transition-all select-none min-h-[74px] ${
                  isSelected
                    ? 'bg-primary-900 border-primary-900 text-cream shadow-md scale-[1.02]'
                    : isDisabled
                    ? 'bg-cream/40 border-line text-ink-subtle opacity-50 cursor-not-allowed'
                    : 'bg-surface border-line text-ink hover:border-line-strong hover:bg-cream-light'
                }`}
              >
                <span className="font-bold text-base tracking-tight">
                  {loc.code}
                </span>
                <span
                  className={`text-xs mt-0.5 ${
                    isSelected
                      ? 'text-primary-300'
                      : isDisabled
                      ? 'text-ink-subtle'
                      : 'text-ink-muted'
                  }`}
                >
                  {isDisabled
                    ? 'Paused'
                    : loc.delivery_fee_paise === 0
                    ? 'Free'
                    : formatRupees(loc.delivery_fee_paise)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Step 2: WHEN · TODAY (PDF Page 7) */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {selectedSlotId ? (
              <CheckCircle2 className="w-4 h-4 text-success fill-success/20" />
            ) : (
              <span className="w-4 h-4 rounded-full bg-ink text-white text-[10px] font-bold flex items-center justify-center">
                2
              </span>
            )}
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              WHEN · TODAY
            </h2>
          </div>
          <span className="text-[11px] text-ink-subtle">
            Updates every 30s
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {loadingSlots && (
            <div className="col-span-3 text-center py-4 text-xs text-ink-muted">
              Finding open kitchen slots...
            </div>
          )}

          {slots?.map((slot) => {
            const isSelected = selectedSlotId === slot.id;
            const isDisabled = !slot.is_available;

            let subText = '';
            if (slot.unavailable_reason === 'FULL') {
              subText = 'Full';
            } else if (slot.unavailable_reason === 'CUTOFF_PASSED') {
              subText = 'Closed';
            } else if (slot.unavailable_reason === 'DELIVERY_DISABLED') {
              subText = 'Paused';
            } else if (slot.seats_left <= 5) {
              subText = `${slot.seats_left} left`;
            }

            return (
              <button
                key={slot.id}
                type="button"
                disabled={isDisabled}
                onClick={() => setSelectedSlotId(slot.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-card border transition-all select-none min-h-[74px] ${
                  isSelected
                    ? 'bg-primary-500 border-primary-500 text-white shadow-md scale-[1.02]'
                    : isDisabled
                    ? 'bg-cream/40 border-line text-ink-subtle opacity-50 cursor-not-allowed'
                    : 'bg-surface border-line text-ink hover:border-primary-500/50'
                }`}
              >
                <span className="font-bold text-base tracking-tight">
                  {formatTime(slot.start_time)}
                </span>
                <span
                  className={`text-xs mt-0.5 ${
                    isSelected
                      ? 'text-primary-100 font-medium'
                      : isDisabled
                      ? 'text-ink-subtle'
                      : 'text-primary-600 font-semibold'
                  }`}
                >
                  {subText || 'Available'}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Step 3: CONFIRM (PDF Page 7) */}
      <section className="space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center">
            3
          </span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            CONFIRM
          </h2>
        </div>

        <div className="p-4 bg-surface rounded-card border border-line shadow-card space-y-3 text-sm">
          {/* Items Breakdown */}
          <div className="space-y-1.5 pb-2 border-b border-line">
            {items.map((i) => (
              <div
                key={i.menuItemId}
                className="flex items-center justify-between text-ink"
              >
                <span>
                  {i.quantity}× {i.name}
                </span>
                <span className="font-medium tabular-nums">
                  {formatRupees(i.pricePaise * i.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Note */}
          {note && (
            <div className="p-2.5 bg-cream-light border border-line rounded-sm text-xs text-ink-muted italic">
              Note: {note}
            </div>
          )}

          {/* Total */}
          <div className="flex items-baseline justify-between pt-1">
            <span className="font-bold text-ink text-base">Total</span>
            <span className="font-display text-2xl font-bold text-ink tabular-nums">
              {formatRupees(total)}
            </span>
          </div>

          {/* COD indicator */}
          <div className="flex items-center gap-2 p-2.5 bg-success-bg border border-success/20 rounded-sm text-success font-medium text-xs">
            <Banknote className="w-4 h-4 flex-shrink-0" />
            <span>Cash on delivery (COD)</span>
          </div>
        </div>
      </section>

      {/* Sticky Bottom Place Order CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-30 p-4 bg-cream/95 backdrop-blur border-t border-line">
        <div className="max-w-lg mx-auto">
          <Button
            size="lg"
            isLoading={isSubmitting}
            disabled={!selectedLocationId || !selectedSlotId}
            onClick={handlePlaceOrder}
            className="w-full shadow-lg"
          >
            Place order · {formatRupees(total)}
          </Button>
        </div>
      </div>
    </div>
  );
}

