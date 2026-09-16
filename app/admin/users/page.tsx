'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { useAuth } from '@/components/providers/AuthProvider';
import { UserRole } from '@/types/api';
import { useToast } from '@/components/providers/ToastProvider';
import { Search, ShieldCheck } from 'lucide-react';

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin', 'users', search, roleFilter],
    queryFn: () =>
      adminApi.getUsers(search, roleFilter === 'all' ? undefined : roleFilter),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      adminApi.updateUserRole(id, role),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toastSuccess(`Updated ${updated.name}'s role to ${updated.role}`);
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to update role');
    },
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">
            User Management
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">
            View customer base, staff access, and security roles
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, phone..."
              className="h-10 pl-9 pr-3 bg-surface border border-line rounded-btn text-xs text-ink focus:outline-none focus:ring-2 focus:ring-primary-500 w-48 sm:w-64 shadow-xs"
            />
            <Search className="w-4 h-4 text-ink-subtle absolute left-3 top-3" />
          </div>

          {/* Role filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-10 px-3 bg-surface border border-line rounded-btn text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-xs"
          >
            <option value="all">All Roles</option>
            <option value="CUSTOMER">Customers</option>
            <option value="STAFF">Staff</option>
            <option value="ADMIN">Admins</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-ink-muted">
          Loading users...
        </div>
      ) : (
        <div className="bg-surface rounded-card border border-line shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line bg-cream/40 text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                  <th className="py-3 px-4 sm:px-6">USER</th>
                  <th className="py-3 px-4">PHONE</th>
                  <th className="py-3 px-4">ORDERS</th>
                  <th className="py-3 px-4">ROLE</th>
                  <th className="py-3 px-4 sm:px-6 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60 text-sm">
                {users.map((u) => {
                  const isSelf = currentUser?.id === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-cream-light/30">
                      {/* Name & Email */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-900 text-cream flex items-center justify-center font-bold text-xs">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 font-semibold text-ink">
                              <span>{u.name}</span>
                              {isSelf && (
                                <span className="px-1.5 py-0.2 bg-primary-100 text-primary-800 rounded text-[10px] font-bold">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-ink-muted">
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 font-mono text-xs text-ink">
                        +91 {u.phone}
                      </td>

                      {/* Orders */}
                      <td className="py-3.5 px-4 text-xs font-semibold tabular-nums text-ink">
                        {u.orders_count || 0}
                      </td>

                      {/* Role selection */}
                      <td className="py-3.5 px-4">
                        <select
                          disabled={isSelf}
                          value={u.role}
                          onChange={(e) =>
                            roleMutation.mutate({
                              id: u.id,
                              role: e.target.value as UserRole,
                            })
                          }
                          className={`h-8 px-2 rounded text-xs font-semibold border ${
                            isSelf
                              ? 'bg-cream/50 text-ink-subtle border-line cursor-not-allowed'
                              : 'bg-surface text-ink border-line focus:ring-primary-500'
                          }`}
                        >
                          <option value="CUSTOMER">CUSTOMER</option>
                          <option value="STAFF">STAFF</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-success bg-success-bg px-2.5 py-0.5 rounded-pill">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

