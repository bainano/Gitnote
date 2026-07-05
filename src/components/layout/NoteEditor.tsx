import { useEffect, useRef, useState, useCallback } from 'react';
import { RefreshCw, Trash2, Type, FileCode, Check, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/appStore';
import { useTranslation } from '@/lib/useTranslation';
import { EmojiPicker } from '@/components/ui/EmojiPicker';
import { IconButton } from '@/components/ui/IconButton';
import { BlockEditor } from '@/components/editor/BlockEditor';
import { ExportModal } from '@/components/layout/ExportModal';

export function NoteEditor() {
  const { t } = useTranslation();
  const {
    currentNote,
    isLoading,
    updateCurrentNoteMeta,
    saveCurrentNote,
    deleteCurrentNote,
    syncCurrentNote,
    syncResult,
    language,
  } = useAppStore();
  const [mode, setMode] = useState<'block' | 'markdown'>('block');
  const [localContent, setLocalContent] = useState('');
  const [localTitle, setLocalTitle] = useState('');
  const [localTags, setLocalTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    if (currentNote) {
      setLocalContent(currentNote.content);
      setLocalTitle(currentNote.meta.title);
      setLocalTags(currentNote.meta.tags);
    }
  }, [currentNote?.meta.id]);

  const debouncedSave = useCallback(
    (content: string, title: string, tags: string[]) => {
      if (!currentNote) return;
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        updateCurrentNoteMeta({ title, tags });
        saveCurrentNote(content);
      }, 500);
    },
    [currentNote, saveCurrentNote, updateCurrentNoteMeta]
  );

  const handleContentChange = (value: string) => {
    setLocalContent(value);
    debouncedSave(value, localTitle, localTags);
  };

  const handleTitleChange = (value: string) => {
    setLocalTitle(value);
    debouncedSave(localContent, value, localTags);
  };

  const handleTagAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      const next = [...localTags, tagInput.trim()];
      setLocalTags(next);
      setTagInput('');
      debouncedSave(localContent, localTitle, next);
    }
  };

  const removeTag = (tag: string) => {
    const next = localTags.filter((t) => t !== tag);
    setLocalTags(next);
    debouncedSave(localContent, localTitle, next);
  };

  if (!currentNote) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-apple-dark-surface">
        <div className="text-center text-apple-textSecondary dark:text-apple-dark-textSecondary">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
          </svg>
          <p className="text-sm font-medium">{t('editor.emptyTitle')}</p>
          <p className="text-xs mt-1 opacity-60">{t('editor.emptySubtitle')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full flex flex-col bg-white dark:bg-apple-dark-surface">
      <div className="h-12 flex items-center justify-between px-6">
        <div className="flex items-center gap-1">
          <IconButton
            active={mode === 'block'}
            onClick={() => setMode('block')}
            title={t('editor.viewBlock')}
            className={mode === 'block' ? 'bg-apple-gray dark:bg-apple-dark-gray text-apple-text dark:text-apple-dark-text' : ''}
          >
            <Type size={16} />
          </IconButton>
          <IconButton
            active={mode === 'markdown'}
            onClick={() => setMode('markdown')}
            title={t('editor.viewSource')}
            className={mode === 'markdown' ? 'bg-apple-gray dark:bg-apple-dark-gray text-apple-text dark:text-apple-dark-text' : ''}
          >
            <FileCode size={16} />
          </IconButton>
        </div>
        <div className="flex items-center gap-1">
          <IconButton onClick={syncCurrentNote} title={t('editor.sync')} disabled={isLoading}>
            <RefreshCw size={16} className={cn(isLoading && 'animate-spin')} />
          </IconButton>
          <IconButton onClick={() => setExportOpen(true)} title={t('editor.export')}>
            <Download size={16} />
          </IconButton>
          <IconButton onClick={deleteCurrentNote} title={t('editor.delete')} className="hover:text-red-500">
            <Trash2 size={16} />
          </IconButton>
        </div>
      </div>

      {syncResult && !syncResult.success && syncResult.error && (
        <div className="px-6 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs">
          {syncResult.error}
        </div>
      )}
      {syncResult?.success && syncResult.uploaded + syncResult.downloaded > 0 && (
        <div className="px-6 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs flex items-center gap-1">
          <Check size={12} />
          {t('editor.syncDone', { uploaded: syncResult.uploaded, downloaded: syncResult.downloaded })}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-8 py-6 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-4">
          <EmojiPicker
            value={currentNote.meta.emoji}
            size="lg"
            onChange={(emoji) => {
              updateCurrentNoteMeta({ emoji });
              saveCurrentNote(localContent);
            }}
          />
          <input
            type="text"
            value={localTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder={t('editor.titlePlaceholder')}
            className="flex-1 h-10 text-3xl font-bold text-apple-text dark:text-apple-dark-text bg-transparent outline-none placeholder:text-apple-textSecondary/30 dark:placeholder:text-apple-dark-textSecondary/30"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-6 pl-14">
          {localTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-apple-gray dark:bg-apple-dark-gray rounded-md text-apple-textSecondary dark:text-apple-dark-textSecondary"
            >
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="hover:text-apple-text dark:hover:text-apple-dark-text">
                ×
              </button>
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagAdd}
            placeholder={t('editor.addTag')}
            className="w-24 h-6 text-xs bg-transparent outline-none placeholder:text-apple-textSecondary/50 dark:placeholder:text-apple-dark-textSecondary/50 text-apple-text dark:text-apple-dark-text"
          />
        </div>

        {mode === 'block' ? (
          <BlockEditor content={localContent} onChange={handleContentChange} />
        ) : (
          <textarea
            value={localContent}
            onChange={(e) => handleContentChange(e.target.value)}
            className="w-full h-[calc(100%-120px)] resize-none outline-none font-mono text-sm text-apple-text dark:text-apple-dark-text bg-transparent"
            spellCheck={false}
          />
        )}
      </div>
      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}
