import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, X, AlertCircle, CheckCircle } from 'lucide-react';

type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'error';

interface UpdateState {
  status: UpdateStatus;
  version?: string;
  progress?: number;       // 0–100
  bytesPerSecond?: number;
  error?: string;
}

function fmtSpeed(bps: number) {
  if (bps > 1_000_000) return `${(bps / 1_000_000).toFixed(1)} MB/s`;
  return `${(bps / 1_000).toFixed(0)} KB/s`;
}

const UpdateBanner: React.FC = () => {
  const [state, setState] = useState<UpdateState>({ status: 'idle' });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const api = window.electronAPI?.updater;
    if (!api) return;

    const unsubs = [
      api.onChecking(() => setState({ status: 'checking' })),
      api.onAvailable((info) => {
        setState({ status: 'available', version: info.version });
        setDismissed(false);
      }),
      api.onNotAvailable(() => setState({ status: 'idle' })),
      api.onProgress((p) => {
        setState(prev => ({
          ...prev,
          status: 'downloading',
          progress: p.percent,
          bytesPerSecond: p.bytesPerSecond,
        }));
      }),
      api.onDownloaded((info) => {
        setState({ status: 'downloaded', version: info.version });
        setDismissed(false);
      }),
      api.onError((msg) => {
        setState({ status: 'error', error: msg });
      }),
    ];

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, []);

  // 보이지 않는 상태들
  if (dismissed) return null;
  if (state.status === 'idle' || state.status === 'checking') return null;

  const handleDownload = () => {
    setState(prev => ({ ...prev, status: 'downloading', progress: 0 }));
    window.electronAPI.updater.download();
  };

  const handleInstall = () => {
    window.electronAPI.updater.install();
  };

  // ── 배너 내용 ─────────────────────────────────────────

  if (state.status === 'available') {
    return (
      <Banner color="blue" onDismiss={() => setDismissed(true)}>
        <Download size={13} />
        <span>
          새 버전 <strong>v{state.version}</strong> 이 출시되었습니다.
        </span>
        <BannerBtn onClick={handleDownload}>지금 다운로드</BannerBtn>
      </Banner>
    );
  }

  if (state.status === 'downloading') {
    return (
      <Banner color="blue">
        <div className="flex items-center gap-2 flex-1">
          <RefreshCw size={13} className="animate-spin shrink-0" />
          <span className="shrink-0">업데이트 다운로드 중…</span>
          <div className="flex-1 h-1 rounded-full bg-[#1f6feb]/30 overflow-hidden mx-1">
            <div
              className="h-full rounded-full bg-[#58a6ff] transition-all duration-300"
              style={{ width: `${state.progress ?? 0}%` }}
            />
          </div>
          <span className="shrink-0 tabular-nums">
            {state.progress ?? 0}%
            {state.bytesPerSecond ? ` · ${fmtSpeed(state.bytesPerSecond)}` : ''}
          </span>
        </div>
      </Banner>
    );
  }

  if (state.status === 'downloaded') {
    return (
      <Banner color="green" onDismiss={() => setDismissed(true)}>
        <CheckCircle size={13} />
        <span>
          <strong>v{state.version}</strong> 다운로드 완료. 재시작하면 업데이트가 적용됩니다.
        </span>
        <BannerBtn onClick={handleInstall} accent="green">재시작하여 업데이트</BannerBtn>
      </Banner>
    );
  }

  if (state.status === 'error') {
    return (
      <Banner color="red" onDismiss={() => setDismissed(true)}>
        <AlertCircle size={13} />
        <span className="truncate flex-1">업데이트 오류: {state.error}</span>
      </Banner>
    );
  }

  return null;
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const COLOR_MAP = {
  blue:  { bg: '#0d2035', border: '#1f6feb', text: '#79c0ff' },
  green: { bg: '#0d2811', border: '#238636', text: '#3fb950' },
  red:   { bg: '#2d1014', border: '#6e2c31', text: '#ff8182' },
};

const Banner: React.FC<{
  color: keyof typeof COLOR_MAP;
  children: React.ReactNode;
  onDismiss?: () => void;
}> = ({ color, children, onDismiss }) => {
  const c = COLOR_MAP[color];
  return (
    <div
      className="flex items-center gap-2 px-4 text-[11px] shrink-0"
      style={{
        height: 30,
        background: c.bg,
        borderBottom: `1px solid ${c.border}`,
        color: c.text,
      }}
    >
      {children}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-auto shrink-0 opacity-50 hover:opacity-100 transition-opacity"
          title="닫기"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
};

const BannerBtn: React.FC<{
  onClick: () => void;
  accent?: 'blue' | 'green';
  children: React.ReactNode;
}> = ({ onClick, accent = 'blue', children }) => (
  <button
    onClick={onClick}
    className="shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold transition-opacity hover:opacity-80"
    style={{
      background: accent === 'green' ? '#238636' : '#1f6feb',
      color: '#fff',
    }}
  >
    {children}
  </button>
);

export default UpdateBanner;
