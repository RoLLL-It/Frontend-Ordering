import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      ...props
    },
    ref
  ) => {
    let variantStyles = 'bg-primary-500 text-white hover:bg-primary-700 active:scale-[0.98] shadow-sm';

    if (variant === 'secondary') {
      variantStyles =
        'bg-surface text-ink border border-line-strong hover:bg-cream-light active:scale-[0.98]';
    } else if (variant === 'ghost') {
      variantStyles = 'bg-transparent text-primary-600 hover:bg-primary-50 active:scale-[0.98]';
    } else if (variant === 'danger') {
      variantStyles = 'bg-error text-white hover:bg-red-700 active:scale-[0.98]';
    }

    let sizeStyles = 'min-h-[44px] px-4 py-2.5 text-base'; // default md
    if (size === 'sm') {
      sizeStyles = 'min-h-[36px] px-3 py-1.5 text-sm';
    } else if (size === 'lg') {
      sizeStyles = 'min-h-[52px] px-6 py-3.5 text-lg font-semibold';
    }

    const disabledStyles = disabled || isLoading ? 'opacity-60 cursor-not-allowed pointer-events-none' : '';

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center font-medium rounded-btn transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${variantStyles} ${sizeStyles} ${disabledStyles} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>{children}</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

