import React from 'react';
import { useRepoStore } from '@/store/repoStore';
import ProjectPanel from './ProjectPanel';
import BranchPanel from './BranchPanel';
import StashPanel from './StashPanel';

const Sidebar: React.FC = () => {
  return (
    <div className="w-64 bg-[#252526] border-r border-[#333333] flex flex-col overflow-hidden">
      <ProjectPanel />
      <div className="flex-1 overflow-auto">
        <BranchPanel />
        <StashPanel />
      </div>
    </div>
  );
};

export default Sidebar;
