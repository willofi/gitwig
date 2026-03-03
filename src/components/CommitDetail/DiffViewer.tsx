import React from 'react';

interface DiffViewerProps {
  diff: string;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ diff }) => {
  const lines = diff.split('\n');

  return (
    <div className="h-full overflow-auto bg-[#1e1e1e] p-4 font-mono text-xs">
      <pre className="whitespace-pre">
        {lines.map((line, idx) => {
          let className = 'text-[#cccccc]';
          if (line.startsWith('+') && !line.startsWith('+++')) {
            className = 'bg-[#153a15] text-[#b3d3b3]';
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            className = 'bg-[#401313] text-[#d3b3b3]';
          } else if (line.startsWith('@@')) {
            className = 'text-[#888888] font-bold';
          }
          
          return (
            <div key={idx} className={`${className} px-2`}>
              {line}
            </div>
          );
        })}
      </pre>
    </div>
  );
};

export default DiffViewer;
