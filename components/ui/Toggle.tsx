import React from 'react';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
  className = '',
}: ToggleProps) {
  return (
    <label
      className={`inline-flex items-center gap-3 cursor-pointer select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`w-[52px] h-[32px] rounded-pill transition-colors duration-200 ease-in-out border ${
            checked
              ? 'bg-primary-500 border-primary-600'
              : 'bg-line-strong border-line'
          }`}
        >
          <div
            className={`w-[26px] h-[26px] mt-[2px] ml-[2px] rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
              checked ? 'translate-x-[20px]' : 'translate-x-0'
            }`}
          />
        </div>
      </div>
      {label && <span className="text-sm font-medium text-ink">{label}</span>}
    </label>
  );
}

