import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { useTranslation } from '@/lib/useTranslation';
import data from '@emoji-mart/data';
import { Picker } from 'emoji-mart';

interface NewFolderModalProps {
  open: boolean;
  onClose: () => void;
}

export function NewFolderModal({ open, onClose }: NewFolderModalProps) {
  const { createFolder, resolvedTheme } = useAppStore();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📁');
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setEmoji('📁');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // 初始化 Picker
  useEffect(() => {
    if (!open || !pickerRef.current) return;

    const instance = new Picker({
      data,
      onEmojiSelect: (e: { native: string }) => setEmoji(e.native),
      set: 'native',
      theme: resolvedTheme,
      previewPosition: 'none',
      searchPosition: 'none',
      skinTonePosition: 'none',
      maxFrequentRows: 0,
      perLine: 9,
      emojiButtonSize: 36,
      emojiSize: 20,
      navPosition: 'top',
    });

    pickerRef.current.appendChild(instance as unknown as Node);

    return () => {
      pickerRef.current?.firstChild && pickerRef.current.removeChild(pickerRef.current.firstChild);
    };
  }, [open, resolvedTheme]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    await createFolder(name.trim(), emoji);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30">
      <div className="w-[420px] max-w-[90vw] bg-white dark:bg-apple-dark-surface rounded-2xl overflow-hidden">
        <div className="h-12 flex items-center justify-between px-5">
          <h2 className="font-semibold text-apple-text dark:text-apple-dark-text">{t('newFolder.title')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-apple-grayHover dark:hover:bg-apple-dark-grayHover text-apple-textSecondary dark:text-apple-dark-textSecondary"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center text-2xl bg-apple-bg dark:bg-apple-dark-bg rounded-lg border border-apple-border dark:border-apple-dark-border select-none">
              {emoji}
            </div>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('newFolder.namePlaceholder')}
              className="flex-1 h-10 px-3 text-sm bg-apple-bg dark:bg-apple-dark-bg border border-apple-border dark:border-apple-dark-border rounded-lg outline-none focus:border-apple-blue dark:focus:border-apple-dark-blue"
            />
          </div>

          <div>
            <label className="block text-xs text-apple-textSecondary dark:text-apple-dark-textSecondary mb-2">{t('newFolder.icon')}</label>
            <div className="rounded-xl border border-apple-border dark:border-apple-dark-border overflow-hidden">
              <div ref={pickerRef} className="w-full" />
            </div>
          </div>
        </div>

        <div className="h-14 flex items-center justify-end gap-2 px-5 bg-apple-bg dark:bg-apple-dark-bg">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-8 text-sm font-medium text-apple-textSecondary dark:text-apple-dark-textSecondary hover:text-apple-text dark:hover:text-apple-dark-text"
          >
            {t('newFolder.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="px-4 h-8 text-sm font-medium text-white bg-apple-blue dark:bg-apple-dark-blue hover:bg-apple-blueHover dark:hover:bg-apple-dark-blueHover rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('newFolder.create')}
          </button>
        </div>
      </div>
    </div>
  );
}