import React from 'react';
import { useRepoStore } from '@/store/repoStore';
import { useShallow } from 'zustand/react/shallow';
import { RefreshCw, Settings, Terminal, Loader2 } from 'lucide-react';

interface MainToolbarProps {
  setShowSettingsModal: (show: boolean) => void;
}

const MainToolbar: React.FC<MainToolbarProps> = ({ setShowSettingsModal }) => {
  const { currentPath, refresh, lastCommand, isExecuting, latestLogDuration, viewMode, setViewMode } = useRepoStore(useShallow(state => ({
    currentPath: state.currentPath,
    refresh: state.refresh,
    lastCommand: state.lastCommand,
    isExecuting: state.isExecuting,
    latestLogDuration: state.gitLogs[0]?.duration,
    viewMode: state.viewMode,
    setViewMode: state.setViewMode,
  })));

  const handleRefresh = async () => {
    if (!currentPath) return;
    await refresh();
  };

  return (
    <div className={`h-12 bg-[#333333] border-b border-[#1e1e1e] flex items-center justify-between px-4`}>
      <div className="flex items-center gap-2">
        <button
          onClick={handleRefresh}
          className="p-2 hover:bg-[#444444] rounded transition-colors"
          title="Refresh"
        >
          <RefreshCw size={18} className={isExecuting ? 'animate-spin' : ''} />
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
            {!isExecuting && latestLogDuration !== undefined && (
              <span className="text-[10px] text-[#484f58] border-l border-[#30363d] pl-2 ml-1">
                {latestLogDuration}ms
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
