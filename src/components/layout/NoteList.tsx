import { useState } from 'react';
import { Plus, Search, FileText, RefreshCw } from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';
import { useAppStore } from '@/stores/appStore';
import { useTranslation } from '@/lib/useTranslation';
import { EmojiPicker } from '@/components/ui/EmojiPicker';
import { ContextMenu } from '@/components/ui/ContextMenu';
import { ExportModal } from '@/components/layout/ExportModal';
import type { Folder, NoteMeta } from '@/types';

export function NoteList() {
  const {
    folders,
    selectedFolderId,
    notes,
    selectedNoteId,
    selectNote,
    createNote,
    syncAll,
    updateFolder,
    deleteNote,
    isLoading,
  } = useAppStore();
  const [search, setSearch] = useState('');
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; noteId: string } | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportNoteId, setExportNoteId] = useState<string | null>(null);
  const { t, language } = useTranslation();

  const folder = folders.find((f) => f.id === selectedFolderId) as Folder | undefined;
  const filtered = notes.filter((n) => n.title.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = async () => {
    if (!selectedFolderId) return;
    await createNote(selectedFolderId);
  };

  const handleContextMenu = (e: React.MouseEvent, noteId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, noteId });
  };

  return (
    <div className="w-sidebar h-full flex flex-col bg-apple-bg dark:bg-apple-dark-bg border-r border-apple-border dark:border-apple-dark-border">
      {folder && (
        <div className="p-4">
          <div className="flex items-start gap-3 mb-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-apple-gray dark:bg-apple-dark-gray"
            >
              <EmojiPicker
                value={folder.emoji}
                size="lg"
                onChange={(emoji) => updateFolder(folder.id, { emoji })}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-apple-text dark:text-apple-dark-text truncate">{folder.name}</h2>
              <p className="text-xs text-apple-textSecondary dark:text-apple-dark-textSecondary">{t('notelist.notesCount', { count: notes.length })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCreate}
              className="flex-1 h-8 flex items-center justify-center gap-1.5 text-sm font-medium text-white bg-apple-blue dark:bg-apple-dark-blue hover:bg-apple-blueHover dark:hover:bg-apple-dark-blueHover rounded-lg transition-colors"
            >
              <Plus size={14} />
              {t('notelist.newNote')}
            </button>
            <button
              type="button"
              onClick={syncAll}
              disabled={isLoading}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-apple-border dark:border-apple-dark-border text-apple-textSecondary dark:text-apple-dark-textSecondary hover:bg-apple-grayHover dark:hover:bg-apple-dark-grayHover disabled:opacity-50"
            >
              <RefreshCw size={14} className={cn(isLoading && 'animate-spin')} />
            </button>
          </div>
        </div>
      )}

      <div className="p-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-textSecondary dark:text-apple-dark-textSecondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('notelist.search')}
            className="w-full h-8 pl-8 pr-3 text-sm bg-apple-surface dark:bg-apple-dark-surface border border-apple-border dark:border-apple-dark-border rounded-lg outline-none focus:border-apple-blue dark:focus:border-apple-dark-blue"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
        {filtered.map((note) => (
          <NoteListItem
            key={note.id}
            note={note}
            active={selectedNoteId === note.id}
            onClick={() => selectNote(note.id)}
            onContextMenu={(e) => handleContextMenu(e, note.id)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-apple-textSecondary dark:text-apple-dark-textSecondary">
            <FileText size={32} className="mb-2 opacity-40" />
            <span className="text-sm">{t('notelist.noNotes')}</span>
          </div>
        )}
      </div>

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={[
            {
              label: t('notelist.exportNote'),
              onClick: async () => {
                await selectNote(ctxMenu.noteId);
                setExportNoteId(ctxMenu.noteId);
                setExportOpen(true);
              },
            },
            { label: t('notelist.deleteNote'), danger: true, onClick: () => deleteNote(ctxMenu.noteId) },
          ]}
          onClose={() => setCtxMenu(null)}
        />
      )}
      <ExportModal open={exportOpen} onClose={() => { setExportOpen(false); setExportNoteId(null); }} />
    </div>
  );
}

function NoteListItem({
  note,
  active,
  onClick,
  onContextMenu,
}: {
  note: NoteMeta;
  active: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={cn(
        'w-full text-left px-3 py-2.5 rounded-lg transition-colors group',
        active ? 'bg-apple-surface dark:bg-apple-dark-surface' : 'hover:bg-apple-grayHover/50 dark:hover:bg-apple-dark-grayHover/50'
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{note.emoji}</span>
        <span className={cn('flex-1 text-sm font-medium truncate', active && 'text-apple-blue dark:text-apple-dark-blue')}>
          {note.title}
        </span>
      </div>
      <div className="flex items-center justify-between pl-6">
        <span className="text-xs text-apple-textSecondary dark:text-apple-dark-textSecondary">{formatDateTime(note.updatedAt)}</span>
        {note.tags.length > 0 && (
          <span className="text-xs px-1.5 py-0.5 bg-apple-gray dark:bg-apple-dark-gray rounded text-apple-textSecondary dark:text-apple-dark-textSecondary truncate max-w-[80px]">
            {note.tags[0]}
          </span>
        )}
      </div>
    </button>
  );
}