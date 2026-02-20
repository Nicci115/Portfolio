import React from 'react';
import { cn } from '@/utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card = ({ className, children, ...props }: CardProps) => {
  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-xl p-6',
        'hover:border-zinc-700 transition-colors duration-300',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
