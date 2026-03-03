import React, { memo } from 'react';
import { useRepoStore } from '@/store/repoStore';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { ko } from 'date-fns/locale';
import GraphSVG from './GraphSVG';
import { Search, Loader2, X, Tag, Calendar } from 'lucide-react';
import { Commit } from '@/types/git.types';
import ResetModal from './ResetModal';
import PromptModal from '../Common/PromptModal';

const MAX_VISIBLE_LANES = 6;
const LANE_WIDTH = 18;
const ROW_HEIGHT = 26;
const OFFSET_X = 16;

const formatDate = (date: number | undefined) => {
  if (!date || isNaN(date)) return '---';
  try {
    const commitDate = new Date(date);
    if (isToday(commitDate)) {
      return formatDistanceToNow(commitDate, { addSuffix: true, locale: ko });
    }
    if (isYesterday(commitDate)) {
      return `어제 ${format(commitDate, 'HH:mm')}`;
    }
    return format(commitDate, 'yy.MM.dd HH:mm');
  } catch (e) {
    return '---';
  }
};

interface RefBadgeProps {
  refs: string;
  viewingBranch: string | null;
}

const RefBadge: React.FC<RefBadgeProps> = ({ refs, viewingBranch }) => {
  const allRefs = refs.split(',').map(r => r.trim());
  const [isHovered, setIsHovered] = React.useState(false);

  if (allRefs.length === 0) return null;

  const renderLabel = (r: string) => {
    const isHead = r.includes('HEAD') || r.includes('->');
    const isTag = r.startsWith('tag:');
    const label = isTag ? r.replace('tag: ', '') : r;

    if (viewingBranch) {
      const cleanLabel = label.replace(/^remotes\//, '').replace(/^origin\//, '');
      const cleanViewing = viewingBranch.replace(/^remotes\//, '').replace(/^origin\//, '');
      if (cleanLabel !== cleanViewing && !r.includes('HEAD')) return null;
    }

    return (
      <span key={r} className={`px-1 py-0.5 rounded-[2px] text-[10px] font-bold border flex items-center gap-1 whitespace-nowrap ${
        isHead 
          ? 'bg-[#1f6feb]/10 border-[#1f6feb]/30 text-[#58a6ff]' 
          : isTag 
            ? 'bg-[#238636]/10 border-[#238636]/30 text-[#3fb950]' 
            : 'bg-[#30363d] border-[#444c56] text-[#c9d1d9]'
      }`}>
        <Tag size={8} strokeWidth={2.5} />
        {label}
      </span>
    );
  };

  const filteredRefs = allRefs.filter(r => {
    if (!viewingBranch) return true;
    const label = r.startsWith('tag:') ? r.replace('tag: ', '') : r;
    const cleanLabel = label.replace(/^remotes\//, '').replace(/^origin\//, '');
    const cleanViewing = viewingBranch.replace(/^remotes\//, '').replace(/^origin\//, '');
    return cleanLabel === cleanViewing || r.includes('HEAD');
  });

  if (filteredRefs.length === 0) return null;

  return (
    <div 
      className="relative flex items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {filteredRefs.length > 1 ? (
        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-[#1f6feb]/20 border border-[#1f6feb]/40 rounded-[2px] text-[10px] font-bold text-[#58a6ff] cursor-help">
          <Tag size={10} strokeWidth={2.5} />
          <span>{filteredRefs.length}</span>
          {isHovered && (
            <div className="absolute top-full right-0 mt-2 z-[100] bg-[#161b22] border border-[#30363d] shadow-2xl rounded-md p-1.5 flex flex-col gap-1 min-w-[120px]">
              {filteredRefs.map(r => renderLabel(r))}
              {/* Tooltip Arrow (pointing UP) */}
              <div className="absolute bottom-full right-4 w-2 h-2 bg-[#161b22] border-l border-t border-[#30363d] rotate-45 translate-y-1" />
            </div>
          )}
        </div>
      ) : (
        renderLabel(filteredRefs[0])
      )}
    </div>
  );
};

interface CommitRowProps {
  commit: Commit;
  idx: number;
  commits: Commit[];
  graphWidth: number;
  authorWidth: number;
  dateWidth: number;
  isSelected: boolean;
  viewingBranch: string | null;
  onSelect: (commit: Commit) => void;
  onContextMenu: (e: React.MouseEvent, commit: Commit) => void;
}

const CommitRow = memo(({ commit, idx, commits, graphWidth, authorWidth, dateWidth, isSelected, viewingBranch, onSelect, onContextMenu }: CommitRowProps) => {
  const isMerge = commit.parents && commit.parents.length > 1;
  
  return (
    <div
      className={`flex items-center text-[12px] border-b border-[#161b22]/30 cursor-pointer transition-colors group relative ${
        isSelected ? 'bg-[#1f2937]' : 'hover:bg-[#161b22]/50'
      }`}
      style={{ height: `${ROW_HEIGHT}px` }}
      onClick={() => onSelect(commit)}
      onContextMenu={(e) => onContextMenu(e, commit)}
    >
      {/* 1. Graph Area */}
      <div className="h-full shrink-0 relative" style={{ width: graphWidth }}>
         <GraphSVG commits={commits} currentIndex={idx} />
      </div>

      {/* 2. Message Area (Flexible) */}
      <div className={`flex-1 px-2 h-full flex items-center min-w-0 ${isMerge ? 'text-[#484f58] font-medium' : 'text-[#c9d1d9]'}`}>
        <span className="truncate group-hover:text-[#58a6ff] transition-colors flex-1">
          {commit.message}
        </span>
        {/* HEAD/Refs inside message area for better alignment */}
        {commit.refs && (
          <div className="shrink-0 ml-2">
            <RefBadge refs={commit.refs} viewingBranch={viewingBranch} />
          </div>
        )}
      </div>

      {/* 3. Meta Info Area (Right Aligned) */}
      <div className="flex items-center h-full shrink-0">
        {/* Author */}
        <div 
          className="px-2 h-full flex items-center justify-start text-[#8b949e] text-[11px] truncate opacity-80 border-l border-transparent group-hover:border-[#30363d]/30" 
          style={{ width: authorWidth }}
        >
          {commit.author_name}
        </div>

        {/* Date */}
        <div 
          className="px-2 h-full flex items-center justify-end text-[#484f58] text-[11px] border-l border-transparent group-hover:border-[#30363d]/30" 
          style={{ width: dateWidth }}
        >
          {formatDate(commit.date)}
        </div>

        {/* SHA */}
        <div className="w-16 px-2 h-full flex items-center justify-end text-[11px] font-mono opacity-30 group-hover:opacity-100 transition-opacity" style={{ color: commit.color }}>
          {commit.hash.substring(0, 7)}
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  return prev.isSelected === next.isSelected && 
         prev.commit.hash === next.commit.hash && 
         prev.idx === next.idx &&
         prev.viewingBranch === next.viewingBranch &&
         prev.authorWidth === next.authorWidth &&
         prev.dateWidth === next.dateWidth &&
         prev.commits.length === next.commits.length;
});

const CommitGraph: React.FC = () => {
  const { 
    commits,
    filteredCommits, 
    selectedCommit, 
    setSelectedCommit, 
    filter, 
    setFilter,
    userFilter,
    setUserFilter,
    dateFilter,
    setDateFilter,
    isLoading, 
    viewingBranch, 
    setViewingBranch,
    logFilterOptions,
    setLogFilterOptions,
    hasMore,
    loadMore,
    refresh 
  } = useRepoStore();

  const [authorWidth, setAuthorWidth] = React.useState(120);
  const [dateWidth, setDateWidth] = React.useState(140);
  const [resizing, setResizing] = React.useState<{ type: 'author' | 'date', startX: number, startWidth: number } | null>(null);

  // [VIRTUALIZATION] State for scroll tracking
  const [scrollTop, setScrollTop] = React.useState(0);
  const [containerHeight, setContainerHeight] = React.useState(0);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const updateHeight = () => {
      if (scrollRef.current) setContainerHeight(scrollRef.current.clientHeight);
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    setScrollTop(scrollTop);

    // Trigger load more when 80% through the current list
    if (hasMore && !isLoading && !filter && !userFilter && dateFilter.type === 'all') {
      if (scrollTop + clientHeight > scrollHeight - 500) {
        loadMore();
      }
    }
  };

  // Calculate visible range
  const visibleCount = containerHeight > 0 ? Math.ceil(containerHeight / ROW_HEIGHT) : 20;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 5);
  const endIndex = Math.min(filteredCommits.length, startIndex + visibleCount + 10);
  const visibleCommits = filteredCommits.slice(startIndex, endIndex);
  const totalHeight = filteredCommits.length * ROW_HEIGHT;
  const offsetY = startIndex * ROW_HEIGHT;

  // Unique authors for filter
  const authors = React.useMemo(() => {
    const set = new Set<string>();
    commits.forEach(c => set.add(c.author_name));
    return Array.from(set).sort();
  }, [commits]);

  const handleMouseDown = (e: React.MouseEvent, type: 'author' | 'date') => {
    e.preventDefault();
    setResizing({
      type,
      startX: e.clientX,
      startWidth: type === 'author' ? authorWidth : dateWidth
    });
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing) return;
      const delta = resizing.startX - e.clientX;
      const newWidth = Math.max(80, resizing.startWidth + delta);
      if (resizing.type === 'author') setAuthorWidth(newWidth);
      else setDateWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (!resizing) return;
      setResizing(null);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    if (resizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing]);

  const maxLanes = React.useMemo(() => {
    if (filteredCommits.length === 0) return 0;
    return Math.max(...filteredCommits.map(c => c.lane || 0), 0) + 1;
  }, [filteredCommits]);

  const graphWidth = Math.max(MAX_VISIBLE_LANES, maxLanes) * LANE_WIDTH + OFFSET_X;

  const [contextMenu, setContextMenu] = React.useState<{ x: number, y: number, commit: Commit } | null>(null);
  const [resettingCommit, setResettingCommit] = React.useState<Commit | null>(null);
  const [squashConfig, setSquashConfig] = React.useState<Commit | null>(null);

  const handleContextMenu = (e: React.MouseEvent, commit: Commit) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, commit });
  };

  const handleSquashConfirm = async (commit: Commit, message: string) => {
    const { currentPath, refresh } = useRepoStore.getState();
    if (!currentPath) return;

    try {
      await window.electronAPI.git.squash(currentPath, commit.hash, commit.hash, message);
      await refresh(true);
      alert("압축 완료!");
    } catch (e: any) {
      alert(`압축 실패: ${e.message}`);
    }
  };

  const handleResetConfirm = async (mode: 'soft' | 'mixed' | 'hard' | 'keep') => {
    if (!resettingCommit) return;
    const { currentPath, refresh } = useRepoStore.getState();
    if (!currentPath) return;

    try {
      await window.electronAPI.git.resetMode(currentPath, resettingCommit.hash, mode);
      setResettingCommit(null);
      await refresh(true);
    } catch (e: any) {
      alert(`재설정 실패: ${e.message}`);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0d1117] overflow-hidden text-[#e6edf3] font-mono relative" onClick={() => setContextMenu(null)}>
      {/* Reset Modal */}
      {resettingCommit && (
        <ResetModal 
          commit={resettingCommit} 
          currentBranch={useRepoStore.getState().currentBranch}
          onClose={() => setResettingCommit(null)} 
          onConfirm={handleResetConfirm}
        />
      )}

      {/* Squash Prompt */}
      {squashConfig && (
        <PromptModal
          title="커밋 Squash (압축)"
          message={`${squashConfig.hash.substring(0, 7)} 까지의 변경사항을 하나의 커밋으로 합칩니다. 새 커밋 메시지를 입력하세요:`}
          initialValue={`Squashed commits up to ${squashConfig.hash.substring(0, 7)}`}
          onClose={() => setSquashConfig(null)}
          onConfirm={(message) => {
            handleSquashConfirm(squashConfig, message);
            setSquashConfig(null);
          }}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-[1000] bg-[#161b22] border border-[#30363d] shadow-2xl rounded-md py-1 min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-[10px] text-[#8b949e] border-b border-[#30363d] mb-1">
            Commit: {contextMenu.commit.hash.substring(0, 7)}
          </div>
          <button 
            className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-[#1f6feb] transition-colors flex items-center gap-2"
            onClick={() => { setResettingCommit(contextMenu.commit); setContextMenu(null); }}
          >
            Reset Current branch to here...
          </button>
          <button 
            className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-[#1f6feb] transition-colors flex items-center gap-2"
            onClick={() => { setSquashConfig(contextMenu.commit); setContextMenu(null); }}
          >
            여기까지 Squash (압축)
          </button>
          <div className="border-t border-[#30363d] my-1" />
          <button 
            className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-[#30363d] transition-colors"
            onClick={() => { navigator.clipboard.writeText(contextMenu.commit.hash); setContextMenu(null); }}
          >
            SHA 복사
          </button>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#161b22] z-50 overflow-hidden">
          <div className="h-full bg-[#1f6feb] animate-[slide_1.5s_infinite_ease-in-out] w-1/3 rounded-full relative" />
          <style>{`
            @keyframes slide {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(300%); }
            }
          `}</style>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#161b22] border-b border-[#30363d] shadow-sm flex-wrap relative z-50">
        <div className="flex items-center gap-2 text-[#58a6ff]">
          <Search size={14} />
          <span className="text-[12px] font-bold">git log</span>
        </div>
        
        <div className="flex items-center gap-2">
          {viewingBranch ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#1f6feb]/15 border border-[#1f6feb]/40 rounded-md text-[10px] text-[#58a6ff]">
              <span><strong>{viewingBranch}</strong></span>
              <button onClick={() => setViewingBranch(null)} className="hover:bg-[#1f6feb]/20 rounded p-0.5 transition-colors">
                <X size={10} />
              </button>
            </div>
          ) : (
            <button onClick={() => refresh()} className="px-2 py-0.5 bg-[#2d333b] hover:bg-[#31363f] border border-[#484f58] rounded-md text-[10px] text-[#8b949e]">
               All
            </button>
          )}

          <div className="flex items-center bg-[#0d1117] rounded-md border border-[#30363d] p-0.5 ml-1">
            <button
              onClick={() => setLogFilterOptions({ firstParent: !logFilterOptions.firstParent })}
              className={`px-1.5 py-0.5 rounded text-[9px] ${logFilterOptions.firstParent ? 'bg-[#1f6feb] text-white' : 'text-[#8b949e]'}`}
            >
              1st
            </button>
            <button
              onClick={() => setLogFilterOptions({ mergesOnly: !logFilterOptions.mergesOnly })}
              className={`px-1.5 py-0.5 rounded text-[9px] ${logFilterOptions.mergesOnly ? 'bg-[#1f6feb] text-white' : 'text-[#8b949e]'}`}
            >
              Merge
            </button>
          </div>
        </div>

        {/* Search & Advanced Filters */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search..."
              className="w-32 bg-[#0d1117] text-[11px] text-[#c9d1d9] pl-2 pr-2 py-1 rounded-md border border-[#30363d] focus:outline-none focus:border-[#1f6feb] transition-all"
            />
          </div>

          <select 
            value={userFilter || ''} 
            onChange={(e) => setUserFilter(e.target.value || null)}
            className="bg-[#0d1117] text-[11px] text-[#c9d1d9] px-2 py-1 rounded-md border border-[#30363d] outline-none focus:border-[#1f6feb] max-w-[100px]"
          >
            <option value="">Users</option>
            {authors.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          <select 
            value={dateFilter.type} 
            onChange={(e) => setDateFilter({ type: e.target.value as any })}
            className="bg-[#0d1117] text-[11px] text-[#c9d1d9] px-2 py-1 rounded-md border border-[#30363d] outline-none focus:border-[#1f6feb]"
          >
            <option value="all">Date</option>
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7d</option>
            <option value="custom">Select...</option>
          </select>

          {dateFilter.type === 'custom' && (
            <div className="flex items-center gap-1 animate-in fade-in slide-in-from-left-2">
              <div className="relative group">
                <input 
                  type="date" 
                  className="bg-[#0d1117] text-[10px] text-[#c9d1d9] pl-1 pr-6 py-0.5 rounded border border-[#30363d] outline-none appearance-none [&::-webkit-calendar-picker-indicator]:hidden"
                  onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.valueAsNumber })}
                  id="date-start"
                />
                <Calendar 
                  size={10} 
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#484f58] group-hover:text-[#58a6ff] pointer-events-auto cursor-pointer" 
                  onClick={() => (document.getElementById('date-start') as any)?.showPicker?.()}
                />
              </div>
              <span className="text-[10px] text-[#484f58]">-</span>
              <div className="relative group">
                <input 
                  type="date" 
                  className="bg-[#0d1117] text-[10px] text-[#c9d1d9] pl-1 pr-6 py-0.5 rounded border border-[#30363d] outline-none appearance-none [&::-webkit-calendar-picker-indicator]:hidden"
                  onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.valueAsNumber })}
                  id="date-end"
                />
                <Calendar 
                  size={10} 
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#484f58] group-hover:text-[#58a6ff] pointer-events-auto cursor-pointer" 
                  onClick={() => (document.getElementById('date-end') as any)?.showPicker?.()}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Column Resizers */}
      <div className="absolute top-[41px] bottom-0 right-0 z-40 pointer-events-none w-full overflow-hidden">
         {/* Resizer: Between Commit Message and Author Name */}
         <div 
           className={`absolute pointer-events-auto h-full w-[4px] cursor-col-resize transition-colors ${resizing?.type === 'author' ? 'bg-[#1f6feb] opacity-100' : 'hover:bg-[#1f6feb]/30 opacity-0 hover:opacity-100'}`}
           style={{ right: `calc(16px + 48px + ${dateWidth}px + ${authorWidth}px - 2px)` }}
           onMouseDown={(e) => handleMouseDown(e, 'author')}
         />
         {/* Resizer: Between Author Name and Date */}
         <div 
           className={`absolute pointer-events-auto h-full w-[4px] cursor-col-resize transition-colors ${resizing?.type === 'date' ? 'bg-[#1f6feb] opacity-100' : 'hover:bg-[#1f6feb]/30 opacity-0 hover:opacity-100'}`}
           style={{ right: `calc(16px + 48px + ${dateWidth}px - 2px)` }}
           onMouseDown={(e) => handleMouseDown(e, 'date')}
         />
      </div>

      {/* Scrollable List with Virtualization */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden relative scrollbar-thin scrollbar-thumb-[#30363d]"
      >
        {isLoading && filteredCommits.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d1117]/50 z-10 gap-3">
            <Loader2 size={32} className="animate-spin text-[#1f6feb]" />
            <span className="text-xs text-[#8b949e] animate-pulse">Loading history...</span>
          </div>
        )}
        
        <div 
          className="relative min-w-full"
          style={{ height: `${totalHeight}px` }}
        >
          <div 
            className="absolute top-0 left-0 w-full"
            style={{ transform: `translateY(${offsetY}px)` }}
          >
            {visibleCommits.map((commit, idx) => (
              <CommitRow 
                key={commit.hash}
                commit={commit}
                idx={startIndex + idx}
                commits={filteredCommits}
                graphWidth={graphWidth}
                authorWidth={authorWidth}
                dateWidth={dateWidth}
                isSelected={selectedCommit?.hash === commit.hash}
                viewingBranch={viewingBranch}
                onSelect={setSelectedCommit}
                onContextMenu={handleContextMenu}
              />
            ))}
          </div>
        </div>
        {isLoading && filteredCommits.length > 0 && (
          <div className="py-4 flex justify-center items-center gap-2 text-[#8b949e] bg-[#0d1117] border-t border-[#30363d]/30">
            <Loader2 size={16} className="animate-spin text-[#1f6feb]" />
            <span className="text-[11px]">더 많은 커밋 불러오는 중...</span>
          </div>
        )}
        {!isLoading && filteredCommits.length === 0 && (
          <div className="p-12 text-center text-[#484f58] italic">
            No commits found.
          </div>
        )}
      </div>
    </div>
  );
};

export default CommitGraph;
