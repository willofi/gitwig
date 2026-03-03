import React from 'react';
import { Commit } from '@/types/git.types';

interface GraphCanvasProps {
  commits: Commit[];
  currentIndex: number;
}

const COLORS = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#a855f7', // purple
  '#14b8a6', // teal
];

const LANE_WIDTH = 14; // Width between lanes
const ROW_HEIGHT = 32; // Height of a commit row
const NODE_RADIUS = 3.5;
const OFFSET_X = 14; // Initial left padding

const GraphCanvas: React.FC<GraphCanvasProps> = ({ commits, currentIndex }) => {
  const commit = commits[currentIndex];
  if (!commit) return null;

  const chars = commit.graphLines.split('');

  return (
    <svg width="100%" height={ROW_HEIGHT} className="overflow-visible" style={{ position: 'relative' }}>
      {chars.map((char, i) => {
        const x = i * LANE_WIDTH + OFFSET_X;
        const color = COLORS[i % COLORS.length];

        // Vertical Line (|) or Commit Node (*)
        if (char === '|' || char === '*') {
          return (
            <g key={i}>
              <line
                x1={x}
                y1={0}
                x2={x}
                y2={ROW_HEIGHT}
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeOpacity="0.7"
              />
              {char === '*' && (
                <g>
                  {/* Outer glow ring */}
                  <circle
                    cx={x}
                    cy={ROW_HEIGHT / 2}
                    r={NODE_RADIUS + 2}
                    fill={color}
                    fillOpacity="0.3"
                  />
                  {/* Core node */}
                  <circle
                    cx={x}
                    cy={ROW_HEIGHT / 2}
                    r={NODE_RADIUS}
                    fill={color}
                    stroke="#1e1e1e"
                    strokeWidth="1.5"
                  />
                </g>
              )}
            </g>
          );
        }

        // Branching Out (\) - Current lane to Right lane
        // From (x, 0) to (x + WIDTH, HEIGHT)
        if (char === '\\') {
          const startX = x;
          const endX = x + LANE_WIDTH;
          // Cubic Bezier: Start -> Control1 -> Control2 -> End
          // C x1 y1, x2 y2, x y
          // We use vertical control points to create a smooth S-curve
          return (
            <path
              key={i}
              d={`M ${startX} 0 C ${startX} ${ROW_HEIGHT * 0.6}, ${endX} ${ROW_HEIGHT * 0.4}, ${endX} ${ROW_HEIGHT}`}
              fill="none"
              stroke={color} // Use current lane color for outgoing
              strokeWidth="2"
              strokeLinecap="round"
              strokeOpacity="0.7"
            />
          );
        }

        // Branching In (/) - Right lane to Current lane
        // From (x + WIDTH, 0) to (x, HEIGHT)
        if (char === '/') {
          const startX = x + LANE_WIDTH;
          const endX = x;
          // Use the color of the lane being merged (which is visually the next lane usually)
          // But here we rely on 'i' which is the destination lane index usually.
          // Let's use a heuristic: match the color of the incoming line.
          const incomingColor = COLORS[(i + 1) % COLORS.length]; 
          
          return (
            <path
              key={i}
              d={`M ${startX} 0 C ${startX} ${ROW_HEIGHT * 0.6}, ${endX} ${ROW_HEIGHT * 0.4}, ${endX} ${ROW_HEIGHT}`}
              fill="none"
              stroke={incomingColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeOpacity="0.7"
            />
          );
        }

        // Horizontal Connector (_)
        if (char === '_') {
          return (
            <path
               key={i}
               d={`M ${x} ${ROW_HEIGHT/2} L ${x + LANE_WIDTH} ${ROW_HEIGHT/2}`}
               stroke={color}
               strokeWidth="2"
               strokeLinecap="round"
               strokeOpacity="0.7"
            />
          );
        }

        return null;
      })}
    </svg>
  );
};

export default GraphCanvas;
