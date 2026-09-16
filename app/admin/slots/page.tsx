'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { slotsApi } from '@/lib/api/slots';
import { formatTime } from '@/lib/utils/format';
import { Toggle } from '@/components/ui/Toggle';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/providers/ToastProvider';
import { Calendar, Clock, Edit2 } from 'lucide-react';
import { DeliverySlot } from '@/types/api';

export default function AdminSlotsPage() {
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const [editSlot, setEditSlot] = useState<DeliverySlot | null>(null);
  const [newCapacity, setNewCapacity] = useState<string>('20');

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => slotsApi.getLocations(),
  });

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ['admin', 'slots'],
    queryFn: () => adminApi.getSlots(),
  });

  const capacityMutation = useMutation({
    mutationFn: ({ id, capacity }: { id: string; capacity: number }) =>
      adminApi.updateSlotCapacity(id, capacity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'slots'] });
      toastSuccess('Slot capacity updated');
      setEditSlot(null);
    },
    onError: (err: any) => {
      toastError(err.message || 'Could not update capacity');
    },
  });

  const handleSaveCapacity = () => {
    if (!editSlot) return;
    const val = parseInt(newCapacity, 10);
    if (isNaN(val) || val < editSlot.booked_count) {
      toastError(
        `Capacity cannot be less than already booked count (${editSlot.booked_count})`
      );
      return;
    }
    capacityMutation.mutate({ id: editSlot.id, capacity: val });
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">
            Delivery Slots & Capacity
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Configure pickup windows and kitchen batch sizes
          </p>
        </div>

        <div className="flex items-center gap-2 bg-surface p-2.5 rounded-card border border-line text-xs font-semibold text-ink">
          <Calendar className="w-4 h-4 text-primary-500" />
          <span>Today · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-ink-muted">
          Loading slots...
        </div>
      ) : (
        <div className="space-y-6">
          {locations.map((loc) => {
            const locSlots = slots.filter((s) => s.location_id === loc.id);

            return (
              <div
                key={loc.id}
                className="bg-surface rounded-card border border-line p-5 shadow-card space-y-3"
              >
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div>
                    <h2 className="font-display text-xl font-bold text-ink">
                      {loc.name} ({loc.code})
                    </h2>
                    <p className="text-xs text-ink-muted">
                      {loc.delivery_enabled ? 'Delivery Active' : 'Delivery Paused'} ·{' '}
                      Fee: {loc.delivery_fee_paise === 0 ? 'Free' : `₹${loc.delivery_fee_paise / 100}`}
                    </p>
                  </div>

                  <Toggle
                    checked={loc.delivery_enabled}
                    onChange={() => {
                      loc.delivery_enabled = !loc.delivery_enabled;
                      queryClient.invalidateQueries({ queryKey: ['locations'] });
                      toastSuccess(`${loc.name} delivery toggled`);
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                  {locSlots.map((slot) => {
                    const isFull = slot.booked_count >= slot.capacity;

                    return (
                      <div
                        key={slot.id}
                        className={`p-3.5 rounded-card border transition-colors flex items-center justify-between ${
                          isFull
                            ? 'bg-cream/40 border-line text-ink-subtle'
                            : 'bg-cream-light border-line text-ink'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-sm">
                            <Clock className="w-3.5 h-3.5 text-primary-500" />
                            <span>
                              {formatTime(slot.start_time)} –{' '}
                              {formatTime(slot.end_time)}
                            </span>
                          </div>

                          <div className="text-xs mt-1 text-ink-muted">
                            <span className="font-semibold text-ink tabular-nums">
                              {slot.booked_count}
                            </span>{' '}
                            / {slot.capacity} orders booked
                          </div>

                          <span
                            className={`inline-block text-[10px] font-bold uppercase mt-1 px-1.5 py-0.5 rounded ${
                              isFull
                                ? 'bg-error-bg text-error'
                                : 'bg-success-bg text-success'
                            }`}
                          >
                            {isFull ? 'FULL' : `${slot.seats_left} spots left`}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setEditSlot(slot);
                            setNewCapacity(slot.capacity.toString());
                          }}
                          className="p-2 rounded-btn text-ink-muted hover:text-ink hover:bg-surface transition-colors"
                          title="Edit capacity"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Capacity Modal */}
      <Modal
        isOpen={!!editSlot}
        onClose={() => setEditSlot(null)}
        title="Edit Slot Capacity"
        description={`Set maximum allowed orders for ${editSlot ? formatTime(editSlot.start_time) : ''}. Minimum allowed: ${editSlot?.booked_count || 0}.`}
      >
        <div className="space-y-4 mt-2">
          <Input
            label="Slot Capacity (Max Orders)"
            type="number"
            min={editSlot?.booked_count || 1}
            value={newCapacity}
            onChange={(e) => setNewCapacity(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setEditSlot(null)}
            >
              Cancel
            </Button>
            <Button
              isLoading={capacityMutation.isPending}
              onClick={handleSaveCapacity}
            >
              Save Capacity
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

