import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { autoUpdater } from 'electron-updater';


process.env.DIST = path.join(__dirname, '../dist');
process.env.PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public');

let win: BrowserWindow | null;

// ─── Auto Updater ────────────────────────────────────────────────────────────

autoUpdater.autoDownload = false;        // 사용자 확인 후 다운로드
autoUpdater.autoInstallOnAppQuit = true; // 종료 시 자동 설치

// 수동 업데이트 전용 — 자동 체크 없음, 이벤트 리스너만 등록
function setupUpdaterListeners(mainWin: BrowserWindow) {
  autoUpdater.on('checking-for-update', () => {
    mainWin.webContents.send('update:checking');
  });

  autoUpdater.on('update-available', (info) => {
    mainWin.webContents.send('update:available', {
      version: info.version,
      releaseNotes: info.releaseNotes,
    });
  });

  autoUpdater.on('update-not-available', () => {
    mainWin.webContents.send('update:not-available');
  });

  autoUpdater.on('download-progress', (progress) => {
    mainWin.webContents.send('update:download-progress', {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    mainWin.webContents.send('update:downloaded', { version: info.version });
  });

  autoUpdater.on('error', (err) => {
    const msg = err.message || '';
    // 개발 환경 또는 릴리즈 미존재 시 무시
    if (!app.isPackaged || msg.includes('No published versions') || msg.includes('net::') || msg.includes('ENOTFOUND')) {
      return;
    }
    mainWin.webContents.send('update:error', msg);
  });
}

// IPC: 앱 버전 조회
ipcMain.handle('app:getVersion', () => app.getVersion());
ipcMain.handle('app:isPackaged', () => app.isPackaged);

// IPC: 렌더러에서 다운로드 요청
ipcMain.handle('update:download', () => {
  return autoUpdater.downloadUpdate();
});

// IPC: 렌더러에서 설치 & 재시작 요청
ipcMain.handle('update:install', () => {
  autoUpdater.quitAndInstall(false, true);
});

// IPC: 수동 업데이트 체크
ipcMain.handle('update:check', () => {
  if (!app.isPackaged) return null;
  return autoUpdater.checkForUpdates();
});

// ─── Main Window ─────────────────────────────────────────────────────────────

function createWindow() {
  const isMac = process.platform === 'darwin';

  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      offscreen: false,
    },
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    titleBarOverlay: isMac ? false : {
      color: '#333333',
      symbolColor: '#cccccc',
      height: 32
    },
    backgroundColor: '#1e1e1e',
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(process.env.DIST!, 'index.html'));
  }

  win.webContents.on('did-finish-load', () => {
    setupUpdaterListeners(win!);
  });
}

app.whenReady().then(() => {
  createWindow();

  // Check git version for debugging
  const { exec } = require('child_process');
  exec('git --version', (error: any, stdout: string) => {
    if (error) {
      console.error('Git not found in system path:', error);
    } else {
      console.log('Git version:', stdout.trim());
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// ─── Split Diff Window ───────────────────────────────────────────────────────

ipcMain.handle('window:openSplitDiff', async (_, params: {
  repoPath: string; hash: string; parentHash: string; filePath: string;
}) => {
  const splitWin = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      offscreen: false,
    },
    backgroundColor: '#0d1117',
    title: `Split Diff — ${params.filePath}`,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    titleBarOverlay: process.platform !== 'darwin' ? {
      color: '#161b22',
      symbolColor: '#8b949e',
      height: 32,
    } : false,
  });

  const query = new URLSearchParams({
    mode: 'splitdiff',
    repo: params.repoPath,
    hash: params.hash,
    parent: params.parentHash,
    file: params.filePath,
  }).toString();

  if (process.env.VITE_DEV_SERVER_URL) {
    splitWin.loadURL(`${process.env.VITE_DEV_SERVER_URL}?${query}`);
  } else {
    splitWin.loadFile(path.join(process.env.DIST!, 'index.html'), {
      query: {
        mode: 'splitdiff',
        repo: params.repoPath,
        hash: params.hash,
        parent: params.parentHash,
        file: params.filePath,
      },
    });
  }
});

// Git IPC Handlers will be added here
import './git/gitService';
