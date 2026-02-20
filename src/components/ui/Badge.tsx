import React from 'react';
import { cn } from '@/utils/cn';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

export const Badge = ({ className, children, ...props }: BadgeProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-medium',
        'bg-zinc-800 text-zinc-300 border border-zinc-700/50',
        'transition-colors hover:border-accent/50 hover:text-accent',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
