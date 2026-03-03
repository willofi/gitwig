import React, { useState, useEffect } from 'react';
import { useRepoStore } from '@/store/repoStore';
import ThreePanelEditor from './ThreePanelEditor';
import { AlertTriangle, Check } from 'lucide-react';

const ConflictResolutionPanel: React.FC = () => {
  const { status, currentPath, refresh } = useRepoStore();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const conflicts = status?.conflicted || [];

  if (conflicts.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#1e1e1e] flex flex-col">
      <div className="h-12 bg-[#333333] border-b border-[#1e1e1e] flex items-center justify-between px-4">
        <div className="flex items-center gap-2 text-yellow-500">
          <AlertTriangle size={18} />
          <span className="font-bold text-sm">Merge Conflicts Detected ({conflicts.length})</span>
        </div>
        <button
          onClick={() => refresh()}
          className="text-xs text-blue-400 hover:underline"
        >
          Check Resolution Status
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-64 border-r border-[#333333] bg-[#252526] overflow-auto">
          <div className="p-4 text-xs font-bold uppercase text-[#666666] tracking-wider">Conflicted Files</div>
          <ul>
            {conflicts.map((file) => (
              <li
                key={file}
                className={`p-3 text-xs cursor-pointer border-b border-[#333333] transition-colors ${
                  selectedFile === file ? 'bg-[#37373d] text-white' : 'text-[#cccccc] hover:bg-[#2a2d2e]'
                }`}
                onClick={() => setSelectedFile(file)}
              >
                {file}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex-1 overflow-hidden">
          {selectedFile ? (
            <ThreePanelEditor filePath={selectedFile} onResolved={() => {
              setSelectedFile(null);
              refresh();
            }} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-[#666666]">
              <AlertTriangle size={48} className="mb-4 opacity-20" />
              <p>Select a file to resolve conflicts</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConflictResolutionPanel;
