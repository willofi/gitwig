import React from 'react';
import { useRepoStore } from '@/store/repoStore';
import { FolderPlus, FolderOpen, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const ProjectPanel: React.FC = () => {
  const { currentPath, setCurrentPath, recentProjects, removeRecentProject } = useRepoStore();
  const { isDark } = useTheme();

  const handleAddProject = async () => {
    const path = await window.electronAPI.dialog.selectDirectory();
    if (path) setCurrentPath(path);
  };

  const sorted = [...recentProjects].sort((a, b) => {
    const nameA = a.split('/').pop()!.toLowerCase();
    const nameB = b.split('/').pop()!.toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const activeBg   = isDark ? '#1f2937' : '#dbeafe';
  const activeText = isDark ? '#58a6ff' : '#0969da';
  const hoverBg    = isDark ? '#2d2d30' : '#eef0f3';
  const mutedText  = isDark ? '#8b949e' : '#636c76';
  const labelText  = isDark ? '#666666' : '#8c959f';

  return (
    <div className="flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2 shrink-0">
        <h2 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: labelText }}>
          Projects
        </h2>
        <button
          onClick={handleAddProject}
          className="hover:text-white transition-colors p-0.5 rounded"
          title="프로젝트 열기"
        >
          <FolderPlus size={14} />
        </button>
      </div>

      {/* Project list */}
      <div className="overflow-y-auto px-1 pb-2" style={{ minHeight: 0 }}>
        {sorted.length === 0 ? (
          <p className="text-[11px] px-2 italic" style={{ color: labelText }}>No projects yet</p>
        ) : (
          sorted.map(p => {
            const isActive = p === currentPath;
            const name     = p.split('/').pop() || p;
            return (
              <div
                key={p}
                className="group flex items-center gap-1.5 px-2 py-1 rounded mx-1 cursor-pointer select-none text-[12px] transition-colors"
                style={{
                  background: isActive ? activeBg : 'transparent',
                  color: isActive ? activeText : mutedText,
                }}
                onDoubleClick={() => setCurrentPath(p)}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = hoverBg; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                title={`${p}\n더블클릭하여 열기`}
              >
                <FolderOpen size={13} className="shrink-0" style={{ color: isActive ? activeText : mutedText }} />
                <span className="truncate flex-1">{name}</span>
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 rounded p-0.5 hover:text-red-400"
                  onClick={e => { e.stopPropagation(); removeRecentProject(p); }}
                  title="목록에서 제거"
                >
                  <X size={11} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ProjectPanel;
