import { create } from 'zustand';
import { Commit, GitStatus, Branch } from '@/types/git.types';
import { processCommitsForGraph } from '@/utils/graphLayout';
import type { AppTheme } from '@/utils/theme';

interface GitLogEntry {
  id: string;
  timestamp: number;
  command: string;
  status: 'pending' | 'success' | 'error';
  duration?: number;
  error?: string;
}

interface DateFilter {
  type: 'all' | '24h' | '7d' | 'custom';
  start?: number;
  end?: number;
}

interface LogFilterOptions {
  firstParent: boolean;
  mergesOnly: boolean;
}

interface RepoState {
  currentPath: string | null;
  recentProjects: string[];
  commits: Commit[];
  filteredCommits: Commit[];
  status: GitStatus | null;
  branches: string[];
  branchDetails: Record<string, Branch>;
  currentBranch: string | null;
  stashes: any[];
  selectedCommit: Commit | null;
  filter: string;
  userFilter: string | null;
  dateFilter: DateFilter;
  isLoading: boolean;
  viewMode: 'repo' | 'logs';
  gitLogs: GitLogEntry[];
  lastCommand: string | null;
  isExecuting: boolean;
  viewingBranch: string | null;
  highlightedBranch: string | null;
  logFilterOptions: LogFilterOptions;
  pageSize: number;
  loadedCount: number;
  hasMore: boolean;
  autoFetchInterval: number; // minutes, 0 for disabled
  theme: AppTheme;
  setCurrentPath: (path: string | null) => void;
  removeRecentProject: (path: string) => void;
  setTheme: (theme: AppTheme) => void;
  setFilter: (filter: string) => void;
  setUserFilter: (user: string | null) => void;
  setDateFilter: (filter: DateFilter) => void;
  setViewingBranch: (branch: string | null) => void;
  setHighlightedBranch: (branch: string | null) => void;
  setViewMode: (mode: 'repo' | 'logs') => void;
  addGitLog: (entry: Omit<GitLogEntry, 'id' | 'timestamp'>) => string;
  updateGitLog: (id: string, update: Partial<GitLogEntry>) => void;
  setLogFilterOptions: (options: Partial<LogFilterOptions>) => void;
  setAutoFetchInterval: (interval: number) => void;
  refresh: (resetCount?: boolean) => Promise<void>;
  refreshStatus: () => Promise<void>;
  loadMore: () => Promise<void>;
  applyFilters: () => void;
  setSelectedCommit: (commit: Commit | null) => void;
}

const HASH_REGEX = /[0-9a-f]{40}/;
const DELIMITER = ' @%@ ';

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

export const useRepoStore = create<RepoState>((set, get) => ({
  currentPath: null,
  recentProjects: loadRecentProjects(),
  commits: [],
  filteredCommits: [],
  status: null,
  branches: [],
  branchDetails: {},
  currentBranch: null,
  stashes: [],
  selectedCommit: null,
  filter: '',
  userFilter: null,
  dateFilter: { type: 'all' },
  isLoading: false,
  viewMode: 'repo',
  gitLogs: [],
  lastCommand: null,
  isExecuting: false,
  viewingBranch: null,
  highlightedBranch: null,
  logFilterOptions: { firstParent: false, mergesOnly: false },
  pageSize: 500,
  loadedCount: 500,
  hasMore: true,
  autoFetchInterval: 0,
  theme: (localStorage.getItem('gitwig-theme') as AppTheme) || 'auto',

  setTheme: (theme) => {
    localStorage.setItem('gitwig-theme', theme);
    set({ theme });
  },

  removeRecentProject: (path) => {
    const updated = get().recentProjects.filter(p => p !== path);
    saveRecentProjects(updated);
    set({ recentProjects: updated });
  },

  setCurrentPath: (path) => {
    set({ currentPath: path, viewingBranch: null, highlightedBranch: null, loadedCount: 500, hasMore: true, logFilterOptions: { firstParent: false, mergesOnly: false } });
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

  setViewMode: (mode) => set({ viewMode: mode }),

  addGitLog: (entry) => {
    const id = Math.random().toString(36).substring(7);
    const newEntry: GitLogEntry = {
      ...entry,
      id,
      timestamp: Date.now(),
    };
    set(state => ({ 
      gitLogs: [newEntry, ...state.gitLogs].slice(0, 1000),
      lastCommand: entry.command,
      isExecuting: entry.status === 'pending'
    }));
    return id;
  },

  updateGitLog: (id, update) => {
    set(state => ({
      gitLogs: state.gitLogs.map(log => log.id === id ? { ...log, ...update } : log),
      isExecuting: update.status === 'pending' ? true : (state.isExecuting && state.gitLogs.some(l => l.id !== id && l.status === 'pending') ? true : false)
    }));
  },
  
  setViewingBranch: (branch) => {
    const timeout = (window as any)._filterTimeout;
    if (timeout) clearTimeout(timeout);
    (window as any)._filterTimeout = null;
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
  
  setHighlightedBranch: (branch) => {
    set({ highlightedBranch: branch });
  },
  
  setLogFilterOptions: (options) => {
    set(state => ({ logFilterOptions: { ...state.logFilterOptions, ...options }, loadedCount: 300, hasMore: true }));
    get().refresh(true);
  },

  setAutoFetchInterval: (interval: number) => {
    set({ autoFetchInterval: interval });
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

    const timeout = (window as any)._filterTimeout;
    if (timeout) clearTimeout(timeout);
    
    (window as any)._filterTimeout = setTimeout(() => {
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
    const lastRefresh = (window as any)._lastRefresh || 0;
    if (now - lastRefresh < 300) {
      const pending = (window as any)._pendingRefresh;
      if (pending) clearTimeout(pending);
      (window as any)._pendingRefresh = setTimeout(() => get().refresh(resetCount), 350);
      return;
    }
    (window as any)._lastRefresh = now;

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

      set({
        status: statusRes.status === 'fulfilled' ? statusRes.value : null,
        branches: branchesRes.status === 'fulfilled' ? branchesRes.value.all : [],
        branchDetails: branchesRes.status === 'fulfilled' ? branchesRes.value.branches : {},
        currentBranch: branchesRes.status === 'fulfilled' ? branchesRes.value.current : null,
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
