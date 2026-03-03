import React, { useState } from 'react';
import { useRepoStore } from '@/store/repoStore';
import { Plus, Minus, Check } from 'lucide-react';

const StagingPanel: React.FC = () => {
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

  const handleAdd = async (filePath: string) => {
    if (!currentPath) return;
    await runWithLog(`git add ${filePath}`, () => window.electronAPI.git.add(currentPath, filePath));
    await refresh();
  };

  const handleReset = async (filePath: string) => {
    if (!currentPath) return;
    await runWithLog(`git reset HEAD ${filePath}`, () => window.electronAPI.git.reset(currentPath, filePath));
    await refresh();
  };

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

  const stagedFiles = status?.staged || [];
  const unstagedFiles = status?.files.filter(f => f.index === ' ' || f.working_dir !== ' ') || [];

  return (
    <div className="h-full flex flex-col bg-[#252526] overflow-hidden">
      <div className="p-4 border-b border-[#333333]">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#888888]">Staging</h2>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Unstaged Changes */}
        <div>
          <h3 className="text-xs font-bold text-[#666666] mb-2 uppercase flex justify-between">
            Unstaged Changes <span>{unstagedFiles.length}</span>
          </h3>
          <ul className="space-y-1">
            {unstagedFiles.map((file) => (
              <li key={file.path} className="flex items-center justify-between text-xs group py-1">
                <span className={`truncate ${file.working_dir === '?' ? 'text-gray-500' : 'text-[#cccccc]'}`}>
                  {file.path}
                </span>
                <button
                  onClick={() => handleAdd(file.path)}
                  className="opacity-0 group-hover:opacity-100 text-green-500 p-1 hover:bg-[#333333] rounded"
                >
                  <Plus size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Staged Changes */}
        <div>
          <h3 className="text-xs font-bold text-[#666666] mb-2 uppercase flex justify-between">
            Staged Changes <span>{stagedFiles.length}</span>
          </h3>
          <ul className="space-y-1">
            {stagedFiles.map((file) => (
              <li key={file} className="flex items-center justify-between text-xs group py-1">
                <span className="truncate text-green-400">{file}</span>
                <button
                  onClick={() => handleReset(file)}
                  className="opacity-0 group-hover:opacity-100 text-red-500 p-1 hover:bg-[#333333] rounded"
                >
                  <Minus size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="p-4 bg-[#1e1e1e] border-t border-[#333333] space-y-2">
        <div className="flex justify-between items-center text-[10px] text-[#666666] uppercase font-bold">
           <span>Message</span>
           <span className={message.split('\n')[0].length > 72 ? 'text-yellow-500' : ''}>
             {message.split('\n')[0].length}/72
           </span>
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
