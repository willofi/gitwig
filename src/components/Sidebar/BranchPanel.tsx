import React, { useState, useMemo, useEffect } from 'react';
import { useRepoStore } from '@/store/repoStore';
import { useTheme } from '@/contexts/ThemeContext';
import { GitBranch, ChevronDown, ChevronRight, Check, Search, MoreVertical, Plus, Edit2, Trash2, GitMerge, RefreshCw, ArrowUpCircle, Folder, FolderOpen, Star, ArrowUp, ArrowDown } from 'lucide-react';
import PromptModal from '../Common/PromptModal';

interface BranchNode {
  name: string;
  fullName: string;
  children: Record<string, BranchNode>;
  isBranch: boolean;
}

const BranchPanel: React.FC = () => {
  const { isDark } = useTheme();
  const { branches, branchDetails, currentBranch, currentPath, refresh, setViewingBranch, viewingBranch, highlightedBranch, setHighlightedBranch, addGitLog, updateGitLog } = useRepoStore();

  const hoverBg      = isDark ? '#2d2d30' : '#eef0f3';
  const activeBg     = isDark ? '#2d2d30' : '#eef0f3';
  const activeText   = isDark ? '#58a6ff' : '#0969da';
  const currentText  = isDark ? '#4facfe' : '#0969da';
  const defaultText  = isDark ? '#cccccc' : '#57606a';
  const containerBg  = isDark ? '#252526' : '#f6f8fa';
  const menuBg       = isDark ? '#161b22' : '#ffffff';
  const menuBorder   = isDark ? '#30363d' : '#d0d7de';
  const menuText     = isDark ? '#8b949e' : '#57606a';
  const menuDivider  = isDark ? '#30363d' : '#e5e7eb';
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['local', 'remote']));
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, branch: string } | null>(null);
  const [promptConfig, setPromptConfig] = useState<{ title: string, message: string, initialValue: string, action: (val: string) => void } | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setContextMenu(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!currentBranch) return;
    const isRemote = currentBranch.startsWith('remotes/');
    const root = isRemote ? 'remote' : 'local';
    const parts = isRemote
      ? currentBranch.replace('remotes/', '').split('/')
      : currentBranch.split('/');
    if (parts.length <= 1) return; // 폴더 없음, 확장 불필요
    setExpandedFolders(prev => {
      const next = new Set(prev);
      // 마지막 part는 브랜치 자체이므로 그 앞까지만 폴더 경로 추가
      for (let i = 0; i < parts.length - 1; i++) {
        next.add(`${root}/${parts.slice(0, i + 1).join('/')}`);
      }
      return next;
    });
  }, [currentBranch]);

  const runWithLog = async (cmd: string, action: () => Promise<any>) => {
    const logId = addGitLog({ command: cmd, status: 'pending' });
    const startTime = Date.now();
    try {
      await action();
      updateGitLog(logId, { status: 'success', duration: Date.now() - startTime });
    } catch (e: any) {
      updateGitLog(logId, { status: 'error', error: e.message || 'Action failed', duration: Date.now() - startTime });
      throw e;
    }
  };

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) newExpanded.delete(path);
    else newExpanded.add(path);
    setExpandedFolders(newExpanded);
  };

  const buildTree = (branchList: string[]) => {
    const root: Record<string, BranchNode> = {
      local: { name: 'local', fullName: 'local', children: {}, isBranch: false },
      remote: { name: 'remote', fullName: 'remote', children: {}, isBranch: false }
    };

    const isRootMainBranch = (fullName: string) => {
      const name = fullName.replace('remotes/origin/', '').replace('remotes/', '');
      const lower = name.toLowerCase();
      // Only treat as root main if it's strictly 'main' or 'master' without any folder path
      return (lower === 'main' || lower === 'master') && !name.includes('/');
    };

    // renderNode에서 자식 노드를 정렬하므로 여기서 pre-sort 불필요
    branchList.forEach(branch => {
      const isRemote = branch.startsWith('remotes/');
      const parts = isRemote ? branch.replace('remotes/', '').split('/') : branch.split('/');
      let current = root[isRemote ? 'remote' : 'local'];

      parts.forEach((part, idx) => {
        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            fullName: isRemote ? `remotes/${parts.slice(0, idx + 1).join('/')}` : parts.slice(0, idx + 1).join('/'),
            children: {},
            isBranch: idx === parts.length - 1
          };
        }
        current = current.children[part];
      });
      current.fullName = branch;
    });
    return root;
  };

  const tree = useMemo(() => buildTree(branches.filter(b => b.toLowerCase().includes(searchTerm.toLowerCase()))), [branches, searchTerm]);

  const handleAction = async (action: string, branch: string) => {
    if (!currentPath) return;
    setContextMenu(null);

    const handleGitError = async (e: any, taskName: string, branchContext?: string) => {
      if (e.message.includes('overwritten by checkout') || e.message.includes('overwritten by merge')) {
        const fileListRaw = e.message.split('overwritten by')[1]?.split('Please commit')[0]?.trim();
        // 'merge:' 또는 'checkout:' 등 콜론으로 끝나는 안내 문구를 필터링하고 실제 파일 경로만 추출
        const files = (fileListRaw || '')
          .split(/\s+/)
          .filter((f: string) => f && !f.endsWith(':'))
          .filter(Boolean);
        
        if (files.length === 0) {
          alert(`Git Error (${taskName}): ${e.message}`);
          return;
        }

        const message = `${taskName} 실패: 로컬 작업 내역과 서버의 내용이 충돌합니다.\n\n` +
          `대상 파일:\n${files.join('\n')}\n\n` +
          `해결 방법:\n` +
          `1. [추천] 변경 사항을 Stash(일시 보관)하고 다시 시도하세요.\n` +
          `2. 변경 사항을 Commit한 후 다시 시도하세요.\n` +
          `3. [강제] 로컬 내용을 버리고 서버 버전으로 덮어쓰시겠습니까? (Discard & Pull)`;
        
        if (window.confirm(message + '\n\n"확인"을 누르면 로컬 변경사항을 삭제하고 서버 내용을 가져옵니다.')) {
          try {
            await runWithLog('git discard changes', () => window.electronAPI.git.discardChanges(currentPath!, files));
            // Re-run the original action
            await handleAction('pull', branchContext || currentBranch!);
          } catch (err: any) {
            alert(`강제 업데이트 실패: ${err.message}`);
          }
        }
      } else {
        alert(`Git Error (${taskName}): ${e.message}`);
      }
    };

    try {
      switch (action) {
        case 'checkout':
          try {
            await runWithLog(`git checkout ${branch}`, () => window.electronAPI.git.checkout(currentPath, branch));
          } catch (e) {
            await handleGitError(e, '체크아웃', branch);
          }
          break;
        case 'new':
          setPromptConfig({
            title: '새 브랜치 생성',
            message: `${branch} 브랜치를 기반으로 새 브랜치 생성:`,
            initialValue: '',
            action: async (name) => {
              try {
                await runWithLog(`git checkout -b ${name} ${branch}`, () => 
                  window.electronAPI.git.checkout(currentPath, branch, { newBranch: name })
                );
                await refresh();
              } catch (e) {
                await handleGitError(e, '브랜치 생성', branch);
              }
            }
          });
          break;
        case 'merge':
          try {
            await runWithLog(`git merge ${branch}`, () => window.electronAPI.git.merge(currentPath, branch));
          } catch (e) {
            await handleGitError(e, '머지', branch);
          }
          break;
        case 'squash':
          try {
            await runWithLog(`git merge --squash ${branch}`, () => window.electronAPI.git.merge(currentPath, branch, { squash: true }));
          } catch (e) {
            await handleGitError(e, '스쿼시 머지', branch);
          }
          break;
        case 'rename':
          setPromptConfig({
            title: '브랜치 이름 변경',
            message: `${branch} 브랜치의 새 이름을 입력하세요:`,
            initialValue: branch,
            action: async (newName) => {
              try {
                await runWithLog(`git branch -m ${branch} ${newName}`, () => window.electronAPI.git.renameBranch(currentPath, branch, newName));
                await refresh();
              } catch (e: any) {
                alert(`이름 변경 실패: ${e.message}`);
              }
            }
          });
          break;
        case 'delete':
          if (window.confirm(`Delete branch ${branch}?`)) {
            try {
              await runWithLog(`git branch -d ${branch}`, () => window.electronAPI.git.deleteBranch(currentPath, branch));
            } catch (e: any) {
              alert(`삭제 실패: ${e.message}`);
            }
          }
          break;
        case 'push':
          try {
            await runWithLog(`git push`, () => window.electronAPI.git.push(currentPath));
          } catch (e: any) {
            alert(`푸시 실패: ${e.message}`);
          }
          break;
        case 'pull':
          try {
            if (branch !== currentBranch) {
              await runWithLog(`git checkout ${branch}`, () => window.electronAPI.git.checkout(currentPath, branch));
            }
            await runWithLog(`git pull origin ${branch}`, () => window.electronAPI.git.pull(currentPath));
          } catch (e) {
            await handleGitError(e, '업데이트(Pull)', branch);
          }
          break;
      }
      if (action !== 'new' && action !== 'rename') await refresh();
    } catch (e: any) {
      console.error('Action handling failed:', e);
    }
  };

  const isRootMain = (fullName: string) => {
    const name = fullName.replace('remotes/origin/', '').replace('remotes/', '');
    const lower = name.toLowerCase();
    // Only 'main' or 'master' at the root level (no slashes)
    return (lower === 'main' || lower === 'master') && !name.includes('/');
  };

  const renderNode = (node: BranchNode, depth: number, path: string) => {
    const isExpanded = expandedFolders.has(path);
    const hasChildren = Object.keys(node.children).length > 0;
    const isCurrent = node.fullName === currentBranch;
    const isViewing = node.fullName === viewingBranch;
    const isHighlighted = node.fullName === highlightedBranch;
    
    const isMain = node.isBranch && isRootMain(node.fullName);
    const details = node.isBranch ? branchDetails[node.fullName] : null;

    const isActive = isViewing || isHighlighted;
    const itemBg    = isActive ? activeBg : 'transparent';
    const itemColor = isViewing ? activeText : isHighlighted ? (isDark ? '#ffffff' : '#24292f') : isCurrent ? currentText : defaultText;

    return (
      <div key={path} className="select-none">
        <div
          className={`group flex items-center py-0.5 px-2 cursor-pointer text-[12px] rounded-md mx-1 transition-colors ${isCurrent && !isActive ? 'font-bold' : ''}`}
          style={{ paddingLeft: `${depth * 12 + 8}px`, background: itemBg, color: itemColor }}
          onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = hoverBg; }}
          onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          onClick={(e) => {
            if (hasChildren) {
              toggleFolder(path);
            } else {
              setHighlightedBranch(node.fullName);
            }
          }}
          onDoubleClick={(e) => {
            if (!hasChildren && node.isBranch) {
              setViewingBranch(node.fullName);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            if (node.isBranch) {
              setHighlightedBranch(node.fullName);
              setContextMenu({ x: e.pageX, y: e.pageY, branch: node.fullName });
            }
          }}
        >
          <span className="w-4 flex items-center shrink-0">
            {hasChildren && (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
          </span>
          <span className="w-4 flex items-center shrink-0 mr-1">
            {node.isBranch ? (
              isMain ? (
                <Star size={13} className="fill-[#eab308] text-[#eab308]" />
              ) : (
                <GitBranch size={13} style={{ color: isCurrent || isViewing ? activeText : (isDark ? '#757575' : '#8c959f') }} />
              )
            ) : (
              <span className="text-[#dcb67a]">
                {isExpanded ? <FolderOpen size={13} /> : <Folder size={13} />}
              </span>
            )}
          </span>
          <span className="truncate flex-1">{node.name}</span>
          
          {/* Ahead/Behind Indicators */}
          {node.isBranch && details && (
            <div className="flex items-center gap-2 ml-2 shrink-0">
              {details.ahead && details.ahead > 0 ? (
                <div className="flex items-center text-[#a5d8ff] text-[10px] font-bold gap-0.5" title={`${details.ahead} commits to push`}>
                  <ArrowUp size={12} strokeWidth={3} />
                  <span>{details.ahead}</span>
                </div>
              ) : null}
              {details.behind && details.behind > 0 ? (
                <div className="flex items-center text-[#ffc9c9] text-[10px] font-bold gap-0.5" title={`${details.behind} commits to pull`}>
                  <ArrowDown size={12} strokeWidth={3} />
                  <span>{details.behind}</span>
                </div>
              ) : null}
            </div>
          )}

          {isCurrent && (
            <div className="flex items-center gap-1 ml-2 shrink-0">
              <Check size={10} className="text-[#4facfe]" />
            </div>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div>
            {Object.values(node.children)
              .sort((a, b) => {
                // 1. Root Main/Master (Priority 0)
                const isAMain = a.isBranch && isRootMain(a.fullName);
                const isBMain = b.isBranch && isRootMain(b.fullName);
                if (isAMain && !isBMain) return -1;
                if (!isAMain && isBMain) return 1;

                // 2. Folders before Branches (Priority 1)
                const aHasChildren = Object.keys(a.children).length > 0;
                const bHasChildren = Object.keys(b.children).length > 0;
                if (aHasChildren && !bHasChildren) return -1;
                if (!aHasChildren && bHasChildren) return 1;

                // 3. Alphabetical (Priority 2)
                return a.name.localeCompare(b.name);
              })
              .map(child => renderNode(child, depth + 1, `${path}/${child.name}`))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden" style={{ background: containerBg }} onClick={() => setContextMenu(null)}>
      <div className="p-3 space-y-2" style={{ borderBottom: `1px solid ${isDark ? '#333333' : '#d0d7de'}` }}>
        <h2 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: isDark ? '#666666' : '#8c959f' }}>Branches</h2>
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: isDark ? '#666666' : '#8c959f' }} />
          <input
            type="text"
            placeholder="Search branches..."
            className="w-full text-[11px] pl-7 pr-2 py-1 rounded focus:outline-none"
            style={{
              background: isDark ? '#1e1e1e' : '#ffffff',
              color: isDark ? '#cccccc' : '#24292f',
              border: `1px solid ${isDark ? '#3c3c3c' : '#d0d7de'}`,
            }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto py-2 px-1">
        {renderNode(tree.local, 0, 'local')}
        {renderNode(tree.remote, 0, 'remote')}
      </div>

      {promptConfig && (
        <PromptModal
          title={promptConfig.title}
          message={promptConfig.message}
          initialValue={promptConfig.initialValue}
          onClose={() => setPromptConfig(null)}
          onConfirm={(val) => {
            promptConfig.action(val);
            setPromptConfig(null);
          }}
        />
      )}

      {contextMenu && (
        <div
          className="fixed z-[100] shadow-2xl py-1 rounded-md min-w-[180px] text-[12px]"
          style={{ top: contextMenu.y, left: contextMenu.x, background: menuBg, border: `1px solid ${menuBorder}`, color: menuText }}
          onClick={e => e.stopPropagation()}
        >
          <ContextMenuItem isDark={isDark} icon={<Check size={14} />} label="Checkout" onClick={() => handleAction('checkout', contextMenu.branch)} />
          <ContextMenuItem isDark={isDark} icon={<Plus size={14} />} label="New Branch from this..." onClick={() => handleAction('new', contextMenu.branch)} />
          <div className="h-[1px] my-1" style={{ background: menuDivider }} />
          <ContextMenuItem isDark={isDark} icon={<GitMerge size={14} />} label={`Merge into ${currentBranch}`} onClick={() => handleAction('merge', contextMenu.branch)} />
          <ContextMenuItem isDark={isDark} icon={<GitMerge size={14} />} label={`Squash Merge into ${currentBranch}`} onClick={() => handleAction('squash', contextMenu.branch)} />
          <div className="h-[1px] my-1" style={{ background: menuDivider }} />
          <ContextMenuItem isDark={isDark} icon={<RefreshCw size={14} />} label="Update (Pull)" onClick={() => handleAction('pull', contextMenu.branch)} />
          <ContextMenuItem isDark={isDark} icon={<ArrowUpCircle size={14} />} label="Push..." onClick={() => handleAction('push', contextMenu.branch)} />
          <div className="h-[1px] my-1" style={{ background: menuDivider }} />
          <ContextMenuItem isDark={isDark} icon={<Edit2 size={14} />} label="Rename..." onClick={() => handleAction('rename', contextMenu.branch)} />
          <ContextMenuItem isDark={isDark} danger icon={<Trash2 size={14} />} label="Delete" onClick={() => handleAction('delete', contextMenu.branch)} />
        </div>
      )}
    </div>
  );
};

const ContextMenuItem: React.FC<{ icon: React.ReactNode, label: string, onClick: () => void, isDark: boolean, danger?: boolean }> = ({ icon, label, onClick, isDark, danger = false }) => (
  <div
    className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer transition-colors"
    style={{
      color: danger ? (isDark ? '#ff7b72' : '#cf222e') : (isDark ? '#8b949e' : '#57606a'),
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = danger
        ? (isDark ? 'rgba(248,81,73,0.18)' : 'rgba(207,34,46,0.12)')
        : (isDark ? 'rgba(31,111,235,0.2)' : 'rgba(9,105,218,0.12)');
      e.currentTarget.style.color = danger
        ? (isDark ? '#ffb4a8' : '#a40e26')
        : (isDark ? '#58a6ff' : '#0969da');
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'transparent';
      e.currentTarget.style.color = danger ? (isDark ? '#ff7b72' : '#cf222e') : (isDark ? '#8b949e' : '#57606a');
    }}
    onClick={onClick}
  >
    <span className="w-4 flex items-center">{icon}</span>
    <span>{label}</span>
  </div>
);

export default BranchPanel;
