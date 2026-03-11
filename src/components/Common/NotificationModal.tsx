import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

type NotificationTone = 'info' | 'success' | 'error';

interface NotificationModalProps {
  title: string;
  message: string;
  tone?: NotificationTone;
  onClose: () => void;
}

const toneStyle: Record<NotificationTone, { icon: React.ReactNode; button: string }> = {
  info: {
    icon: <Info size={16} className="text-[#58a6ff]" />,
    button: 'bg-[#1f6feb] border border-[#388bfd] hover:bg-[#388bfd]',
  },
  success: {
    icon: <CheckCircle2 size={16} className="text-[#3fb950]" />,
    button: 'bg-[#238636] border border-[#2ea043] hover:bg-[#2ea043]',
  },
  error: {
    icon: <AlertCircle size={16} className="text-[#ff7b72]" />,
    button: 'bg-[#da3633] border border-[#f85149] hover:bg-[#f85149]',
  },
};

const NotificationModal: React.FC<NotificationModalProps> = ({
  title,
  message,
  tone = 'info',
  onClose,
}) => {
  const style = toneStyle[tone];

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
            {style.icon}
            <span className="text-[14px] font-bold text-[#e6edf3]">{title}</span>
          </div>
          <button onClick={onClose} className="text-[#8b949e] hover:text-[#e6edf3] transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <p className="text-[12px] text-[#c9d1d9] whitespace-pre-wrap leading-relaxed">{message}</p>
          <div className="mt-5 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-1.5 text-[12px] font-medium text-white rounded-md transition-colors shadow-sm ${style.button}`}
            >
              확인
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;
