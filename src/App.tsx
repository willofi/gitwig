import React, { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useShallow } from 'zustand/react/shallow';
import Sidebar from '@/components/Sidebar/Sidebar';
import MainToolbar from '@/components/Toolbar/MainToolbar';
import CommitGraph from '@/components/CommitGraph/CommitGraph';
import CommitDetail from '@/components/CommitDetail/CommitDetail';
import StagingPanel from '@/components/StagingArea/StagingPanel';
import UpdateBanner from '@/components/Common/UpdateBanner';
import { useRepoStore } from '@/store/repoStore';
import TitleBar from '@/components/Common/TitleBar';
import { ThemeContext } from '@/contexts/ThemeContext';
import { computeIsDark } from '@/utils/theme';
import { PanelLeftOpen, PanelRightOpen } from 'lucide-react';

const ConflictResolutionPanel = React.lazy(() => import('@/components/ConflictEditor/ConflictResolutionPanel'));
const SettingsModal = React.lazy(() => import('@/components/Common/SettingsModal'));
const GitLogView = React.lazy(() => import('@/components/Toolbar/GitLogView'));

function App() {
  const { currentBranch, status, currentPath, isLoading, viewMode, autoFetchInterval, theme } = useRepoStore(
    useShallow(s => ({
      currentBranch: s.currentBranch,
      status: s.status,
      currentPath: s.currentPath,
      isLoading: s.isLoading,
      viewMode: s.viewMode,
      autoFetchInterval: s.autoFetchInterval,
      theme: s.theme,
    }))
  );
  const [error, setError] = React.useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = React.useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  // ── 상하 패널 리사이저 ────────────────────────────────────────────────────
  const MIN_TOP    = 120;
  const MIN_BOTTOM = 100;
  const [bottomHeight, setBottomHeight] = useState(280);
  const bottomHeightRef = useRef(280);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY      = e.clientY;
    const startHeight = bottomHeightRef.current;

    const onMouseMove = (ev: MouseEvent) => {
      if (!splitContainerRef.current) return;
      const containerH = splitContainerRef.current.clientHeight;
      const delta      = startY - ev.clientY;
      const next       = Math.min(containerH - MIN_TOP - 5, Math.max(MIN_BOTTOM, startHeight + delta));
      bottomHeightRef.current = next;
      setBottomHeight(next);
    };
    const onMouseUp = () => {
      document.body.style.cursor    = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
    };
    document.body.style.cursor    = 'row-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
  }, []);

  // 시스템 다크모드 변경 감지 (auto 모드 전용)
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    if (theme !== 'auto') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => forceUpdate(n => n + 1);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [theme]);

  const isDark = computeIsDark(theme);

  // currentPath 변경 시 에러 초기화 (refresh는 setCurrentPath에서 이미 호출됨)
  useEffect(() => {
    setError(null);
  }, [currentPath]);

  // Auto-fetch logic
  useEffect(() => {
    if (!currentPath || autoFetchInterval === 0) return;
    const intervalId = setInterval(() => {
      useRepoStore.getState().refresh();
    }, autoFetchInterval * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [currentPath, autoFetchInterval]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault();
        useRepoStore.getState().refresh();
      } else if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setShowSettingsModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark }}>
      <div
        data-theme={isDark ? 'dark' : 'light'}
        className="flex h-screen overflow-hidden text-sans flex-col"
        style={{ background: isDark ? '#1e1e1e' : '#ffffff', color: isDark ? '#cccccc' : '#1f2328' }}
      >
        <TitleBar />
        <UpdateBanner />
        <MainToolbar setShowSettingsModal={setShowSettingsModal} />
        <div className="flex flex-1 overflow-hidden relative">
          {viewMode === 'logs' ? (
            <Suspense fallback={null}><GitLogView /></Suspense>
          ) : (
            <>
              {/* ── 왼쪽 사이드바 ── */}
              <div style={{ width: leftOpen ? 256 : 0, flexShrink: 0, overflow: 'hidden', transition: 'width 0.2s ease' }}>
                <Sidebar onCollapse={() => setLeftOpen(false)} />
              </div>

              {/* 왼쪽 열기 탭 — flex row 형제 요소 */}
              {!leftOpen && (
                <div
                  className="flex flex-col shrink-0"
                  style={{
                    width: 20,
                    background: isDark ? '#1e1e1e' : '#f0f2f5',
                    borderRight: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
                  }}
                >
                  <button
                    onClick={() => setLeftOpen(true)}
                    title="Explorer 열기"
                    className="p-0.5 rounded transition-colors hover:bg-[#444444]/30"
                    style={{ color: isDark ? '#8b949e' : '#57606a', margin: '7px auto 0' }}
                  >
                    <PanelLeftOpen size={13} />
                  </button>
                </div>
              )}

              {/* ── 메인 콘텐츠 ── */}
              <div ref={splitContainerRef} className="flex flex-col flex-1 overflow-hidden" style={{ minWidth: 0 }}>
                <div className="overflow-hidden" style={{ flex: 1, minHeight: MIN_TOP }}>
                  <CommitGraph />
                </div>
                <div
                  onMouseDown={handleDividerMouseDown}
                  className="group flex items-center justify-center shrink-0 cursor-row-resize"
                  style={{ height: 5, background: isDark ? '#21262d' : '#eaeef2' }}
                >
                  <div
                    className="w-10 rounded-full transition-opacity opacity-0 group-hover:opacity-100"
                    style={{ height: 3, background: isDark ? '#8b949e' : '#8c959f' }}
                  />
                </div>
                <div className="overflow-auto shrink-0" style={{ height: bottomHeight, minHeight: MIN_BOTTOM, borderTop: `1px solid ${isDark ? '#333333' : '#d0d7de'}` }}>
                  <CommitDetail />
                </div>
              </div>

              {/* 오른쪽 열기 탭 — flex row 형제 요소 */}
              {!rightOpen && (
                <div
                  className="flex flex-col shrink-0"
                  style={{
                    width: 20,
                    background: isDark ? '#1e1e1e' : '#f0f2f5',
                    borderLeft: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
                  }}
                >
                  <button
                    onClick={() => setRightOpen(true)}
                    title="Staging 열기"
                    className="p-0.5 rounded transition-colors hover:bg-[#444444]/30"
                    style={{ color: isDark ? '#8b949e' : '#57606a', margin: '7px auto 0' }}
                  >
                    <PanelRightOpen size={13} />
                  </button>
                </div>
              )}

              {/* ── 오른쪽 사이드바 ── */}
              <div style={{ width: rightOpen ? 320 : 0, flexShrink: 0, overflow: 'hidden', transition: 'width 0.2s ease', borderLeft: rightOpen ? `1px solid ${isDark ? '#333333' : '#d0d7de'}` : 'none' }}>
                <StagingPanel onCollapse={() => setRightOpen(false)} />
              </div>
            </>
          )}
        </div>
        <Suspense fallback={null}><ConflictResolutionPanel /></Suspense>
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
        {showSettingsModal && <Suspense fallback={null}><SettingsModal onClose={() => setShowSettingsModal(false)} /></Suspense>}
      </div>
    </ThemeContext.Provider>
  );
}

export default App;
