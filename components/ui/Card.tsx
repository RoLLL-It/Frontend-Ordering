import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'cream' | 'dark';
}

export function Card({
  children,
  className = '',
  variant = 'surface',
  ...props
}: CardProps) {
  let bg = 'bg-surface border-line text-ink';
  if (variant === 'cream') {
    bg = 'bg-cream-light border-line text-ink';
  } else if (variant === 'dark') {
    bg = 'bg-primary-900 border-primary-800 text-cream';
  }

  return (
    <div
      className={`rounded-card border p-4 sm:p-5 shadow-card ${bg} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

