import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import data from '@emoji-mart/data';
import { Picker } from 'emoji-mart';
import { useAppStore } from '@/stores/appStore';

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_STYLES = {
  sm: 'w-6 h-6 text-sm',
  md: 'w-7 h-7 text-lg',
  lg: 'w-10 h-10 text-2xl',
};

export function EmojiPicker({ value, onChange, className, size = 'md' }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const pickerInstance = useRef<Picker | null>(null);
  const resolvedTheme = useAppStore((s) => s.resolvedTheme);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node)) return;
      if (panelRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open || !pickerRef.current) return;

    const instance = new Picker({
      data,
      onEmojiSelect: (emoji: { native: string }) => {
        onChange(emoji.native);
        setOpen(false);
      },
      set: 'native',
      theme: resolvedTheme,
      previewPosition: 'none',
      searchPosition: 'none',
      skinTonePosition: 'none',
      maxFrequentRows: 0,
      perLine: 8,
      emojiButtonSize: 36,
      emojiSize: 20,
      navPosition: 'top',
    });

    pickerRef.current.appendChild(instance as unknown as Node);
    pickerInstance.current = instance;

    return () => {
      pickerRef.current?.firstChild && pickerRef.current.removeChild(pickerRef.current.firstChild);
      pickerInstance.current = null;
    };
  }, [open, onChange, resolvedTheme]);

  const handleOpen = useCallback(() => {
    const btn = triggerRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const panelWidth = 352;
    const panelHeight = 435;
    let left = rect.left;
    let top = rect.bottom + 6;

    if (left + panelWidth > window.innerWidth) {
      left = window.innerWidth - panelWidth - 12;
    }
    if (left < 12) left = 12;
    if (top + panelHeight > window.innerHeight) {
      top = rect.top - panelHeight - 6;
    }

    setPos({ top, left });
    setOpen(true);
  }, []);

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className={cn(
          'flex items-center justify-center rounded-md hover:bg-apple-grayHover/60 dark:hover:bg-apple-dark-grayHover/60 transition-colors cursor-pointer select-none',
          SIZE_STYLES[size]
        )}
      >
        {value || '😀'}
      </button>
      {open && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[9999] bg-white dark:bg-apple-dark-surface rounded-xl border border-apple-border dark:border-apple-dark-border"
          style={{ top: pos.top, left: pos.left }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div ref={pickerRef} />
        </div>,
        document.body
      )}
    </div>
  );
}