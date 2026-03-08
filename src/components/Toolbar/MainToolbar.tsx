import React from 'react';
import { useRepoStore } from '@/store/repoStore';
import { RefreshCw, Settings, Terminal, Loader2 } from 'lucide-react';

interface MainToolbarProps {
  setShowSettingsModal: (show: boolean) => void;
}

const MainToolbar: React.FC<MainToolbarProps> = ({ setShowSettingsModal }) => {
  const { currentPath, refresh, status, lastCommand, isExecuting, viewMode, setViewMode, addGitLog, updateGitLog } = useRepoStore();
  const isMac = window.electronAPI.platform === 'darwin';
  const isWindows = window.electronAPI.platform === 'win32';

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

  const handleFetch = async () => {
    if (!currentPath) return;
    await runWithLog('git fetch', () => window.electronAPI.git.fetch(currentPath));
    await refresh();
  };

  const handlePull = async () => {
    if (!currentPath) return;
    await runWithLog('git pull', () => window.electronAPI.git.pull(currentPath));
    await refresh();
  };

  const handlePush = async () => {
    if (!currentPath) return;
    await runWithLog('git push', () => window.electronAPI.git.push(currentPath));
    await refresh();
  };

  return (
    <div className={`h-12 bg-[#333333] border-b border-[#1e1e1e] flex items-center justify-between px-4`}>
      <div className="flex items-center gap-2">
        <button
          onClick={handleFetch}
          className="p-2 hover:bg-[#444444] rounded transition-colors"
          title="Fetch"
        >
          <RefreshCw size={18} className={isExecuting && lastCommand?.includes('fetch') ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Global Command Display */}
      <div className="flex-1 flex justify-center px-4 overflow-hidden">
        {lastCommand && (
          <div className={`flex items-center gap-3 px-4 py-1.5 bg-black/20 rounded-full border transition-all ${isExecuting ? 'border-[#1f6feb]/50 shadow-[0_0_8px_rgba(31,111,235,0.2)]' : 'border-[#30363d]'}`}>
            {isExecuting ? (
              <Loader2 size={12} className="animate-spin text-[#58a6ff]" />
            ) : (
              <Terminal size={12} className="text-[#8b949e]" />
            )}
            <span className="font-mono text-[11px] truncate max-w-[300px]">
              {isExecuting ? 'Executing:' : 'Last:'} <span className="text-[#cccccc]">{lastCommand}</span>
            </span>
            {!isExecuting && useRepoStore.getState().gitLogs[0]?.duration !== undefined && (
              <span className="text-[10px] text-[#484f58] border-l border-[#30363d] pl-2 ml-1">
                {useRepoStore.getState().gitLogs[0].duration}ms
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode(viewMode === 'logs' ? 'repo' : 'logs')}
          className={`p-2 rounded transition-colors ${viewMode === 'logs' ? 'bg-[#1f6feb] text-white' : 'hover:bg-[#444444] text-[#cccccc]'}`}
          title="Git Activity Log"
        >
          <Terminal size={18} />
        </button>
        <button
          onClick={() => setShowSettingsModal(true)}
          className="p-2 hover:bg-[#444444] rounded transition-colors" title="Settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </div>
  );
};

export default MainToolbar;
