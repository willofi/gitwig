import React, { useState, useEffect } from 'react';
import { X, Settings, RefreshCw } from 'lucide-react';
import { useRepoStore } from '@/store/repoStore';

interface SettingsModalProps {
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { autoFetchInterval, setAutoFetchInterval } = useRepoStore();
  const [localInterval, setLocalInterval] = useState(autoFetchInterval);

  const handleSave = () => {
    setAutoFetchInterval(localInterval);
    onClose();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="w-[450px] bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-[#0d1117] border-b border-[#30363d] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings size={16} className="text-[#58a6ff]" />
            <span className="text-[14px] font-bold text-[#e6edf3]">설정</span>
          </div>
          <button onClick={onClose} className="text-[#8b949e] hover:text-[#e6edf3] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <h3 className="text-[13px] font-bold text-[#e6edf3] flex items-center gap-2">
              <RefreshCw size={14} /> 자동 Fetch 설정
            </h3>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                step="1"
                value={localInterval}
                onChange={(e) => setLocalInterval(parseInt(e.target.value))}
                className="w-24 px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-[13px] text-[#c9d1d9] focus:outline-none focus:border-[#1f6feb] transition-colors"
              />
              <span className="text-[12px] text-[#8b949e]">분마다 Fetch (0 입력 시 비활성화)</span>
            </div>
            <p className="text-[11px] text-[#484f58]">
              Git 리모트 저장소의 변경사항을 주기적으로 확인합니다. 숫자를 0으로 설정하면 자동 Fetch가 비활성화됩니다.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#0d1117] border-t border-[#30363d] flex items-center justify-end gap-2">
          <button 
            onClick={onClose}
            className="px-4 py-1.5 text-[12px] font-medium text-[#c9d1d9] bg-[#21262d] border border-[#30363d] rounded-md hover:bg-[#30363d] transition-colors"
          >
            취소
          </button>
          <button 
            onClick={handleSave}
            className="px-4 py-1.5 text-[12px] font-medium text-white bg-[#238636] border border-[#2ea043] rounded-md hover:bg-[#2ea043] transition-colors shadow-sm"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
