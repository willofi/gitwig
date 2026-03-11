import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  message,
  confirmLabel = '확인',
  danger = false,
  onClose,
  onConfirm,
}) => {
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-[420px] bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 bg-[#0d1117] border-b border-[#30363d] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className={danger ? 'text-[#ff7b72]' : 'text-[#58a6ff]'} />
            <span className="text-[14px] font-bold text-[#e6edf3]">{title}</span>
          </div>
          <button onClick={onClose} className="text-[#8b949e] hover:text-[#e6edf3] transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <p className="text-[12px] text-[#c9d1d9] whitespace-pre-wrap leading-relaxed">{message}</p>

          <div className="mt-5 flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-[12px] font-medium text-[#c9d1d9] bg-[#21262d] border border-[#30363d] rounded-md hover:bg-[#30363d] transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => onConfirm()}
              className={`px-4 py-1.5 text-[12px] font-medium text-white rounded-md transition-colors shadow-sm ${
                danger
                  ? 'bg-[#da3633] border border-[#f85149] hover:bg-[#f85149]'
                  : 'bg-[#238636] border border-[#2ea043] hover:bg-[#2ea043]'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
