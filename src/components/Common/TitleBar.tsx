import React from 'react';
import TwigIcon from './TwigIcon';

const TitleBar: React.FC = () => {
  const isMac = window.electronAPI.platform === 'darwin';
  const isWindows = window.electronAPI.platform === 'win32';

  return (
    <div
      className="flex items-center bg-[#2d2d2d] select-none"
      style={{
        height: '32px',
        WebkitAppRegion: 'drag',
        paddingRight: isWindows ? '135px' : '0',
        paddingLeft: isMac ? '80px' : '0',
      } as React.CSSProperties}
    >
      <div className="flex-1 flex justify-center items-center h-full gap-2">
        <TwigIcon size={18} />
        <span className="text-[11px] font-semibold text-[#9ca3af] tracking-widest uppercase">
          GitWig
        </span>
      </div>
    </div>
  );
};

export default TitleBar;
