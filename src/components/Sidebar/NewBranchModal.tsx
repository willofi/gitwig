import React, { useState } from 'react';
import { X, GitBranch } from 'lucide-react';

interface NewBranchModalProps {
  baseBranch: string;
  onClose: () => void;
  onConfirm: (name: string) => void;
}

const NewBranchModal: React.FC<NewBranchModalProps> = ({ baseBranch, onClose, onConfirm }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onConfirm(name.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="w-[400px] bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-3 bg-[#0d1117] border-b border-[#30363d] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch size={16} className="text-[#58a6ff]" />
            <span className="text-[14px] font-bold text-[#e6edf3]">새 브랜치 생성</span>
          </div>
          <button onClick={onClose} className="text-[#8b949e] hover:text-[#e6edf3] transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] text-[#8b949e]">기준 브랜치</label>
            <div className="px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-[13px] text-[#c9d1d9] font-mono">
              {baseBranch}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] text-[#8b949e]">새 브랜치 이름</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="branch-name"
              className="px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-[13px] text-[#c9d1d9] focus:outline-none focus:border-[#1f6feb] transition-colors"
            />
          </div>

          <div className="mt-4 flex items-center gap-2 justify-end">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-[12px] font-medium text-[#c9d1d9] bg-[#21262d] border border-[#30363d] rounded-md hover:bg-[#30363d] transition-colors"
            >
              취소
            </button>
            <button 
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-1.5 text-[12px] font-medium text-white bg-[#238636] border border-[#2ea043] rounded-md hover:bg-[#2ea043] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              생성 및 체크아웃
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewBranchModal;
