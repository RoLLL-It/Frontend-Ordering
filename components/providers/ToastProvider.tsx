'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toast: addToast,
        success: (msg) => addToast(msg, 'success'),
        error: (msg) => addToast(msg, 'error'),
        warning: (msg) => addToast(msg, 'warning'),
        info: (msg) => addToast(msg, 'info'),
      }}
    >
      {children}
      {/* Toast container */}
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-4 z-50 flex flex-col gap-2 w-[90%] max-w-sm pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((t) => {
          let bg = 'bg-surface text-ink border-line';
          let Icon = Info;
          let iconColor = 'text-info';

          if (t.type === 'success') {
            bg = 'bg-success-bg text-success border-success/30';
            Icon = CheckCircle2;
            iconColor = 'text-success';
          } else if (t.type === 'error') {
            bg = 'bg-error-bg text-error border-error/30';
            Icon = AlertCircle;
            iconColor = 'text-error';
          } else if (t.type === 'warning') {
            bg = 'bg-warning-bg text-warning border-warning/30';
            Icon = AlertCircle;
            iconColor = 'text-warning';
          }

          return (
            <div
              key={t.id}
              role={t.type === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-card border shadow-card text-sm font-medium ${bg} transition-all duration-200 animate-in fade-in slide-in-from-top-2`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
                <span>{t.message}</span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="p-1 hover:opacity-70 rounded focus:outline-none"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

