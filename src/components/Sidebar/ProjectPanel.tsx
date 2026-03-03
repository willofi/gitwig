import React from 'react';
import { useRepoStore } from '@/store/repoStore';
import { FolderPlus, Package } from 'lucide-react';

const ProjectPanel: React.FC = () => {
  const { currentPath, setCurrentPath } = useRepoStore();

  const handleAddProject = async () => {
    const path = await window.electronAPI.dialog.selectDirectory();
    if (path) {
      setCurrentPath(path);
    }
  };

  return (
    <div className="p-4 border-b border-[#333333]">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#888888]">Projects</h2>
        <button onClick={handleAddProject} className="hover:text-white transition-colors">
          <FolderPlus size={16} />
        </button>
      </div>
      {currentPath ? (
        <div className="flex items-center gap-2 text-sm text-[#cccccc] bg-[#37373d] p-2 rounded">
          <Package size={14} />
          <span className="truncate">{currentPath.split('/').pop()}</span>
        </div>
      ) : (
        <p className="text-xs text-[#666666]">No project selected</p>
      )}
    </div>
  );
};

export default ProjectPanel;
