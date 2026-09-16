'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { menuApi } from '@/lib/api/menu';
import { useAuth } from '@/components/providers/AuthProvider';
import { MenuItem } from '@/types/api';
import { formatRupees } from '@/lib/utils/format';
import { FoodTypeBadge } from '@/components/ui/Badge';
import { Toggle } from '@/components/ui/Toggle';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/providers/ToastProvider';
import { Plus, Info, Star } from 'lucide-react';

export default function AdminMenuPage() {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('140');
  const [newItemCategory, setNewItemCategory] = useState('cat-1');
  const [newItemIsVeg, setNewItemIsVeg] = useState(true);

  const { data: menuData, isLoading } = useQuery({
    queryKey: ['menu'],
    queryFn: () => menuApi.getMenu(),
  });

  const categories = menuData?.categories || [];
  const totalItems = categories.reduce((sum, c) => sum + c.items.length, 0);

  // Toggle availability mutation with optimistic update
  const toggleMutation = useMutation({
    mutationFn: (id: string) => adminApi.toggleAvailability(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['menu'] });
      const previous = queryClient.getQueryData(['menu']);

      queryClient.setQueryData(['menu'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          categories: old.categories.map((c: any) => ({
            ...c,
            items: c.items.map((it: MenuItem) =>
              it.id === id ? { ...it, is_available: !it.is_available } : it
            ),
          })),
        };
      });

      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['menu'], context.previous);
      }
      toastError('Failed to update availability');
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      toastSuccess(
        `${updated.name} is now ${updated.is_available ? 'available' : 'sold out'}`
      );
    },
  });

  // Create item mutation
  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createItem({
        category_id: newItemCategory,
        name: newItemName,
        description: newItemDesc,
        price_paise: parseInt(newItemPrice, 10) * 100,
        is_veg: newItemIsVeg,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      toastSuccess('New item added to menu');
      setAddModalOpen(false);
      setNewItemName('');
      setNewItemDesc('');
      setNewItemPrice('140');
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to create item');
    },
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header (PDF Page 12) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Menu</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {totalItems} items across {categories.length} categories
          </p>
        </div>

        {isAdmin && (
          <Button
            size="md"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add item</span>
          </Button>
        )}
      </div>

      {/* Staff Permission Notice Banner (PDF Page 12) */}
      <div className="flex items-start gap-2.5 p-3.5 bg-cream-light border border-line rounded-card text-xs text-ink-muted">
        <Info className="w-4 h-4 text-primary-600 flex-shrink-0 mt-0.5" />
        <span>
          You&apos;re signed in as Staff — you can mark items sold out, but only an
          admin can change prices or add items.
        </span>
      </div>

      {/* Categories & Items Table (PDF Page 12) */}
      {isLoading ? (
        <div className="py-16 text-center text-sm text-ink-muted">
          Loading menu table...
        </div>
      ) : (
        <div className="bg-surface rounded-card border border-line shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line bg-cream/40 text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                  <th className="py-3 px-4 sm:px-6">ITEM</th>
                  <th className="py-3 px-4">PRICE</th>
                  <th className="py-3 px-4">RATING</th>
                  <th className="py-3 px-4 text-center">AVAILABLE</th>
                  <th className="py-3 px-4 sm:px-6 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {categories.map((cat) => (
                  <React.Fragment key={cat.id}>
                    {/* Category Header Row */}
                    <tr className="bg-cream-light/70">
                      <td
                        colSpan={5}
                        className="py-2.5 px-4 sm:px-6 text-xs font-bold uppercase tracking-wider text-ink"
                      >
                        {cat.name}
                      </td>
                    </tr>

                    {/* Items */}
                    {cat.items.map((item) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-cream-light/30 transition-colors ${
                          !item.is_available ? 'bg-cream/20' : ''
                        }`}
                      >
                        {/* ITEM */}
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 rounded-sm overflow-hidden bg-cream border border-line flex-shrink-0">
                              <Image
                                src={item.image_url || '/logo.png'}
                                alt={item.name}
                                fill
                                sizes="48px"
                                className={`object-cover ${
                                  !item.is_available ? 'grayscale' : ''
                                }`}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <FoodTypeBadge isVeg={item.is_veg} />
                                <span className="font-semibold text-ink text-sm">
                                  {item.name}
                                </span>
                                {!item.is_available && (
                                  <span className="px-1.5 py-0.5 rounded-sm bg-line text-error text-[10px] font-bold uppercase">
                                    SOLD OUT
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-ink-muted truncate max-w-xs mt-0.5">
                                {item.description}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* PRICE */}
                        <td className="py-3.5 px-4 font-bold text-ink text-sm tabular-nums whitespace-nowrap">
                          {formatRupees(item.price_paise)}
                        </td>

                        {/* RATING */}
                        <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                          <div className="flex items-center gap-1 text-ink">
                            <Star className="w-3.5 h-3.5 fill-primary-500 text-primary-500" />
                            <span className="font-bold tabular-nums">
                              {item.rating_avg.toFixed(1)}
                            </span>
                            <span className="text-ink-muted">
                              ({item.rating_count})
                            </span>
                          </div>
                        </td>

                        {/* AVAILABLE (STAFF Toggle) */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex justify-center">
                            <Toggle
                              checked={item.is_available}
                              onChange={() => toggleMutation.mutate(item.id)}
                            />
                          </div>
                        </td>

                        {/* ACTIONS */}
                        <td className="py-3.5 px-4 sm:px-6 text-right text-xs">
                          <div className="inline-flex items-center gap-3">
                            <button
                              type="button"
                              disabled={!isAdmin}
                              className={`font-semibold transition-colors ${
                                isAdmin
                                  ? 'text-primary-600 hover:text-primary-700'
                                  : 'text-ink-subtle opacity-50 cursor-not-allowed'
                              }`}
                              title={
                                isAdmin
                                  ? 'Edit item'
                                  : 'Admin privileges required to edit price/details'
                              }
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={!isAdmin}
                              className={`font-semibold transition-colors ${
                                isAdmin
                                  ? 'text-error hover:text-red-700'
                                  : 'text-ink-subtle opacity-50 cursor-not-allowed'
                              }`}
                              title={
                                isAdmin
                                  ? 'Remove item'
                                  : 'Admin privileges required to delete'
                              }
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Item Modal (Admin Only) */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add New Menu Item"
        description="Add a new handcrafted roll or side to the kitchen menu."
      >
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1 block">
              Category
            </label>
            <select
              value={newItemCategory}
              onChange={(e) => setNewItemCategory(e.target.value)}
              className="w-full h-11 px-3 bg-surface border border-line rounded-sm text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Item Name"
            placeholder="e.g. Mutton Galouti Roll"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
          />

          <div>
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1 block">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Fresh spiced meat, onions, mint chutney..."
              value={newItemDesc}
              onChange={(e) => setNewItemDesc(e.target.value)}
              className="w-full p-2.5 bg-surface border border-line rounded-sm text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <Input
            label="Price (₹ Rupees)"
            type="number"
            min="10"
            value={newItemPrice}
            onChange={(e) => setNewItemPrice(e.target.value)}
          />

          <div className="flex items-center gap-3 pt-1">
            <Toggle
              checked={newItemIsVeg}
              onChange={(v) => setNewItemIsVeg(v)}
              label={newItemIsVeg ? 'Vegetarian Item' : 'Non-Vegetarian Item'}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
            <Button
              variant="secondary"
              onClick={() => setAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={!newItemName.trim() || !newItemPrice}
              isLoading={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Save item
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

