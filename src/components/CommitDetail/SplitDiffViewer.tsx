import React, { useRef, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { buildSplitRows, parseUnifiedDiff, type DiffLine, type SplitRow } from '@/utils/diffParser';

// ─── Theme tokens ─────────────────────────────────────────────────────────────

const SPLIT_THEME = {
  dark: {
    bg:             '#0d1117',
    headerBg:       '#161b22',
    headerBorder:   '#30363d',
    colLabelBg:     '#161b22',
    colLabelBorder: '#21262d',
    hunkBg:         '#1c2128',
    hunkText:       '#79c0ff',
    hunkMuted:      '#484f58',
    addBg:          '#0d2811',
    addNumBg:       '#071d07',
    addText:        '#aff5b4',
    addMarker:      '#3fb950',
    delBg:          '#2d1014',
    delNumBg:       '#1b0c0e',
    delText:        '#ff8182',
    delMarker:      '#f85149',
    contextText:    '#e6edf3',
    lineNumText:    '#484f58',
    lineNumBorder:  '#30363d',
    fileHeaderText: '#8b949e',
    divider:        '#30363d',
    emptyBg:        '#0d1117',
    titleText:      '#e6edf3',
    labelText:      '#484f58',
  },
  light: {
    bg:             '#ffffff',
    headerBg:       '#f6f8fa',
    headerBorder:   '#d0d7de',
    colLabelBg:     '#f6f8fa',
    colLabelBorder: '#eaeef2',
    hunkBg:         '#ddf4ff',
    hunkText:       '#0550ae',
    hunkMuted:      '#6e7781',
    addBg:          '#e6ffec',
    addNumBg:       '#ccffd8',
    addText:        '#24292f',
    addMarker:      '#1a7f37',
    delBg:          '#ffebe9',
    delNumBg:       '#ffd7d5',
    delText:        '#24292f',
    delMarker:      '#cf222e',
    contextText:    '#1f2328',
    lineNumText:    '#6e7781',
    lineNumBorder:  '#d0d7de',
    fileHeaderText: '#57606a',
    divider:        '#d0d7de',
    emptyBg:        '#ffffff',
    titleText:      '#1f2328',
    labelText:      '#6e7781',
  },
} as const;

function getDiffStats(lines: DiffLine[]) {
  return { adds: lines.filter(l => l.type === 'add').length, dels: lines.filter(l => l.type === 'del').length };
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SplitDiffViewerProps {
  diff: string;
  fileName?: string;
  /** Override theme — used when rendering in a separate window without ThemeContext */
  forceDark?: boolean;
  platform?: string;
}

const SplitDiffViewer: React.FC<SplitDiffViewerProps> = ({ diff, fileName, forceDark, platform }) => {
  const ctx = useTheme();
  const isDark = forceDark !== undefined ? forceDark : ctx.isDark;
  const T = isDark ? SPLIT_THEME.dark : SPLIT_THEME.light;

  const leftPanelRef  = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const isSyncingRef  = useRef(false);

  const handleLeftScroll = useCallback(() => {
    if (isSyncingRef.current || !rightPanelRef.current || !leftPanelRef.current) return;
    isSyncingRef.current = true;
    rightPanelRef.current.scrollTop = leftPanelRef.current.scrollTop;
    requestAnimationFrame(() => { isSyncingRef.current = false; });
  }, []);

  const handleRightScroll = useCallback(() => {
    if (isSyncingRef.current || !leftPanelRef.current || !rightPanelRef.current) return;
    isSyncingRef.current = true;
    leftPanelRef.current.scrollTop = rightPanelRef.current.scrollTop;
    requestAnimationFrame(() => { isSyncingRef.current = false; });
  }, []);

  if (!diff || !diff.trim()) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, color: T.lineNumText, fontFamily: 'monospace' }}>
        변경 내용 없음
      </div>
    );
  }

  const unified = parseUnifiedDiff(diff);
  const rows = buildSplitRows(diff);
  const { adds, dels } = getDiffStats(unified);

  const isMac = platform === 'darwin';
  const isWin = platform === 'win32';

  const monoFont = 'ui-monospace, "SFMono-Regular", "Cascadia Code", Consolas, monospace';

  const tableStyle: React.CSSProperties = {
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
    minWidth: '100%',
    fontFamily: monoFont,
    fontSize: 12,
  };

  // ── Sub-renderers (inline to access T) ────────────────────────────────────

  const renderSpanRow = (row: SplitRow) => {
    if (row.spanType === 'file-header') {
      return (
        <tr key={row.key} style={{ background: T.headerBg }}>
          <td colSpan={3} style={{ padding: '3px 12px', lineHeight: '20px', whiteSpace: 'pre', color: T.fileHeaderText, fontSize: 11 }}>
            {row.spanContent}
          </td>
        </tr>
      );
    }
    const atPart = row.spanContent?.match(/^(@@ .+? @@)(.*)/);
    return (
      <tr key={row.key} style={{ background: T.hunkBg }}>
        <td colSpan={2} style={{ borderRight: `1px solid ${T.lineNumBorder}`, width: '4.8rem' }} />
        <td style={{ padding: '3px 12px', lineHeight: '20px', whiteSpace: 'pre' }}>
          {atPart
            ? <><span style={{ color: T.hunkText }}>{atPart[1]}</span><span style={{ color: T.hunkMuted }}>{atPart[2]}</span></>
            : <span style={{ color: T.hunkText }}>{row.spanContent}</span>}
        </td>
      </tr>
    );
  };

  const renderSideRow = (row: SplitRow, side: 'left' | 'right') => {
    const s = side === 'left' ? row.left! : row.right!;
    const isAdd   = s.type === 'add';
    const isDel   = s.type === 'del';
    const isEmpty = s.type === 'empty';
    const rowBg     = isAdd ? T.addBg    : isDel ? T.delBg    : isEmpty ? T.emptyBg : 'transparent';
    const numBg     = isAdd ? T.addNumBg : isDel ? T.delNumBg : isEmpty ? T.emptyBg : 'transparent';
    const textCol   = isAdd ? T.addText  : isDel ? T.delText  : T.contextText;
    const marker    = isAdd ? '+'        : isDel ? '−'        : ' ';
    const markerCol = isAdd ? T.addMarker: isDel ? T.delMarker: T.lineNumText;
    return (
      <tr key={row.key} style={{ background: rowBg }}>
        <td className="select-none" style={{ background: numBg, color: T.lineNumText, borderRight: `1px solid ${T.lineNumBorder}`, textAlign: 'right', padding: '1px 8px 1px 0', lineHeight: '20px', verticalAlign: 'top', width: '3.4rem', minWidth: '3.4rem' }}>
          {s.lineNo ?? ''}
        </td>
        <td className="select-none" style={{ background: numBg, color: markerCol, fontWeight: 700, borderRight: `1px solid ${T.lineNumBorder}`, textAlign: 'center', padding: '1px 0', lineHeight: '20px', verticalAlign: 'top', width: '1.4rem', minWidth: '1.4rem' }}>
          {marker}
        </td>
        <td style={{ color: textCol, padding: '1px 16px 1px 12px', lineHeight: '20px', verticalAlign: 'top', whiteSpace: 'pre' }}>
          {s.content}
        </td>
      </tr>
    );
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: T.bg }}>

      {/* ── Title bar (platform-aware, draggable) ─────────── */}
      <div
        style={{
          height: 38, flexShrink: 0,
          display: 'flex', alignItems: 'center',
          background: T.headerBg,
          borderBottom: `1px solid ${T.headerBorder}`,
          paddingLeft:  isMac ? 80  : 12,
          paddingRight: isWin ? 140 : 12,
          WebkitAppRegion: 'drag',
          userSelect: 'none',
        } as React.CSSProperties}
      >
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <span
            style={{ color: T.titleText, fontSize: 12, fontFamily: monoFont, fontWeight: 600, maxWidth: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            title={fileName}
          >
            {fileName}
          </span>
          {(adds > 0 || dels > 0) && (
            <span style={{ fontSize: 11, fontWeight: 700, display: 'flex', gap: 8, WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
              {adds > 0 && <span style={{ color: T.addMarker }}>+{adds}</span>}
              {dels > 0 && <span style={{ color: T.delMarker }}>−{dels}</span>}
            </span>
          )}
        </div>
      </div>

      {/* ── Column labels ─────────────────────────────────── */}
      <div style={{ height: 26, flexShrink: 0, display: 'flex', background: T.colLabelBg, borderBottom: `1px solid ${T.colLabelBorder}`, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: T.labelText, userSelect: 'none', textTransform: 'uppercase' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', paddingLeft: 12, borderRight: `1px solid ${T.divider}` }}>BEFORE</div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', paddingLeft: 12 }}>AFTER</div>
      </div>

      {/* ── Split panels ──────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Left */}
        <div ref={leftPanelRef} style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', minWidth: 0 }} onScroll={handleLeftScroll}>
          <table style={tableStyle}>
            <colgroup><col style={{ width: '3.4rem' }} /><col style={{ width: '1.4rem' }} /><col /></colgroup>
            <tbody>
              {rows.map(row => row.isSpanning ? renderSpanRow(row) : renderSideRow(row, 'left'))}
            </tbody>
          </table>
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: T.divider, flexShrink: 0 }} />

        {/* Right */}
        <div ref={rightPanelRef} style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', minWidth: 0 }} onScroll={handleRightScroll}>
          <table style={tableStyle}>
            <colgroup><col style={{ width: '3.4rem' }} /><col style={{ width: '1.4rem' }} /><col /></colgroup>
            <tbody>
              {rows.map(row => row.isSpanning ? renderSpanRow(row) : renderSideRow(row, 'right'))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SplitDiffViewer;
