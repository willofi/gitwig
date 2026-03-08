export interface Commit {
  hash: string;
  parents: string[];
  children?: string[]; // Added for graph traversal
  refs: string;
  message: string;
  body?: string; // Full commit message body
  author_name: string;
  author_email: string;
  date: number; // Unix timestamp
  graphLines: string; // The ASCII graph part
  lane?: number;      // Calculated lane
  color?: string;     // Calculated color
  activeLanes?: (string | null)[]; // Deprecated, use lanesIn
  lanesIn?: (string | null)[];    // Hashes entering this row from ABOVE (at y=0)
  lanesOut?: (string | null)[];   // Hashes leaving this row to BELOW (at y=ROW_HEIGHT)
  effectiveParents?: string[];    // Nearest visible ancestors for this commit
  edges?: GraphEdge[];            // Lines to be drawn in this row
}

export interface GraphEdge {
  fromLane: number;
  toLane: number;
  color: string;
  isMerge?: boolean;
  isBranch?: boolean;
}

export interface Branch {
  name: string;
  current: boolean;
  label: string;
  commit: string;
  ahead?: number;
  behind?: number;
  tracking?: string;
}

export interface FileStatus {
  path: string;
  index: string;
  working_dir: string;
}

export interface GitStatus {
  not_added: string[];
  conflicted: string[];
  created: string[];
  deleted: string[];
  modified: string[];
  renamed: { from: string; to: string }[];
  staged: string[];
  files: FileStatus[];
  ahead: number;
  behind: number;
  current: string;
  tracking: string;
}

export interface GitLogOptions {
  maxCount?: number;
  branch?: string;
  firstParent?: boolean;
  mergesOnly?: boolean;
}

export interface GitAPI {
  getLog: (path: string, options?: GitLogOptions) => Promise<string>;
  getShow: (path: string, hash: string) => Promise<string>;
  getStatus: (path: string) => Promise<GitStatus>;
  getBranches: (path: string) => Promise<{ all: string[], current: string, branches: Record<string, Branch> }>;
  checkout: (path: string, branch: string, options?: { newBranch?: string }) => Promise<void>;
  merge: (path: string, from: string, options?: { squash?: boolean }) => Promise<void>;
  renameBranch: (path: string, oldName: string, newName: string) => Promise<void>;
  deleteBranch: (path: string, branch: string, force?: boolean) => Promise<void>;
  commit: (path: string, message: string, options?: any) => Promise<void>;
  push: (path: string) => Promise<void>;
  pull: (path: string) => Promise<void>;
  fetch: (path: string) => Promise<void>;
  checkIsRepo: (path: string) => Promise<boolean>;
  getCommitFiles: (path: string, hash: string) => Promise<{ status: string, path: string }[]>;
  getDiff: (path: string, hash1?: string, hash2?: string, filePath?: string) => Promise<string>;
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  add: (path: string, files: string | string[]) => Promise<void>;
  addAll: (path: string) => Promise<void>;
  resetAll: (path: string) => Promise<void>;
  discardChanges: (path: string, files: string | string[]) => Promise<void>;
  reset: (path: string, files: string | string[]) => Promise<void>;
  resetHard: (path: string, hash: string) => Promise<void>;
  resetMode: (path: string, hash: string, mode: 'soft' | 'mixed' | 'hard' | 'keep') => Promise<void>;
  squash: (path: string, startHash: string, endHash: string, message: string) => Promise<void>;
  cherryPick: (path: string, hash: string) => Promise<void>;
  stash: (path: string, message?: string) => Promise<void>;
  applyStash: (path: string, index: number) => Promise<void>;
  getStashes: (path: string) => Promise<{ all: any[] }>;
}

export interface WindowAPI {
  openSplitDiff: (params: { repoPath: string; hash: string; parentHash: string; filePath: string }) => Promise<void>;
}

export interface UpdateInfo {
  version: string;
  releaseNotes?: string;
}

export interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

export interface UpdaterAPI {
  onChecking:     (cb: () => void)                       => void;
  onAvailable:    (cb: (info: UpdateInfo) => void)       => void;
  onNotAvailable: (cb: () => void)                       => void;
  onProgress:     (cb: (p: DownloadProgress) => void)    => void;
  onDownloaded:   (cb: (info: UpdateInfo) => void)       => void;
  onError:        (cb: (msg: string) => void)            => void;
  download:       ()                                     => Promise<void>;
  install:        ()                                     => Promise<void>;
  check:          ()                                     => Promise<void>;
}

export interface AppAPI {
  getVersion: () => Promise<string>;
  isPackaged: () => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: {
      platform: string;
      app: AppAPI;
      git: GitAPI;
      dialog: {
        selectDirectory: () => Promise<string | null>;
      };
      window: WindowAPI;
      updater: UpdaterAPI;
    }
  }
}
