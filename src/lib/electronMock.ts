import { v4 as uuidv4 } from 'uuid';
import type { Config, Folder, NoteMeta, SyncResult, ExportOptions, ExportResult } from '@/types';
import { t } from '@/lib/i18n';
import type { Language } from '@/lib/i18n';

const STORAGE_KEY = 'gitnote_data';

interface MockData {
  folders: Folder[];
  notes: NoteMeta[];
  contents: Record<string, string>;
  config: Omit<Config, 'folders'>;
}

function getDefaultConfig(lang: Language = 'zh'): Omit<Config, 'folders'> {
  return {
    version: '0.1.0',
    theme: 'light',
    language: lang,
    fontSize: 16,
    onboardingDone: false,
    github: {
      token: '',
      owner: '',
      repo: '',
      branch: 'main',
      syncDir: 'notes',
    },
  };
}

function getWelcomeContent(lang: Language): { title: string; content: string; folderName: string; tags: string } {
  return {
    title: t(lang, 'welcome.title'),
    content: t(lang, 'welcome.content'),
    folderName: t(lang, 'welcome.folderName'),
    tags: t(lang, 'welcome.tags'),
  };
}

function now(): string {
  return String(Date.now());
}

export function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const data: MockData = JSON.parse(raw);
      return data;
    } catch {
      console.warn('Failed to parse stored data, creating fresh');
    }
  }

  const lang: Language = 'zh';
  const welcome = getWelcomeContent(lang);
  const folderId = uuidv4();
  const noteId = 'welcome-to-gitnote';

  const defaultData: MockData = {
    folders: [
      { id: folderId, name: welcome.folderName, emoji: '📁', emojiBg: '', order: 0 },
    ],
    notes: [
      {
        id: noteId,
        folderId,
        title: welcome.title,
        emoji: '📝',
        tags: [welcome.tags],
        createdAt: now(),
        updatedAt: now(),
        filename: '',
      },
    ],
    contents: {
      [noteId]: welcome.content,
    },
    config: getDefaultConfig(lang),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
  return defaultData;
}

function saveData(data: MockData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

async function readConfig(): Promise<Config> {
  const data = loadData();
  const lang = data.config.language as Language;
  const welcome = getWelcomeContent(lang);
  const welcomeNote = data.notes.find((n) => n.id === 'welcome-to-gitnote');
  const folders = data.folders.map((f) => {
    if (welcomeNote && f.id === welcomeNote.folderId) {
      return { ...f, name: welcome.folderName };
    }
    return f;
  });
  return { ...data.config, folders };
}

async function writeConfig(config: Config): Promise<boolean> {
  const data = loadData();
  const { folders, ...cfg } = config;
  data.config = cfg;
  data.folders = folders;
  saveData(data);
  return true;
}

async function listFolders(): Promise<Folder[]> {
  const data = loadData();
  const lang = data.config.language as Language;
  const welcome = getWelcomeContent(lang);
  // 欢迎频道的第一个文件夹（id 以 "welcome" 开头的第一个笔记所在文件夹）名称动态跟随语言
  const welcomeNote = data.notes.find((n) => n.id === 'welcome-to-gitnote');
  return data.folders.map((f) => {
    if (welcomeNote && f.id === welcomeNote.folderId) {
      return { ...f, name: welcome.folderName };
    }
    return f;
  });
}

async function createFolder(name: string, emoji: string): Promise<Folder> {
  const data = loadData();
  const folder: Folder = {
    id: uuidv4(),
    name,
    emoji,
    emojiBg: '',
    order: data.folders.length,
  };
  data.folders.push(folder);
  saveData(data);
  return folder;
}

async function updateFolder(id: string, name: string, emoji: string): Promise<Folder> {
  const data = loadData();
  const folder = data.folders.find((f) => f.id === id);
  if (!folder) throw new Error('Folder not found');
  folder.name = name;
  folder.emoji = emoji;
  saveData(data);
  return folder;
}

async function deleteFolder(id: string): Promise<void> {
  const data = loadData();
  data.folders = data.folders.filter((f) => f.id !== id);
  data.notes = data.notes.filter((n) => n.folderId !== id);
  for (const note of data.notes) {
    delete data.contents[note.id];
  }
  saveData(data);
}

async function listNotes(folderId: string): Promise<NoteMeta[]> {
  const data = loadData();
  const lang = data.config.language as Language;
  const welcome = getWelcomeContent(lang);
  return data.notes
    .filter((n) => n.folderId === folderId)
    .map((n) => {
      if (n.id === 'welcome-to-gitnote') {
        return { ...n, title: welcome.title, tags: [welcome.tags] };
      }
      return n;
    });
}

async function createNote(folderId: string, title: string): Promise<NoteMeta> {
  const data = loadData();
  const note: NoteMeta = {
    id: uuidv4(),
    folderId,
    title,
    emoji: '📝',
    tags: [],
    createdAt: now(),
    updatedAt: now(),
    filename: '',
  };
  data.notes.push(note);
  data.contents[note.id] = '';
  saveData(data);
  return note;
}

async function readNote(id: string): Promise<{ meta: NoteMeta; content: string } | null> {
  const data = loadData();
  const note = data.notes.find((n) => n.id === id);
  if (!note) return null;

  let content = data.contents[id] ?? '';

  // 欢迎笔记动态返回对应语言的内容
  if (id === 'welcome-to-gitnote') {
    const lang = data.config.language as Language;
    const welcome = getWelcomeContent(lang);
    note.title = welcome.title;
    note.tags = [welcome.tags];
    content = welcome.content;
  }

  return { meta: note, content };
}

async function saveNote(payload: { meta: NoteMeta; content: string }): Promise<boolean> {
  const data = loadData();
  const existing = data.notes.find((n) => n.id === payload.meta.id);
  if (!existing) {
    data.notes.push(payload.meta);
  } else {
    Object.assign(existing, payload.meta);
  }
  data.contents[payload.meta.id] = payload.content;
  saveData(data);
  return true;
}

async function deleteNote(id: string): Promise<boolean> {
  const data = loadData();
  data.notes = data.notes.filter((n) => n.id !== id);
  delete data.contents[id];
  saveData(data);
  return true;
}

async function syncAll(): Promise<SyncResult> {
  return {
    success: false,
    error: t(loadData().config.language as Language, 'sync.browserNotSupported'),
    uploaded: 0,
    downloaded: 0,
    conflicts: [],
  };
}

async function syncNote(id: string): Promise<SyncResult> {
  return {
    success: false,
    error: t(loadData().config.language as Language, 'sync.browserNotSupported'),
    uploaded: 0,
    downloaded: 0,
    conflicts: [],
  };
}

async function testConnection(): Promise<boolean> {
  return false;
}

async function getDataPath(): Promise<string> {
  return 'browser-storage';
}

async function saveNoteToDocuments(_options: ExportOptions): Promise<ExportResult> {
  return {
    success: false,
    error: t(loadData().config.language as Language, 'export.browserNotSupported'),
  };
}

export const electronMock = {
  readConfig,
  writeConfig,
  listFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  listNotes,
  createNote,
  readNote,
  saveNote,
  deleteNote,
  syncAll,
  syncNote,
  testConnection,
  getDataPath,
  saveNoteToDocuments,
  openExternal: (url: string) => window.open(url, '_blank'),
  minimizeWindow: () => {},
  maximizeWindow: () => {},
  closeWindow: () => {},
  isMaximized: async () => false,
  onMaximizeChange: (_callback: (maximized: boolean) => void) => () => {},
  selectDirectory: async () => null,
  migrateStoragePath: async () => false,
  migrateToFolderFormat: async () => false,
};