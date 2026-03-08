import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { autoUpdater } from 'electron-updater';


process.env.DIST = path.join(__dirname, '../dist');
process.env.PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public');

let win: BrowserWindow | null;

// ─── Auto Updater ────────────────────────────────────────────────────────────

autoUpdater.autoDownload = false;        // 사용자 확인 후 다운로드
autoUpdater.autoInstallOnAppQuit = true; // 종료 시 자동 설치

function setupAutoUpdater(mainWin: BrowserWindow) {
  // 개발 환경에서는 업데이트 체크 건너뜀
  if (!app.isPackaged) return;

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
    // 릴리즈 없음 / 네트워크 오류는 사용자에게 노출하지 않음
    const msg = err.message || '';
    if (msg.includes('No published versions') || msg.includes('net::') || msg.includes('ENOTFOUND')) {
      console.log('[AutoUpdater] No update available or network issue (suppressed):', msg);
      return;
    }
    mainWin.webContents.send('update:error', msg);
    console.error('[AutoUpdater] Error:', err);
  });

  // 앱 시작 5초 후 업데이트 체크 (UI 로드 완료 대기)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(err => {
      console.error('[AutoUpdater] checkForUpdates failed:', err);
    });
  }, 5000);

  // 이후 매 4시간마다 재확인
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 4 * 60 * 60 * 1000);
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
    setupAutoUpdater(win!);
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
