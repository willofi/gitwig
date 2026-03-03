import React, { useState } from 'react';
import { X } from 'lucide-react';

interface PromptModalProps {
  title: string;
  message: string;
  initialValue?: string;
  placeholder?: string;
  onClose: () => void;
  onConfirm: (value: string) => void;
}

const PromptModal: React.FC<PromptModalProps> = ({ title, message, initialValue = '', placeholder = '', onClose, onConfirm }) => {
  const [value, setValue] = useState(initialValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onConfirm(value.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="w-[400px] bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-3 bg-[#0d1117] border-b border-[#30363d] flex items-center justify-between">
          <span className="text-[14px] font-bold text-[#e6edf3]">{title}</span>
          <button onClick={onClose} className="text-[#8b949e] hover:text-[#e6edf3] transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] text-[#8b949e]">{message}</label>
            <input
              autoFocus
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
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
              disabled={!value.trim()}
              className="px-4 py-1.5 text-[12px] font-medium text-white bg-[#238636] border border-[#2ea043] rounded-md hover:bg-[#2ea043] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              확인
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PromptModal;
