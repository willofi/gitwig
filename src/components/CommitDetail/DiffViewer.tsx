import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface DiffViewerProps {
  diff: string;
  fileName?: string;
}

type LineType = 'add' | 'del' | 'context' | 'hunk' | 'file-header';

interface DiffLine {
  type: LineType;
  content: string;
  oldNo: number | null;
  newNo: number | null;
}

function parseDiff(raw: string): DiffLine[] {
  const result: DiffLine[] = [];
  let oldNo = 0;
  let newNo = 0;

  for (const line of raw.split('\n')) {
    if (
      line.startsWith('diff ') || line.startsWith('index ') ||
      line.startsWith('new file') || line.startsWith('deleted file') ||
      line.startsWith('Binary') || line.startsWith('--- ') || line.startsWith('+++ ')
    ) {
      result.push({ type: 'file-header', content: line, oldNo: null, newNo: null });
    } else if (line.startsWith('@@')) {
      const m = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (m) {
        oldNo = parseInt(m[1]) - 1;
        newNo = parseInt(m[2]) - 1;
      }
      result.push({ type: 'hunk', content: line, oldNo: null, newNo: null });
    } else if (line.startsWith('+')) {
      newNo++;
      result.push({ type: 'add', content: line.slice(1), oldNo: null, newNo });
    } else if (line.startsWith('-')) {
      oldNo++;
      result.push({ type: 'del', content: line.slice(1), oldNo, newNo: null });
    } else {
      // context line (starts with ' ' or empty at end)
      oldNo++;
      newNo++;
      result.push({ type: 'context', content: line.length > 0 ? line.slice(1) : '', oldNo, newNo });
    }
  }

  return result;
}

function getDiffStats(lines: DiffLine[]) {
  const adds = lines.filter(l => l.type === 'add').length;
  const dels = lines.filter(l => l.type === 'del').length;
  return { adds, dels };
}

// ─── Theme tokens ─────────────────────────────────────────────────────────────
// 라이트 모드 지원 시 이 값들을 CSS 변수나 props로 교체하면 됩니다.
const THEME = {
  dark: {
    bg:           '#0d1117',
    fileBg:       '#161b22',
    fileBorder:   '#30363d',
    hunkBg:       '#1c2128',
    hunkText:     '#79c0ff',
    addBg:        '#0d2811',
    addNumBg:     '#071d07',
    addText:      '#aff5b4',
    addMarker:    '#3fb950',
    delBg:        '#2d1014',
    delNumBg:     '#1b0c0e',
    delText:      '#ff8182',
    delMarker:    '#f85149',
    contextText:  '#e6edf3',
    lineNumText:  '#484f58',
    lineNumBorder:'#30363d',
    fileHeaderText:'#8b949e',
  },
  // 라이트 모드 (향후 구현)
  light: {
    bg:           '#ffffff',
    fileBg:       '#f6f8fa',
    fileBorder:   '#d0d7de',
    hunkBg:       '#ddf4ff',
    hunkText:     '#0550ae',
    addBg:        '#e6ffec',
    addNumBg:     '#ccffd8',
    addText:      '#24292f',
    addMarker:    '#1a7f37',
    delBg:        '#ffebe9',
    delNumBg:     '#ffd7d5',
    delText:      '#24292f',
    delMarker:    '#cf222e',
    contextText:  '#24292f',
    lineNumText:  '#6e7781',
    lineNumBorder:'#d0d7de',
    fileHeaderText:'#57606a',
  },
} as const;

const DiffViewer: React.FC<DiffViewerProps> = ({ diff, fileName }) => {
  const { isDark } = useTheme();
  const t = isDark ? THEME.dark : THEME.light;
  if (!diff || !diff.trim()) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center gap-2"
        style={{ background: t.bg, color: t.lineNumText }}
      >
        <span className="text-sm italic">변경 내용 없음</span>
      </div>
    );
  }

  const lines = parseDiff(diff);
  const { adds, dels } = getDiffStats(lines);

  return (
    <div
      className="h-full flex flex-col font-mono text-[12px] overflow-hidden"
      style={{ background: t.bg, color: t.contextText }}
    >
      {/* ── 파일 헤더 바 ─────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 py-[7px] sticky top-0 z-10 border-b"
        style={{ background: t.fileBg, borderColor: t.fileBorder }}
      >
        {fileName && (
          <span className="text-[11px] font-semibold truncate flex-1" style={{ color: t.contextText }}>
            {fileName}
          </span>
        )}
        <div className="flex items-center gap-3 shrink-0 text-[11px] font-bold">
          {adds > 0 && <span style={{ color: t.addMarker }}>+{adds}</span>}
          {dels > 0 && <span style={{ color: t.delMarker }}>−{dels}</span>}
        </div>
      </div>

      {/* ── diff 본문 ─────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <table className="border-collapse" style={{ tableLayout: 'fixed', minWidth: '100%' }}>
          <colgroup>
            {/* old line no */}
            <col style={{ width: '3.4rem' }} />
            {/* new line no */}
            <col style={{ width: '3.4rem' }} />
            {/* +/- marker */}
            <col style={{ width: '1.4rem' }} />
            {/* content */}
            <col style={{ width: 'max-content', minWidth: '40rem' }} />
          </colgroup>
          <tbody>
            {lines.map((line, idx) => {
              /* ── 파일 헤더 라인 (diff/index/---/+++) ─── */
              if (line.type === 'file-header') {
                return (
                  <tr key={idx} style={{ background: t.fileBg }}>
                    <td
                      colSpan={4}
                      className="px-4 py-[3px] leading-5 whitespace-pre overflow-hidden"
                      style={{ color: t.fileHeaderText }}
                    >
                      {line.content}
                    </td>
                  </tr>
                );
              }

              /* ── Hunk 헤더 (@@ ... @@) ────────────────── */
              if (line.type === 'hunk') {
                // @@ ... @@ 뒤의 컨텍스트 힌트 파싱
                const atPart = line.content.match(/^(@@ .+? @@)(.*)/);
                return (
                  <tr key={idx} style={{ background: t.hunkBg }}>
                    <td
                      colSpan={3}
                      className="py-[3px] leading-5 select-none border-r"
                      style={{ borderColor: t.lineNumBorder }}
                    />
                    <td className="px-3 py-[3px] leading-5 whitespace-pre overflow-hidden">
                      {atPart ? (
                        <>
                          <span style={{ color: t.hunkText }}>{atPart[1]}</span>
                          <span style={{ color: t.lineNumText }}>{atPart[2]}</span>
                        </>
                      ) : (
                        <span style={{ color: t.hunkText }}>{line.content}</span>
                      )}
                    </td>
                  </tr>
                );
              }

              /* ── 일반 diff 라인 ────────────────────────── */
              const isAdd = line.type === 'add';
              const isDel = line.type === 'del';

              const rowBg    = isAdd ? t.addBg    : isDel ? t.delBg    : 'transparent';
              const numBg    = isAdd ? t.addNumBg : isDel ? t.delNumBg : 'transparent';
              const textCol  = isAdd ? t.addText  : isDel ? t.delText  : t.contextText;
              const marker   = isAdd ? '+'        : isDel ? '−'        : ' ';
              const markerCol= isAdd ? t.addMarker: isDel ? t.delMarker: t.lineNumText;

              return (
                <tr key={idx} style={{ background: rowBg }}>
                  {/* old line number */}
                  <td
                    className="select-none text-right pr-3 py-[1px] leading-5 border-r align-top"
                    style={{ background: numBg, color: t.lineNumText, borderColor: t.lineNumBorder, minWidth: '3.4rem' }}
                  >
                    {line.oldNo ?? ''}
                  </td>
                  {/* new line number */}
                  <td
                    className="select-none text-right pr-3 py-[1px] leading-5 border-r align-top"
                    style={{ background: numBg, color: t.lineNumText, borderColor: t.lineNumBorder, minWidth: '3.4rem' }}
                  >
                    {line.newNo ?? ''}
                  </td>
                  {/* +/- marker */}
                  <td
                    className="select-none text-center py-[1px] leading-5 font-bold align-top border-r"
                    style={{ background: numBg, color: markerCol, borderColor: t.lineNumBorder }}
                  >
                    {marker}
                  </td>
                  {/* content */}
                  <td
                    className="py-[1px] pl-3 pr-4 leading-5 whitespace-pre align-top"
                    style={{ color: textCol }}
                  >
                    {line.content}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DiffViewer;
