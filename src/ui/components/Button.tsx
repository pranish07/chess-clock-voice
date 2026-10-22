import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const STYLES: Record<Variant, string> = {
  primary:
    'bg-brand text-brandink hover:opacity-90 border border-transparent shadow-sm disabled:opacity-50',
  secondary:
    'bg-elevated text-ink border border-line hover:border-brand/60 hover:text-brand disabled:opacity-50',
  ghost: 'bg-transparent text-muted border border-transparent hover:bg-line/40 hover:text-ink',
  danger: 'bg-transparent text-danger border border-danger/30 hover:bg-danger/10',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition ${
        size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
      } ${STYLES[variant]} ${className}`}
      {...props}
    />
  );
}
