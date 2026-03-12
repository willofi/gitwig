import React, { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { useRepoStore } from '@/store/repoStore';
import { useShallow } from 'zustand/react/shallow';
import { useGitActions } from '@/hooks/useGitActions';
import { FileText, Calendar, User, Hash, GitMerge } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import DiffViewer from './DiffViewer';
import type { AppTheme } from '@/utils/theme';

const CommitDetail: React.FC = () => {
  const { selectedCommit, currentPath, theme } = useRepoStore(
    useShallow(s => ({
      selectedCommit: s.selectedCommit,
      currentPath: s.currentPath,
      theme: s.theme,
    }))
  );
  const { runWithLog } = useGitActions();
  const [loaded, setLoaded] = useState<{ files: { status: string, path: string }[], body: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [diff, setDiff] = useState<string>('');
  const activeFileRef = useRef<string | null>(null);
  const activeHashRef = useRef<string | null>(null);
  const commitCacheRef = useRef(new Map<string, { files: { status: string, path: string }[], body: string }>());
  const diffCacheRef = useRef(new Map<string, string>());

  // paint 전에 동기적으로 초기화
  useLayoutEffect(() => {
    setLoaded(null);
    setSelectedFile(null);
    activeFileRef.current = null;
    setDiff('');
    activeHashRef.current = selectedCommit?.hash ?? null;
  }, [selectedCommit?.hash, currentPath]);

  // body + 파일 목록을 병렬로 로드해 한번에 표시
  useEffect(() => {
    if (!selectedCommit || !currentPath) return;
    const hash = selectedCommit.hash;
    const cached = commitCacheRef.current.get(hash);

    if (cached) {
      setLoaded(cached);
      return;
    }

    Promise.all([
      window.electronAPI.git.getCommitFiles(currentPath, hash).catch(() => []),
      runWithLog(`git show ${hash.substring(0, 7)}`, () =>
        window.electronAPI.git.getShow(currentPath, hash)
      ).catch(() => ''),
    ]).then(([files, rawBody]) => {
      if (hash !== activeHashRef.current) return;
      // %B 포맷은 subject 포함 전체 메시지를 반환하므로 첫 줄(= message와 동일) 제거
      const body = (rawBody || '').trim().split('\n').slice(1).join('\n').trim();
      const nextLoaded = { files: files || [], body };
      commitCacheRef.current.set(hash, nextLoaded);
      setLoaded(nextLoaded);
    });
  }, [selectedCommit?.hash, currentPath]);

  const handleFileDblClick = (filePath: string) => {
    if (!currentPath || !selectedCommit) return;
    window.electronAPI.window.openSplitDiff({
      repoPath: currentPath,
      hash: selectedCommit.hash,
      parentHash: `${selectedCommit.hash}^1`,
      filePath,
      theme: theme as AppTheme,
    });
  };

  const handleFileClick = async (filePath: string) => {
    if (!currentPath || !selectedCommit) return;
    setSelectedFile(filePath);
    activeFileRef.current = filePath;
    const diffCacheKey = `${selectedCommit.hash}:${filePath}`;
    const cachedDiff = diffCacheRef.current.get(diffCacheKey);

    if (cachedDiff !== undefined) {
      setDiff(cachedDiff);
      return;
    }

    setDiff('');

    try {
      const fileDiff = await runWithLog(
        `git diff ${selectedCommit.hash.substring(0, 7)}^1..${selectedCommit.hash.substring(0, 7)} -- ${filePath}`,
        () => window.electronAPI.git.getDiff(
          currentPath,
          `${selectedCommit.hash}^1`,
          selectedCommit.hash,
          filePath
        )
      );
      // 빠르게 다른 파일 클릭 시 이전 결과 무시
      if (activeFileRef.current === filePath) {
        const nextDiff = fileDiff || '';
        diffCacheRef.current.set(diffCacheKey, nextDiff);
        setDiff(nextDiff);
      }
    } catch {
      if (activeFileRef.current === filePath) setDiff('');
    }
  };

  if (!selectedCommit) {
    return (
      <div className="p-8 text-center text-[#666666] text-sm italic">
        Select a commit to view details
      </div>
    );
  }

  const isMerge = (selectedCommit.parents?.length ?? 0) > 1;

  return (
    <div className="flex h-full overflow-hidden bg-[#1e1e1e]">
      {/* Left: metadata + file list */}
      <div className="w-1/2 border-r border-[#333333] flex flex-col overflow-hidden">
        {/* Commit message & meta */}
        <div className="p-5 border-b border-[#333333] bg-[#252526] overflow-y-auto max-h-[60%] scrollbar-thin scrollbar-thumb-[#454545]">
          <h3 className="text-[#e6edf3] font-bold text-[15px] mb-3 leading-snug whitespace-pre-wrap selection:bg-[#1f6feb]/30">
            {selectedCommit.message}
          </h3>

          {loaded?.body && (
            <div className="text-[#c9d1d9] text-[13px] mb-6 whitespace-pre-wrap leading-relaxed selection:bg-[#1f6feb]/30">
              {loaded.body}
            </div>
          )}

          <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-[#333333]/50">
            <div className="flex items-center gap-2 text-[#8b949e] text-[12px]">
              <Hash size={13} />
              <span className="font-mono text-[#58a6ff]">{selectedCommit.hash}</span>
            </div>
            <div className="flex items-center gap-2 text-[#8b949e] text-[12px]">
              <Calendar size={13} />
              <span>
                {selectedCommit.date && !isNaN(selectedCommit.date)
                  ? format(selectedCommit.date, 'yy. MM. dd. a h:mm', { locale: ko })
                  : '---'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[#8b949e] text-[12px]">
              <User size={13} />
              <span>
                <strong className="text-[#c9d1d9]">{selectedCommit.author_name}</strong>
                <span className="ml-1 opacity-70">&lt;{selectedCommit.author_email}&gt;</span>
              </span>
            </div>

            {/* 머지 커밋: 부모 해시 표시 */}
            {isMerge && (
              <div className="mt-2 pt-2 border-t border-[#333333]/50">
                <div className="flex items-center gap-2 text-[#8b949e] text-[11px] mb-2">
                  <GitMerge size={13} />
                  <span className="font-semibold uppercase tracking-wider">Merged Parents</span>
                </div>
                <div className="flex flex-col gap-1">
                  {selectedCommit.parents.map((p, i) => (
                    <div key={p} className="flex items-center gap-2">
                      <span className="text-[10px] text-[#484f58] w-4">{i === 0 ? 'P1' : `P${i + 1}`}</span>
                      <button
                        className="font-mono text-[11px] text-[#d2a8ff] hover:text-[#f0d0ff] transition-colors truncate"
                        title={`클릭하여 복사: ${p}`}
                        onClick={() => navigator.clipboard.writeText(p)}
                      >
                        {p.substring(0, 12)}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-[#454545]">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#666666] mb-3 flex items-center gap-2">
            Changed Files
            {loaded && <span className="px-1.5 py-0.5 bg-[#333333] rounded text-[#8b949e]">{loaded.files.length}</span>}
          </h4>
          {!loaded ? (
            <p className="text-[11px] text-[#484f58] italic">Loading...</p>
          ) : loaded.files.length === 0 ? (
            <p className="text-[11px] text-[#484f58] italic">
              {isMerge ? '첫 번째 부모 대비 변경 없음 (충돌 해결 없는 클린 머지)' : '변경된 파일 없음'}
            </p>
          ) : (
            <ul className="space-y-0.5">
              {loaded.files.map((file) => (
                <li
                  key={file.path}
                  className={`flex items-center gap-2 text-[12px] p-2 rounded-md cursor-pointer transition-all ${
                    selectedFile === file.path
                      ? 'bg-[#37373d] text-[#58a6ff] shadow-sm'
                      : 'text-[#c9d1d9] hover:bg-[#2a2d2e]'
                  }`}
                  onClick={() => handleFileClick(file.path)}
                  onDoubleClick={() => handleFileDblClick(file.path)}
                >
                  <span className={`w-5 text-center font-bold shrink-0 text-[11px] ${
                    file.status === 'A' ? 'text-[#3fb950]'
                    : file.status === 'D' ? 'text-[#f85149]'
                    : file.status === 'R' ? 'text-[#d2a8ff]'
                    : 'text-[#d29922]'
                  }`}>
                    {file.status}
                  </span>
                  <FileText size={13} className="text-[#8b949e] shrink-0" />
                  <span className="truncate flex-1 text-[11px]">{file.path}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Right: diff viewer */}
      <div className="flex-1 overflow-hidden">
        {selectedFile ? (
          <DiffViewer diff={diff} fileName={selectedFile} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-[#484f58] gap-3">
            <FileText size={48} strokeWidth={1} />
            <span className="text-sm italic">파일을 선택하면 변경 내용이 표시됩니다</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommitDetail;
