import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function IconButton({ children, className, active, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'w-8 h-8 flex items-center justify-center rounded-lg text-apple-textSecondary dark:text-apple-dark-textSecondary hover:bg-apple-grayHover dark:hover:bg-apple-dark-grayHover hover:text-apple-text dark:hover:text-apple-dark-text transition-colors',
        active && 'bg-apple-gray dark:bg-apple-dark-gray text-apple-text dark:text-apple-dark-text',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}