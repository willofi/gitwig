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
  loadMore: () => Promise<void>;
  applyFilters: () => void;
  setSelectedCommit: (commit: Commit | null) => void;
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
  theme: (localStorage.getItem('gitwig-theme') as AppTheme) || 'dark',

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
    set({ currentPath: path, viewingBranch: null, highlightedBranch: null, loadedCount: 300, hasMore: true, logFilterOptions: { firstParent: false, mergesOnly: false } });
    if (!path) return;
    const prev = get().recentProjects.filter(p => p !== path);
    const updated = [...prev, path].slice(-20);
    saveRecentProjects(updated);
    set({ recentProjects: updated });

    // 프로젝트 최초 오픈 시 현재 체크아웃된 브랜치를 기본 뷰로 설정
    (async () => {
      try {
        const isRepo = await window.electronAPI.git.checkIsRepo(path);
        if (isRepo) {
          const result = await window.electronAPI.git.getBranches(path);
          if (result?.current) {
            set({ viewingBranch: result.current, highlightedBranch: result.current });
          }
        }
      } finally {
        get().refresh(true);
      }
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
        let filtered = [...commits];

        if (filter) {
          const f = filter.toLowerCase();
          filtered = filtered.filter(c => 
            c.message.toLowerCase().includes(f) ||
            c.author_name.toLowerCase().includes(f) ||
            c.hash.toLowerCase().includes(f) ||
            (c.refs || '').toLowerCase().includes(f)
          );
        }

        if (userFilter) {
          filtered = filtered.filter(c => c.author_name === userFilter || c.author_email === userFilter);
        }

        if (dateFilter.type !== 'all') {
          const now = Date.now();
          let startLimit = 0;
          let endLimit = Infinity;

          if (dateFilter.type === '24h') startLimit = now - (24 * 60 * 60 * 1000);
          else if (dateFilter.type === '7d') startLimit = now - (7 * 24 * 60 * 60 * 1000);
          else if (dateFilter.type === 'custom') {
            startLimit = dateFilter.start || 0;
            endLimit = dateFilter.end || Infinity;
          }

          filtered = filtered.filter(c => c.date >= startLimit && c.date <= endLimit);
        }
        
        const finalFiltered = (filter || userFilter || dateFilter.type !== 'all') 
          ? processCommitsForGraph(filtered) 
          : filtered;
          
        set({ filteredCommits: finalFiltered });
      } catch (e) {
        console.error('Filtering failed:', e);
      }
    }, 150);
  },
  
  setSelectedCommit: async (commit) => {
    set({ selectedCommit: commit });
    const { currentPath, addGitLog, updateGitLog } = get();
    if (commit && currentPath && !commit.body) {
      const logId = addGitLog({ command: `git show ${commit.hash.substring(0, 7)}`, status: 'pending' });
      const startTime = Date.now();
      try {
        const fullBody = await window.electronAPI.git.getShow(currentPath, commit.hash);
        const body = (fullBody || '').trim();
        set(state => ({
          selectedCommit: state.selectedCommit?.hash === commit.hash 
            ? { ...state.selectedCommit, body } 
            : state.selectedCommit,
        }));
        updateGitLog(logId, { status: 'success', duration: Date.now() - startTime });
      } catch (e: any) {
        updateGitLog(logId, { status: 'error', error: e.message, duration: Date.now() - startTime });
      }
    }
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

    const logId = addGitLog({ command: `git refresh${viewingBranch ? ` [${viewingBranch}]` : ''} (-n ${currentLoadedCount})`, status: 'pending' });
    const startTime = Date.now();

    set({ isLoading: true });
    try {
      const branchToFetch = viewingBranch || undefined;

      const [logRes, statusRes, branchesRes, stashesRes] = await Promise.allSettled([
        window.electronAPI.git.getLog(currentPath, { 
          maxCount: currentLoadedCount,
          branch: branchToFetch,
          ...logFilterOptions
        }),
        window.electronAPI.git.getStatus(currentPath),
        window.electronAPI.git.getBranches(currentPath),
        window.electronAPI.git.getStashes(currentPath),
      ]);

      if (logRes.status === 'rejected') {
        updateGitLog(logId, { status: 'error', error: logRes.reason?.message || 'Failed to fetch git log', duration: Date.now() - startTime });
      } else {
        updateGitLog(logId, { status: 'success', duration: Date.now() - startTime });
      }

      let fetchedCommits: Commit[] = [];
      if (logRes.status === 'fulfilled' && logRes.value) {
        const rawLog = logRes.value;
        const lines = rawLog.split('\n');
        const hashRegex = /[0-9a-f]{40}/;
        const DELIMITER = ' @%@ ';
        
        for (let i = 0; i < lines.length; i++) {
          try {
            const line = lines[i];
            if (!line) continue;
            const match = line.match(hashRegex);
            if (match) {
              const hash = match[0];
              const hashIdx = line.indexOf(hash);
              const graphLines = line.substring(0, hashIdx);
              const content = line.substring(hashIdx + 40);
              const parts = content.split(DELIMITER);
              if (parts.length > 0 && parts[0].trim() === '') parts.shift();
              const parents = parts[0]?.trim() ? parts[0].trim().split(' ') : [];
              // [FIX] Strip parentheses from refs
              const refs = (parts[1]?.trim() || '').replace(/^\(|\)$/g, '');
              const message = parts[2]?.trim() || '';
              const author_name = parts[3]?.trim() || '';
              const author_email = parts[4]?.trim() || '';
              const dateStr = parts[5]?.trim() || '0';
              const date = parseInt(dateStr, 10) * 1000;
              if (!isNaN(date)) fetchedCommits.push({ hash, parents, refs, message, author_name, author_email, date, graphLines });
            }
          } catch (e) {}
        }
        if (fetchedCommits.length > 0) {
          fetchedCommits = processCommitsForGraph(fetchedCommits);
        }
      }

      const newHasMore = fetchedCommits.length >= currentLoadedCount;

      set({
        commits: fetchedCommits,
        status: statusRes.status === 'fulfilled' ? statusRes.value : null,
        branches: branchesRes.status === 'fulfilled' ? branchesRes.value.all : [],
        branchDetails: branchesRes.status === 'fulfilled' ? branchesRes.value.branches : {},
        currentBranch: branchesRes.status === 'fulfilled' ? branchesRes.value.current : null,
        stashes: stashesRes.status === 'fulfilled' ? stashesRes.value.all : [],
        isLoading: false,
        hasMore: newHasMore
      });

      get().applyFilters();

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
      // git 명령 실패 시 (경로가 repo가 아닌 경우 포함)
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
