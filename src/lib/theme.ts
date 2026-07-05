export type ThemeMode = 'light' | 'dark' | 'system';

let systemChangeHandler: ((event: MediaQueryListEvent) => void) | null = null;

/** 从 localStorage 同步读取用户保存的主题，供 store 初始值使用 */
export function getStoredTheme(): ThemeMode {
  try {
    const raw = localStorage.getItem('gitnote_data');
    if (raw) {
      const data = JSON.parse(raw);
      return data.config?.theme || 'system';
    }
  } catch { /* ignore */ }
  return 'system';
}

export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

export function applyTheme(mode: ThemeMode) {
  const resolved = resolveTheme(mode);
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
}

export function initializeTheme(mode: ThemeMode) {
  applyTheme(mode);
  listenToSystemThemeChange(mode);
}

export function updateTheme(mode: ThemeMode) {
  applyTheme(mode);
  listenToSystemThemeChange(mode);
}

function listenToSystemThemeChange(mode: ThemeMode) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');

  if (systemChangeHandler) {
    mq.removeEventListener('change', systemChangeHandler);
    systemChangeHandler = null;
  }

  if (mode === 'system') {
    systemChangeHandler = () => {
      applyTheme('system');
    };
    mq.addEventListener('change', systemChangeHandler);
  }
}