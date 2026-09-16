'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/store/cart';
import { ordersApi } from '@/lib/api/orders';
import { formatRupees } from '@/lib/utils/format';
import { CartValidateResponse } from '@/types/api';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Plus, Minus, Trash2, AlertCircle, ShoppingBag } from 'lucide-react';

export default function CartPage() {
  const router = useRouter();
  const { items, setQuantity, remove, note, setNote } = useCartStore();
  const [validation, setValidation] = useState<CartValidateResponse | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Validate cart on load and when items change
  useEffect(() => {
    if (items.length === 0) return;

    let isMounted = true;
    setIsValidating(true);

    const payload = items.map((i) => ({
      menu_item_id: i.menuItemId,
      quantity: i.quantity,
    }));

    ordersApi
      .validateCart(payload)
      .then((data) => {
        if (isMounted) setValidation(data);
      })
      .catch(() => {
        // Fallback to local store subtotal
      })
      .finally(() => {
        if (isMounted) setIsValidating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [items]);

  const hasUnavailable = (validation?.unavailable_items.length || 0) > 0;

  const handleRemoveSoldOut = () => {
    if (!validation?.unavailable_items) return;
    const toRemove = items.filter((i) =>
      validation.unavailable_items.includes(i.name)
    );
    toRemove.forEach((i) => remove(i.menuItemId));
  };

  if (items.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-center animate-in fade-in">
        <div className="w-20 h-20 rounded-full bg-cream-light border border-line flex items-center justify-center text-ink-muted mb-4">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h1 className="font-display text-2xl font-bold text-ink mb-1">
          Your cart is empty. Let&apos;s fix that.
        </h1>
        <p className="text-sm text-ink-muted max-w-xs mb-6">
          Fresh handcrafted rolls waiting for you.
        </p>
        <Link
          href="/menu"
          className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-btn shadow-md transition-transform active:scale-95"
        >
          Browse menu
        </Link>
      </div>
    );
  }

  // Use validated numbers if available, otherwise local store
  const subtotal = validation
    ? validation.subtotal_paise
    : items.reduce((sum, i) => sum + i.pricePaise * i.quantity, 0);
  const deliveryFee = validation ? validation.delivery_fee_paise : 0;
  const total = subtotal + deliveryFee;

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link
          href="/menu"
          className="p-1.5 rounded-full text-ink hover:bg-cream-light transition-colors"
          aria-label="Back to menu"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">
          Your cart
        </h1>
      </div>

      {/* Sold out alert banner (PDF Page 6) */}
      {hasUnavailable && (
        <div className="p-3.5 bg-error-bg border border-error/30 rounded-card flex flex-col gap-1.5 animate-in fade-in">
          <div className="flex items-center gap-2 text-error font-semibold text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>
              {validation?.unavailable_items.join(', ')} just sold out.
            </span>
          </div>
          <button
            type="button"
            onClick={handleRemoveSoldOut}
            className="text-left text-xs font-bold text-error underline hover:text-red-800"
          >
            Remove it and continue
          </button>
        </div>
      )}

      {/* Cart Items List */}
      <div className="space-y-3">
        {items.map((item) => {
          const isItemSoldOut = validation?.unavailable_items.includes(item.name);

          return (
            <div
              key={item.menuItemId}
              className={`p-3.5 bg-surface rounded-card border border-line shadow-card flex items-center justify-between gap-3 ${
                isItemSoldOut ? 'opacity-60 grayscale-[50%]' : ''
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative w-14 h-14 rounded-card overflow-hidden bg-cream-light border border-line flex-shrink-0">
                  <Image
                    src={item.imageUrl || '/logo.png'}
                    alt={item.name}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </div>

                <div className="min-w-0">
                  <h3 className="font-semibold text-ink text-sm truncate">
                    {item.name}
                  </h3>
                  {isItemSoldOut ? (
                    <span className="text-xs font-semibold text-error">
                      Sold out
                    </span>
                  ) : (
                    <p className="text-xs text-ink-muted">
                      {formatRupees(item.pricePaise)} each
                    </p>
                  )}
                </div>
              </div>

              {/* Stepper / Remove */}
              <div className="flex items-center gap-3">
                {isItemSoldOut ? (
                  <button
                    type="button"
                    onClick={() => remove(item.menuItemId)}
                    className="text-xs font-semibold text-error hover:underline"
                  >
                    Remove
                  </button>
                ) : (
                  <>
                    <div className="flex items-center bg-cream border border-line rounded-pill overflow-hidden">
                      <button
                        type="button"
                        onClick={() =>
                          item.quantity === 1
                            ? remove(item.menuItemId)
                            : setQuantity(item.menuItemId, item.quantity - 1)
                        }
                        className="w-7 h-7 flex items-center justify-center hover:bg-cream-light text-ink transition-colors"
                        aria-label="Decrease quantity"
                      >
                        {item.quantity === 1 ? (
                          <Trash2 className="w-3.5 h-3.5 text-error" />
                        ) : (
                          <Minus className="w-3 h-3" />
                        )}
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-ink tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity(item.menuItemId, item.quantity + 1)
                        }
                        className="w-7 h-7 flex items-center justify-center hover:bg-cream-light text-ink transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="font-bold text-ink text-sm tabular-nums min-w-[50px] text-right">
                      {formatRupees(item.pricePaise * item.quantity)}
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add a note (PDF Page 6) */}
      <div className="bg-surface rounded-card border border-line p-3.5 shadow-card">
        <div className="flex items-center justify-between text-xs text-ink-muted mb-1.5 font-medium">
          <span>Add a note (optional)</span>
          <span>{note.length}/200</span>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. less spicy, extra mint mayo"
          maxLength={200}
          rows={2}
          className="w-full p-2.5 bg-cream-light border border-line rounded-sm text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none placeholder:text-ink-subtle"
        />
      </div>

      {/* Summary Card (PDF Page 6) */}
      <div className="bg-surface rounded-card border border-line p-4 shadow-card space-y-2 text-sm">
        <div className="flex justify-between text-ink-muted">
          <span>Subtotal</span>
          <span className="font-semibold text-ink tabular-nums">
            {formatRupees(subtotal)}
          </span>
        </div>

        <div className="flex justify-between text-ink-muted">
          <span>Delivery</span>
          <span className="font-semibold text-success uppercase text-xs tracking-wider">
            {deliveryFee === 0 ? 'FREE' : formatRupees(deliveryFee)}
          </span>
        </div>

        <div className="pt-2 border-t border-line flex justify-between items-baseline">
          <span className="font-bold text-ink text-base">Total</span>
          <span className="font-display text-2xl font-bold text-ink tabular-nums">
            {formatRupees(total)}
          </span>
        </div>
      </div>

      {/* Checkout CTA Button */}
      <div className="pt-2">
        <Button
          size="lg"
          disabled={hasUnavailable || isValidating}
          onClick={() => router.push('/checkout')}
          className="w-full shadow-md"
        >
          {isValidating ? 'Checking prices...' : 'Proceed to checkout'}
        </Button>
        {hasUnavailable && (
          <p className="text-center text-xs text-error font-medium mt-2">
            Remove sold-out items to continue
          </p>
        )}
      </div>
    </div>
  );
}

