import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import YAML from 'yaml';
import { v4 as uuidv4 } from 'uuid';
import type { Config, NoteMeta, NoteConfig, SyncResult, ExportOptions, ExportResult } from './types';

const prodPath = path.join(__dirname, '../dist/index.html');
const isDev = !existsSync(prodPath);
let mainWindow: BrowserWindow | null = null;
const configPath = path.join(app.getPath('userData'), 'config.json');

let dataDir = path.join(app.getPath('userData'), 'notes');
let notesMetaPath = path.join(dataDir, 'notes-meta.json');

function formatDate(date: Date = new Date()): string {
  return date.toISOString();
}

async function ensureDir(dir: string = dataDir) {
  if (!existsSync(dir)) {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function readConfig(): Promise<Config> {
  if (!existsSync(configPath)) {
    const defaultConfig: Config = {
      version: '0.1.0',
      theme: 'light',
      fontSize: 16,
      folders: [
        {
          id: uuidv4(),
          name: '开始使用',
          emoji: '☂️',
          emojiBg: '#F4D03F',
          order: 0,
        },
      ],
    };
    await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
  }
  const raw = await fs.readFile(configPath, 'utf-8');
  return JSON.parse(raw) as Config;
}

async function writeConfig(config: Config): Promise<boolean> {
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  return true;
}

function updateDataDir(config: Config) {
  const newDir = config.storageDir || path.join(app.getPath('userData'), 'notes');
  if (newDir !== dataDir) {
    dataDir = newDir;
    notesMetaPath = path.join(dataDir, 'notes-meta.json');
  }
}

async function readNotesMeta(): Promise<{ notes: NoteMeta[] }> {
  await ensureDir(dataDir);
  if (!existsSync(notesMetaPath)) {
    return { notes: [] };
  }
  const raw = await fs.readFile(notesMetaPath, 'utf-8');
  return JSON.parse(raw) as { notes: NoteMeta[] };
}

async function writeNotesMeta(meta: { notes: NoteMeta[] }) {
  await ensureDir(dataDir);
  await fs.writeFile(notesMetaPath, JSON.stringify(meta, null, 2));
}

async function rebuildNotesMeta(): Promise<{ notes: NoteMeta[] }> {
  await ensureDir(dataDir);
  const entries = await fs.readdir(dataDir);
  const notes: NoteMeta[] = [];

  for (const entry of entries) {
    const entryPath = path.join(dataDir, entry);
    try {
      const stat = await fs.stat(entryPath);
      if (!stat.isDirectory()) continue;
      if (entry === 'images') continue;

      const configPath = path.join(entryPath, 'config.json');
      if (!existsSync(configPath)) continue;

      const configRaw = await fs.readFile(configPath, 'utf-8');
      const noteConfig = JSON.parse(configRaw) as NoteConfig;

      if (!noteConfig.id || !noteConfig.title || !noteConfig.folderId) continue;

      notes.push({
        id: noteConfig.id,
        folderId: noteConfig.folderId,
        title: noteConfig.title,
        emoji: noteConfig.emoji || '📝',
        tags: noteConfig.tags || [],
        createdAt: noteConfig.createdAt || formatDate(),
        updatedAt: noteConfig.updatedAt || formatDate(),
        filename: '',
      });
    } catch {
      // Skip invalid entries
    }
  }

  return { notes };
}

async function listNotes(folderId?: string): Promise<NoteMeta[]> {
  let meta = await readNotesMeta();

  // If index is empty but folders exist, rebuild from filesystem
  if (meta.notes.length === 0) {
    try {
      const entries = await fs.readdir(dataDir);
      const hasNoteFolders = entries.some((e) => {
        try {
          return existsSync(path.join(dataDir, e, 'config.json'));
        } catch {
          return false;
        }
      });
      if (hasNoteFolders) {
        meta = await rebuildNotesMeta();
        await writeNotesMeta(meta);
      }
    } catch {
      // Ignore rebuild errors
    }
  }

  let notes = meta.notes;
  if (folderId) {
    notes = notes.filter((n) => n.folderId === folderId);
  }
  return notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function buildNoteConfig(meta: NoteMeta): NoteConfig {
  return {
    id: meta.id,
    title: meta.title,
    emoji: meta.emoji,
    tags: meta.tags,
    folderId: meta.folderId,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
  };
}

function parseFrontMatter(content: string): { front: Partial<NoteMeta>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { front: {}, body: content };
  }
  return { front: YAML.parse(match[1]) as Partial<NoteMeta>, body: match[2] };
}

async function findMdFileInDir(dir: string): Promise<string | null> {
  try {
    const entries = await fs.readdir(dir);
    const mdFile = entries.find((e) => e.endsWith('.md'));
    return mdFile ? path.join(dir, mdFile) : null;
  } catch {
    return null;
  }
}

async function readNote(noteId: string): Promise<{ meta: NoteMeta; content: string } | null> {
  const meta = await readNotesMeta();
  const note = meta.notes.find((n) => n.id === noteId);
  if (!note) return null;

  // Try folder format first: <dataDir>/<noteId>/<title>.md
  const noteDir = path.join(dataDir, noteId);
  if (existsSync(noteDir)) {
    const mdFile = await findMdFileInDir(noteDir);
    if (mdFile) {
      const content = await fs.readFile(mdFile, 'utf-8');
      return { meta: note, content };
    }
  }

  // Fallback: old flat format (<dataDir>/<filename>)
  if (note.filename) {
    const filePath = path.join(dataDir, note.filename);
    if (existsSync(filePath)) {
      const raw = await fs.readFile(filePath, 'utf-8');
      const { body } = parseFrontMatter(raw);
      return { meta: note, content: body };
    }
  }

  return null;
}

async function saveNote(payload: { meta: NoteMeta; content: string }): Promise<boolean> {
  await ensureDir(dataDir);
  const meta = await readNotesMeta();
  const now = formatDate();
  const existing = meta.notes.find((n) => n.id === payload.meta.id);
  const noteMeta: NoteMeta = {
    ...payload.meta,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    filename: existing?.filename || '',
  };

  // Write to folder format: <dataDir>/<noteId>/<title>.md + config.json
  const noteDir = path.join(dataDir, noteMeta.id);
  await fs.mkdir(noteDir, { recursive: true });

  const noteConfig = buildNoteConfig(noteMeta);
  await fs.writeFile(path.join(noteDir, 'config.json'), JSON.stringify(noteConfig, null, 2), 'utf-8');

  // Clean up old MD files in this folder (title might have changed)
  try {
    const entries = await fs.readdir(noteDir);
    for (const entry of entries) {
      if (entry.endsWith('.md') && entry !== `${noteMeta.title || 'untitled'}.md`) {
        await fs.unlink(path.join(noteDir, entry));
      }
    }
  } catch { /* ignore */ }

  // Write pure markdown content (no frontmatter)
  const mdFileName = `${noteMeta.title || 'untitled'}.md`;
  await fs.writeFile(path.join(noteDir, mdFileName), payload.content, 'utf-8');

  // Clean up old flat file if it exists
  if (noteMeta.filename) {
    const oldPath = path.join(dataDir, noteMeta.filename);
    if (existsSync(oldPath)) {
      try { await fs.unlink(oldPath); } catch { /* ignore */ }
    }
  }

  const idx = meta.notes.findIndex((n) => n.id === noteMeta.id);
  if (idx >= 0) {
    meta.notes[idx] = noteMeta;
  } else {
    meta.notes.push(noteMeta);
  }
  await writeNotesMeta(meta);
  return true;
}

async function deleteNote(noteId: string): Promise<boolean> {
  const meta = await readNotesMeta();
  const note = meta.notes.find((n) => n.id === noteId);
  if (!note) return false;

  // Delete folder format
  const noteDir = path.join(dataDir, noteId);
  if (existsSync(noteDir)) {
    await fs.rm(noteDir, { recursive: true, force: true });
  }

  // Also delete old flat file if exists
  if (note.filename) {
    const filePath = path.join(dataDir, note.filename);
    if (existsSync(filePath)) {
      try { await fs.unlink(filePath); } catch { /* ignore */ }
    }
  }

  meta.notes = meta.notes.filter((n) => n.id !== noteId);
  await writeNotesMeta(meta);
  return true;
}

async function migrateToFolderFormat(): Promise<boolean> {
  await ensureDir(dataDir);
  const meta = await readNotesMeta();
  let migrated = 0;

  for (const note of meta.notes) {
    const noteDir = path.join(dataDir, note.id);
    if (existsSync(noteDir)) continue; // Already in folder format

    // Find old flat file
    let oldFilePath: string | null = null;
    if (note.filename) {
      const p = path.join(dataDir, note.filename);
      if (existsSync(p)) oldFilePath = p;
    }

    if (!oldFilePath) continue; // No file to migrate

    // Read and parse old file
    const raw = await fs.readFile(oldFilePath, 'utf-8');
    const { front, body } = parseFrontMatter(raw);

    // Create folder
    await fs.mkdir(noteDir, { recursive: true });

    // Write config.json
    const noteConfig: NoteConfig = {
      id: note.id,
      title: note.title,
      emoji: note.emoji,
      tags: note.tags,
      folderId: note.folderId,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };
    await fs.writeFile(path.join(noteDir, 'config.json'), JSON.stringify(noteConfig, null, 2), 'utf-8');

    // Write pure markdown
    await fs.writeFile(path.join(noteDir, `${note.title || 'untitled'}.md`), body, 'utf-8');

    // Delete old file
    await fs.unlink(oldFilePath);

    // Update filename to empty (no longer needed)
    note.filename = '';
    migrated++;
  }

  if (migrated > 0) {
    await writeNotesMeta(meta);
  }
  return migrated > 0;
}

async function migrateStoragePath(oldPath: string, newPath: string): Promise<boolean> {
  await ensureDir(newPath);

  // Read meta from old path
  const oldMetaPath = path.join(oldPath, 'notes-meta.json');
  if (!existsSync(oldMetaPath)) return false;

  const raw = await fs.readFile(oldMetaPath, 'utf-8');
  const meta = JSON.parse(raw) as { notes: NoteMeta[] };

  // Copy each note folder
  for (const note of meta.notes) {
    const srcDir = path.join(oldPath, note.id);
    const destDir = path.join(newPath, note.id);

    if (existsSync(srcDir) && !existsSync(destDir)) {
      await fs.cp(srcDir, destDir, { recursive: true });
    } else if (!existsSync(destDir)) {
      // Try old flat format
      if (note.filename) {
        const srcFile = path.join(oldPath, note.filename);
        if (existsSync(srcFile)) {
          await fs.mkdir(destDir, { recursive: true });
          const content = await fs.readFile(srcFile, 'utf-8');
          const { body } = parseFrontMatter(content);
          const noteConfig = buildNoteConfig(note);
          await fs.writeFile(path.join(destDir, 'config.json'), JSON.stringify(noteConfig, null, 2), 'utf-8');
          await fs.writeFile(path.join(destDir, `${note.title || 'untitled'}.md`), body, 'utf-8');
        }
      }
    }
  }

  // Copy notes-meta.json
  await fs.writeFile(path.join(newPath, 'notes-meta.json'), JSON.stringify(meta, null, 2), 'utf-8');

  return true;
}

async function selectDirectory(): Promise<string | null> {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
}

// --- GitHub Sync ---

async function githubRequest(url: string, token: string, method: string = 'GET', body?: unknown) {
  const options: RequestInit = {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    let hint = '';
    if (res.status === 401) {
      hint = 'Token 无效，请检查 Personal Access Token 是否正确';
    } else if (res.status === 403) {
      hint = 'Token 权限不足。经典 Token 需要勾选 "repo" 权限；细粒度 Token 需要开启 "Contents" 读写权限';
    } else if (res.status === 404) {
      hint = '仓库不存在，请检查仓库所有者和仓库名是否正确';
    }
    throw new Error(`GitHub API ${res.status}: ${text}${hint ? '\n' + hint : ''}`);
  }
  return res.json();
}

async function fetchRemoteFile(url: string, token: string): Promise<string> {
  const data = (await githubRequest(url, token)) as { content: string; encoding: 'base64' };
  return Buffer.from(data.content, 'base64').toString('utf-8');
}

async function fetchRemoteFileSha(url: string, token: string): Promise<string | null> {
  try {
    const data = (await githubRequest(url, token)) as { sha: string };
    return data.sha;
  } catch {
    return null;
  }
}

async function uploadFileToGitHub(
  filePath: string,
  remotePath: string,
  token: string,
  owner: string,
  repo: string,
  branch: string,
  sha?: string,
  message?: string,
) {
  const apiBase = `https://api.github.com/repos/${owner}/${repo}`;
  const ext = path.extname(filePath).toLowerCase();
  const binaryExts = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.ico', '.pdf'];
  const isBinary = binaryExts.includes(ext);

  let base64Content: string;
  if (isBinary) {
    const buffer = await fs.readFile(filePath);
    base64Content = buffer.toString('base64');
  } else {
    const content = await fs.readFile(filePath, 'utf-8');
    base64Content = Buffer.from(content).toString('base64');
  }

  const body: Record<string, string> = {
    message: message || `sync: ${path.basename(filePath)}`,
    content: base64Content,
    branch,
  };
  if (sha) body.sha = sha;
  await githubRequest(`${apiBase}/contents/${remotePath}`, token, 'PUT', body);
}

async function deleteRemoteFile(
  remotePath: string,
  token: string,
  owner: string,
  repo: string,
  branch: string,
  message: string,
) {
  const apiBase = `https://api.github.com/repos/${owner}/${repo}`;
  const sha = await fetchRemoteFileSha(
    `https://api.github.com/repos/${owner}/${repo}/contents/${remotePath}`,
    token,
  );
  if (!sha) return;
  await githubRequest(`${apiBase}/contents/${remotePath}`, token, 'DELETE', {
    message,
    sha,
    branch,
  });
}

async function uploadNoteFolder(
  noteId: string,
  token: string,
  owner: string,
  repo: string,
  branch: string,
  remoteBase: string,
  imageExportMode?: 'base64' | 'file',
) {
  const noteDir = path.join(dataDir, noteId);
  if (!existsSync(noteDir)) return;

  const entries = await fs.readdir(noteDir);

  // Find current MD file to get its name
  const currentMdFile = entries.find((e) => e.endsWith('.md'));
  const currentMdName = currentMdFile || 'untitled.md';

  // Read MD content
  let mdContent = '';
  if (currentMdFile) {
    mdContent = await fs.readFile(path.join(noteDir, currentMdFile), 'utf-8');
  }

  if (imageExportMode === 'file' && mdContent) {
    // Extract base64 images to files
    const imagesDir = path.join(noteDir, 'images');
    let imageIndex = 0;
    let changed = false;

    const newContent = mdContent.replace(
      /!\[(.*?)\]\(data:(image\/[^;]+);base64,([^)]+)\)/g,
      (_match, caption: string, mimeType: string, b64Data: string) => {
        const ext = mimeType.split('/')[1] || 'png';
        const filename = `img_${imageIndex++}.${ext}`;
        const imgPath = path.join(imagesDir, filename);
        if (!existsSync(imagesDir)) {
          mkdirSync(imagesDir, { recursive: true });
        }
        writeFileSync(imgPath, Buffer.from(b64Data, 'base64'));
        changed = true;
        return `![${caption || 'image'}](images/${filename})`;
      },
    );

    if (changed) {
      mdContent = newContent;
      await fs.writeFile(path.join(noteDir, currentMdFile!), mdContent, 'utf-8');
    }
  } else if (imageExportMode === 'base64' && mdContent) {
    // Convert relative image paths back to base64
    const imagesDir = path.join(noteDir, 'images');
    let changed = false;

    const newContent = mdContent.replace(
      /!\[(.*?)\]\(images\/([^)]+)\)/g,
      (_match: string, caption: string, imgFileName: string) => {
        const imgPath = path.join(imagesDir, imgFileName);
        if (!existsSync(imgPath)) return _match;
        try {
          const buffer = readFileSync(imgPath);
          const ext = path.extname(imgFileName).slice(1) || 'png';
          const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
          changed = true;
          return `![${caption}](data:${mimeType};base64,${buffer.toString('base64')})`;
        } catch {
          return _match;
        }
      },
    );

    if (changed) {
      mdContent = newContent;
      await fs.writeFile(path.join(noteDir, currentMdFile!), mdContent, 'utf-8');
    }

    // Clean up images folder
    if (existsSync(imagesDir)) {
      await fs.rm(imagesDir, { recursive: true, force: true });
    }
  }

  // Re-read entries after potential modifications
  const updatedEntries = await fs.readdir(noteDir);

  // Get remote file list for this note
  const remoteNoteFiles = (await githubRequest(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    token,
  ) as { tree: { path: string; type: string }[] }).tree
    .filter((f) => f.path.startsWith(`${remoteBase}/${noteId}/`) && f.type === 'blob')
    .map((f) => f.path.slice(`${remoteBase}/${noteId}/`.length));

  // Clean up stale MD files on remote (title changed)
  for (const remoteFile of remoteNoteFiles) {
    if (remoteFile.endsWith('.md') && remoteFile !== currentMdName) {
      await deleteRemoteFile(
        `${remoteBase}/${noteId}/${remoteFile}`,
        token, owner, repo, branch,
        `cleanup: remove old file ${remoteFile}`,
      );
    }
  }

  // If base64 mode, clean up remote images folder
  if (imageExportMode === 'base64') {
    for (const remoteFile of remoteNoteFiles) {
      if (remoteFile.startsWith('images/')) {
        await deleteRemoteFile(
          `${remoteBase}/${noteId}/${remoteFile}`,
          token, owner, repo, branch,
          `cleanup: remove images folder (base64 mode)`,
        );
      }
    }
  }

  // Upload all current files
  for (const entry of updatedEntries) {
    const entryPath = path.join(noteDir, entry);
    const stat = await fs.stat(entryPath);
    if (stat.isFile()) {
      const remotePath = `${remoteBase}/${noteId}/${entry}`;
      const sha = await fetchRemoteFileSha(
        `https://api.github.com/repos/${owner}/${repo}/contents/${remotePath}`,
        token,
      );
      await uploadFileToGitHub(entryPath, remotePath, token, owner, repo, branch, sha || undefined, `sync: ${noteId}/${entry}`);
    } else if (entry === 'images' && stat.isDirectory()) {
      const imageEntries = await fs.readdir(entryPath);
      for (const img of imageEntries) {
        const imgPath = path.join(entryPath, img);
        const imgStat = await fs.stat(imgPath);
        if (imgStat.isFile()) {
          const remoteImgPath = `${remoteBase}/${noteId}/images/${img}`;
          const sha = await fetchRemoteFileSha(
            `https://api.github.com/repos/${owner}/${repo}/contents/${remoteImgPath}`,
            token,
          );
          await uploadFileToGitHub(imgPath, remoteImgPath, token, owner, repo, branch, sha || undefined, `sync: ${noteId}/images/${img}`);
        }
      }
    }
  }
}

async function downloadNoteFolder(
  noteId: string,
  token: string,
  owner: string,
  repo: string,
  branch: string,
  remoteBase: string,
  remoteFiles: { path: string; type: string }[],
) {
  const noteDir = path.join(dataDir, noteId);
  await fs.mkdir(noteDir, { recursive: true });

  const noteFiles = remoteFiles.filter(
    (f) => f.path.startsWith(`${remoteBase}/${noteId}/`) && f.type === 'blob',
  );

  let noteConfig: NoteConfig | null = null;
  let content = '';

  for (const file of noteFiles) {
    const relativePath = file.path.slice(`${remoteBase}/${noteId}/`.length);
    const localPath = path.join(noteDir, relativePath);
    const localDir = path.dirname(localPath);
    if (!existsSync(localDir)) {
      await fs.mkdir(localDir, { recursive: true });
    }

    const fileContent = await fetchRemoteFile(
      `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`,
      token,
    );
    await fs.writeFile(localPath, fileContent, 'utf-8');

    if (relativePath === 'config.json') {
      noteConfig = JSON.parse(fileContent) as NoteConfig;
    } else if (relativePath.endsWith('.md')) {
      content = fileContent;
    }
  }

  return { noteConfig, content };
}

async function syncAll(): Promise<SyncResult> {
  const config = await readConfig();
  if (!config.github) {
    return { success: false, uploaded: 0, downloaded: 0, conflicts: [], error: 'GitHub 未配置' };
  }
  const { token, owner, repo, branch, syncDir, imageExportMode } = config.github;
  const apiBase = `https://api.github.com/repos/${owner}/${repo}`;
  const remoteBase = syncDir || 'notes';

  try {
    const meta = await readNotesMeta();
    const treeData = (await githubRequest(`${apiBase}/git/trees/${branch}?recursive=1`, token)) as {
      tree: { path: string; type: string; sha: string }[];
    };
    const remoteFiles = treeData.tree.filter(
      (item) => item.path.startsWith(`${remoteBase}/`) && item.type === 'blob',
    );

    // Get unique note IDs from remote files
    const remoteNoteIds = new Set<string>();
    for (const file of remoteFiles) {
      const relative = file.path.slice(`${remoteBase}/`.length);
      const parts = relative.split('/');
      if (parts.length > 0 && parts[0]) {
        remoteNoteIds.add(parts[0]);
      }
    }

    let uploaded = 0;
    let downloaded = 0;
    const conflicts: string[] = [];

    // Upload local notes not on remote or newer
    for (const note of meta.notes) {
      if (remoteNoteIds.has(note.id)) {
        // Check config.json on remote for updatedAt
        const remoteConfigPath = `${remoteBase}/${note.id}/config.json`;
        try {
          const remoteConfigRaw = await fetchRemoteFile(
            `${apiBase}/contents/${remoteConfigPath}`,
            token,
          );
          const remoteConfig = JSON.parse(remoteConfigRaw) as NoteConfig;
          if (note.updatedAt >= remoteConfig.updatedAt) {
            await uploadNoteFolder(note.id, token, owner, repo, branch, remoteBase, imageExportMode);
            uploaded++;
          } else {
            conflicts.push(note.title);
          }
        } catch {
          // Config not found on remote, upload anyway
          await uploadNoteFolder(note.id, token, owner, repo, branch, remoteBase, imageExportMode);
          uploaded++;
        }
      } else {
        await uploadNoteFolder(note.id, token, owner, repo, branch, remoteBase, imageExportMode);
        uploaded++;
      }
    }

    // Download remote notes not local
    for (const remoteNoteId of remoteNoteIds) {
      const exists = meta.notes.some((n) => n.id === remoteNoteId);
      if (!exists) {
        const result = await downloadNoteFolder(
          remoteNoteId,
          token,
          owner,
          repo,
          branch,
          remoteBase,
          remoteFiles,
        );
        if (result.noteConfig) {
          const noteMeta: NoteMeta = {
            id: result.noteConfig.id,
            folderId: result.noteConfig.folderId,
            title: result.noteConfig.title,
            emoji: result.noteConfig.emoji || '📝',
            tags: result.noteConfig.tags || [],
            createdAt: result.noteConfig.createdAt || formatDate(),
            updatedAt: result.noteConfig.updatedAt || formatDate(),
            filename: '',
          };
          meta.notes.push(noteMeta);
          downloaded++;
        }
      }
    }

    // Write updated meta once after all downloads
    if (downloaded > 0) {
      await writeNotesMeta(meta);
    }

    return { success: true, uploaded, downloaded, conflicts };
  } catch (err) {
    return {
      success: false,
      uploaded: 0,
      downloaded: 0,
      conflicts: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function syncNote(noteId: string): Promise<SyncResult> {
  const config = await readConfig();
  if (!config.github) {
    return { success: false, uploaded: 0, downloaded: 0, conflicts: [], error: 'GitHub 未配置' };
  }
  const { token, owner, repo, branch, syncDir, imageExportMode } = config.github;
  const remoteBase = syncDir || 'notes';
  const apiBase = `https://api.github.com/repos/${owner}/${repo}`;

  try {
    const noteData = await readNote(noteId);
    if (!noteData) {
      return { success: false, uploaded: 0, downloaded: 0, conflicts: [], error: '笔记不存在' };
    }
    const { meta } = noteData;

    // Check remote for config.json
    const remoteConfigPath = `${remoteBase}/${noteId}/config.json`;
    let remoteUpdatedAt: string | undefined;
    try {
      const remoteConfigRaw = await fetchRemoteFile(`${apiBase}/contents/${remoteConfigPath}`, token);
      const remoteConfig = JSON.parse(remoteConfigRaw) as NoteConfig;
      remoteUpdatedAt = remoteConfig.updatedAt;
    } catch {
      // Remote doesn't exist yet
    }

    if (!remoteUpdatedAt || meta.updatedAt >= remoteUpdatedAt) {
      await uploadNoteFolder(noteId, token, owner, repo, branch, remoteBase, imageExportMode);
      return { success: true, uploaded: 1, downloaded: 0, conflicts: [] };
    }

    return {
      success: false,
      uploaded: 0,
      downloaded: 0,
      conflicts: [meta.title],
      error: '远程版本较新，请使用批量同步处理冲突',
    };
  } catch (err) {
    return {
      success: false,
      uploaded: 0,
      downloaded: 0,
      conflicts: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function testConnection(): Promise<boolean> {
  const config = await readConfig();
  if (!config.github) return false;
  const { token, owner, repo } = config.github;
  try {
    // Test user authentication
    await githubRequest('https://api.github.com/user', token);
    // Test repository access (read permission)
    await githubRequest(`https://api.github.com/repos/${owner}/${repo}`, token);
    return true;
  } catch {
    return false;
  }
}

async function saveNoteToDocuments(options: ExportOptions): Promise<ExportResult> {
  try {
    const config = await readConfig();
    const noteData = await readNote(options.noteId);
    if (!noteData) {
      return { success: false, error: 'Note not found' };
    }
    const { meta, content } = noteData;
    const exportBase = config.exportDir || path.join(app.getPath('documents'), 'Gitnote');
    const noteDir = path.join(exportBase, meta.id);

    await fs.mkdir(noteDir, { recursive: true });

    let mdContent = content;

    if (options.imageExportMode === 'file') {
      // Extract base64 images and save as files
      const imagesDir = path.join(noteDir, 'images');
      let imageIndex = 0;

      mdContent = mdContent.replace(
        /!\[(.*?)\]\(data:(image\/[^;]+);base64,([^)]+)\)/g,
        (_match, caption: string, _mimeType: string, b64Data: string) => {
          const ext = _mimeType.split('/')[1] || 'png';
          const filename = `img_${imageIndex++}.${ext}`;
          const filePath = path.join(imagesDir, filename);
          // Use sync write to ensure image is saved before MD references it
          if (!existsSync(imagesDir)) {
            mkdirSync(imagesDir, { recursive: true });
          }
          writeFileSync(filePath, Buffer.from(b64Data, 'base64'));
          return `![${caption || 'image'}](images/${filename})`;
        },
      );
    }

    const mdFilePath = path.join(noteDir, `${meta.title}.md`);
    await fs.writeFile(mdFilePath, mdContent, 'utf-8');

    const noteConfig = buildNoteConfig(meta);
    const configFilePath = path.join(noteDir, 'config.json');
    await fs.writeFile(configFilePath, JSON.stringify(noteConfig, null, 2), 'utf-8');

    return { success: true, path: noteDir };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    icon: path.join(__dirname, '../icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.on('maximize', () => win.webContents.send('window:maximizeChange', true));
  win.on('unmaximize', () => win.webContents.send('window:maximizeChange', false));

  mainWindow = win;

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(prodPath);
  }
}

app.whenReady().then(async () => {
  // Read config and update data directory
  const config = await readConfig();
  updateDataDir(config);

  // Auto-migrate old format to folder format
  await migrateToFolderFormat();

  ipcMain.handle('fs:readConfig', () => readConfig());
  ipcMain.handle('fs:writeConfig', (_, config: Config) => {
    updateDataDir(config);
    return writeConfig(config);
  });
  ipcMain.handle('fs:listNotes', (_, folderId?: string) => listNotes(folderId));
  ipcMain.handle('fs:readNote', (_, noteId: string) => readNote(noteId));
  ipcMain.handle('fs:saveNote', (_, payload: { meta: NoteMeta; content: string }) => saveNote(payload));
  ipcMain.handle('fs:deleteNote', (_, noteId: string) => deleteNote(noteId));
  ipcMain.handle('github:syncAll', () => syncAll());
  ipcMain.handle('github:syncNote', (_, noteId: string) => syncNote(noteId));
  ipcMain.handle('github:testConnection', () => testConnection());
  ipcMain.handle('app:getDataPath', () => dataDir);
  ipcMain.handle('app:saveNoteToDocuments', (_, options: ExportOptions) => saveNoteToDocuments(options));
  ipcMain.handle('app:openExternal', (_, url: string) => shell.openExternal(url));
  ipcMain.handle('app:selectDirectory', () => selectDirectory());
  ipcMain.handle('app:migrateStoragePath', (_, oldPath: string, newPath: string) => migrateStoragePath(oldPath, newPath));
  ipcMain.handle('app:migrateToFolderFormat', () => migrateToFolderFormat());

  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize();
  });
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow?.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.handle('window:close', () => {
    mainWindow?.close();
  });
  ipcMain.handle('window:isMaximized', () => {
    return mainWindow?.isMaximized() ?? false;
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
