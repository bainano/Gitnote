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
  language?: 'zh' | 'en';
  fontSize: number;
  github?: GitHubConfig;
  folders: Folder[];
  exportDir?: string;
  storageDir?: string;
  onboardingDone?: boolean;
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
