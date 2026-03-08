import React, { useRef, useCallback, useState } from 'react';
import ProjectPanel from './ProjectPanel';
import BranchPanel from './BranchPanel';
import StashPanel from './StashPanel';
import { useTheme } from '@/contexts/ThemeContext';
import { ChevronLeft, PanelLeftClose } from 'lucide-react';

const MIN_TOP    = 80;
const MIN_BOTTOM = 100;

interface SidebarProps {
  onCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onCollapse }) => {
  const { isDark } = useTheme();
  const [topHeight, setTopHeight] = useState(160);
  const topHeightRef   = useRef(160);
  const containerRef   = useRef<HTMLDivElement>(null);

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY      = e.clientY;
    const startHeight = topHeightRef.current;

    const onMouseMove = (ev: MouseEvent) => {
      if (!containerRef.current) return;
      const containerH = containerRef.current.clientHeight;
      const delta      = ev.clientY - startY;
      const next       = Math.min(containerH - MIN_BOTTOM - 5, Math.max(MIN_TOP, startHeight + delta));
      topHeightRef.current = next;
      setTopHeight(next);
    };
    const onMouseUp = () => {
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
    };
    document.body.style.cursor     = 'row-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
  }, []);

  const bg          = isDark ? '#252526' : '#f6f8fa';
  const borderColor = isDark ? '#333333' : '#d0d7de';
  const dividerColor = isDark ? '#21262d' : '#eaeef2';
  const handleColor  = isDark ? '#8b949e' : '#8c959f';
  const navBg       = isDark ? '#1e1e1e' : '#f0f2f5';
  const labelColor  = isDark ? '#666666' : '#8c959f';
  const iconColor   = isDark ? '#8b949e' : '#57606a';

  return (
    <div
      ref={containerRef}
      className="flex flex-col overflow-hidden h-full"
      style={{ width: 256, borderRight: `1px solid ${borderColor}`, background: bg }}
    >
      {/* Nav bar */}
      <div
        className="flex items-center justify-between px-3 shrink-0"
        style={{ height: 28, background: navBg, borderBottom: `1px solid ${borderColor}` }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: labelColor }}>
          Explorer
        </span>
        <button
          onClick={onCollapse}
          className="p-0.5 rounded transition-colors hover:bg-[#444444]/30"
          title="사이드바 닫기"
          style={{ color: iconColor }}
        >
          <PanelLeftClose size={13} />
        </button>
      </div>

      {/* Projects */}
      <div className="shrink-0 overflow-hidden flex flex-col" style={{ height: topHeight, minHeight: MIN_TOP }}>
        <ProjectPanel />
      </div>

      {/* Drag handle */}
      <div
        onMouseDown={handleDividerMouseDown}
        className="group flex items-center justify-center shrink-0 cursor-row-resize"
        style={{ height: 5, background: dividerColor }}
      >
        <div
          className="w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ height: 3, background: handleColor }}
        />
      </div>

      {/* Branches + Stash */}
      <div className="flex-1 overflow-hidden flex flex-col" style={{ minHeight: MIN_BOTTOM, borderTop: `1px solid ${borderColor}` }}>
        <BranchPanel />
        <StashPanel />
      </div>
    </div>
  );
};

export default Sidebar;
