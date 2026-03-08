import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    isPackaged: () => ipcRenderer.invoke('app:isPackaged'),
  },
  git: {
    getCurrentBranch: (path: string) => ipcRenderer.invoke('git:getCurrentBranch', path),
    getLog: (path: string, options?: any) => ipcRenderer.invoke('git:getLog', path, options),
    getShow: (path: string, hash: string) => ipcRenderer.invoke('git:getShow', path, hash),
    getStatus: (path: string) => ipcRenderer.invoke('git:getStatus', path),
    getBranches: (path: string) => ipcRenderer.invoke('git:getBranches', path),
    checkout: (path: string, branch: string, options?: any) => ipcRenderer.invoke('git:checkout', path, branch, options),
    merge: (path: string, from: string, options?: any) => ipcRenderer.invoke('git:merge', path, from, options),
    renameBranch: (path: string, oldName: string, newName: string) => ipcRenderer.invoke('git:renameBranch', path, oldName, newName),
    deleteBranch: (path: string, branch: string, force?: boolean) => ipcRenderer.invoke('git:deleteBranch', path, branch, force),
    commit: (path: string, message: string, options?: any) => ipcRenderer.invoke('git:commit', path, message, options),
    push: (path: string) => ipcRenderer.invoke('git:push', path),
    pull: (path: string) => ipcRenderer.invoke('git:pull', path),
    fetch: (path: string) => ipcRenderer.invoke('git:fetch', path),
    checkIsRepo: (path: string) => ipcRenderer.invoke('git:checkIsRepo', path),
    getDiff: (path: string, hash1?: string, hash2?: string, filePath?: string) => ipcRenderer.invoke('git:getDiff', path, hash1, hash2, filePath),
    add: (path: string, files: string | string[]) => ipcRenderer.invoke('git:add', path, files),
    addAll: (path: string) => ipcRenderer.invoke('git:addAll', path),
    resetAll: (path: string) => ipcRenderer.invoke('git:resetAll', path),
    discardChanges: (path: string, files: string | string[]) => ipcRenderer.invoke('git:discardChanges', path, files),
    reset: (path: string, files: string | string[]) => ipcRenderer.invoke('git:reset', path, files),
    resetHard: (path: string, hash: string) => ipcRenderer.invoke('git:resetHard', path, hash),
    resetMode: (path: string, hash: string, mode: 'soft' | 'mixed' | 'hard' | 'keep') => ipcRenderer.invoke('git:resetMode', path, hash, mode),
    squash: (path: string, startHash: string, endHash: string, message: string) => ipcRenderer.invoke('git:squash', path, startHash, endHash, message),
    cherryPick: (path: string, hash: string) => ipcRenderer.invoke('git:cherryPick', path, hash),
    stash: (path: string, message?: string) => ipcRenderer.invoke('git:stash', path, message),
    applyStash: (path: string, index: number) => ipcRenderer.invoke('git:applyStash', path, index),
    getStashes: (path: string) => ipcRenderer.invoke('git:getStashes', path),
    readFile: (path: string) => ipcRenderer.invoke('git:readFile', path),
    writeFile: (path: string, content: string) => ipcRenderer.invoke('git:writeFile', path, content),
    getCommitFiles: (path: string, hash: string) => ipcRenderer.invoke('git:getCommitFiles', path, hash),
  },
  dialog: {
    selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  },
  window: {
    openSplitDiff: (params: { repoPath: string; hash: string; parentHash: string; filePath: string }) =>
      ipcRenderer.invoke('window:openSplitDiff', params),
  },
  updater: {
    onChecking:      (cb: () => void)                   => ipcRenderer.on('update:checking',         (_, ...a) => cb(...a as [])),
    onAvailable:     (cb: (info: UpdateInfo) => void)   => ipcRenderer.on('update:available',         (_, info) => cb(info)),
    onNotAvailable:  (cb: () => void)                   => ipcRenderer.on('update:not-available',     (_, ...a) => cb(...a as [])),
    onProgress:      (cb: (p: DownloadProgress) => void)=> ipcRenderer.on('update:download-progress', (_, p)    => cb(p)),
    onDownloaded:    (cb: (info: UpdateInfo) => void)   => ipcRenderer.on('update:downloaded',        (_, info) => cb(info)),
    onError:         (cb: (msg: string) => void)        => ipcRenderer.on('update:error',             (_, msg)  => cb(msg)),
    download:        ()                                 => ipcRenderer.invoke('update:download'),
    install:         ()                                 => ipcRenderer.invoke('update:install'),
    check:           ()                                 => ipcRenderer.invoke('update:check'),
  },
});

interface UpdateInfo     { version: string; releaseNotes?: string }
interface DownloadProgress { percent: number; transferred: number; total: number; bytesPerSecond: number }
