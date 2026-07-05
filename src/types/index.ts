export interface Folder {
  id: string;
  name: string;
  emoji: string;
  emojiBg: string;
  order: number;
}

export interface NoteMeta {
  id: string;
  folderId: string;
  title: string;
  emoji: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  filename: string;
}

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  syncDir: string;
  imageExportMode?: ImageExportMode;
}

export interface NoteConfig {
  id: string;
  title: string;
  emoji: string;
  tags: string[];
  folderId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Config {
  version: string;
  theme: 'light' | 'dark' | 'system';
  language: 'zh' | 'en';
  fontSize: number;
  github?: GitHubConfig;
  folders: Folder[];
  onboardingDone?: boolean;
  exportDir?: string;
  storageDir?: string;
}

export type ImageExportMode = 'base64' | 'file';

export interface ExportOptions {
  noteId: string;
  imageExportMode: ImageExportMode;
}

export interface ExportResult {
  success: boolean;
  path?: string;
  error?: string;
}

export interface SyncResult {
  success: boolean;
  uploaded: number;
  downloaded: number;
  conflicts: string[];
  error?: string;
}

export type BlockType = 'paragraph' | 'heading' | 'todo' | 'callout' | 'code' | 'bullet' | 'numbered' | 'divider' | 'quote' | 'image';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  meta?: Record<string, unknown>;
}

export interface ElectronAPI {
  readConfig: () => Promise<Config>;
  writeConfig: (config: Config) => Promise<boolean>;
  listNotes: (folderId?: string) => Promise<NoteMeta[]>;
  readNote: (noteId: string) => Promise<{ meta: NoteMeta; content: string } | null>;
  saveNote: (payload: { meta: NoteMeta; content: string }) => Promise<boolean>;
  deleteNote: (noteId: string) => Promise<boolean>;
  syncAll: () => Promise<SyncResult>;
  syncNote: (noteId: string) => Promise<SyncResult>;
  testConnection: () => Promise<boolean>;
  getDataPath: () => Promise<string>;
  saveNoteToDocuments: (options: ExportOptions) => Promise<ExportResult>;
  openExternal: (url: string) => Promise<void>;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  isMaximized: () => Promise<boolean>;
  onMaximizeChange: (callback: (maximized: boolean) => void) => () => void;
  selectDirectory: () => Promise<string | null>;
  migrateStoragePath: (oldPath: string, newPath: string) => Promise<boolean>;
  migrateToFolderFormat: () => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}