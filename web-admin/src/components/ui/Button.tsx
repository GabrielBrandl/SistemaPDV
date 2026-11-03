import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'success' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-amber-500 text-slate-900 hover:bg-amber-400',
  success: 'bg-emerald-500 text-slate-900 hover:bg-emerald-400',
  secondary: 'bg-slate-700 text-slate-100 hover:bg-slate-600',
  danger: 'bg-red-500/90 text-white hover:bg-red-500',
  ghost:
    'border border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800',
};

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2',
  lg: 'px-5 py-3 text-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  className = '',
  disabled,
  children,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        VARIANTS[variant]
      } ${SIZES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading ? 'Aguarde...' : children}
    </button>
  );
}
