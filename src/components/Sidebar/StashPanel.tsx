import React from 'react';
import { useRepoStore } from '@/store/repoStore';
import { Archive, Play } from 'lucide-react';

const StashPanel: React.FC = () => {
  const { stashes, currentPath, refresh, addGitLog, updateGitLog } = useRepoStore();

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

  const handleApply = async (index: number) => {
    if (!currentPath) return;
    try {
      await runWithLog(`git stash apply stash@{${index}}`, () => window.electronAPI.git.applyStash(currentPath, index));
      await refresh();
    } catch (error) {
      console.error('Apply stash failed:', error);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xs font-bold uppercase tracking-wider text-[#888888] mb-4">Stashes</h2>
      {stashes.length > 0 ? (
        <ul className="space-y-1">
          {stashes.map((stash, idx) => (
            <li
              key={idx}
              className="flex items-center justify-between text-xs p-1 rounded hover:bg-[#2a2d2e] text-[#cccccc] group"
            >
              <div className="flex items-center gap-2 truncate">
                <Archive size={14} className="text-[#888888]" />
                <span className="truncate">{stash.message}</span>
              </div>
              <button
                onClick={() => handleApply(idx)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#3e3e42] rounded text-blue-400"
                title="Apply Stash"
              >
                <Play size={12} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-[#666666]">No stashes</p>
      )}
    </div>
  );
};

export default StashPanel;
