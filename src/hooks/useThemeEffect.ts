import { useEffect } from 'react';
import { initializeTheme, updateTheme } from '@/lib/theme';
import type { ThemeMode } from '@/lib/theme';

export function useThemeEffect(theme: ThemeMode, deps: React.DependencyList = [theme]) {
  useEffect(() => {
    updateTheme(theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function useThemeInit(theme: ThemeMode) {
  useEffect(() => {
    initializeTheme(theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}