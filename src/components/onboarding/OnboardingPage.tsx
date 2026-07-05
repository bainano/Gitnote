import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/appStore';
import { useTranslation } from '@/lib/useTranslation';
import { updateTheme } from '@/lib/theme';
import type { GitHubConfig } from '@/types';

type Step = 'language' | 'theme' | 'github';

export function OnboardingPage() {
  const { t } = useTranslation();
  const { setLanguage, setTheme, setOnboardingDone, config, saveConfig } = useAppStore();
  const [step, setStep] = useState<Step>('language');
  const [selectedLang, setSelectedLang] = useState<'zh' | 'en'>('zh');
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [github, setGithub] = useState<GitHubConfig>({
    token: '',
    owner: '',
    repo: '',
    branch: 'main',
    syncDir: 'notes',
  });

  const steps: Step[] = ['language', 'theme', 'github'];
  const currentIdx = steps.indexOf(step);

  const handleSelectLanguage = (lang: 'zh' | 'en') => {
    setSelectedLang(lang);
    setLanguage(lang);
  };

  const handleSelectTheme = (theme: 'light' | 'dark' | 'system') => {
    setSelectedTheme(theme);
    setTheme(theme);
    updateTheme(theme);
  };

  const handleNext = () => {
    if (currentIdx < steps.length - 1) {
      setStep(steps[currentIdx + 1]);
    }
  };

  const handleBack = () => {
    if (currentIdx > 0) {
      setStep(steps[currentIdx - 1]);
    }
  };

  const handleDone = async () => {
    updateTheme(selectedTheme);
    if (config) {
      // 先写入完整配置（含 language + theme），再调 setLanguage/setTheme 处理副作用
      await saveConfig({ ...config, language: selectedLang, theme: selectedTheme, github, onboardingDone: true });
    }
    await setLanguage(selectedLang);
    setTheme(selectedTheme);
    setOnboardingDone();
  };

  const handleSkipGithub = () => {
    handleDone();
  };

  const isLast = step === 'github';

  return (
    <div className="h-full flex items-center justify-center bg-apple-bg dark:bg-apple-dark-bg">
      <div className="w-[480px] max-w-[90vw]">

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  'w-2.5 h-2.5 rounded-full transition-colors',
                  i === currentIdx
                    ? 'bg-apple-blue dark:bg-apple-dark-blue'
                    : i < currentIdx
                      ? 'bg-apple-blue/40 dark:bg-apple-dark-blue/40'
                      : 'bg-apple-border dark:bg-apple-dark-border'
                )}
              />
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    'w-8 h-0.5',
                    i < currentIdx
                      ? 'bg-apple-blue/40 dark:bg-apple-dark-blue/40'
                      : 'bg-apple-border dark:bg-apple-dark-border'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Language Step */}
        {step === 'language' && (
          <div>
            <h1 className="text-2xl font-bold text-apple-text dark:text-apple-dark-text text-center mb-2">
              {t('onboarding.welcome')}
            </h1>
            <p className="text-sm text-apple-textSecondary dark:text-apple-dark-textSecondary text-center mb-8">
              {t('onboarding.language')}
            </p>
            <div className="space-y-3">
              <LanguageCard
                selected={selectedLang === 'zh'}
                onClick={() => handleSelectLanguage('zh')}
                label={t('onboarding.language.zh')}
                desc={t('onboarding.language.zhDesc')}
              />
              <LanguageCard
                selected={selectedLang === 'en'}
                onClick={() => handleSelectLanguage('en')}
                label={t('onboarding.language.en')}
                desc={t('onboarding.language.enDesc')}
              />
            </div>
          </div>
        )}

        {/* Theme Step */}
        {step === 'theme' && (
          <div>
            <h1 className="text-2xl font-bold text-apple-text dark:text-apple-dark-text text-center mb-2">
              {t('onboarding.theme')}
            </h1>
            <p className="text-sm text-apple-textSecondary dark:text-apple-dark-textSecondary text-center mb-8">
              {t('onboarding.theme')}
            </p>
            <div className="space-y-3">
              <ThemeCard
                selected={selectedTheme === 'light'}
                onClick={() => handleSelectTheme('light')}
                icon={<Sun size={24} />}
                label={t('onboarding.theme.light')}
                desc={t('onboarding.theme.lightDesc')}
              />
              <ThemeCard
                selected={selectedTheme === 'dark'}
                onClick={() => handleSelectTheme('dark')}
                icon={<Moon size={24} />}
                label={t('onboarding.theme.dark')}
                desc={t('onboarding.theme.darkDesc')}
              />
              <ThemeCard
                selected={selectedTheme === 'system'}
                onClick={() => handleSelectTheme('system')}
                icon={<Monitor size={24} />}
                label={t('onboarding.theme.system')}
                desc={t('onboarding.theme.systemDesc')}
              />
            </div>
          </div>
        )}

        {/* GitHub Step */}
        {step === 'github' && (
          <div>
            <h1 className="text-2xl font-bold text-apple-text dark:text-apple-dark-text text-center mb-2">
              {t('onboarding.github')}
            </h1>
            <p className="text-sm text-apple-textSecondary dark:text-apple-dark-textSecondary text-center mb-8">
              {t('onboarding.github.desc')}
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-apple-textSecondary dark:text-apple-dark-textSecondary mb-1">
                  {t('settings.github.token')}
                </label>
                <input
                  type="password"
                  value={github.token}
                  onChange={(e) => setGithub({ ...github, token: e.target.value })}
                  placeholder="ghp_xxxxxxxxxxxx"
                  className="w-full h-9 px-3 text-sm bg-apple-bg dark:bg-apple-dark-surface border border-apple-border dark:border-apple-dark-border rounded-lg outline-none focus:border-apple-blue dark:focus:border-apple-dark-blue text-apple-text dark:text-apple-dark-text placeholder:text-apple-textSecondary/40 dark:placeholder:text-apple-dark-textSecondary/40"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-apple-textSecondary dark:text-apple-dark-textSecondary mb-1">
                    {t('settings.github.owner')}
                  </label>
                  <input
                    type="text"
                    value={github.owner}
                    onChange={(e) => setGithub({ ...github, owner: e.target.value })}
                    placeholder="username"
                    className="w-full h-9 px-3 text-sm bg-apple-bg dark:bg-apple-dark-surface border border-apple-border dark:border-apple-dark-border rounded-lg outline-none focus:border-apple-blue dark:focus:border-apple-dark-blue text-apple-text dark:text-apple-dark-text placeholder:text-apple-textSecondary/40 dark:placeholder:text-apple-dark-textSecondary/40"
                  />
                </div>
                <div>
                  <label className="block text-xs text-apple-textSecondary dark:text-apple-dark-textSecondary mb-1">
                    {t('settings.github.repo')}
                  </label>
                  <input
                    type="text"
                    value={github.repo}
                    onChange={(e) => setGithub({ ...github, repo: e.target.value })}
                    placeholder="gitnote-sync"
                    className="w-full h-9 px-3 text-sm bg-apple-bg dark:bg-apple-dark-surface border border-apple-border dark:border-apple-dark-border rounded-lg outline-none focus:border-apple-blue dark:focus:border-apple-dark-blue text-apple-text dark:text-apple-dark-text placeholder:text-apple-textSecondary/40 dark:placeholder:text-apple-dark-textSecondary/40"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-apple-textSecondary dark:text-apple-dark-textSecondary mb-1">
                    {t('settings.github.branch')}
                  </label>
                  <input
                    type="text"
                    value={github.branch}
                    onChange={(e) => setGithub({ ...github, branch: e.target.value })}
                    placeholder="main"
                    className="w-full h-9 px-3 text-sm bg-apple-bg dark:bg-apple-dark-surface border border-apple-border dark:border-apple-dark-border rounded-lg outline-none focus:border-apple-blue dark:focus:border-apple-dark-blue text-apple-text dark:text-apple-dark-text placeholder:text-apple-textSecondary/40 dark:placeholder:text-apple-dark-textSecondary/40"
                  />
                </div>
                <div>
                  <label className="block text-xs text-apple-textSecondary dark:text-apple-dark-textSecondary mb-1">
                    {t('settings.github.syncDir')}
                  </label>
                  <input
                    type="text"
                    value={github.syncDir}
                    onChange={(e) => setGithub({ ...github, syncDir: e.target.value })}
                    placeholder="notes"
                    className="w-full h-9 px-3 text-sm bg-apple-bg dark:bg-apple-dark-surface border border-apple-border dark:border-apple-dark-border rounded-lg outline-none focus:border-apple-blue dark:focus:border-apple-dark-blue text-apple-text dark:text-apple-dark-text placeholder:text-apple-textSecondary/40 dark:placeholder:text-apple-dark-textSecondary/40"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-10">
          <div>
            {currentIdx > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1.5 px-4 h-9 text-sm font-medium text-apple-textSecondary dark:text-apple-dark-textSecondary hover:text-apple-text dark:hover:text-apple-dark-text rounded-lg transition-colors"
              >
                <ArrowLeft size={16} />
                {t('onboarding.back')}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isLast && (
              <button
                type="button"
                onClick={handleSkipGithub}
                className="px-4 h-9 text-sm font-medium text-apple-textSecondary dark:text-apple-dark-textSecondary hover:text-apple-text dark:hover:text-apple-dark-text rounded-lg transition-colors"
              >
                {t('onboarding.github.skip')}
              </button>
            )}
            <button
              type="button"
              onClick={isLast ? handleDone : handleNext}
              className="flex items-center gap-1.5 px-5 h-9 text-sm font-medium text-white bg-apple-blue hover:bg-apple-blueHover dark:bg-apple-dark-blue dark:hover:bg-apple-dark-blueHover rounded-lg transition-colors"
            >
              {isLast ? t('onboarding.done') : t('onboarding.next')}
              {!isLast && <ArrowRight size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LanguageCard({
  selected,
  onClick,
  label,
  desc,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-4 px-5 py-4 rounded-xl border-2 transition-colors text-left',
        selected
          ? 'border-apple-blue dark:border-apple-dark-blue bg-apple-blue/5 dark:bg-apple-dark-blue/10'
          : 'border-apple-border dark:border-apple-dark-border hover:border-apple-textSecondary/30 dark:hover:border-apple-dark-textSecondary/30'
      )}
    >
      <div className="flex-1">
        <div className="font-medium text-apple-text dark:text-apple-dark-text">{label}</div>
        <div className="text-sm text-apple-textSecondary dark:text-apple-dark-textSecondary">{desc}</div>
      </div>
      <div
        className={cn(
          'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
          selected
            ? 'border-apple-blue dark:border-apple-dark-blue bg-apple-blue dark:bg-apple-dark-blue'
            : 'border-apple-textSecondary/30 dark:border-apple-dark-textSecondary/30'
        )}
      >
        {selected && <Check size={12} className="text-white" />}
      </div>
    </button>
  );
}

function ThemeCard({
  selected,
  onClick,
  icon,
  label,
  desc,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-4 px-5 py-4 rounded-xl border-2 transition-colors text-left',
        selected
          ? 'border-apple-blue dark:border-apple-dark-blue bg-apple-blue/5 dark:bg-apple-dark-blue/10'
          : 'border-apple-border dark:border-apple-dark-border hover:border-apple-textSecondary/30 dark:hover:border-apple-dark-textSecondary/30'
      )}
    >
      <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-apple-gray dark:bg-apple-dark-gray text-apple-textSecondary dark:text-apple-dark-textSecondary">
        {icon}
      </div>
      <div className="flex-1">
        <div className="font-medium text-apple-text dark:text-apple-dark-text">{label}</div>
        <div className="text-sm text-apple-textSecondary dark:text-apple-dark-textSecondary">{desc}</div>
      </div>
      <div
        className={cn(
          'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
          selected
            ? 'border-apple-blue dark:border-apple-dark-blue bg-apple-blue dark:bg-apple-dark-blue'
            : 'border-apple-textSecondary/30 dark:border-apple-dark-textSecondary/30'
        )}
      >
        {selected && <Check size={12} className="text-white" />}
      </div>
    </button>
  );
}