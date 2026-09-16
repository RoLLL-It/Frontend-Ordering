'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { menuApi } from '@/lib/api/menu';
import { MenuItemCard } from '@/components/menu/MenuItemCard';
import { FoodTypeBadge } from '@/components/ui/Badge';
import { ArrowLeft, Search, X, AlertCircle } from 'lucide-react';

export default function MenuPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [vegOnly, setVegOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);

  const { data: menuData, isLoading, error } = useQuery({
    queryKey: ['menu'],
    queryFn: () => menuApi.getMenu(),
    staleTime: 60_000,
  });

  const categories = menuData?.categories || [];

  // Filter items client-side
  const filteredCategories = useMemo(() => {
    return categories
      .map((cat) => {
        let items = cat.items;

        if (vegOnly) {
          items = items.filter((i) => i.is_veg);
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          items = items.filter(
            (i) =>
              i.name.toLowerCase().includes(q) ||
              i.description.toLowerCase().includes(q)
          );
        }

        return {
          ...cat,
          items,
        };
      })
      .filter((cat) => {
        if (selectedCategory !== 'all' && cat.id !== selectedCategory) {
          return false;
        }
        return cat.items.length > 0;
      });
  }, [categories, selectedCategory, vegOnly, searchQuery]);

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-200">
      {/* Top Bar (PDF Page 5) */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href="/home"
            className="p-1.5 rounded-full text-ink hover:bg-cream-light transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">
            Menu
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setShowSearch(!showSearch)}
          className={`p-2 rounded-full transition-colors ${
            showSearch
              ? 'bg-primary-500 text-white'
              : 'text-ink hover:bg-cream-light'
          }`}
          aria-label="Search menu"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>

      {/* Search Input */}
      {showSearch && (
        <div className="relative animate-in fade-in slide-in-from-top-2 duration-150">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by roll name or ingredient..."
            autoFocus
            className="w-full h-11 pl-10 pr-10 bg-surface border border-line rounded-btn text-ink text-base focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
          />
          <Search className="w-5 h-5 text-ink-subtle absolute left-3 top-3" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 text-ink-subtle hover:text-ink absolute right-3 top-2.5"
              aria-label="Clear search"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Notice if delivery is disabled */}
      {menuData && !menuData.delivery_enabled && (
        <div className="flex items-center gap-2 p-3 bg-warning-bg border border-warning/20 rounded-card text-warning text-sm font-medium">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>Kitchen's closed — you can browse but not order right now.</span>
        </div>
      )}

      {/* Category Tabs & Veg Filter Chip (PDF Page 5) */}
      <div className="space-y-2.5 sticky top-[61px] z-20 bg-cream/95 backdrop-blur py-2 -mx-4 px-4 sm:-mx-6 sm:px-6 border-b border-line/40">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-1.5 rounded-pill text-sm font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-primary-900 text-cream shadow-sm'
                : 'bg-surface text-ink border border-line hover:border-line-strong'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-1.5 rounded-pill text-sm font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-primary-900 text-cream shadow-sm'
                  : 'bg-surface text-ink border border-line hover:border-line-strong'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Veg Only Filter Chip */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setVegOnly(!vegOnly)}
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-pill text-xs font-semibold border transition-all ${
              vegOnly
                ? 'bg-veg/10 border-veg text-veg shadow-xs'
                : 'bg-surface border-line text-ink-muted hover:text-ink'
            }`}
          >
            <FoodTypeBadge isVeg={true} />
            <span>Veg only</span>
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-28 bg-surface rounded-card border border-line animate-pulse p-4 flex gap-4"
            >
              <div className="w-20 h-20 bg-cream rounded-card" />
              <div className="flex-1 space-y-2 py-1">
                <div className="w-1/2 h-4 bg-cream rounded" />
                <div className="w-3/4 h-3 bg-cream rounded" />
                <div className="w-1/4 h-4 bg-cream rounded mt-4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-8 text-center bg-surface rounded-card border border-error/20">
          <p className="text-error font-semibold mb-2">Could not load menu</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-500 text-white rounded-btn font-semibold text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Menu Categories and Items */}
      {!isLoading && filteredCategories.length === 0 && (
        <div className="py-12 text-center text-ink-muted">
          <p className="font-semibold text-lg">No items found</p>
          <p className="text-sm mt-1">Try resetting filters or search terms.</p>
        </div>
      )}

      {!isLoading &&
        filteredCategories.map((cat) => (
          <section key={cat.id} className="space-y-3 pt-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              {cat.name}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {cat.items.map((item) => (
                <MenuItemCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}

