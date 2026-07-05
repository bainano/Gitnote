import { useCallback } from 'react';
import { useAppStore } from '@/stores/appStore';
import { t, type TranslationKey } from '@/lib/i18n';

export function useTranslation() {
  const language = useAppStore((s) => s.language);
  const translate = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => t(language, key, params),
    [language],
  );
  return { t: translate, language };
}