import React, { useState, useEffect } from 'react';
import { X, Settings, RefreshCw, Monitor, Sun, Moon, Download, RotateCcw, CheckCircle, AlertCircle, Loader2, Package } from 'lucide-react';
import { useRepoStore } from '@/store/repoStore';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/utils/theme';

interface SettingsModalProps {
  onClose: () => void;
}

type UpdateCheckStatus = 'idle' | 'checking' | 'up-to-date' | 'available' | 'downloading' | 'downloaded' | 'error' | 'dev';

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { autoFetchInterval, setAutoFetchInterval, theme, setTheme } = useRepoStore();
  const { isDark } = useTheme();
  const [localInterval, setLocalInterval] = useState(autoFetchInterval);
  const [appVersion, setAppVersion] = useState<string>('—');
  const [updateStatus, setUpdateStatus] = useState<UpdateCheckStatus>('idle');
  const [updateVersion, setUpdateVersion] = useState('');
  const [updateProgress, setUpdateProgress] = useState(0);
  const [isPackaged, setIsPackaged] = useState<boolean | null>(null);

  useEffect(() => {
    window.electronAPI?.app?.getVersion()
      .then(v => setAppVersion(v))
      .catch(() => setAppVersion('—'));
    window.electronAPI?.app?.isPackaged()
      .then(v => setIsPackaged(v))
      .catch(() => setIsPackaged(false));
  }, []);

  useEffect(() => {
    const api = window.electronAPI?.updater;
    if (!api) return;
    api.onChecking(() => setUpdateStatus('checking'));
    api.onAvailable((info) => { setUpdateStatus('available'); setUpdateVersion(info.version); });
    api.onNotAvailable(() => setUpdateStatus('up-to-date'));
    api.onProgress((p) => { setUpdateStatus('downloading'); setUpdateProgress(Math.round(p.percent)); });
    api.onDownloaded((info) => { setUpdateStatus('downloaded'); setUpdateVersion(info.version); });
    api.onError(() => setUpdateStatus('error'));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSave = () => { setAutoFetchInterval(localInterval); onClose(); };

  const handleCheck   = () => {
    if (isPackaged === false) { setUpdateStatus('dev'); return; }
    setUpdateStatus('checking');
    window.electronAPI?.updater?.check?.();
  };
  const handleDownload = () => { setUpdateStatus('downloading'); setUpdateProgress(0); window.electronAPI?.updater?.download?.(); };
  const handleInstall  = () => { window.electronAPI?.updater?.install?.(); };

  // ── Colour tokens (light/dark) ─────────────────────────────────────────────
  const c = isDark ? {
    modal:       '#161b22',
    modalBorder: '#30363d',
    header:      '#0d1117',
    divider:     '#21262d',
    title:       '#e6edf3',
    body:        '#8b949e',
    label:       '#c9d1d9',
    input:       { bg: '#0d1117', border: '#30363d', text: '#c9d1d9', focus: '#388bfd' },
    cancelBtn:   { bg: '#21262d', border: '#30363d', text: '#c9d1d9', hover: '#30363d' },
    saveBtn:     { bg: '#1f6feb', border: '#388bfd', text: '#ffffff', hover: '#388bfd', shadow: '0 0 0 1px rgba(56,139,253,0.25) inset' },
    themeActive: { bg: '#1f6feb', border: '#388bfd', text: '#fff' },
    themeIdle:   { bg: '#21262d', border: '#30363d', text: '#8b949e', hoverBg: '#30363d', hoverText: '#e6edf3' },
    versionBox:  { bg: '#0d1117', border: '#30363d', text: '#8b949e' },
    versionNum:  '#e6edf3',
    upOk:        '#3fb950',
    upErr:       '#ff8182',
    accentBtn:   { bg: '#1f6feb', border: '#388bfd' },
    greenBtn:    { bg: '#238636', border: '#2ea043', hover: '#2ea043' },
    barBg:       '#21262d',
    barFg:       '#58a6ff',
  } : {
    modal:       '#ffffff',
    modalBorder: '#d0d7de',
    header:      '#f6f8fa',
    divider:     '#eaeef2',
    title:       '#1f2328',
    body:        '#636c76',
    label:       '#1f2328',
    input:       { bg: '#ffffff', border: '#d0d7de', text: '#1f2328', focus: '#0969da' },
    cancelBtn:   { bg: '#f6f8fa', border: '#d0d7de', text: '#24292f', hover: '#eaeef2' },
    saveBtn:     { bg: '#0969da', border: '#0550ae', text: '#ffffff', hover: '#0860ca', shadow: '0 0 0 1px rgba(9,105,218,0.18) inset' },
    themeActive: { bg: '#0969da', border: '#0969da', text: '#fff' },
    themeIdle:   { bg: '#f6f8fa', border: '#d0d7de', text: '#57606a', hoverBg: '#eaeef2', hoverText: '#1f2328' },
    versionBox:  { bg: '#f6f8fa', border: '#d0d7de', text: '#57606a' },
    versionNum:  '#1f2328',
    upOk:        '#2da44e',
    upErr:       '#cf222e',
    accentBtn:   { bg: '#0969da', border: '#0550ae' },
    greenBtn:    { bg: '#2da44e', border: '#2da44e', hover: '#2c974b' },
    barBg:       '#eaeef2',
    barFg:       '#0969da',
  };

  const SectionTitle: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
    <h3 style={{ color: c.title, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
      {icon}
      {label}
    </h3>
  );

  const ThemeBtn: React.FC<{ value: AppTheme; icon: React.ElementType; label: string }> = ({ value, icon: Icon, label }) => {
    const active = theme === value;
    return (
      <button
        onClick={() => setTheme(value)}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          padding: '10px 8px',
          borderRadius: 8,
          border: `1px solid ${active ? c.themeActive.border : c.themeIdle.border}`,
          background: active ? c.themeActive.bg : c.themeIdle.bg,
          color: active ? c.themeActive.text : c.themeIdle.text,
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >
        <Icon size={17} />
        {label}
      </button>
    );
  };

  const SmBtn: React.FC<{ style?: React.CSSProperties; onClick: () => void; children: React.ReactNode }> = ({ style, onClick, children }) => (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 11px',
        fontSize: 11, fontWeight: 600,
        borderRadius: 6, border: '1px solid',
        cursor: 'pointer', transition: 'opacity 0.15s',
        ...style,
      }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
    >
      {children}
    </button>
  );

  // ── Update status widget ─────────────────────────────────────────────────
  const renderUpdateWidget = () => {
    if (updateStatus === 'dev') return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: c.body }}>
        개발 환경에서는 업데이트를 확인할 수 없습니다.
      </div>
    );

    if (updateStatus === 'idle') return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: c.body }}>마지막 확인: —</span>
        <SmBtn style={{ background: c.cancelBtn.bg, borderColor: c.cancelBtn.border, color: c.cancelBtn.text }} onClick={handleCheck}>
          <RotateCcw size={11} /> 업데이트 확인
        </SmBtn>
      </div>
    );

    if (updateStatus === 'checking') return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: c.body }}>
        <Loader2 size={13} className="animate-spin" /> 업데이트 확인 중…
      </div>
    );

    if (updateStatus === 'up-to-date') return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: c.upOk }}>
          <CheckCircle size={13} /> 최신 버전입니다
        </span>
        <SmBtn style={{ background: c.cancelBtn.bg, borderColor: c.cancelBtn.border, color: c.cancelBtn.text }} onClick={handleCheck}>
          <RotateCcw size={11} /> 다시 확인
        </SmBtn>
      </div>
    );

    if (updateStatus === 'available') return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: c.body }}>
          새 버전 <strong style={{ color: c.versionNum, fontFamily: 'monospace' }}>v{updateVersion}</strong> 출시
        </span>
        <SmBtn style={{ background: c.accentBtn.bg, borderColor: c.accentBtn.border, color: '#fff' }} onClick={handleDownload}>
          <Download size={11} /> 다운로드
        </SmBtn>
      </div>
    );

    if (updateStatus === 'downloading') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: c.body }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Loader2 size={12} className="animate-spin" />다운로드 중…</span>
          <span style={{ fontFamily: 'monospace' }}>{updateProgress}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: c.barBg, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 3, background: c.barFg, width: `${updateProgress}%`, transition: 'width 0.3s' }} />
        </div>
      </div>
    );

    if (updateStatus === 'downloaded') return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: c.upOk }}>
          <CheckCircle size={13} />
          <strong style={{ color: c.versionNum, fontFamily: 'monospace' }}>v{updateVersion}</strong>&nbsp;준비 완료
        </span>
        <SmBtn style={{ background: c.greenBtn.bg, borderColor: c.greenBtn.border, color: '#fff' }} onClick={handleInstall}>
          <RotateCcw size={11} /> 재시작하여 설치
        </SmBtn>
      </div>
    );

    if (updateStatus === 'error') return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: c.upErr }}>
          <AlertCircle size={13} /> 업데이트 확인 실패
        </span>
        <SmBtn style={{ background: c.cancelBtn.bg, borderColor: c.cancelBtn.border, color: c.cancelBtn.text }} onClick={handleCheck}>
          <RotateCcw size={11} /> 재시도
        </SmBtn>
      </div>
    );

    return null;
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        style={{ width: 460, background: c.modal, border: `1px solid ${c.modalBorder}`, borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '12px 20px', background: c.header, borderBottom: `1px solid ${c.modalBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={15} color={isDark ? '#58a6ff' : '#0969da'} />
            <span style={{ fontSize: 14, fontWeight: 700, color: c.title }}>설정</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.body, padding: 2, display: 'flex' }}>
            <X size={17} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', maxHeight: '70vh' }}>

          {/* 1. 테마 */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SectionTitle icon={<Monitor size={12} />} label="테마" />
            <div style={{ display: 'flex', gap: 8 }}>
              <ThemeBtn value="auto"  icon={Monitor} label="자동 (시스템)" />
              <ThemeBtn value="light" icon={Sun}     label="라이트" />
              <ThemeBtn value="dark"  icon={Moon}    label="다크" />
            </div>
            <p style={{ fontSize: 11, color: c.body, margin: 0 }}>
              {theme === 'auto'  && 'OS 설정에 따라 다크/라이트가 자동 전환됩니다.'}
              {theme === 'light' && '라이트 모드로 고정됩니다.'}
              {theme === 'dark'  && '다크 모드로 고정됩니다.'}
            </p>
          </section>

          <hr style={{ border: 'none', borderTop: `1px solid ${c.divider}`, margin: 0 }} />

          {/* 2. 자동 Fetch */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SectionTitle icon={<RefreshCw size={12} />} label="자동 Fetch" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="number"
                min="0"
                step="1"
                value={localInterval}
                onChange={e => setLocalInterval(parseInt(e.target.value) || 0)}
                style={{
                  width: 72, padding: '6px 10px',
                  background: c.input.bg, border: `1px solid ${c.input.border}`,
                  borderRadius: 6, fontSize: 13, color: c.input.text,
                  outline: 'none',
                }}
                onFocus={e => e.currentTarget.style.borderColor = c.input.focus}
                onBlur={e  => e.currentTarget.style.borderColor = c.input.border}
              />
              <span style={{ fontSize: 12, color: c.body }}>분마다 Fetch (0 = 비활성화)</span>
            </div>
            <p style={{ fontSize: 11, color: c.body, margin: 0 }}>
              Git 리모트의 변경사항을 주기적으로 확인합니다.
            </p>
          </section>

          <hr style={{ border: 'none', borderTop: `1px solid ${c.divider}`, margin: 0 }} />

          {/* 3. 앱 버전 & 업데이트 */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SectionTitle icon={<Package size={12} />} label="앱 버전 및 업데이트" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: c.versionBox.bg, border: `1px solid ${c.versionBox.border}`, borderRadius: 8, fontSize: 12, color: c.versionBox.text }}>
              <span>현재 버전</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: c.versionNum }}>v{appVersion}</span>
            </div>
            {renderUpdateWidget()}
          </section>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', background: c.header, borderTop: `1px solid ${c.modalBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onClose}
            style={{ padding: '6px 16px', fontSize: 12, fontWeight: 600, background: c.cancelBtn.bg, border: `1px solid ${c.cancelBtn.border}`, color: c.cancelBtn.text, borderRadius: 6, cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = c.cancelBtn.hover)}
            onMouseLeave={e => (e.currentTarget.style.background = c.cancelBtn.bg)}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            style={{ padding: '6px 16px', fontSize: 12, fontWeight: 600, background: c.saveBtn.bg, border: `1px solid ${c.saveBtn.border}`, color: c.saveBtn.text, borderRadius: 6, cursor: 'pointer', boxShadow: c.saveBtn.shadow }}
            onMouseEnter={e => (e.currentTarget.style.background = c.saveBtn.hover)}
            onMouseLeave={e => (e.currentTarget.style.background = c.saveBtn.bg)}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
