import React, { useEffect, useState } from 'react';
import SplitDiffViewer from '@/components/CommitDetail/SplitDiffViewer';
import { ThemeContext } from '@/contexts/ThemeContext';
import { computeIsDark, type AppTheme } from '@/utils/theme';

interface Props {
  repoPath: string;
  hash: string;
  parentHash: string;
  filePath: string;
}

const SplitDiffApp: React.FC<Props> = ({ repoPath, hash, parentHash, filePath }) => {
  const [diff, setDiff] = useState('');
  const [loading, setLoading] = useState(true);
  const platform = window.electronAPI.platform;

  // 메인 창에서 localStorage에 저장된 테마를 읽어서 적용
  const getTheme = () => (localStorage.getItem('gitwig-theme') as AppTheme) || 'dark';
  const [isDark, setIsDark] = useState(() => computeIsDark(getTheme()));

  // 시스템 미디어 쿼리 변경 감지 (auto 모드)
  useEffect(() => {
    const theme = getTheme();
    if (theme !== 'auto') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setIsDark(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // 메인 창에서 테마를 바꾸면 storage 이벤트 수신 (다른 창에서 변경 시 발생)
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'gitwig-theme') setIsDark(computeIsDark((e.newValue as AppTheme) || 'dark'));
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  useEffect(() => {
    document.title = filePath ? `Split Diff — ${filePath}` : 'Split Diff';
  }, [filePath]);

  useEffect(() => {
    if (!repoPath || !hash || !filePath) return;
    setLoading(true);
    const parent = parentHash || `${hash}^1`;
    window.electronAPI.git
      .getDiff(repoPath, parent, hash, filePath)
      .then(setDiff)
      .catch(() => setDiff(''))
      .finally(() => setLoading(false));
  }, [repoPath, hash, parentHash, filePath]);

  const bg = isDark ? '#0d1117' : '#ffffff';
  const fg = isDark ? '#484f58' : '#636c76';

  return (
    <ThemeContext.Provider value={{ isDark }}>
      <div style={{ height: '100vh', overflow: 'hidden', background: bg }}>
        {loading ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: fg, fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>
            Loading diff…
          </div>
        ) : (
          <SplitDiffViewer diff={diff} fileName={filePath} platform={platform} />
        )}
      </div>
    </ThemeContext.Provider>
  );
};

export default SplitDiffApp;
