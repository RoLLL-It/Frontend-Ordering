import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg';
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  let widthClass = 'max-w-md';
  if (maxWidth === 'sm') widthClass = 'max-w-sm';
  if (maxWidth === 'lg') widthClass = 'max-w-xl';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`w-full ${widthClass} bg-surface rounded-card border border-line p-6 shadow-2xl animate-in zoom-in-95 duration-200`}
      >
        <div className="flex items-start justify-between pb-3 border-b border-line mb-4">
          <div>
            <h2 id="modal-title" className="text-xl font-bold font-display text-ink">
              {title}
            </h2>
            {description && (
              <p className="text-sm text-ink-muted mt-1">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-sm text-ink-muted hover:text-ink hover:bg-cream transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}

