export interface GitLogEntry {
  id: string;
  timestamp: number;
  command: string;
  status: 'pending' | 'success' | 'error';
  duration?: number;
  error?: string;
}

export interface LogSlice {
  gitLogs: GitLogEntry[];
  lastCommand: string | null;
  isExecuting: boolean;
  addGitLog: (entry: Omit<GitLogEntry, 'id' | 'timestamp'>) => string;
  updateGitLog: (id: string, update: Partial<GitLogEntry>) => void;
  clearGitLogs: () => void;
}

type SliceSet<T> = (partial: Partial<T> | ((state: T) => Partial<T>)) => void;

export function createLogSlice<T extends LogSlice>(set: SliceSet<T>): LogSlice {
  return {
    gitLogs: [],
    lastCommand: null,
    isExecuting: false,

    addGitLog: (entry) => {
      const id = Math.random().toString(36).substring(7);
      const newEntry: GitLogEntry = {
        ...entry,
        id,
        timestamp: Date.now(),
      };

      set((state: T) => {
        const nextLogs = [newEntry, ...state.gitLogs].slice(0, 1000);
        const hasPending = nextLogs.some(log => log.status === 'pending');
        return {
          gitLogs: nextLogs,
          lastCommand: entry.command,
          isExecuting: hasPending,
        } as Partial<T>;
      });

      return id;
    },

    updateGitLog: (id, update) => {
      set((state: T) => {
        const nextLogs = state.gitLogs.map(log => (log.id === id ? { ...log, ...update } : log));
        const hasPending = nextLogs.some(log => log.status === 'pending');
        return {
          gitLogs: nextLogs,
          isExecuting: hasPending,
        } as Partial<T>;
      });
    },

    clearGitLogs: () => {
      set(() => ({
        gitLogs: [],
        lastCommand: null,
        isExecuting: false,
      } as unknown as Partial<T>));
    },
  };
}
