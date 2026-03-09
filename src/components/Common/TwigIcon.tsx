import React from 'react';

interface TwigIconProps {
  size?: number;
  className?: string;
}

/**
 * GitWig 앱 아이콘 — git graph를 살아있는 나뭇가지처럼 재해석한 형태
 */
const TwigIcon: React.FC<TwigIconProps> = ({ size = 32, className }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="twigBark" x1="26" y1="92" x2="52" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60371d" />
          <stop offset="100%" stopColor="#c58b57" />
        </linearGradient>
        <linearGradient id="twigLeaf" x1="0" y1="0" x2="18" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#d9f99d" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
      </defs>

      <path d="M30 92C28 78 28 66 29 54C31 42 35 28 43 10" stroke="#5f361d" strokeWidth="5.5" strokeLinecap="round" />
      <path d="M30 92C28 78 28 66 29 54C31 42 35 28 43 10" stroke="url(#twigBark)" strokeWidth="3.1" strokeLinecap="round" />
      <path d="M33 66C42 66 52 62 61 54" stroke="#ba8450" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M34 47C46 44 57 39 69 31" stroke="#c89463" strokeWidth="2.9" strokeLinecap="round" />
      <path d="M38 27C49 22 61 16 75 8" stroke="#d3a36f" strokeWidth="3" strokeLinecap="round" />

      <path d="M68 6C74 6 79 10 81 16C76 19 69 19 64 16C64 12 66 8 68 6Z" fill="url(#twigLeaf)" />
      <path d="M72 18C78 18 83 22 85 28C80 31 73 30 68 27C68 23 70 20 72 18Z" fill="#34d399" />
      <path d="M64 28C69 27 73 30 75 35C71 38 65 38 61 35C61 31 62 29 64 28Z" fill="#86efac" />
      <path d="M57 50C62 49 66 52 68 57C64 60 59 60 55 58C55 54 56 51 57 50Z" fill="#4ade80" />
      <path d="M51 60C55 59 59 61 61 65C57 68 52 68 49 66C49 63 50 61 51 60Z" fill="#bbf7d0" />

      <circle cx="30" cy="92" r="3.6" fill="#6fb6ff" opacity="0.5" />
      <circle cx="33" cy="66" r="3.1" fill="#6fb6ff" opacity="0.75" />
      <circle cx="34" cy="47" r="3.2" fill="#6fb6ff" opacity="0.82" />
      <circle cx="43" cy="10" r="5.8" fill="#58a6ff" opacity="0.26" />
      <circle cx="43" cy="10" r="3.7" fill="#58a6ff" />
      <circle cx="43" cy="10" r="1.3" fill="#e8f4ff" />
    </svg>
  );
};

export default TwigIcon;
