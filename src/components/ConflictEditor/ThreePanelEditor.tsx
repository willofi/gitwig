import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useRepoStore } from '@/store/repoStore';
import { Check } from 'lucide-react';

interface ThreePanelEditorProps {
  filePath: string;
  onResolved: () => void;
}

const ThreePanelEditor: React.FC<ThreePanelEditorProps> = ({ filePath, onResolved }) => {
  const { currentPath } = useRepoStore();
  const [ours, setOurs] = useState('');
  const [theirs, setTheirs] = useState('');
  const [result, setResult] = useState('');

  useEffect(() => {
    if (!currentPath) return;
    window.electronAPI.git.readFile(currentPath, filePath).then((content) => {
      // Very simple parsing for the 3 panels
      const lines = content.split('\n');
      let o = '', t = '', r = '';
      let mode: 'ours' | 'theirs' | 'none' = 'none';

      lines.forEach(line => {
        if (line.startsWith('<<<<<<<')) {
          mode = 'ours';
        } else if (line.startsWith('=======')) {
          mode = 'theirs';
        } else if (line.startsWith('>>>>>>>')) {
          mode = 'none';
        } else if (mode === 'ours') {
          o += line + '\n';
        } else if (mode === 'theirs') {
          t += line + '\n';
        } else {
          o += line + '\n';
          t += line + '\n';
          r += line + '\n';
        }
      });
      setOurs(o);
      setTheirs(t);
      setResult(content); // Show the full content with markers initially for editing
    });
  }, [filePath, currentPath]);

  const handleSave = async () => {
    if (!currentPath) return;
    await window.electronAPI.git.writeFile(currentPath, filePath, result);
    // Stage the file after resolving
    await window.electronAPI.git.add(currentPath, filePath);
    onResolved();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#1e1e1e]">
      <div className="flex-1 flex overflow-hidden">
        {/* Ours */}
        <div className="flex-1 flex flex-col border-r border-[#333333]">
          <div className="p-2 bg-[#252526] text-[10px] font-bold uppercase text-blue-400">Ours (Current Branch)</div>
          <div className="flex-1">
            <Editor
              theme="vs-dark"
              language="typescript"
              value={ours}
              options={{ readOnly: true, minimap: { enabled: false } }}
            />
          </div>
        </div>

        {/* Result */}
        <div className="flex-1 flex flex-col border-r border-[#333333]">
          <div className="p-2 bg-[#252526] text-[10px] font-bold uppercase text-green-400">Result (Merged)</div>
          <div className="flex-1">
            <Editor
              theme="vs-dark"
              language="typescript"
              value={result}
              onChange={(value) => setResult(value || '')}
              options={{ minimap: { enabled: false } }}
            />
          </div>
        </div>

        {/* Theirs */}
        <div className="flex-1 flex flex-col">
          <div className="p-2 bg-[#252526] text-[10px] font-bold uppercase text-yellow-400">Theirs (Incoming)</div>
          <div className="flex-1">
            <Editor
              theme="vs-dark"
              language="typescript"
              value={theirs}
              options={{ readOnly: true, minimap: { enabled: false } }}
            />
          </div>
        </div>
      </div>

      <div className="p-4 bg-[#252526] border-t border-[#333333] flex justify-end gap-4">
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-[#0e639c] hover:bg-[#1177bb] text-white text-sm font-bold rounded flex items-center gap-2 transition-colors"
        >
          <Check size={16} />
          Mark as Resolved
        </button>
      </div>
    </div>
  );
};

export default ThreePanelEditor;
