import { useState } from 'react';
import { X, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/appStore';
import { useTranslation } from '@/lib/useTranslation';
import type { ImageExportMode } from '@/types';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
}

export function ExportModal({ open, onClose }: ExportModalProps) {
  const { t } = useTranslation();
  const { exportNote } = useAppStore();
  const [imageMode, setImageMode] = useState<ImageExportMode>('base64');
  const [isExporting, setIsExporting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setResult(null);
    try {
      const res = await exportNote(imageMode);
      if (res.success) {
        setResult({ success: true, message: `${t('export.success')}\n${res.path || ''}` });
      } else {
        setResult({ success: false, message: res.error || t('export.failed') });
      }
    } catch {
      setResult({ success: false, message: t('export.failed') });
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setImageMode('base64');
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30">
      <div className="w-[420px] max-w-[90vw] bg-white dark:bg-apple-dark-surface rounded-2xl overflow-hidden">
        <div className="h-12 flex items-center justify-between px-5">
          <h2 className="font-semibold text-apple-text dark:text-apple-dark-text">{t('export.title')}</h2>
          <button
            type="button"
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-apple-grayHover dark:hover:bg-apple-dark-grayHover text-apple-textSecondary dark:text-apple-dark-textSecondary"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-apple-textSecondary dark:text-apple-dark-textSecondary mb-2">{t('export.imageMode')}</label>
            <div className="space-y-2">
              <label
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors',
                  imageMode === 'base64'
                    ? 'border-apple-blue dark:border-apple-dark-blue bg-apple-blue/5 dark:bg-apple-dark-blue/10'
                    : 'border-apple-border dark:border-apple-dark-border hover:bg-apple-grayHover dark:hover:bg-apple-dark-grayHover'
                )}
              >
                <input
                  type="radio"
                  name="imageMode"
                  value="base64"
                  checked={imageMode === 'base64'}
                  onChange={() => setImageMode('base64')}
                  className="sr-only"
                />
                <div
                  className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
                    imageMode === 'base64'
                      ? 'border-apple-blue dark:border-apple-dark-blue'
                      : 'border-apple-textSecondary/30 dark:border-apple-dark-textSecondary/30'
                  )}
                >
                  {imageMode === 'base64' && <div className="w-2 h-2 rounded-full bg-apple-blue dark:bg-apple-dark-blue" />}
                </div>
                <span className="text-sm text-apple-text dark:text-apple-dark-text">{t('export.imageMode.base64')}</span>
              </label>
              <label
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors',
                  imageMode === 'file'
                    ? 'border-apple-blue dark:border-apple-dark-blue bg-apple-blue/5 dark:bg-apple-dark-blue/10'
                    : 'border-apple-border dark:border-apple-dark-border hover:bg-apple-grayHover dark:hover:bg-apple-dark-grayHover'
                )}
              >
                <input
                  type="radio"
                  name="imageMode"
                  value="file"
                  checked={imageMode === 'file'}
                  onChange={() => setImageMode('file')}
                  className="sr-only"
                />
                <div
                  className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
                    imageMode === 'file'
                      ? 'border-apple-blue dark:border-apple-dark-blue'
                      : 'border-apple-textSecondary/30 dark:border-apple-dark-textSecondary/30'
                  )}
                >
                  {imageMode === 'file' && <div className="w-2 h-2 rounded-full bg-apple-blue dark:bg-apple-dark-blue" />}
                </div>
                <span className="text-sm text-apple-text dark:text-apple-dark-text">{t('export.imageMode.file')}</span>
              </label>
            </div>
          </div>

          {result && (
            <div
              className={cn(
                'px-3 py-2 rounded-lg text-xs',
                result.success
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
              )}
            >
              {result.message}
            </div>
          )}
        </div>

        <div className="h-14 flex items-center justify-end gap-2 px-5 bg-apple-bg dark:bg-apple-dark-bg">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 h-8 text-sm font-medium text-apple-textSecondary dark:text-apple-dark-textSecondary hover:text-apple-text dark:hover:text-apple-dark-text"
          >
            {result?.success ? t('export.close') : t('export.cancel')}
          </button>
          {!result?.success && (
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="px-4 h-8 text-sm font-medium text-white bg-apple-blue dark:bg-apple-dark-blue hover:bg-apple-blueHover dark:hover:bg-apple-dark-blueHover rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Download size={14} />
              {isExporting ? t('export.exporting') : t('export.confirm')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
