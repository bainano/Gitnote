import { useEffect } from 'react';
import { FolderSidebar } from '@/components/layout/FolderSidebar';
import { NoteList } from '@/components/layout/NoteList';
import { NoteEditor } from '@/components/layout/NoteEditor';
import { SettingsModal } from '@/components/layout/SettingsModal';
import { OnboardingPage } from '@/components/onboarding/OnboardingPage';
import { TitleBar } from '@/components/ui/TitleBar';
import { useAppStore } from '@/stores/appStore';
import { useThemeEffect } from '@/hooks/useThemeEffect';

function App() {
  const { loadConfig, onboardingDone, theme, language } = useAppStore();

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  }, [language]);

  useThemeEffect(theme);

  return (
    <div className="h-full flex flex-col bg-apple-bg dark:bg-apple-dark-bg">
      <TitleBar />
      {!onboardingDone ? (
        <OnboardingPage />
      ) : (
        <div className="flex-1 flex">
          <FolderSidebar />
          <NoteList />
          <NoteEditor />
          <SettingsModal />
        </div>
      )}
    </div>
  );
}

export default App;