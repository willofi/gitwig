import { ipcMain, dialog } from 'electron';
import simpleGit, { SimpleGit } from 'simple-git';
import fs from 'fs/promises';

const gitMap: Map<string, SimpleGit> = new Map();

function getGit(path: string): SimpleGit {
  console.log(`Initialising git for path: ${path}`);
  if (!gitMap.has(path)) {
    const git = simpleGit({
      baseDir: path,
      binary: 'git',
      maxConcurrentProcesses: 6,
    });
    gitMap.set(path, git);
  }
  return gitMap.get(path)!;
}

ipcMain.handle('git:getLog', async (_, path: string, options?: any) => {
  const branch = options?.branch;
  const maxCount = options?.maxCount;
  const firstParent = options?.firstParent;
  const mergesOnly = options?.mergesOnly;

  const isStrict = !!branch && branch !== 'all';
  console.log(`[GIT LOG] Path: ${path} | Branch: ${branch || '--all'} | Strict: ${isStrict}`);
  
  const git = getGit(path);
  try {
    // [FIX] 구분자를 더 유니크하게 변경하여 데이터 내 포함될 가능성을 줄임
    const DELIMITER = ' @%@ ';
    const args = ['log', '--graph', '--decorate=short', '--color=never', `--format=format:%H${DELIMITER}%P${DELIMITER}%d${DELIMITER}%s${DELIMITER}%an${DELIMITER}%ae${DELIMITER}%at`];
    
    if (maxCount) {
      args.push(`-n`, maxCount.toString());
    }

    if (firstParent) args.push('--first-parent');
    if (mergesOnly) args.push('--merges');

    if (isStrict) {
      args.push(branch);
    } else {
      args.push('--all');
    }

    console.log(`[GIT LOG] Executing: git ${args.join(' ')}`);
    const result = await git.raw(args);
    return result;
  } catch (e) {
    console.error(`Git log failed for ${path}:`, e);
    throw e;
  }
});

ipcMain.handle('git:getShow', async (_, path: string, hash: string) => {
  const git = getGit(path);
  try {
    const result = await git.raw(['show', '-s', '--format=%B', hash]);
    return result;
  } catch (e) {
    return '';
  }
});

ipcMain.handle('git:getStatus', async (_, path: string) => {
  const git = getGit(path);
  const status = await git.status();
  return JSON.parse(JSON.stringify(status));
});

ipcMain.handle('git:getBranches', async (_, path: string) => {
  const git = getGit(path);
  const branches = await git.branch();
  
  // [NEW] Get ahead/behind counts for all local branches
  try {
    const rawData = await git.raw([
      'for-each-ref',
      '--format=%(refname:short)@%@%(upstream:track)',
      'refs/heads'
    ]);
    
    const lines = rawData.trim().split('\n');
    lines.forEach(line => {
      const [name, track] = line.split('@%@');
      if (branches.branches[name]) {
        const aheadMatch = track.match(/ahead (\d+)/);
        const behindMatch = track.match(/behind (\d+)/);
        
        // Use type assertion to add dynamic properties not present in simple-git types
        const branch = branches.branches[name] as any;
        branch.ahead = aheadMatch ? parseInt(aheadMatch[1], 10) : 0;
        branch.behind = behindMatch ? parseInt(behindMatch[1], 10) : 0;
      }
    });
  } catch (e) {
    console.warn('Failed to fetch ahead/behind for branches:', e);
  }

  return JSON.parse(JSON.stringify(branches));
});

ipcMain.handle('git:checkout', async (_, path: string, branch: string, options?: any) => {
  const git = getGit(path);
  if (options?.newBranch) {
    return await git.checkoutBranch(options.newBranch, branch);
  }
  return await git.checkout(branch);
});

ipcMain.handle('git:merge', async (_, path: string, from: string, options?: any) => {
  const git = getGit(path);
  if (options?.squash) {
    return await git.merge(['--squash', from]);
  }
  return await git.merge([from]);
});

ipcMain.handle('git:renameBranch', async (_, path: string, oldName: string, newName: string) => {
  const git = getGit(path);
  return await git.branch(['-m', oldName, newName]);
});

ipcMain.handle('git:deleteBranch', async (_, path: string, branch: string, force?: boolean) => {
  const git = getGit(path);
  return await git.deleteLocalBranch(branch, force);
});

ipcMain.handle('git:commit', async (_, path: string, message: string, options?: any) => {
  const git = getGit(path);
  await git.commit(message, undefined, options);
  return true;
});

ipcMain.handle('git:push', async (_, path: string) => {
  const git = getGit(path);
  await git.push();
  return true;
});

ipcMain.handle('git:pull', async (_, path: string) => {
  const git = getGit(path);
  await git.pull();
  return true;
});

ipcMain.handle('git:fetch', async (_, path: string) => {
  const git = getGit(path);
  await git.fetch();
  return true;
});

ipcMain.handle('git:checkIsRepo', async (_, path: string) => {
  try {
    const git = simpleGit(path);
    const isRepo = await git.checkIsRepo();
    return isRepo;
  } catch (e) {
    return false;
  }
});

ipcMain.handle('git:getStashes', async (_, path: string) => {
  const git = getGit(path);
  const stashes = await git.stashList();
  return JSON.parse(JSON.stringify(stashes));
});

ipcMain.handle('git:readFile', async (_, path: string) => {
  return await fs.readFile(path, 'utf-8');
});

ipcMain.handle('git:writeFile', async (_, path: string, content: string) => {
  return await fs.writeFile(path, content, 'utf-8');
});

ipcMain.handle('git:getCommitFiles', async (_, path: string, hash: string) => {
  const git = getGit(path);
  const result = await git.raw(['show', '--name-status', '--format=format:', hash]);
  return result.trim().split('\n').map(line => {
    const [status, filePath] = line.split(/\s+/);
    return { status, path: filePath };
  });
});

ipcMain.handle('git:getDiff', async (_, path: string, hash1?: string, hash2?: string) => {
  const git = getGit(path);
  if (hash2) {
    return await git.diff([hash1!, hash2]);
  } else if (hash1) {
    if (hash1 === 'UPSTREAM') {
      // Compare local working tree with the upstream tracking branch
      return await git.diff(['@{u}']);
    }
    return await git.show([hash1]);
  }
  return await git.diff();
});

ipcMain.handle('git:discardChanges', async (_, path: string, files: string | string[]) => {
  const git = getGit(path);
  // Restores files to HEAD state (both index and working tree)
  return await git.checkout(['HEAD', '--', ...(Array.isArray(files) ? files : [files])]);
});

ipcMain.handle('git:add', async (_, path: string, files: string | string[]) => {
  const git = getGit(path);
  return await git.add(files);
});

ipcMain.handle('git:reset', async (_, path: string, files: string | string[]) => {
  const git = getGit(path);
  return await git.reset(['--', ...(Array.isArray(files) ? files : [files])]);
});

ipcMain.handle('git:stash', async (_, path: string, message?: string) => {
  const git = getGit(path);
  return await git.stash(message ? ['save', message] : []);
});

ipcMain.handle('git:resetHard', async (_, path: string, hash: string) => {
  const git = getGit(path);
  return await git.reset(['--hard', hash]);
});

ipcMain.handle('git:resetMode', async (_, path: string, hash: string, mode: 'soft' | 'mixed' | 'hard' | 'keep') => {
  const git = getGit(path);
  const modeFlag = `--${mode}`;
  return await git.reset([modeFlag, hash]);
});

ipcMain.handle('git:squash', async (_, path: string, startHash: string, endHash: string, message: string) => {
  const git = getGit(path);
  try {
    // Basic squash implementation using reset and commit
    await git.reset(['--soft', `${startHash}^`]);
    await git.commit(message);
    return true;
  } catch (e) {
    console.error('Squash failed:', e);
    throw e;
  }
});

ipcMain.handle('dialog:selectDirectory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  if (canceled) return null;
  return filePaths[0];
});
