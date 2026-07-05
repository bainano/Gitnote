import { useEffect, useState } from 'react';
import { X, Check, AlertCircle, Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/appStore';
import { useTranslation } from '@/lib/useTranslation';
import { updateTheme } from '@/lib/theme';
import type { GitHubConfig } from '@/types';

export function SettingsModal() {
  const { config, saveConfig, testConnection, setLanguage, setTheme, selectStorageDir, language, theme } = useAppStore();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [github, setGithub] = useState<GitHubConfig>({
    token: '',
    owner: '',
    repo: '',
    branch: 'main',
    syncDir: 'notes',
  });
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState('');
  const [selectedLang, setSelectedLang] = useState<'zh' | 'en'>(language);
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | 'system'>(theme);
  const [exportDir, setExportDir] = useState('');
  const [storageDir, setStorageDir] = useState('');
  const [migrateConfirm, setMigrateConfirm] = useState<{ show: boolean; oldPath: string; newPath: string }>({ show: false, oldPath: '', newPath: '' });

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-settings', handler);
    return () => window.removeEventListener('open-settings', handler);
  }, []);

  useEffect(() => {
    if (config?.github) {
      setGithub(config.github);
    }
  }, [config?.github, open]);

  useEffect(() => {
    setSelectedLang(language);
    setSelectedTheme(theme);
    if (config?.exportDir !== undefined) {
      setExportDir(config.exportDir);
    }
    if (config?.storageDir !== undefined) {
      setStorageDir(config.storageDir);
    } else {
      setStorageDir('');
    }
  }, [language, theme, config?.exportDir, config?.storageDir, open]);

  const handleSave = async () => {
    if (!config) return;
    updateTheme(selectedTheme);

    const newStorageDir = storageDir || undefined;
    const oldStorageDir = config.storageDir;

    // Check if storage path changed
    if (newStorageDir !== oldStorageDir && (newStorageDir || oldStorageDir)) {
      setMigrateConfirm({
        show: true,
        oldPath: oldStorageDir || '',
        newPath: newStorageDir || '',
      });
      return; // Don't close yet, wait for migration choice
    }

    const newConfig = { ...config, language: selectedLang, theme: selectedTheme, github, exportDir: exportDir || undefined, storageDir: newStorageDir };
    await saveConfig(newConfig);
    await setLanguage(selectedLang);
    setTheme(selectedTheme);
    setOpen(false);
  };

  const handleMigrate = async (migrate: boolean) => {
    if (!config) return;
    const { oldPath, newPath } = migrateConfirm;

    if (migrate && oldPath && newPath) {
      const success = await useAppStore.getState().migrateStoragePath(oldPath, newPath);
      if (!success) {
        setMigrateConfirm({ show: false, oldPath: '', newPath: '' });
        return;
      }
    }

    const newConfig = {
      ...config,
      language: selectedLang,
      theme: selectedTheme,
      github,
      exportDir: exportDir || undefined,
      storageDir: newPath || undefined,
    };
    await saveConfig(newConfig);
    await setLanguage(selectedLang);
    setTheme(selectedTheme);
    setMigrateConfirm({ show: false, oldPath: '', newPath: '' });
    setOpen(false);
  };

  const handleBrowseStorage = async () => {
    await selectStorageDir();
    const updatedConfig = useAppStore.getState().config;
    if (updatedConfig?.storageDir) {
      setStorageDir(updatedConfig.storageDir);
    }
  };

  const handleTest = async () => {
    if (!config) return;
    setTestStatus('testing');
    setTestError('');
    await saveConfig({ ...config, github });
    try {
      const ok = await testConnection();
      setTestStatus(ok ? 'success' : 'error');
      if (!ok) {
        setTestError('连接失败，请检查 Token、仓库所有者和仓库名');
      }
    } catch (err) {
      setTestStatus('error');
      setTestError(err instanceof Error ? err.message : '未知错误');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30">
      {/* Migration Confirmation Dialog */}
      {migrateConfirm.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40">
          <div className="w-[380px] max-w-[90vw] bg-white dark:bg-apple-dark-surface rounded-2xl overflow-hidden">
            <div className="p-5">
              <p className="text-sm text-apple-text dark:text-apple-dark-text">{t('settings.storage.migrateConfirm')}</p>
            </div>
            <div className="h-14 flex items-center justify-end gap-2 px-5 bg-apple-bg dark:bg-apple-dark-bg">
              <button
                type="button"
                onClick={() => handleMigrate(false)}
                className="px-4 h-8 text-sm font-medium text-apple-textSecondary dark:text-apple-dark-textSecondary hover:text-apple-text dark:hover:text-apple-dark-text"
              >
                {t('settings.storage.noMigrate')}
              </button>
              <button
                type="button"
                onClick={() => handleMigrate(true)}
                className="px-4 h-8 text-sm font-medium text-white bg-apple-blue dark:bg-apple-dark-blue hover:bg-apple-blueHover dark:hover:bg-apple-dark-blueHover rounded-lg transition-colors"
              >
                {t('settings.storage.migrate')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-[480px] max-w-[90vw] bg-white dark:bg-apple-dark-surface rounded-2xl overflow-hidden">
        <div className="h-12 flex items-center justify-between px-5">
          <h2 className="font-semibold text-apple-text dark:text-apple-dark-text">{t('settings.title')}</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-apple-grayHover dark:hover:bg-apple-dark-grayHover text-apple-textSecondary dark:text-apple-dark-textSecondary"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Language Section */}
          <section>
            <h3 className="text-sm font-semibold text-apple-text dark:text-apple-dark-text mb-3">{t('settings.language')}</h3>
            <div className="space-y-2">
              <label
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors',
                  selectedLang === 'zh'
                    ? 'border-apple-blue dark:border-apple-dark-blue bg-apple-blue/5 dark:bg-apple-dark-blue/10'
                    : 'border-apple-border dark:border-apple-dark-border hover:bg-apple-grayHover dark:hover:bg-apple-dark-grayHover'
                )}
              >
                <input
                  type="radio"
                  name="language"
                  value="zh"
                  checked={selectedLang === 'zh'}
                  onChange={() => setSelectedLang('zh')}
                  className="sr-only"
                />
                <div
                  className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
                    selectedLang === 'zh'
                      ? 'border-apple-blue dark:border-apple-dark-blue'
                      : 'border-apple-textSecondary/30 dark:border-apple-dark-textSecondary/30'
                  )}
                >
                  {selectedLang === 'zh' && <div className="w-2 h-2 rounded-full bg-apple-blue dark:bg-apple-dark-blue" />}
                </div>
                <span className="text-sm text-apple-text dark:text-apple-dark-text">{t('onboarding.language.zh')}</span>
              </label>
              <label
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors',
                  selectedLang === 'en'
                    ? 'border-apple-blue dark:border-apple-dark-blue bg-apple-blue/5 dark:bg-apple-dark-blue/10'
                    : 'border-apple-border dark:border-apple-dark-border hover:bg-apple-grayHover dark:hover:bg-apple-dark-grayHover'
                )}
              >
                <input
                  type="radio"
                  name="language"
                  value="en"
                  checked={selectedLang === 'en'}
                  onChange={() => setSelectedLang('en')}
                  className="sr-only"
                />
                <div
                  className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
                    selectedLang === 'en'
                      ? 'border-apple-blue dark:border-apple-dark-blue'
                      : 'border-apple-textSecondary/30 dark:border-apple-dark-textSecondary/30'
                  )}
                >
                  {selectedLang === 'en' && <div className="w-2 h-2 rounded-full bg-apple-blue dark:bg-apple-dark-blue" />}
                </div>
                <span className="text-sm text-apple-text dark:text-apple-dark-text">{t('onboarding.language.en')}</span>
              </label>
            </div>
          </section>

          {/* Theme Section */}
          <section>
            <h3 className="text-sm font-semibold text-apple-text dark:text-apple-dark-text mb-3">{t('settings.theme')}</h3>
            <div className="space-y-2">
              <label
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors',
                  selectedTheme === 'light'
                    ? 'border-apple-blue dark:border-apple-dark-blue bg-apple-blue/5 dark:bg-apple-dark-blue/10'
                    : 'border-apple-border dark:border-apple-dark-border hover:bg-apple-grayHover dark:hover:bg-apple-dark-grayHover'
                )}
              >
                <input
                  type="radio"
                  name="theme"
                  value="light"
                  checked={selectedTheme === 'light'}
                  onChange={() => setSelectedTheme('light')}
                  className="sr-only"
                />
                <div
                  className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
                    selectedTheme === 'light'
                      ? 'border-apple-blue dark:border-apple-dark-blue'
                      : 'border-apple-textSecondary/30 dark:border-apple-dark-textSecondary/30'
                  )}
                >
                  {selectedTheme === 'light' && <div className="w-2 h-2 rounded-full bg-apple-blue dark:bg-apple-dark-blue" />}
                </div>
                <Sun size={16} className="text-apple-textSecondary dark:text-apple-dark-textSecondary" />
                <span className="text-sm text-apple-text dark:text-apple-dark-text">{t('settings.theme.light')}</span>
              </label>
              <label
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors',
                  selectedTheme === 'dark'
                    ? 'border-apple-blue dark:border-apple-dark-blue bg-apple-blue/5 dark:bg-apple-dark-blue/10'
                    : 'border-apple-border dark:border-apple-dark-border hover:bg-apple-grayHover dark:hover:bg-apple-dark-grayHover'
                )}
              >
                <input
                  type="radio"
                  name="theme"
                  value="dark"
                  checked={selectedTheme === 'dark'}
                  onChange={() => setSelectedTheme('dark')}
                  className="sr-only"
                />
                <div
                  className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
                    selectedTheme === 'dark'
                      ? 'border-apple-blue dark:border-apple-dark-blue'
                      : 'border-apple-textSecondary/30 dark:border-apple-dark-textSecondary/30'
                  )}
                >
                  {selectedTheme === 'dark' && <div className="w-2 h-2 rounded-full bg-apple-blue dark:bg-apple-dark-blue" />}
                </div>
                <Moon size={16} className="text-apple-textSecondary dark:text-apple-dark-textSecondary" />
                <span className="text-sm text-apple-text dark:text-apple-dark-text">{t('settings.theme.dark')}</span>
              </label>
              <label
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors',
                  selectedTheme === 'system'
                    ? 'border-apple-blue dark:border-apple-dark-blue bg-apple-blue/5 dark:bg-apple-dark-blue/10'
                    : 'border-apple-border dark:border-apple-dark-border hover:bg-apple-grayHover dark:hover:bg-apple-dark-grayHover'
                )}
              >
                <input
                  type="radio"
                  name="theme"
                  value="system"
                  checked={selectedTheme === 'system'}
                  onChange={() => setSelectedTheme('system')}
                  className="sr-only"
                />
                <div
                  className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
                    selectedTheme === 'system'
                      ? 'border-apple-blue dark:border-apple-dark-blue'
                      : 'border-apple-textSecondary/30 dark:border-apple-dark-textSecondary/30'
                  )}
                >
                  {selectedTheme === 'system' && <div className="w-2 h-2 rounded-full bg-apple-blue dark:bg-apple-dark-blue" />}
                </div>
                <Monitor size={16} className="text-apple-textSecondary dark:text-apple-dark-textSecondary" />
                <span className="text-sm text-apple-text dark:text-apple-dark-text">{t('settings.theme.system')}</span>
              </label>
            </div>
          </section>

          {/* GitHub Section */}
          <section>
            <h3 className="text-sm font-semibold text-apple-text dark:text-apple-dark-text mb-3">{t('settings.github')}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-apple-textSecondary dark:text-apple-dark-textSecondary mb-1">{t('settings.github.token')}</label>
                <input
                  type="password"
                  value={github.token}
                  onChange={(e) => setGithub({ ...github, token: e.target.value })}
                  placeholder="ghp_xxxxxxxxxxxx"
                  className="w-full h-9 px-3 text-sm bg-apple-bg dark:bg-apple-dark-bg border border-apple-border dark:border-apple-dark-border rounded-lg outline-none focus:border-apple-blue dark:focus:border-apple-dark-blue text-apple-text dark:text-apple-dark-text"
                />
                <p className="mt-1 text-xs text-apple-textSecondary dark:text-apple-dark-textSecondary">
                  经典 Token 需勾选 "repo" 权限；细粒度 Token 需开启 "Contents" 读写权限
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-apple-textSecondary dark:text-apple-dark-textSecondary mb-1">{t('settings.github.owner')}</label>
                  <input
                    type="text"
                    value={github.owner}
                    onChange={(e) => setGithub({ ...github, owner: e.target.value })}
                    placeholder="username"
                    className="w-full h-9 px-3 text-sm bg-apple-bg dark:bg-apple-dark-bg border border-apple-border dark:border-apple-dark-border rounded-lg outline-none focus:border-apple-blue dark:focus:border-apple-dark-blue text-apple-text dark:text-apple-dark-text"
                  />
                </div>
                <div>
                  <label className="block text-xs text-apple-textSecondary dark:text-apple-dark-textSecondary mb-1">{t('settings.github.repo')}</label>
                  <input
                    type="text"
                    value={github.repo}
                    onChange={(e) => setGithub({ ...github, repo: e.target.value })}
                    placeholder="gitnote-sync"
                    className="w-full h-9 px-3 text-sm bg-apple-bg dark:bg-apple-dark-bg border border-apple-border dark:border-apple-dark-border rounded-lg outline-none focus:border-apple-blue dark:focus:border-apple-dark-blue text-apple-text dark:text-apple-dark-text"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-apple-textSecondary dark:text-apple-dark-textSecondary mb-1">{t('settings.github.branch')}</label>
                  <input
                    type="text"
                    value={github.branch}
                    onChange={(e) => setGithub({ ...github, branch: e.target.value })}
                    placeholder="main"
                    className="w-full h-9 px-3 text-sm bg-apple-bg dark:bg-apple-dark-bg border border-apple-border dark:border-apple-dark-border rounded-lg outline-none focus:border-apple-blue dark:focus:border-apple-dark-blue text-apple-text dark:text-apple-dark-text"
                  />
                </div>
                <div>
                  <label className="block text-xs text-apple-textSecondary dark:text-apple-dark-textSecondary mb-1">{t('settings.github.syncDir')}</label>
                  <input
                    type="text"
                    value={github.syncDir}
                    onChange={(e) => setGithub({ ...github, syncDir: e.target.value })}
                    placeholder="notes"
                    className="w-full h-9 px-3 text-sm bg-apple-bg dark:bg-apple-dark-bg border border-apple-border dark:border-apple-dark-border rounded-lg outline-none focus:border-apple-blue dark:focus:border-apple-dark-blue text-apple-text dark:text-apple-dark-text"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-apple-textSecondary dark:text-apple-dark-textSecondary mb-2">{t('settings.github.imageMode')}</label>
                <div className="space-y-2">
                  <label
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors',
                      (github.imageExportMode || 'base64') === 'base64'
                        ? 'border-apple-blue dark:border-apple-dark-blue bg-apple-blue/5 dark:bg-apple-dark-blue/10'
                        : 'border-apple-border dark:border-apple-dark-border hover:bg-apple-grayHover dark:hover:bg-apple-dark-grayHover'
                    )}
                  >
                    <input
                      type="radio"
                      name="syncImageMode"
                      value="base64"
                      checked={(github.imageExportMode || 'base64') === 'base64'}
                      onChange={() => setGithub({ ...github, imageExportMode: 'base64' })}
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
                        (github.imageExportMode || 'base64') === 'base64'
                          ? 'border-apple-blue dark:border-apple-dark-blue'
                          : 'border-apple-textSecondary/30 dark:border-apple-dark-textSecondary/30'
                      )}
                    >
                      {(github.imageExportMode || 'base64') === 'base64' && <div className="w-2 h-2 rounded-full bg-apple-blue dark:bg-apple-dark-blue" />}
                    </div>
                    <span className="text-sm text-apple-text dark:text-apple-dark-text">{t('settings.github.imageMode.base64')}</span>
                  </label>
                  <label
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors',
                      github.imageExportMode === 'file'
                        ? 'border-apple-blue dark:border-apple-dark-blue bg-apple-blue/5 dark:bg-apple-dark-blue/10'
                        : 'border-apple-border dark:border-apple-dark-border hover:bg-apple-grayHover dark:hover:bg-apple-dark-grayHover'
                    )}
                  >
                    <input
                      type="radio"
                      name="syncImageMode"
                      value="file"
                      checked={github.imageExportMode === 'file'}
                      onChange={() => setGithub({ ...github, imageExportMode: 'file' })}
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
                        github.imageExportMode === 'file'
                          ? 'border-apple-blue dark:border-apple-dark-blue'
                          : 'border-apple-textSecondary/30 dark:border-apple-dark-textSecondary/30'
                      )}
                    >
                      {github.imageExportMode === 'file' && <div className="w-2 h-2 rounded-full bg-apple-blue dark:bg-apple-dark-blue" />}
                    </div>
                    <span className="text-sm text-apple-text dark:text-apple-dark-text">{t('settings.github.imageMode.file')}</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testStatus === 'testing'}
                  className="px-3 h-8 text-sm font-medium border border-apple-border dark:border-apple-dark-border rounded-lg hover:bg-apple-grayHover dark:hover:bg-apple-dark-grayHover text-apple-text dark:text-apple-dark-text disabled:opacity-50"
                >
                  {testStatus === 'testing' ? t('settings.github.testing') : t('settings.github.test')}
                </button>
                {testStatus === 'success' && (
                  <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <Check size={12} /> {t('settings.github.success')}
                  </span>
                )}
                {testStatus === 'error' && (
                  <span className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400">
                    <AlertCircle size={12} /> {testError || t('settings.github.failed')}
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Export Section */}
          <section>
            <h3 className="text-sm font-semibold text-apple-text dark:text-apple-dark-text mb-3">{t('settings.export')}</h3>
            <div>
              <label className="block text-xs text-apple-textSecondary dark:text-apple-dark-textSecondary mb-1">{t('settings.export.dir')}</label>
              <input
                type="text"
                value={exportDir}
                onChange={(e) => setExportDir(e.target.value)}
                placeholder={t('settings.export.dirPlaceholder')}
                className="w-full h-9 px-3 text-sm bg-apple-bg dark:bg-apple-dark-bg border border-apple-border dark:border-apple-dark-border rounded-lg outline-none focus:border-apple-blue dark:focus:border-apple-dark-blue text-apple-text dark:text-apple-dark-text"
              />
            </div>
          </section>

          {/* Storage Section */}
          <section>
            <h3 className="text-sm font-semibold text-apple-text dark:text-apple-dark-text mb-3">{t('settings.storage')}</h3>
            <div>
              <label className="block text-xs text-apple-textSecondary dark:text-apple-dark-textSecondary mb-1">{t('settings.storage.dir')}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={storageDir}
                  onChange={(e) => setStorageDir(e.target.value)}
                  placeholder={t('settings.storage.dirPlaceholder')}
                  className="flex-1 h-9 px-3 text-sm bg-apple-bg dark:bg-apple-dark-bg border border-apple-border dark:border-apple-dark-border rounded-lg outline-none focus:border-apple-blue dark:focus:border-apple-dark-blue text-apple-text dark:text-apple-dark-text"
                />
                <button
                  type="button"
                  onClick={handleBrowseStorage}
                  className="px-3 h-9 text-sm font-medium border border-apple-border dark:border-apple-dark-border rounded-lg hover:bg-apple-grayHover dark:hover:bg-apple-dark-grayHover text-apple-text dark:text-apple-dark-text"
                >
                  {t('settings.storage.browse')}
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="h-14 flex items-center justify-end gap-2 px-5 bg-apple-bg dark:bg-apple-dark-bg">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-4 h-8 text-sm font-medium text-apple-textSecondary dark:text-apple-dark-textSecondary hover:text-apple-text dark:hover:text-apple-dark-text"
          >
            {t('settings.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 h-8 text-sm font-medium text-white bg-apple-blue dark:bg-apple-dark-blue hover:bg-apple-blueHover dark:hover:bg-apple-dark-blueHover rounded-lg transition-colors"
          >
            {t('settings.save')}
          </button>
        </div>
      </div>
    </div>
  );
}