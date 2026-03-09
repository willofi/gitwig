import { ipcMain, dialog } from 'electron';
import simpleGit, { SimpleGit } from 'simple-git';
import fs from 'fs/promises';

const gitMap: Map<string, SimpleGit> = new Map();

function getGit(path: string): SimpleGit {
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
  const git = getGit(path);
  try {
    const args = ['log', '--decorate=short', '--color=never', '--format=format:%H%x1f%P%x1f%d%x1f%s%x1f%an%x1f%ae%x1f%at'];
    if (maxCount) args.push('-n', maxCount.toString());
    if (firstParent) args.push('--first-parent');
    if (mergesOnly) args.push('--merges');
    args.push(isStrict ? branch : '--all');
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

ipcMain.handle('git:getCurrentBranch', async (_, path: string) => {
  const git = getGit(path);
  try {
    const result = await git.raw(['rev-parse', '--abbrev-ref', 'HEAD']);
    const branch = result.trim();
    return branch === 'HEAD' ? null : branch; // detached HEAD는 null 반환
  } catch {
    return null;
  }
});

ipcMain.handle('git:getStatus', async (_, path: string) => {
  const git = getGit(path);
  const status = await git.status();
  return {
    not_added: status.not_added,
    conflicted: status.conflicted,
    created: status.created,
    deleted: status.deleted,
    modified: status.modified,
    renamed: status.renamed,
    staged: status.staged,
    files: status.files,
    ahead: status.ahead,
    behind: status.behind,
    current: status.current,
    tracking: status.tracking,
  };
});

ipcMain.handle('git:getBranches', async (_, path: string) => {
  const git = getGit(path);

  // git.branch()와 for-each-ref를 병렬 실행
  const [branches, rawData] = await Promise.all([
    git.branch(['-a']),
    git.raw(['for-each-ref', '--format=%(refname:short)@%@%(upstream:track)', 'refs/heads'])
      .catch(() => ''),
  ]);

  if (rawData) {
    const lines = rawData.trim().split('\n');
    for (const line of lines) {
      const [name, track] = line.split('@%@');
      if (name && track && branches.branches[name]) {
        const b = branches.branches[name] as any;
        const aheadMatch = track.match(/ahead (\d+)/);
        const behindMatch = track.match(/behind (\d+)/);
        b.ahead = aheadMatch ? parseInt(aheadMatch[1], 10) : 0;
        b.behind = behindMatch ? parseInt(behindMatch[1], 10) : 0;
      }
    }
  }

  return {
    all: branches.all,
    current: branches.current,
    branches: Object.fromEntries(
      Object.entries(branches.branches).map(([k, v]) => [k, {
        name: (v as any).name,
        commit: (v as any).commit,
        label: (v as any).label,
        current: (v as any).current,
        linkedWorkTree: (v as any).linkedWorkTree,
        ahead: (v as any).ahead ?? 0,
        behind: (v as any).behind ?? 0,
      }])
    ),
  };
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

ipcMain.handle('git:applyStash', async (_, path: string, index: number) => {
  const git = getGit(path);
  return await git.stash(['apply', `stash@{${index}}`]);
});

ipcMain.handle('git:getStashes', async (_, path: string) => {
  const git = getGit(path);
  const stashes = await git.stashList();
  return stashes;
});

ipcMain.handle('git:readFile', async (_, path: string) => {
  return await fs.readFile(path, 'utf-8');
});

ipcMain.handle('git:writeFile', async (_, path: string, content: string) => {
  return await fs.writeFile(path, content, 'utf-8');
});

ipcMain.handle('git:getCommitFiles', async (_, path: string, hash: string) => {
  const git = getGit(path);

  const parse = (raw: string) =>
    raw.trim().split('\n').filter(Boolean).map(line => {
      const parts = line.split(/\t/);
      const status = parts[0][0]; // R100 → R, C100 → C 등 첫 글자만
      const filePath = parts.length > 2
        ? `${parts[1]} → ${parts[2]}` // 이름 변경
        : parts[1];
      return { status, path: filePath };
    }).filter(f => f.path);

  try {
    // 첫 번째 부모와의 diff — 머지 커밋도 올바르게 파일 목록 반환
    const result = await git.raw(['diff', '--name-status', `${hash}^1`, hash]);
    return parse(result);
  } catch {
    // 루트 커밋(부모 없음) 등 fallback
    try {
      const result = await git.raw(['show', '--name-status', '--format=format:', hash]);
      return parse(result);
    } catch {
      return [];
    }
  }
});

ipcMain.handle('git:getDiff', async (_, path: string, hash1?: string, hash2?: string, filePath?: string) => {
  const git = getGit(path);
  if (hash2) {
    const args: string[] = [hash1!, hash2];
    if (filePath) args.push('--', filePath);
    return await git.diff(args);
  } else if (hash1) {
    if (hash1 === 'UPSTREAM') {
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

ipcMain.handle('git:addAll', async (_, path: string) => {
  const git = getGit(path);
  return await git.add('-A');
});

ipcMain.handle('git:resetAll', async (_, path: string) => {
  const git = getGit(path);
  return await git.raw(['reset', 'HEAD']);
});

ipcMain.handle('git:cherryPick', async (_, path: string, hash: string) => {
  const git = getGit(path);
  return await git.raw(['cherry-pick', hash]);
});

ipcMain.handle('dialog:selectDirectory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  if (canceled) return null;
  return filePaths[0];
});
