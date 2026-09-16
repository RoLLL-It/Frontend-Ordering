'use client';

import React from 'react';
import Image from 'next/image';
import { MenuItem } from '@/types/api';
import { FoodTypeBadge } from '@/components/ui/Badge';
import { formatRupees } from '@/lib/utils/format';
import { useCartStore } from '@/lib/store/cart';
import { Star, Plus, Minus } from 'lucide-react';

export interface MenuItemCardProps {
  item: MenuItem;
}

export function MenuItemCard({ item }: MenuItemCardProps) {
  const { items, add, setQuantity } = useCartStore();

  const cartItem = items.find((ci) => ci.menuItemId === item.id);
  const qty = cartItem?.quantity || 0;
  const isSoldOut = !item.is_available;

  return (
    <div
      className={`relative flex gap-3.5 p-3.5 sm:p-4 bg-surface rounded-card border border-line shadow-card transition-all ${
        isSoldOut ? 'opacity-60 grayscale-[40%]' : 'hover:border-line-strong'
      }`}
    >
      {/* Thumbnail */}
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-card overflow-hidden bg-cream-light border border-line">
        <Image
          src={item.image_url || '/logo.png'}
          alt={item.name}
          fill
          sizes="(max-width: 640px) 80px, 96px"
          className="object-cover"
        />
      </div>

      {/* Content */}
      <div className="flex flex-col justify-between flex-grow min-w-0">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <FoodTypeBadge isVeg={item.is_veg} />
            <h3 className="font-semibold text-ink text-base tracking-tight truncate">
              {item.name}
            </h3>
          </div>

          <p className="text-xs text-ink-muted line-clamp-2 mt-0.5">
            {item.description}
          </p>

          <div className="flex items-center gap-1 mt-1 text-xs text-ink-subtle">
            <Star className="w-3.5 h-3.5 fill-primary-500 text-primary-500" />
            <span className="font-semibold text-ink tabular-nums">
              {item.rating_avg.toFixed(1)}
            </span>
            <span className="text-ink-muted">({item.rating_count})</span>
          </div>
        </div>

        {/* Price & Action */}
        <div className="flex items-center justify-between mt-2 pt-1 border-t border-line/40">
          <span className="font-bold text-ink text-base tabular-nums">
            {formatRupees(item.price_paise)}
          </span>

          {isSoldOut ? (
            <span className="px-3 py-1 bg-line text-ink-subtle text-xs font-semibold rounded-pill select-none">
              Sold out
            </span>
          ) : qty > 0 ? (
            <div className="flex items-center bg-primary-500 text-white rounded-pill shadow-sm overflow-hidden select-none">
              <button
                type="button"
                onClick={() => setQuantity(item.id, qty - 1)}
                className="w-8 h-8 flex items-center justify-center hover:bg-primary-600 active:scale-95 transition-transform"
                aria-label={`Decrease quantity of ${item.name}`}
              >
                <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
              <span className="w-6 text-center text-sm font-bold tabular-nums">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(item.id, qty + 1)}
                className="w-8 h-8 flex items-center justify-center hover:bg-primary-600 active:scale-95 transition-transform"
                aria-label={`Increase quantity of ${item.name}`}
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() =>
                add({
                  menuItemId: item.id,
                  name: item.name,
                  pricePaise: item.price_paise,
                  isVeg: item.is_veg,
                  imageUrl: item.image_url,
                })
              }
              className="px-4 py-1.5 bg-surface border border-line-strong hover:border-primary-500 hover:text-primary-600 text-ink font-semibold text-sm rounded-pill transition-all active:scale-95 shadow-sm"
              aria-label={`Add ${item.name} to cart`}
            >
              Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

