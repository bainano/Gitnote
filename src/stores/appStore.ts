import { create } from 'zustand';
import { v4 } from '@/lib/utils';
import { electronMock } from '@/lib/electronMock';
import { initializeTheme, getStoredTheme } from '@/lib/theme';
import type { Config, Folder, NoteMeta, SyncResult, ImageExportMode, ExportResult } from '@/types';

type Language = 'zh' | 'en';

type ThemeMode = 'light' | 'dark' | 'system';

const api = window.electronAPI || electronMock;

const initialTheme = getStoredTheme();

interface AppState {
  config: Config | null;
  folders: Folder[];
  selectedFolderId: string | null;
  notes: NoteMeta[];
  selectedNoteId: string | null;
  currentNote: { meta: NoteMeta; content: string } | null;
  isLoading: boolean;
  syncResult: SyncResult | null;
  sidebarCollapsed: boolean;
  language: Language;
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  onboardingDone: boolean;

  loadConfig: () => Promise<void>;
  saveConfig: (config: Config) => Promise<void>;
  selectFolder: (folderId: string) => Promise<void>;
  loadNotes: () => Promise<void>;
  selectNote: (noteId: string) => Promise<void>;
  createNote: (folderId: string, title?: string) => Promise<NoteMeta | null>;
  saveCurrentNote: (content: string) => Promise<void>;
  updateCurrentNoteMeta: (updates: Partial<NoteMeta>) => void;
  deleteCurrentNote: () => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  createFolder: (name: string, emoji?: string) => Promise<void>;
  updateFolder: (folderId: string, updates: Partial<Folder>) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  syncAll: () => Promise<void>;
  syncCurrentNote: () => Promise<void>;
  testConnection: () => Promise<boolean>;
  exportNote: (imageExportMode: ImageExportMode) => Promise<ExportResult>;
  selectStorageDir: () => Promise<void>;
  migrateStoragePath: (oldPath: string, newPath: string) => Promise<boolean>;
  toggleSidebar: () => void;
  setLanguage: (lang: Language) => void;
  setTheme: (theme: ThemeMode) => void;
  setOnboardingDone: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  config: null,
  folders: [],
  selectedFolderId: null,
  notes: [],
  selectedNoteId: null,
  currentNote: null,
  isLoading: false,
  syncResult: null,
  sidebarCollapsed: false,
  language: 'zh',
  theme: initialTheme,
  resolvedTheme: initialTheme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : initialTheme,
  onboardingDone: false,

  loadConfig: async () => {
    if (!api) return;
    const config = await api.readConfig();
    const language = config.language || 'zh';
    const theme = config.theme || 'system';
    initializeTheme(theme);
    set({
      config,
      folders: config.folders,
      language,
      theme,
      resolvedTheme: theme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme,
      onboardingDone: !!config.onboardingDone,
    });
    if (config.folders.length > 0 && !get().selectedFolderId) {
      await get().selectFolder(config.folders[0].id);
    }
  },

  saveConfig: async (config) => {
    if (!api) return;
    await api.writeConfig(config);
    set({ config, folders: config.folders });
  },

  selectFolder: async (folderId) => {
    set({ selectedFolderId: folderId, selectedNoteId: null, currentNote: null });
    await get().loadNotes();
  },

  loadNotes: async () => {
    if (!api) return;
    const { selectedFolderId } = get();
    const notes = await api.listNotes(selectedFolderId || undefined);
    set({ notes });
    if (notes.length > 0 && !get().selectedNoteId) {
      await get().selectNote(notes[0].id);
    }
  },

  selectNote: async (noteId) => {
    if (!api) return;
    set({ isLoading: true, selectedNoteId: noteId });
    const data = await api.readNote(noteId);
    set({ currentNote: data, isLoading: false });
  },

  createNote: async (folderId, title) => {
    if (!api) return null;
    const lang = get().language;
    const defaultTitle = lang === 'zh' ? '未命名笔记' : 'Untitled';
    const id = v4();
    const note: NoteMeta = {
      id,
      folderId,
      title: title || defaultTitle,
      emoji: '📝',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      filename: '',
    };
    await api.saveNote({ meta: note, content: '' });
    await get().loadNotes();
    await get().selectNote(id);
    return note;
  },

  saveCurrentNote: async (content) => {
    if (!api) return;
    const { currentNote } = get();
    if (!currentNote) return;
    await api.saveNote({ meta: currentNote.meta, content });
    await get().loadNotes();
  },

  updateCurrentNoteMeta: (updates) => {
    const { currentNote } = get();
    if (!currentNote) return;
    set({ currentNote: { meta: { ...currentNote.meta, ...updates }, content: currentNote.content } });
  },

  deleteCurrentNote: async () => {
    if (!api) return;
    const { currentNote } = get();
    if (!currentNote) return;
    await api.deleteNote(currentNote.meta.id);
    set({ currentNote: null, selectedNoteId: null });
    await get().loadNotes();
  },

  deleteNote: async (noteId) => {
    if (!api) return;
    await api.deleteNote(noteId);
    const { selectedNoteId } = get();
    if (selectedNoteId === noteId) {
      set({ currentNote: null, selectedNoteId: null });
    }
    await get().loadNotes();
  },

  createFolder: async (name, emoji = '📁') => {
    if (!api) return;
    const { config } = get();
    if (!config) return;
    const id = v4();
    const folder: Folder = {
      id,
      name,
      emoji,
      emojiBg: '',
      order: config.folders.length,
    };
    const newConfig = { ...config, folders: [...config.folders, folder] };
    await api.writeConfig(newConfig);
    set({ config: newConfig, folders: newConfig.folders });
  },

  updateFolder: async (folderId, updates) => {
    if (!api) return;
    const { config } = get();
    if (!config) return;
    const folders = config.folders.map((f) => (f.id === folderId ? { ...f, ...updates } : f));
    const newConfig = { ...config, folders };
    await api.writeConfig(newConfig);
    set({ config: newConfig, folders });
  },

  deleteFolder: async (folderId) => {
    if (!api) return;
    const { config, notes, selectedFolderId, selectedNoteId } = get();
    if (!config) return;
    const folderNotes = notes.filter((n) => n.folderId === folderId);
    for (const note of folderNotes) {
      await api.deleteNote(note.id);
    }
    const folders = config.folders.filter((f) => f.id !== folderId);
    const newConfig = { ...config, folders };
    await api.writeConfig(newConfig);
    set({ config: newConfig, folders });
    if (selectedFolderId === folderId) {
      if (folders.length > 0) {
        set({ selectedFolderId: null, currentNote: null, selectedNoteId: null });
        await get().selectFolder(folders[0].id);
      } else {
        set({ selectedFolderId: null, currentNote: null, selectedNoteId: null, notes: [] });
      }
    } else {
      await get().loadNotes();
    }
  },

  toggleSidebar: () => {
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed }));
  },

  syncAll: async () => {
    if (!api) return;
    set({ isLoading: true });
    const result = await api.syncAll();
    set({ syncResult: result, isLoading: false });
    if (result.success) {
      await get().loadNotes();
    }
  },

  syncCurrentNote: async () => {
    if (!api) return;
    const { currentNote } = get();
    if (!currentNote) return;
    set({ isLoading: true });
    await api.saveNote({ meta: currentNote.meta, content: currentNote.content });
    const result = await api.syncNote(currentNote.meta.id);
    set({ syncResult: result, isLoading: false });
    if (result.success) {
      await get().loadNotes();
    }
  },

  testConnection: async () => {
    if (!api) return false;
    return api.testConnection();
  },

  exportNote: async (imageExportMode) => {
    if (!api) return { success: false, error: 'No API available' };
    const { currentNote } = get();
    if (!currentNote) return { success: false, error: 'No note selected' };
    return api.saveNoteToDocuments({ noteId: currentNote.meta.id, imageExportMode });
  },

  selectStorageDir: async () => {
    if (!api) return;
    const dir = await api.selectDirectory();
    if (dir) {
      const { config } = get();
      if (config) {
        set({ config: { ...config, storageDir: dir } });
      }
    }
  },

  migrateStoragePath: async (oldPath, newPath) => {
    if (!api) return false;
    return api.migrateStoragePath(oldPath, newPath);
  },

  setLanguage: async (lang) => {
    set({ language: lang });
    const { config } = get();
    if (config) {
      const newConfig = { ...config, language: lang };
      await api?.writeConfig(newConfig);
      // 重新读取 config 获取动态 patch 后的欢迎频道名
      const updatedConfig = await api?.readConfig();
      if (updatedConfig) set({ config: updatedConfig, folders: updatedConfig.folders });
    }
    // 切换语言后重新加载当前频道的笔记列表和当前笔记
    const { selectedFolderId, selectedNoteId } = get();
    if (selectedFolderId) {
      const notes = await api?.listNotes(selectedFolderId);
      if (notes) set({ notes });
    }
    if (selectedNoteId) {
      const data = await api?.readNote(selectedNoteId);
      if (data) set({ currentNote: data });
    }
  },

  setTheme: (theme) => {
    set({
      theme,
      resolvedTheme: theme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme,
    });
    const { config } = get();
    if (config) {
      const newConfig = { ...config, theme };
      api?.writeConfig(newConfig);
      set({ config: newConfig });
    }
  },

  setOnboardingDone: () => {
    set({ onboardingDone: true });
    const { config } = get();
    if (config) {
      const newConfig = { ...config, onboardingDone: true };
      api?.writeConfig(newConfig);
      set({ config: newConfig });
    }
  },
}));
