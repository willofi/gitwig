import React, { useEffect } from 'react';
import Sidebar from '@/components/Sidebar/Sidebar';
import MainToolbar from '@/components/Toolbar/MainToolbar';
import CommitGraph from '@/components/CommitGraph/CommitGraph';
import CommitDetail from '@/components/CommitDetail/CommitDetail';
import StagingPanel from '@/components/StagingArea/StagingPanel';
import ConflictResolutionPanel from '@/components/ConflictEditor/ConflictResolutionPanel';
import { useRepoStore } from '@/store/repoStore';
import TitleBar from '@/components/Common/TitleBar';
import SettingsModal from '@/components/Common/SettingsModal';

import GitLogView from '@/components/Toolbar/GitLogView';

function App() {
  const { refresh, currentBranch, status, currentPath, isLoading, viewMode, autoFetchInterval } = useRepoStore();
  const [error, setError] = React.useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = React.useState(false);

  useEffect(() => {
    const handleRefresh = async () => {
      if (!currentPath) return;
      setError(null);
      try {
        await refresh();
      } catch (e: any) {
        setError(e.message || 'Refresh failed');
      }
    };
    handleRefresh();
  }, [currentPath, refresh]);

  // Auto-fetch logic
  useEffect(() => {
    if (!currentPath || autoFetchInterval === 0) return;

    const intervalId = setInterval(() => {
      useRepoStore.getState().refresh();
    }, autoFetchInterval * 60 * 1000); // minutes to milliseconds

    return () => clearInterval(intervalId);
  }, [currentPath, autoFetchInterval]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault();
        refresh();
      } else if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setShowSettingsModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [refresh]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#1e1e1e] text-[#cccccc] flex-col text-sans">
      <TitleBar />
      <MainToolbar setShowSettingsModal={setShowSettingsModal} />
      <div className="flex flex-1 overflow-hidden relative">
        {viewMode === 'logs' ? (
          <GitLogView />
        ) : (
          <>
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-hidden">
                 <CommitGraph />
              </div>
              <div className="h-1/3 border-t border-[#333333] overflow-auto">
                 <CommitDetail />
              </div>
            </div>
            <div className="w-80 border-l border-[#333333] overflow-auto">
              <StagingPanel />
            </div>
          </>
        )}
      </div>
      <ConflictResolutionPanel />
      <div className="h-6 bg-[#007acc] text-white text-[10px] flex items-center justify-between px-2 z-50">
        <div className="flex items-center gap-4">
          <span>Branch: <span className="font-bold">{currentBranch || 'N/A'}</span></span>
          {status && (
            <span>Status: <span className="font-bold">{status.files.length === 0 ? 'Clean' : `${status.files.length} changes`}</span></span>
          )}
          {isLoading && <span className="animate-pulse">Refreshing...</span>}
          {error && <span className="text-red-300">Error: {error}</span>}
        </div>
        <div>Last refreshed: {new Date().toLocaleTimeString()}</div>
      </div>
      {showSettingsModal && <SettingsModal onClose={() => setShowSettingsModal(false)} />}
    </div>
  );
}

export default App;
