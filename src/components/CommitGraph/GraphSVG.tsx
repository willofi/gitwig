import React from 'react';
import { Commit } from '@/types/git.types';

interface GraphSVGProps {
  commits: Commit[];
  currentIndex: number;
}

const LANE_WIDTH = 18;
const ROW_HEIGHT = 26;
const NODE_RADIUS = 3.5;
const OFFSET_X = 16;

const COLORS = [
  "#58a6ff", "#3fb950", "#f78166", "#d2a8ff",
  "#ffa657", "#79c0ff", "#56d364", "#ff7b72",
  "#bc8cff", "#ffb77c",
];

const GraphSVG: React.FC<GraphSVGProps> = ({ commits, currentIndex }) => {
  const commit = commits[currentIndex];
  if (!commit || commit.lane === undefined || !commit.lanesIn || !commit.lanesOut) return null;

  const { lanesIn, lanesOut } = commit;
  const nodeX = commit.lane * LANE_WIDTH + OFFSET_X;
  const midY = ROW_HEIGHT / 2;
  const STROKE_WIDTH = 2;
  const TOP = -1;
  const BOTTOM = ROW_HEIGHT + 1;

  return (
    <svg width="100%" height={ROW_HEIGHT} className="overflow-visible" style={{ pointerEvents: 'none' }}>
      {/* 1. Incoming Lines (Top -> midY) */}
      {lanesIn.map((hash, inIdx) => {
        if (!hash) return null;
        const startX = inIdx * LANE_WIDTH + OFFSET_X;
        const outIdx = lanesOut.indexOf(hash);
        const color = COLORS[inIdx % COLORS.length];

        // Any line that is this commit, its parent, or dead-ends here should converge to nodeX
        const isTargetingNode = hash === commit.hash || commit.effectiveParents?.includes(hash) || outIdx === -1;
        const targetX = isTargetingNode ? nodeX : (outIdx * LANE_WIDTH + OFFSET_X);

        return (
          <path
            key={`in-${inIdx}-${hash}`}
            d={`M ${startX} ${TOP} C ${startX} ${midY * 0.5}, ${targetX} ${midY * 0.5}, ${targetX} ${midY}`}
            fill="none"
            stroke={color}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeOpacity="0.8"
          />
        );
      })}

      {/* 2. Outgoing Lines (midY -> Bottom) */}
      {lanesOut.map((hash, outIdx) => {
        if (!hash) return null;
        const endX = outIdx * LANE_WIDTH + OFFSET_X;
        const inIdx = lanesIn.indexOf(hash);
        const color = COLORS[outIdx % COLORS.length];

        // Any line that is a parent, a new line, or this commit's continuation should start from nodeX
        const isFromNode = commit.effectiveParents?.includes(hash) || inIdx === -1 || hash === commit.hash;
        const sourceX = isFromNode ? nodeX : endX;
        
        // Use node color for the primary lineage (first parent)
        const isPrimaryParent = commit.effectiveParents?.includes(hash) && commit.effectiveParents.indexOf(hash) === 0;
        const pathColor = isPrimaryParent ? commit.color! : color;

        return (
          <path
            key={`out-${outIdx}-${hash}`}
            d={`M ${sourceX} ${midY} C ${sourceX} ${midY + midY * 0.5}, ${endX} ${midY + midY * 0.5}, ${endX} ${BOTTOM}`}
            fill="none"
            stroke={pathColor}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeOpacity="0.8"
          />
        );
      })}

      {/* 3. Commit Node */}
      <g>
        <circle
          cx={nodeX}
          cy={midY}
          r={NODE_RADIUS + 1.5}
          fill={commit.color}
          fillOpacity="0.25"
        />
        <circle
          cx={nodeX}
          cy={midY}
          r={NODE_RADIUS}
          fill={commit.color}
          stroke="#0d1117"
          strokeWidth="1.5"
        />
        {(commit.parents.length > 1 || (commit.effectiveParents?.length ?? 0) > 1) && (
          <circle
            cx={nodeX}
            cy={midY}
            r={NODE_RADIUS - 1.5}
            fill="#0d1117"
          />
        )}
      </g>
    </svg>
  );
};

export default GraphSVG;
