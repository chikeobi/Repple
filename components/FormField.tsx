import type { InputHTMLAttributes } from 'react';
import type { ReactNode } from 'react';

import { cn } from '../utils/cn';

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  helpText?: string;
  indicator?: ReactNode;
};

export function FormField({ className, helpText, indicator, label, ...props }: FormFieldProps) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--repple-muted)]">
          {label}
        </span>
        {indicator}
      </span>
      <input
        className={cn(
          'h-12 rounded-[12px] border border-[rgba(15,23,42,0.08)] bg-[var(--repple-paper-strong)] px-4 text-[15px] text-[var(--repple-ink)] outline-none shadow-[0_6px_18px_rgba(15,23,42,0.03)] transition placeholder:text-[rgba(100,116,139,0.78)] focus:border-[rgba(10,132,255,0.42)] focus:ring-4 focus:ring-[rgba(10,132,255,0.12)]',
          className,
        )}
        {...props}
      />
      {helpText ? (
        <span className="-mt-0.5 text-[11px] leading-4 text-[var(--repple-muted)]">{helpText}</span>
      ) : null}
    </label>
  );
}
