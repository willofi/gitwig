import React from 'react';

const TitleBar: React.FC = () => {
  const isMac = window.electronAPI.platform === 'darwin';
  const isWindows = window.electronAPI.platform === 'win32';

  return (
    <div 
      className={`flex items-center bg-[#333333] select-none`}
      style={{ 
        height: '32px', 
        WebkitAppRegion: 'drag' as any,
        paddingRight: isWindows ? '135px' : '0',
        paddingLeft: isMac ? '80px' : '0'
      }}
    >
      <div className="flex-1 flex justify-center items-center h-full">
        <span className="text-[11px] font-medium text-[#888888] tracking-wider uppercase opacity-50">
          GitWig
        </span>
      </div>
    </div>
  );
};

export default TitleBar;
