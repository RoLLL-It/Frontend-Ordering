import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  prefixText?: string;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      prefixText,
      rightElement,
      id,
      className = '',
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const errorId = inputId ? `${inputId}-error` : undefined;
    const helperId = inputId ? `${inputId}-helper` : undefined;

    return (
      <div className="flex flex-col w-full text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {prefixText && (
            <span className="inline-flex items-center px-3.5 h-11 border border-r-0 border-line rounded-l-sm bg-cream text-ink font-medium text-base select-none">
              {prefixText}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={`w-full h-11 px-3.5 text-base text-ink bg-surface border ${
              error
                ? 'border-error focus:ring-error'
                : 'border-line focus:border-primary-500 focus:ring-primary-500'
            } ${
              prefixText ? 'rounded-r-sm' : 'rounded-sm'
            } transition-all duration-150 placeholder:text-ink-subtle/60 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
              rightElement ? 'pr-11' : ''
            } ${className}`}
            {...props}
          />

          {rightElement && (
            <div className="absolute right-3 flex items-center justify-center">
              {rightElement}
            </div>
          )}
        </div>

        {error ? (
          <p id={errorId} className="text-sm text-error mt-1 font-medium animate-in fade-in duration-150">
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-ink-subtle mt-1">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

