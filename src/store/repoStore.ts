import { create } from 'zustand';
import { Commit, GitStatus, Branch, StashEntry } from '@/types/git.types';
import { processCommitsForGraph } from '@/utils/graphLayout';
import type { AppTheme } from '@/utils/theme';
import { createLogSlice, type LogSlice } from './slices/logSlice';
import { createSessionSlice, type SessionSlice } from './slices/sessionSlice';
import { createUiPreferenceSlice, type UiPreferenceSlice, type DateFilter, type LogFilterOptions } from './slices/uiPreferenceSlice';

interface RepoState extends LogSlice, SessionSlice, UiPreferenceSlice {
  commits: Commit[];
  filteredCommits: Commit[];
  status: GitStatus | null;
  branches: string[];
  branchDetails: Record<string, Branch>;
  currentBranch: string | null;
  stashes: StashEntry[];
  selectedCommit: Commit | null;
  isLoading: boolean;
  pageSize: number;
  loadedCount: number;
  hasMore: boolean;
  setCurrentPath: (path: string | null) => void;
  setFilter: (filter: string) => void;
  setUserFilter: (user: string | null) => void;
  setDateFilter: (filter: DateFilter) => void;
  setViewingBranch: (branch: string | null) => void;
  setLogFilterOptions: (options: Partial<LogFilterOptions>) => void;
  refresh: (resetCount?: boolean) => Promise<void>;
  refreshStatus: () => Promise<void>;
  loadMore: () => Promise<void>;
  applyFilters: () => void;
  setSelectedCommit: (commit: Commit | null) => void;
}

const HASH_REGEX = /[0-9a-f]{40}/;
const DELIMITER = '\x1f';
type TimeoutHandle = ReturnType<typeof setTimeout>;

const storeScheduler: {
  filterTimeout: TimeoutHandle | null;
  pendingRefreshTimeout: TimeoutHandle | null;
  lastRefreshAt: number;
  refreshRequestId: number;
} = {
  filterTimeout: null,
  pendingRefreshTimeout: null,
  lastRefreshAt: 0,
  refreshRequestId: 0,
};

function parseLogOutput(rawLog: string): Commit[] {
  const lines = rawLog.split('\n');
  const result: Commit[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const match = line.match(HASH_REGEX);
    if (!match) continue;
    try {
      const hash = match[0];
      const hashIdx = line.indexOf(hash);
      const graphLines = line.substring(0, hashIdx);
      const content = line.substring(hashIdx + 40);
      const parts = content.split(DELIMITER);
      if (parts.length > 0 && parts[0].trim() === '') parts.shift();
      const parents = parts[0]?.trim() ? parts[0].trim().split(' ') : [];
      const refs = (parts[1]?.trim() || '').replace(/^\(|\)$/g, '');
      const message = parts[2]?.trim() || '';
      const author_name = parts[3]?.trim() || '';
      const author_email = parts[4]?.trim() || '';
      const date = parseInt(parts[5]?.trim() || '0', 10) * 1000;
      if (!isNaN(date)) result.push({ hash, parents, refs, message, author_name, author_email, date, graphLines });
    } catch (_) {}
  }
  return result;
}

const loadRecentProjects = (): string[] => {
  try { return JSON.parse(localStorage.getItem('gitwig-recent-projects') || '[]'); }
  catch { return []; }
};

const saveRecentProjects = (list: string[]) => {
  localStorage.setItem('gitwig-recent-projects', JSON.stringify(list));
};

const BRANCH_FAVORITES_KEY = 'gitwig-branch-favorites';
const DEFAULT_FAVORITE_BRANCHES = ['main', 'remotes/origin/main'];
const THEME_KEY = 'gitwig-theme';

function loadFavoriteBranchMap(): Record<string, string[]> {
  try {
    return JSON.parse(localStorage.getItem(BRANCH_FAVORITES_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveFavoriteBranchMap(map: Record<string, string[]>) {
  localStorage.setItem(BRANCH_FAVORITES_KEY, JSON.stringify(map));
}

function loadFavoriteBranches(path: string): string[] {
  const map = loadFavoriteBranchMap();
  if (Array.isArray(map[path])) return map[path];
  map[path] = DEFAULT_FAVORITE_BRANCHES;
  saveFavoriteBranchMap(map);
  return map[path];
}

function saveFavoriteBranches(path: string, branches: string[]) {
  const map = loadFavoriteBranchMap();
  map[path] = Array.from(new Set(branches));
  saveFavoriteBranchMap(map);
}

function syncFavoriteBranches(path: string, favorites: string[], availableBranches: string[]) {
  const available = new Set(availableBranches);
  const next = favorites.filter(branch => available.has(branch));

  saveFavoriteBranches(path, next);
  return next;
}

function loadTheme(): AppTheme {
  return (localStorage.getItem(THEME_KEY) as AppTheme) || 'auto';
}

function saveTheme(theme: AppTheme) {
  localStorage.setItem(THEME_KEY, theme);
}

export const useRepoStore = create<RepoState>((set, get) => ({
  ...createLogSlice(set),
  ...createSessionSlice(set, get, {
    loadRecentProjects,
    saveRecentProjects,
    loadTheme,
    saveTheme,
    saveFavoriteBranches,
  }),
  ...createUiPreferenceSlice(set),
  commits: [],
  filteredCommits: [],
  status: null,
  branches: [],
  branchDetails: {},
  currentBranch: null,
  stashes: [],
  selectedCommit: null,
  isLoading: false,
  pageSize: 500,
  loadedCount: 500,
  hasMore: true,

  setCurrentPath: (path) => {
    const previousPath = get().currentPath;
    if (previousPath && previousPath !== path) {
      window.electronAPI.git.disposeRepo(previousPath).catch(() => {});
    }

    set({
      currentPath: path,
      viewingBranch: null,
      highlightedBranch: null,
      favoriteBranches: path ? loadFavoriteBranches(path) : [],
      loadedCount: 500,
      hasMore: true,
      logFilterOptions: { firstParent: false, excludeMerges: false }
    });
    if (!path) return;
    const prev = get().recentProjects.filter(p => p !== path);
    const updated = [...prev, path].slice(-20);
    saveRecentProjects(updated);
    set({ recentProjects: updated });

    // git rev-parse HEAD (~10ms)로 현재 브랜치를 즉시 감지 후 refresh
    // (getBranches 전체 목록 대비 10-20배 빠름)
    (async () => {
      try {
        const branch = await window.electronAPI.git.getCurrentBranch(path);
        if (branch) {
          set({ viewingBranch: branch, highlightedBranch: branch });
        }
      } catch (_) {}
      get().refresh(true);
    })();
  },
  setViewingBranch: (branch) => {
    if (storeScheduler.filterTimeout) {
      clearTimeout(storeScheduler.filterTimeout);
      storeScheduler.filterTimeout = null;
    }
    set({ 
      viewingBranch: branch, 
      highlightedBranch: branch, 
      selectedCommit: null,
      filter: '',
      userFilter: null,
      dateFilter: { type: 'all' },
      loadedCount: 300,
      hasMore: true
    });
    get().refresh(true);
  },
  
  setLogFilterOptions: (options) => {
    set(state => ({ logFilterOptions: { ...state.logFilterOptions, ...options }, loadedCount: 300, hasMore: true }));
    get().refresh(true);
  },

  // 스테이징 조작(add/reset) 후 status만 갱신 — 전체 refresh 대비 4배 빠름
  refreshStatus: async () => {
    const { currentPath } = get();
    if (!currentPath) return;
    try {
      const status = await window.electronAPI.git.getStatus(currentPath);
      set({ status });
    } catch (_) {}
  },

  setUserFilter: (user) => {
    set({ userFilter: user });
    get().applyFilters();
  },

  setDateFilter: (dateFilter) => {
    set({ dateFilter });
    get().applyFilters();
  },
  
  setFilter: (filter) => {
    const { filter: oldFilter } = get();
    if (filter === oldFilter) return;
    set({ filter });
    get().applyFilters();
  },

  applyFilters: () => {
    const { commits, filter, userFilter, dateFilter } = get();
    if (commits.length === 0) {
      set({ filteredCommits: [] });
      return;
    }

    if (storeScheduler.filterTimeout) {
      clearTimeout(storeScheduler.filterTimeout);
    }

    storeScheduler.filterTimeout = setTimeout(() => {
      try {
        const hasFilter = !!(filter || userFilter || dateFilter.type !== 'all');

        // 필터 없으면 복사 없이 바로 반환
        if (!hasFilter) {
          set({ filteredCommits: commits });
          return;
        }

        // 필터 조건을 한 번의 filter()로 합쳐 배열 순회 횟수 최소화
        const f = filter ? filter.toLowerCase() : null;
        const now = Date.now();
        let startLimit = 0;
        let endLimit = Infinity;
        if (dateFilter.type === '24h') startLimit = now - 86400000;
        else if (dateFilter.type === '7d') startLimit = now - 604800000;
        else if (dateFilter.type === 'custom') {
          startLimit = dateFilter.start || 0;
          endLimit = dateFilter.end || Infinity;
        }

        const filtered = commits.filter(c => {
          if (f && !(
            c.message.toLowerCase().includes(f) ||
            c.author_name.toLowerCase().includes(f) ||
            c.hash.toLowerCase().startsWith(f) ||
            (c.refs || '').toLowerCase().includes(f)
          )) return false;
          if (userFilter && c.author_name !== userFilter && c.author_email !== userFilter) return false;
          if (dateFilter.type !== 'all' && (c.date < startLimit || c.date > endLimit)) return false;
          return true;
        });

        const finalFiltered = processCommitsForGraph(filtered);
          
        set({ filteredCommits: finalFiltered });
      } catch (e) {
        console.error('Filtering failed:', e);
      }
    }, 150);
  },
  
  setSelectedCommit: (commit) => {
    set({ selectedCommit: commit });
  },

  loadMore: async () => {
    const { isLoading, hasMore, loadedCount, pageSize } = get();
    if (isLoading || !hasMore) return;
    
    set({ loadedCount: loadedCount + pageSize });
    await get().refresh();
  },
  
  refresh: async (resetCount = false) => {
    const { currentPath, viewingBranch, logFilterOptions, addGitLog, updateGitLog, loadedCount, pageSize } = get();
    if (!currentPath) return;

    if (resetCount) {
      set({ loadedCount: pageSize, hasMore: true });
    }

    const currentLoadedCount = resetCount ? pageSize : loadedCount;

    const now = Date.now();
    if (now - storeScheduler.lastRefreshAt < 300) {
      if (storeScheduler.pendingRefreshTimeout) {
        clearTimeout(storeScheduler.pendingRefreshTimeout);
      }
      storeScheduler.pendingRefreshTimeout = setTimeout(() => get().refresh(resetCount), 350);
      return;
    }
    storeScheduler.lastRefreshAt = now;
    if (storeScheduler.pendingRefreshTimeout) {
      clearTimeout(storeScheduler.pendingRefreshTimeout);
      storeScheduler.pendingRefreshTimeout = null;
    }

    const requestId = ++storeScheduler.refreshRequestId;

    const logId = addGitLog({ command: `git log${viewingBranch ? ` [${viewingBranch}]` : ''} -n ${currentLoadedCount}`, status: 'pending' });
    const startTime = Date.now();

    set({ isLoading: true });
    try {
      const branchToFetch = viewingBranch || undefined;

      // 4개 IPC 호출을 동시에 시작
      const logPromise = window.electronAPI.git.getLog(currentPath, {
        maxCount: currentLoadedCount,
        branch: branchToFetch,
        ...logFilterOptions
      });
      const statusPromise = window.electronAPI.git.getStatus(currentPath);
      const branchesPromise = window.electronAPI.git.getBranches(currentPath);
      const stashesPromise = window.electronAPI.git.getStashes(currentPath);

      // log가 완료되는 즉시 커밋을 파싱해서 화면에 반영 (branches/status 기다리지 않음)
      let fetchedCommits: Commit[] = [];
      let newHasMore = false;
      try {
        const rawLog = await logPromise;
        if (rawLog) {
          fetchedCommits = parseLogOutput(rawLog);
          if (fetchedCommits.length > 0) {
            fetchedCommits = processCommitsForGraph(fetchedCommits);
          }
          newHasMore = fetchedCommits.length >= currentLoadedCount;
          if (requestId !== storeScheduler.refreshRequestId) return;
          // 커밋 먼저 표시 — branches/status는 이후에 업데이트
          set({ commits: fetchedCommits, hasMore: newHasMore });
          get().applyFilters();
          updateGitLog(logId, { status: 'success', duration: Date.now() - startTime });
        }
      } catch (logErr: any) {
        updateGitLog(logId, { status: 'error', error: logErr?.message || 'Failed to fetch git log', duration: Date.now() - startTime });
      }

      // 나머지 IPC 결과를 기다린 뒤 사이드 데이터 업데이트
      const [statusRes, branchesRes, stashesRes] = await Promise.allSettled([
        statusPromise, branchesPromise, stashesPromise,
      ]);
      if (requestId !== storeScheduler.refreshRequestId) return;

      const nextFavoriteBranches = branchesRes.status === 'fulfilled'
        ? syncFavoriteBranches(currentPath, get().favoriteBranches, branchesRes.value.all)
        : get().favoriteBranches;

      set({
        status: statusRes.status === 'fulfilled' ? statusRes.value : null,
        branches: branchesRes.status === 'fulfilled' ? branchesRes.value.all : [],
        branchDetails: branchesRes.status === 'fulfilled' ? branchesRes.value.branches : {},
        currentBranch: branchesRes.status === 'fulfilled' ? branchesRes.value.current : null,
        favoriteBranches: nextFavoriteBranches,
        stashes: stashesRes.status === 'fulfilled' ? stashesRes.value.all : [],
        isLoading: false,
      });

      // 아직 로드할 커밋이 있으면 필터 없는 상태에서 자동으로 백그라운드 로딩
      const MAX_AUTO_LOAD = 3000;
      if (newHasMore) {
        const s = get();
        if (!s.filter && !s.userFilter && s.dateFilter.type === 'all' && s.loadedCount < MAX_AUTO_LOAD) {
          setTimeout(() => {
            const cur = get();
            if (cur.hasMore && !cur.isLoading) cur.loadMore();
          }, 500);
        }
      }
    } catch (error: any) {
      if (requestId !== storeScheduler.refreshRequestId) return;
      const msg = error?.message || '';
      if (msg.includes('not a git repository') || msg.includes('fatal:')) {
        set({ commits: [], filteredCommits: [], status: null, branches: [], branchDetails: {}, currentBranch: null, stashes: [], isLoading: false, hasMore: false });
      } else {
        console.error('Critical error in refresh:', error);
        set({ isLoading: false });
      }
    }
  },
}));
