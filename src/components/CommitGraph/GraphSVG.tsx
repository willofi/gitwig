import React from 'react';
import { Commit } from '@/types/git.types';
import { useTheme } from '@/contexts/ThemeContext';

interface GraphSVGProps {
  commits: Commit[];
  currentIndex: number;
}

const LANE_WIDTH = 14;
const ROW_HEIGHT = 26;
const NODE_RADIUS = 3.5;
const OFFSET_X = 16;

const COLORS = [
  "#58a6ff", "#3fb950", "#f78166", "#d2a8ff",
  "#ffa657", "#79c0ff", "#56d364", "#ff7b72",
  "#bc8cff", "#ffb77c",
];

function lx(idx: number) { return idx * LANE_WIDTH + OFFSET_X; }

const GraphSVG: React.FC<GraphSVGProps> = ({ commits, currentIndex }) => {
  const { isDark } = useTheme();
  const nodeBg = isDark ? '#0d1117' : '#ffffff';
  const commit = commits[currentIndex];
  if (!commit || commit.lane === undefined || !commit.lanesIn || !commit.lanesOut) return null;

  const { lane, lanesIn, lanesOut, color } = commit;
  const nodeX = lx(lane);
  const midY = ROW_HEIGHT / 2;
  const SW = 1.8;
  const TOP = -1;
  const BOT = ROW_HEIGHT + 1;

  const paths: React.ReactNode[] = [];
  let ki = 0;

  /** bezier 곡선 or 직선 */
  const seg = (sx: number, sy: number, ex: number, ey: number, col: string) => {
    if (sx === ex) {
      paths.push(<line key={ki++} x1={sx} y1={sy} x2={ex} y2={ey}
        stroke={col} strokeWidth={SW} strokeLinecap="round" strokeOpacity="0.85" />);
    } else {
      const d = ey - sy;
      paths.push(<path key={ki++}
        d={`M ${sx} ${sy} C ${sx} ${sy + d * 0.55}, ${ex} ${sy + d * 0.45}, ${ex} ${ey}`}
        fill="none" stroke={col} strokeWidth={SW} strokeLinecap="round" strokeOpacity="0.85" />);
    }
  };

  // ── 1. INCOMING  (TOP → midY) ─────────────────────────────────────────────
  //
  //  각 lanesIn[i] = hash 에 대해:
  //    hash === commit.hash  → nodeX 로 수렴 (이 커밋의 레인)
  //    그 외                 → lanesOut 내 같은 hash 위치로 통과 (대각선 가능)
  //                            lanesOut 에도 없으면 → 그냥 끊김 (nodeX 아님!)
  //
  lanesIn.forEach((hash, inIdx) => {
    if (!hash) return;
    const sx = lx(inIdx);
    if (hash === commit.hash) {
      seg(sx, TOP, nodeX, midY, COLORS[inIdx % COLORS.length]);
    } else {
      const oi = lanesOut.indexOf(hash);
      if (oi === -1) return; // 이 레인은 사라짐 (MAX_LANES overflow 등) → 그냥 생략
      seg(sx, TOP, lx(oi), midY, COLORS[inIdx % COLORS.length]);
    }
  });

  // ── 2. OUTGOING  (midY → BOT) ────────────────────────────────────────────
  //
  //  [A] 기본 루프 - lanesOut 의 각 hash 에 대해:
  //    lanesIn 에 있었다면   → lanesIn 위치에서 출발 (통과)
  //    lanesIn 에 없었다면   → nodeX 에서 출발 (새 부모 추적 시작)
  //
  //  [B] 추가 호(arc) - effectiveParents 중 이미 lanesIn 에서 추적 중인 것:
  //    이 커밋(브랜치 팁 포함)이 "이미 다른 레인에서 추적 중인 부모"를 가질 때,
  //    기본 루프는 그 부모를 pass-through 로 처리해 노드와 연결이 안 된다.
  //    → nodeX 에서 해당 부모 레인으로 추가 호를 그려 연결을 명시한다.
  //
  //  이것이 git log 의 "|/", "|_|" 패턴을 SVG 로 올바르게 표현하는 핵심이다.
  //

  // [A]
  lanesOut.forEach((hash, outIdx) => {
    if (!hash) return;
    const ex = lx(outIdx);
    const inIdx = lanesIn.indexOf(hash);
    const sx = inIdx !== -1 ? lx(inIdx) : nodeX;
    seg(sx, midY, ex, BOT, COLORS[outIdx % COLORS.length]);
  });

  // [B]
  (commit.effectiveParents ?? []).forEach(pHash => {
    const inIdx = lanesIn.indexOf(pHash);
    if (inIdx === -1) return;              // 아직 추적 안 됨 → [A] 에서 처리
    const outIdx = lanesOut.indexOf(pHash);
    if (outIdx === -1) return;
    const ex = lx(outIdx);
    if (nodeX === ex) return;             // 같은 레인 → pass-through 가 이미 커버
    seg(nodeX, midY, ex, BOT, COLORS[outIdx % COLORS.length]);
  });

  // ── 3. 노드 ───────────────────────────────────────────────────────────────
  const isMerge = (commit.parents?.length ?? 0) > 1;

  return (
    <svg width="100%" height={ROW_HEIGHT} className="overflow-visible" style={{ pointerEvents: 'none' }}>
      {paths}
      <circle cx={nodeX} cy={midY} r={NODE_RADIUS + 1.5} fill={color} fillOpacity="0.2" />
      <circle cx={nodeX} cy={midY} r={NODE_RADIUS} fill={color} stroke={nodeBg} strokeWidth="1.5" />
      {isMerge && <circle cx={nodeX} cy={midY} r={NODE_RADIUS - 1.5} fill={nodeBg} />}
    </svg>
  );
};

export default GraphSVG;
