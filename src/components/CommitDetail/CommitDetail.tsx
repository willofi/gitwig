import React, { useEffect, useState } from 'react';
import { useRepoStore } from '@/store/repoStore';
import { FileText, Calendar, User, Hash } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import DiffViewer from './DiffViewer';

const CommitDetail: React.FC = () => {
  const { selectedCommit, currentPath, addGitLog, updateGitLog } = useRepoStore();
  const [files, setFiles] = useState<{ status: string, path: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [diff, setDiff] = useState<string>('');

  const runWithLog = async (cmd: string, action: () => Promise<any>) => {
    const logId = addGitLog({ command: cmd, status: 'pending' });
    const startTime = Date.now();
    try {
      const result = await action();
      updateGitLog(logId, { status: 'success', duration: Date.now() - startTime });
      return result;
    } catch (e: any) {
      updateGitLog(logId, { status: 'error', error: e.message || 'Action failed', duration: Date.now() - startTime });
      throw e;
    }
  };

  useEffect(() => {
    if (selectedCommit && currentPath) {
      runWithLog(`git show --name-status ${selectedCommit.hash.substring(0, 7)}`, () => 
        window.electronAPI.git.getCommitFiles(currentPath, selectedCommit.hash)
      ).then(setFiles);
      setSelectedFile(null);
      setDiff('');
    }
  }, [selectedCommit, currentPath]);

  const handleFileClick = async (filePath: string) => {
    if (!currentPath || !selectedCommit) return;
    setSelectedFile(filePath);
    const fileDiff = await runWithLog(`git diff ${selectedCommit.hash}^..${selectedCommit.hash} -- ${filePath}`, () => 
      window.electronAPI.git.getDiff(currentPath, `${selectedCommit.hash}^`, selectedCommit.hash)
    );
    setDiff(fileDiff);
  };

  if (!selectedCommit) {
    return (
      <div className="p-8 text-center text-[#666666] text-sm italic">
        Select a commit to view details
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden bg-[#1e1e1e]">
      <div className="w-1/2 border-r border-[#333333] flex flex-col overflow-hidden">
        {/* Full Commit Message & Meta */}
        <div className="p-5 border-b border-[#333333] bg-[#252526] overflow-y-auto max-h-[60%] scrollbar-thin scrollbar-thumb-[#454545]">
          <h3 className="text-[#e6edf3] font-bold text-[15px] mb-3 leading-snug whitespace-pre-wrap selection:bg-[#1f6feb]/30">
            {selectedCommit.message}
          </h3>
          
          {selectedCommit.body && (
            <div className="text-[#c9d1d9] text-[13px] mb-6 whitespace-pre-wrap leading-relaxed selection:bg-[#1f6feb]/30">
              {selectedCommit.body}
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
          </div>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-[#454545]">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#666666] mb-3 flex items-center gap-2">
            Changed Files <span className="px-1.5 py-0.5 bg-[#333333] rounded text-[#8b949e]">{files.length}</span>
          </h4>
          <ul className="space-y-0.5">
            {files.map((file) => (
              <li
                key={file.path}
                className={`flex items-center gap-2 text-[12px] p-2 rounded-md cursor-pointer transition-all ${
                  selectedFile === file.path ? 'bg-[#37373d] text-[#58a6ff] shadow-sm' : 'text-[#c9d1d9] hover:bg-[#2a2d2e]'
                }`}
                onClick={() => handleFileClick(file.path)}
              >
                <span className={`w-5 text-center font-bold shrink-0 ${
                  file.status === 'A' ? 'text-[#3fb950]' : file.status === 'M' ? 'text-[#d29922]' : 'text-[#f85149]'
                }`}>
                  {file.status}
                </span>
                <FileText size={14} className="text-[#8b949e] shrink-0" />
                <span className="truncate flex-1">{file.path}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      {/* Diff View */}
      <div className="flex-1 overflow-hidden bg-[#0d1117]">
        {selectedFile ? (
          <DiffViewer diff={diff} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-[#484f58] gap-3">
            <FileText size={48} strokeWidth={1} />
            <span className="text-sm italic">Select a file to view changes</span>
          </div>
        )}
      </div>
    </div>
  );
};


export default CommitDetail;
