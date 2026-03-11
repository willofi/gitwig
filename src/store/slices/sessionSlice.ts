import type { AppTheme } from '@/utils/theme';

export interface SessionSlice {
  currentPath: string | null;
  recentProjects: string[];
  favoriteBranches: string[];
  theme: AppTheme;
  removeRecentProject: (path: string) => void;
  setTheme: (theme: AppTheme) => void;
  toggleFavoriteBranch: (branch: string) => void;
}

interface SessionSliceUtils {
  loadRecentProjects: () => string[];
  saveRecentProjects: (list: string[]) => void;
  loadTheme: () => AppTheme;
  saveTheme: (theme: AppTheme) => void;
  saveFavoriteBranches: (path: string, branches: string[]) => void;
}

type SliceSet<T> = (partial: Partial<T> | ((state: T) => Partial<T>)) => void;
type SliceGet<T> = () => T;

export function createSessionSlice<T extends SessionSlice>(
  set: SliceSet<T>,
  get: SliceGet<T>,
  utils: SessionSliceUtils
): SessionSlice {
  return {
    currentPath: null,
    recentProjects: utils.loadRecentProjects(),
    favoriteBranches: [],
    theme: utils.loadTheme(),

    setTheme: (theme) => {
      utils.saveTheme(theme);
      set({ theme } as Partial<T>);
    },

    removeRecentProject: (path) => {
      const updated = get().recentProjects.filter(p => p !== path);
      utils.saveRecentProjects(updated);
      set({ recentProjects: updated } as Partial<T>);
    },

    toggleFavoriteBranch: (branch) => {
      const { currentPath, favoriteBranches } = get();
      if (!currentPath) return;

      const exists = favoriteBranches.includes(branch);
      const next = exists
        ? favoriteBranches.filter(item => item !== branch)
        : [branch, ...favoriteBranches];

      utils.saveFavoriteBranches(currentPath, next);
      set({ favoriteBranches: next } as Partial<T>);
    },
  };
}
