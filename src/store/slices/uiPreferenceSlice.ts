export interface DateFilter {
  type: 'all' | '24h' | '7d' | 'custom';
  start?: number;
  end?: number;
}

export interface LogFilterOptions {
  firstParent: boolean;
  excludeMerges: boolean;
}

export interface UiPreferenceSlice {
  filter: string;
  userFilter: string | null;
  dateFilter: DateFilter;
  viewMode: 'repo' | 'logs';
  viewingBranch: string | null;
  highlightedBranch: string | null;
  logFilterOptions: LogFilterOptions;
  autoFetchInterval: number;
  setViewMode: (mode: 'repo' | 'logs') => void;
  setHighlightedBranch: (branch: string | null) => void;
  setAutoFetchInterval: (interval: number) => void;
}

type SliceSet<T> = (partial: Partial<T> | ((state: T) => Partial<T>)) => void;

export function createUiPreferenceSlice<T extends UiPreferenceSlice>(set: SliceSet<T>): UiPreferenceSlice {
  return {
    filter: '',
    userFilter: null,
    dateFilter: { type: 'all' },
    viewMode: 'repo',
    viewingBranch: null,
    highlightedBranch: null,
    logFilterOptions: { firstParent: false, excludeMerges: false },
    autoFetchInterval: 0,

    setViewMode: (mode) => set({ viewMode: mode } as Partial<T>),
    setHighlightedBranch: (branch) => set({ highlightedBranch: branch } as Partial<T>),
    setAutoFetchInterval: (interval) => set({ autoFetchInterval: interval } as Partial<T>),
  };
}
