import { useState } from 'react';
import { Plus, Search, Settings, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/appStore';
import { useTranslation } from '@/lib/useTranslation';
import { EmojiPicker } from '@/components/ui/EmojiPicker';
import { ContextMenu } from '@/components/ui/ContextMenu';
import { NewFolderModal } from '@/components/layout/NewFolderModal';
import type { Folder } from '@/types';

export function FolderSidebar() {
  const { t } = useTranslation();
  const {
    folders,
    selectedFolderId,
    selectFolder,
    updateFolder,
    deleteFolder,
    sidebarCollapsed,
    toggleSidebar,
  } = useAppStore();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; folderId: string } | null>(null);

  const filtered = folders.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));

  const handleEmojiChange = (folder: Folder, emoji: string) => {
    updateFolder(folder.id, { emoji });
  };

  const handleContextMenu = (e: React.MouseEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, folderId });
  };

  const content = (
    <>
      <div className="h-12 flex items-center justify-between px-4">
        <span className="font-semibold text-sm text-apple-text dark:text-apple-dark-text">{t('sidebar.channels')}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-apple-grayHover dark:hover:bg-apple-dark-grayHover text-apple-textSecondary dark:text-apple-dark-textSecondary"
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-settings'))}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-apple-grayHover dark:hover:bg-apple-dark-grayHover text-apple-textSecondary dark:text-apple-dark-textSecondary"
          >
            <Settings size={16} />
          </button>
          <button
            type="button"
            onClick={toggleSidebar}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-apple-grayHover dark:hover:bg-apple-dark-grayHover text-apple-textSecondary dark:text-apple-dark-textSecondary"
            title={t('sidebar.collapse')}
          >
            <PanelLeftClose size={16} />
          </button>
        </div>
      </div>

      <div className="p-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-textSecondary dark:text-apple-dark-textSecondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('sidebar.filterChannels')}
            className="w-full h-8 pl-8 pr-3 text-sm bg-apple-surface dark:bg-apple-dark-surface border border-apple-border dark:border-apple-dark-border rounded-lg outline-none focus:border-apple-blue dark:focus:border-apple-dark-blue"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
        {filtered.map((folder) => (
          <div
            key={folder.id}
            onClick={() => selectFolder(folder.id)}
            onContextMenu={(e) => handleContextMenu(e, folder.id)}
            className={cn(
              'group flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-colors',
              selectedFolderId === folder.id ? 'bg-apple-surface dark:bg-apple-dark-surface' : 'hover:bg-apple-grayHover/50 dark:hover:bg-apple-dark-grayHover/50'
            )}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <EmojiPicker value={folder.emoji} onChange={(emoji) => handleEmojiChange(folder, emoji)} />
            </div>
            <span className="flex-1 text-sm font-medium truncate">{folder.name}</span>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="w-full flex items-center gap-3 px-2 py-2 text-sm text-apple-textSecondary dark:text-apple-dark-textSecondary hover:bg-apple-grayHover/50 dark:hover:bg-apple-dark-grayHover/50 rounded-lg transition-colors"
        >
          <Plus size={16} />
          <span>{t('sidebar.newChannel')}</span>
        </button>
      </div>

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={[
            { label: t('sidebar.deleteChannel'), danger: true, onClick: () => deleteFolder(ctxMenu.folderId) },
          ]}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </>
  );

  if (sidebarCollapsed) {
    return (
      <aside className="h-full flex flex-col items-center bg-apple-bg dark:bg-apple-dark-bg border-r border-apple-border dark:border-apple-dark-border py-3 px-2 gap-2">
        <button
          type="button"
          onClick={toggleSidebar}
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-apple-grayHover dark:hover:bg-apple-dark-grayHover text-apple-textSecondary dark:text-apple-dark-textSecondary"
          title={t('sidebar.expand')}
        >
          <PanelLeftOpen size={16} />
        </button>
        {filtered.map((folder) => (
          <button
            key={folder.id}
            type="button"
            onClick={() => selectFolder(folder.id)}
            onContextMenu={(e) => handleContextMenu(e, folder.id)}
            className={cn(
              'w-9 h-9 flex items-center justify-center text-lg rounded-xl transition-colors',
              selectedFolderId === folder.id ? 'bg-apple-surface dark:bg-apple-dark-surface' : 'hover:bg-apple-grayHover/50 dark:hover:bg-apple-dark-grayHover/50'
            )}
            title={folder.name}
          >
            {folder.emoji}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="w-9 h-9 flex items-center justify-center text-lg rounded-xl hover:bg-apple-grayHover/50 dark:hover:bg-apple-dark-grayHover/50 text-apple-textSecondary dark:text-apple-dark-textSecondary"
          title={t('sidebar.newChannel')}
        >
          <Plus size={16} />
        </button>
        {ctxMenu && (
          <ContextMenu
            x={ctxMenu.x}
            y={ctxMenu.y}
            items={[
              { label: t('sidebar.deleteChannel'), danger: true, onClick: () => deleteFolder(ctxMenu.folderId) },
            ]}
            onClose={() => setCtxMenu(null)}
          />
        )}
        <NewFolderModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </aside>
    );
  }

  return (
    <aside className="w-sidebar h-full flex flex-col bg-apple-bg dark:bg-apple-dark-bg border-r border-apple-border dark:border-apple-dark-border">
      {content}
      <NewFolderModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </aside>
  );
}