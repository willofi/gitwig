import React, { useState } from 'react';
import { useRepoStore } from '@/store/repoStore';
import { Plus, Minus, Check, PlusCircle, MinusCircle, Star, PanelRightClose } from 'lucide-react';

// ─── Heuristic commit message generator ───────────────────────────────────────

interface FileEntry { path: string; index: string; }

function guessType(files: FileEntry[]): string {
  const paths = files.map(f => f.path);
  const statuses = files.map(f => f.index.trim());

  const isTest  = (p: string) => /\.(test|spec)\.[jt]sx?$/.test(p) || p.includes('__tests__') || p.includes('/test/');
  const isDocs  = (p: string) => /\.(md|mdx|txt|rst)$/i.test(p) || p.startsWith('docs/');
  const isStyle = (p: string) => /\.(css|scss|sass|less|styl)$/.test(p);
  const isConfig = (p: string) =>
    /\.(json|yaml|yml|toml|env|lock)$/.test(p) ||
    /^(package\.json|tsconfig.*|vite\.config|eslint.*|prettier.*|\.gitignore|\.env.*)$/i.test(p.split('/').pop()!);

  if (paths.every(isTest))   return 'test';
  if (paths.every(isDocs))   return 'docs';
  if (paths.every(isStyle))  return 'style';
  if (paths.every(isConfig)) return 'chore';
  if (statuses.every(s => s === 'D')) return 'chore';
  if (statuses.some(s => s === 'A'))  return 'feat';
  return 'feat';
}

function guessScope(files: FileEntry[]): string {
  const paths = files.map(f => f.path);
  if (paths.length === 1) {
    return paths[0].split('/').pop()!.replace(/\.[^.]+$/, '');
  }
  const parts = paths.map(p => p.split('/'));
  const generic = new Set(['src', 'app', 'lib', 'utils', 'components', 'pages', 'hooks', 'store', 'types', 'styles']);
  // Walk from deepest common dir upward, skip generic names
  const minLen = Math.min(...parts.map(p => p.length));
  let common = '';
  for (let i = 0; i < minLen - 1; i++) {
    if (parts.every(p => p[i] === parts[0][i])) {
      const seg = parts[0][i];
      if (!generic.has(seg)) common = seg;
    } else break;
  }
  if (common) return common;
  // Fallback: most frequent directory segment
  const freq: Record<string, number> = {};
  parts.forEach(segs => segs.slice(0, -1).forEach(s => { if (!generic.has(s)) freq[s] = (freq[s] || 0) + 1; }));
  const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : '';
}

function guessSubject(type: string, scope: string, files: FileEntry[]): string {
  const statuses = files.map(f => f.index.trim());
  const added    = statuses.filter(s => s === 'A').length;
  const deleted  = statuses.filter(s => s === 'D').length;
  const modified = statuses.filter(s => s === 'M' || s === 'U').length;
  const count    = files.length;

  if (type === 'test')  return `add tests for ${scope || 'module'}`;
  if (type === 'docs')  return `update documentation`;
  if (type === 'style') return `update ${scope || 'styles'}`;
  if (type === 'chore') {
    if (deleted > 0)  return `remove unused ${count === 1 ? scope || 'file' : 'files'}`;
    return `update ${scope || 'config'}`;
  }
  if (type === 'feat') {
    if (added === count) return `add ${scope || (count > 1 ? `${count} files` : 'module')}`;
    return `add ${scope || 'feature'}`;
  }
  if (modified > 0) return `update ${scope || 'module'}`;
  return `update ${scope || 'code'}`;
}

function generateMessage(stagedFiles: string[], allFiles: FileEntry[]): string {
  const staged = allFiles.filter(f => stagedFiles.includes(f.path) && f.index.trim() !== '');
  if (staged.length === 0) return '';
  const type    = guessType(staged);
  const scope   = guessScope(staged);
  const subject = guessSubject(type, scope, staged);
  return scope ? `${type}(${scope}): ${subject}` : `${type}: ${subject}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface StagingPanelProps {
  onCollapse: () => void;
}

const StagingPanel: React.FC<StagingPanelProps> = ({ onCollapse }) => {
  const { status, currentPath, refresh, addGitLog, updateGitLog } = useRepoStore();
  const [message, setMessage] = useState('');

  const runWithLog = async (cmd: string, action: () => Promise<any>) => {
    const logId = addGitLog({ command: cmd, status: 'pending' });
    const startTime = Date.now();
    try {
      await action();
      updateGitLog(logId, { status: 'success', duration: Date.now() - startTime });
    } catch (e: any) {
      updateGitLog(logId, { status: 'error', error: e.message || 'Action failed', duration: Date.now() - startTime });
      throw e;
    }
  };

  const handleAdd      = async (fp: string) => { if (!currentPath) return; await runWithLog(`git add ${fp}`, () => window.electronAPI.git.add(currentPath, fp)); await refresh(); };
  const handleReset    = async (fp: string) => { if (!currentPath) return; await runWithLog(`git reset HEAD ${fp}`, () => window.electronAPI.git.reset(currentPath, fp)); await refresh(); };
  const handleAddAll   = async () => { if (!currentPath) return; await runWithLog('git add -A', () => window.electronAPI.git.addAll(currentPath)); await refresh(); };
  const handleResetAll = async () => { if (!currentPath) return; await runWithLog('git reset HEAD', () => window.electronAPI.git.resetAll(currentPath)); await refresh(); };

  const handleCommit = async () => {
    if (!currentPath || !message) return;
    try {
      await runWithLog(`git commit -m "${message.split('\n')[0]}"`, () => window.electronAPI.git.commit(currentPath, message));
      setMessage('');
      await refresh();
    } catch (error) {
      console.error('Commit failed:', error);
    }
  };

  const handleAutoMessage = () => {
    const allFiles: FileEntry[] = (status?.files || []).map(f => ({ path: f.path, index: f.index }));
    const generated = generateMessage(stagedFiles, allFiles);
    if (generated) setMessage(generated);
  };

  const stagedFiles   = status?.staged || [];
  const unstagedFiles = status?.files.filter(f => f.index === ' ' || f.working_dir !== ' ') || [];

  return (
    <div className="h-full flex flex-col bg-[#252526] overflow-hidden">
      <div className="flex items-center justify-between px-3 shrink-0 bg-[#1e1e1e] border-b border-[#333333]" style={{ height: 28 }}>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#666666]">Staging</span>
        <button
          onClick={onCollapse}
          className="p-0.5 rounded transition-colors hover:bg-[#444444]/30 text-[#8b949e]"
          title="사이드바 닫기"
        >
          <PanelRightClose size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">

        {/* Unstaged Changes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-[#666666] uppercase">
              Unstaged <span className="ml-1">{unstagedFiles.length}</span>
            </h3>
            {unstagedFiles.length > 0 && (
              <button
                onClick={handleAddAll}
                className="flex items-center gap-1 text-[10px] font-bold text-green-500 hover:text-green-400 transition-colors px-1.5 py-0.5 rounded hover:bg-[#333333]"
                title="모두 Stage"
              >
                <PlusCircle size={11} /> All
              </button>
            )}
          </div>
          <ul className="space-y-1">
            {unstagedFiles.map((file) => (
              <li key={file.path} className="flex items-center justify-between text-xs group py-1">
                <span className={`truncate ${file.working_dir === '?' ? 'text-gray-500' : 'text-[#cccccc]'}`}>
                  {file.path}
                </span>
                <button
                  onClick={() => handleAdd(file.path)}
                  className="opacity-0 group-hover:opacity-100 text-green-500 p-1 hover:bg-[#333333] rounded"
                  title="Stage"
                >
                  <Plus size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Staged Changes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-[#666666] uppercase">
              Staged <span className="ml-1">{stagedFiles.length}</span>
            </h3>
            {stagedFiles.length > 0 && (
              <button
                onClick={handleResetAll}
                className="flex items-center gap-1 text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors px-1.5 py-0.5 rounded hover:bg-[#333333]"
                title="모두 Unstage"
              >
                <MinusCircle size={11} /> All
              </button>
            )}
          </div>
          <ul className="space-y-1">
            {stagedFiles.map((file) => (
              <li key={file} className="flex items-center justify-between text-xs group py-1">
                <span className="truncate text-green-400">{file}</span>
                <button
                  onClick={() => handleReset(file)}
                  className="opacity-0 group-hover:opacity-100 text-red-500 p-1 hover:bg-[#333333] rounded"
                  title="Unstage"
                >
                  <Minus size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Commit area */}
      <div className="p-4 bg-[#1e1e1e] border-t border-[#333333] space-y-2">
        <div className="flex justify-between items-center text-[10px] text-[#666666] uppercase font-bold">
          <div className="flex items-center gap-2">
            <span>Message</span>
            {stagedFiles.length > 0 && (
              <div className="relative group/autobtn">
                <button
                  onClick={handleAutoMessage}
                  className="p-1 rounded transition-all duration-150 hover:bg-yellow-500/15 hover:shadow-[0_0_8px_rgba(234,179,8,0.35)] hover:scale-110"
                  style={{ color: '#eab308' }}
                >
                  <Star size={12} fill="currentColor" />
                </button>
                <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap opacity-0 group-hover/autobtn:opacity-100 transition-opacity duration-150 z-50"
                  style={{ background: '#1c2128', border: '1px solid #30363d', color: '#e6edf3' }}>
                  Auto Generate
                </div>
              </div>
            )}
          </div>
          <span>{message.split('\n')[0].length}</span>
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Subject (max 72 chars)&#10;&#10;Optional body description..."
          className="w-full h-24 bg-[#252526] text-sm text-[#cccccc] p-2 border border-[#333333] rounded focus:outline-none focus:border-blue-500 resize-none"
        />
        <button
          onClick={handleCommit}
          disabled={!message || stagedFiles.length === 0}
          className="w-full py-2 bg-[#0e639c] hover:bg-[#1177bb] disabled:bg-[#333333] disabled:text-[#666666] text-white text-sm font-bold rounded flex items-center justify-center gap-2 transition-colors"
        >
          <Check size={16} />
          Commit
        </button>
      </div>
    </div>
  );
};

export default StagingPanel;
