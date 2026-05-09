import { forwardRef, type HTMLAttributes, type PropsWithChildren } from 'react';

import { cn } from '../utils/cn';

type SectionCardProps = PropsWithChildren<HTMLAttributes<HTMLElement>>;

export const SectionCard = forwardRef<HTMLElement, SectionCardProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <section
        className={cn('luxury-card rounded-[18px] p-5 sm:p-7', className)}
        ref={ref}
        {...props}
      >
        {children}
      </section>
    );
  },
);

SectionCard.displayName = 'SectionCard';
