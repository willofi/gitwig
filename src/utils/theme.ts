export type AppTheme = 'dark' | 'light' | 'auto';

export function computeIsDark(theme: AppTheme): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
