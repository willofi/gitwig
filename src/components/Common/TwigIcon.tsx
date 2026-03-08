import React from 'react';

interface TwigIconProps {
  size?: number;
  className?: string;
}

/**
 * GitWig 앱 아이콘 — 작은 나뭇가지(twig)가 뻗어나가는 형태
 * 가지 끝의 노드 색상은 git 그래프의 COLORS 팔레트와 동일하게 맞춤
 */
const TwigIcon: React.FC<TwigIconProps> = ({ size = 32, className }) => {
  // viewBox 기준 좌표계 (0 0 100 100)
  // trunk: x=30, y=92 → y=8  (아래 → 위)
  // branch1 (top, green):   (30,22) → (80,10)
  // branch2 (mid, purple):  (30,44) → (75,32)
  // branch3 (lower, orange):(30,62) → (65,53)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* ── trunk ─────────────────────────────────── */}
      <line x1="30" y1="92" x2="30" y2="8"
        stroke="#3d6fa8" strokeWidth="4.5" strokeLinecap="round"/>
      <line x1="30" y1="92" x2="30" y2="8"
        stroke="#58a6ff" strokeWidth="2.8" strokeLinecap="round" opacity="0.9"/>

      {/* ── branch 1 (top-right, green) ───────────── */}
      <line x1="30" y1="22" x2="80" y2="10"
        stroke="#2a6b38" strokeWidth="3.8" strokeLinecap="round"/>
      <line x1="30" y1="22" x2="80" y2="10"
        stroke="#3fb950" strokeWidth="2.3" strokeLinecap="round" opacity="0.9"/>

      {/* ── branch 2 (mid-right, purple) ──────────── */}
      <line x1="30" y1="44" x2="76" y2="32"
        stroke="#5a3d8a" strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="30" y1="44" x2="76" y2="32"
        stroke="#d2a8ff" strokeWidth="2.1" strokeLinecap="round" opacity="0.9"/>

      {/* ── branch 3 (lower-right, orange) ────────── */}
      <line x1="30" y1="62" x2="65" y2="52"
        stroke="#7a4a1a" strokeWidth="3.2" strokeLinecap="round"/>
      <line x1="30" y1="62" x2="65" y2="52"
        stroke="#ffa657" strokeWidth="1.9" strokeLinecap="round" opacity="0.9"/>

      {/* ── nodes ─────────────────────────────────── */}

      {/* trunk top (HEAD) — blue */}
      <circle cx="30" cy="8"  r="5.5" fill="#58a6ff" opacity="0.25"/>
      <circle cx="30" cy="8"  r="3.5" fill="#58a6ff"/>
      <circle cx="30" cy="8"  r="1.4" fill="#e8f4ff"/>

      {/* branch 1 junction */}
      <circle cx="30" cy="22" r="3.2" fill="#58a6ff" opacity="0.8"/>

      {/* branch 1 tip — green */}
      <circle cx="80" cy="10" r="5"   fill="#3fb950" opacity="0.25"/>
      <circle cx="80" cy="10" r="3.2" fill="#3fb950"/>
      <circle cx="80" cy="10" r="1.2" fill="#f0fff4"/>

      {/* branch 2 junction */}
      <circle cx="30" cy="44" r="3"   fill="#58a6ff" opacity="0.75"/>

      {/* branch 2 tip — purple */}
      <circle cx="76" cy="32" r="4.8" fill="#d2a8ff" opacity="0.25"/>
      <circle cx="76" cy="32" r="3"   fill="#d2a8ff"/>
      <circle cx="76" cy="32" r="1.1" fill="#f8f0ff"/>

      {/* branch 3 junction */}
      <circle cx="30" cy="62" r="2.8" fill="#58a6ff" opacity="0.7"/>

      {/* branch 3 tip — orange */}
      <circle cx="65" cy="52" r="4.5" fill="#ffa657" opacity="0.25"/>
      <circle cx="65" cy="52" r="2.8" fill="#ffa657"/>
      <circle cx="65" cy="52" r="1"   fill="#fff8f0"/>

      {/* trunk bottom (base) */}
      <circle cx="30" cy="92" r="3.5" fill="#58a6ff" opacity="0.4"/>
    </svg>
  );
};

export default TwigIcon;
