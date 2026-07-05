import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface MenuItem {
  label: string;
  danger?: boolean;
  onClick: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-[300] min-w-[140px] py-1 bg-white dark:bg-apple-dark-surface rounded-xl border border-apple-border dark:border-apple-dark-border"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            item.onClick();
            onClose();
          }}
          className={cn(
            'w-full text-left px-4 py-1.5 text-sm transition-colors',
            item.danger
              ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
              : 'text-apple-text dark:text-apple-dark-text hover:bg-apple-grayHover dark:hover:bg-apple-dark-grayHover'
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}