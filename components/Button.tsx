import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

import { cn } from '../utils/cn';

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost';
    fullWidth?: boolean;
  }
>;

const variantStyles = {
  primary:
    'bg-[var(--repple-accent)] text-white shadow-[0_14px_30px_rgba(10,132,255,0.24)] hover:bg-[var(--repple-accent-deep)]',
  secondary:
    'bg-white/88 text-[var(--repple-ink)] border border-[rgba(15,23,42,0.08)] shadow-[0_10px_24px_rgba(15,23,42,0.04)] hover:bg-white',
  ghost:
    'bg-transparent text-[var(--repple-muted)] border border-transparent hover:bg-[rgba(255,255,255,0.7)] hover:text-[var(--repple-ink)]',
};

export function Button({
  children,
  className,
  fullWidth,
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex min-h-11 items-center justify-center rounded-[12px] px-4 py-2.5 text-sm font-medium tracking-[0.005em] transition duration-150 disabled:cursor-not-allowed disabled:opacity-60',
        variantStyles[variant],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
