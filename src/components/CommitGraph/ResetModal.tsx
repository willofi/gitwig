import React from 'react';
import { Commit } from '@/types/git.types';
import { X, AlertCircle, Info } from 'lucide-react';

type ResetMode = 'soft' | 'mixed' | 'hard' | 'keep';

interface ResetModalProps {
  commit: Commit;
  currentBranch: string | null;
  onClose: () => void;
  onConfirm: (mode: ResetMode) => void;
}

const ResetModal: React.FC<ResetModalProps> = ({ commit, currentBranch, onClose, onConfirm }) => {
  const [mode, setMode] = React.useState<ResetMode>('mixed');

  const modes: { id: ResetMode; label: string; description: string; warning?: string }[] = [
    {
      id: 'soft',
      label: '소프트',
      description: '파일이 변경되지 않으며 차이점이 커밋을 위해 스테이징됩니다.'
    },
    {
      id: 'mixed',
      label: '혼합',
      description: '파일이 변경되지 않으며 차이점이 스테이징되지 않습니다.'
    },
    {
      id: 'hard',
      label: '하드',
      description: '파일을 선택한 커밋 상태로 되돌립니다.',
      warning: '경고: 로컬 변경 사항이 손실될 수 있습니다.'
    },
    {
      id: 'keep',
      label: '유지',
      description: '파일을 선택한 커밋 상태로 되돌리지만, 로컬 변경 사항이 온전히 유지됩니다.'
    }
  ];

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="w-[500px] bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-[#0d1117] border-b border-[#30363d] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold text-[#e6edf3]">Git 재설정</span>
          </div>
          <button onClick={onClose} className="text-[#8b949e] hover:text-[#e6edf3] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <div className="text-[13px] text-[#58a6ff] font-bold truncate">
              {currentBranch || 'HEAD'} -&gt; {commit.author_name} ({commit.author_email})이(가) 작성한 {commit.hash.substring(0, 7)}
            </div>
            <div className="text-[12px] text-[#c9d1d9] italic truncate">
              "{commit.message}"
            </div>
            <div className="text-[12px] text-[#8b949e] mt-2">
              현재 브랜치 HEAD를 선택한 커밋으로 재설정하며,<br />
              선택한 모드에 따라 작업 트리와 색인을 업데이트합니다.
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {modes.map((m) => (
              <label 
                key={m.id} 
                className={`flex gap-3 cursor-pointer group p-2 rounded-md transition-colors ${mode === m.id ? 'bg-[#1f6feb]/5' : 'hover:bg-[#30363d]/30'}`}
              >
                <div className="pt-0.5">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${mode === m.id ? 'border-[#1f6feb] bg-[#1f6feb]' : 'border-[#444c56] bg-transparent group-hover:border-[#8b949e]'}`}>
                    {mode === m.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <input 
                    type="radio" 
                    className="hidden" 
                    name="reset-mode" 
                    value={m.id} 
                    checked={mode === m.id}
                    onChange={() => setMode(m.id)}
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className={`text-[13px] font-bold ${mode === m.id ? 'text-[#1f6feb]' : 'text-[#c9d1d9]'}`}>{m.label}</div>
                  <div className="text-[11px] text-[#8b949e] leading-relaxed">{m.description}</div>
                  {m.warning && <div className="text-[11px] text-[#f85149] font-medium mt-0.5 flex items-center gap-1"><AlertCircle size={10} /> {m.warning}</div>}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#0d1117] border-t border-[#30363d] flex items-center justify-between">
          <div className="text-[#8b949e] hover:text-[#58a6ff] transition-colors cursor-help">
            <Info size={16} />
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose}
              className="px-4 py-1.5 text-[12px] font-medium text-[#c9d1d9] bg-[#21262d] border border-[#30363d] rounded-md hover:bg-[#30363d] transition-colors"
            >
              취소
            </button>
            <button 
              onClick={() => onConfirm(mode)}
              className="px-4 py-1.5 text-[12px] font-medium text-white bg-[#238636] border border-[#2ea043] rounded-md hover:bg-[#2ea043] transition-colors shadow-sm"
            >
              재설정
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetModal;
