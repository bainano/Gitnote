import { contextBridge, ipcRenderer } from 'electron';
import type { Config, NoteMeta, SyncResult, ExportOptions, ExportResult } from './types';

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

const api: ElectronAPI = {
  readConfig: () => ipcRenderer.invoke('fs:readConfig'),
  writeConfig: (config) => ipcRenderer.invoke('fs:writeConfig', config),
  listNotes: (folderId) => ipcRenderer.invoke('fs:listNotes', folderId),
  readNote: (noteId) => ipcRenderer.invoke('fs:readNote', noteId),
  saveNote: (payload) => ipcRenderer.invoke('fs:saveNote', payload),
  deleteNote: (noteId) => ipcRenderer.invoke('fs:deleteNote', noteId),
  syncAll: () => ipcRenderer.invoke('github:syncAll'),
  syncNote: (noteId) => ipcRenderer.invoke('github:syncNote', noteId),
  testConnection: () => ipcRenderer.invoke('github:testConnection'),
  getDataPath: () => ipcRenderer.invoke('app:getDataPath'),
  saveNoteToDocuments: (options) => ipcRenderer.invoke('app:saveNoteToDocuments', options),
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onMaximizeChange: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, maximized: boolean) => callback(maximized);
    ipcRenderer.on('window:maximizeChange', handler);
    return () => { ipcRenderer.removeListener('window:maximizeChange', handler); };
  },
  selectDirectory: () => ipcRenderer.invoke('app:selectDirectory'),
  migrateStoragePath: (oldPath, newPath) => ipcRenderer.invoke('app:migrateStoragePath', oldPath, newPath),
  migrateToFolderFormat: () => ipcRenderer.invoke('app:migrateToFolderFormat'),
};

contextBridge.exposeInMainWorld('electronAPI', api);
