export type DiffLineType = 'add' | 'del' | 'context' | 'hunk' | 'file-header';

export interface DiffLine {
  type: DiffLineType;
  content: string;
  oldNo: number | null;
  newNo: number | null;
}

export interface SplitSide {
  lineNo: number | null;
  content: string;
  type: 'add' | 'del' | 'context' | 'empty';
}

export interface SplitRow {
  key: string;
  isSpanning: boolean;
  spanContent?: string;
  spanType?: 'file-header' | 'hunk';
  left?: SplitSide;
  right?: SplitSide;
}

export function parseUnifiedDiff(raw: string): DiffLine[] {
  const result: DiffLine[] = [];
  let oldNo = 0;
  let newNo = 0;

  for (const line of raw.split('\n')) {
    if (
      line.startsWith('diff ') ||
      line.startsWith('index ') ||
      line.startsWith('new file') ||
      line.startsWith('deleted file') ||
      line.startsWith('Binary') ||
      line.startsWith('--- ') ||
      line.startsWith('+++ ')
    ) {
      result.push({ type: 'file-header', content: line, oldNo: null, newNo: null });
      continue;
    }

    if (line.startsWith('@@')) {
      const m = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (m) {
        oldNo = parseInt(m[1], 10) - 1;
        newNo = parseInt(m[2], 10) - 1;
      }
      result.push({ type: 'hunk', content: line, oldNo: null, newNo: null });
      continue;
    }

    if (line.startsWith('+')) {
      newNo++;
      result.push({ type: 'add', content: line.slice(1), oldNo: null, newNo });
      continue;
    }

    if (line.startsWith('-')) {
      oldNo++;
      result.push({ type: 'del', content: line.slice(1), oldNo, newNo: null });
      continue;
    }

    oldNo++;
    newNo++;
    result.push({ type: 'context', content: line.length > 0 ? line.slice(1) : '', oldNo, newNo });
  }

  return result;
}

export function buildSplitRows(raw: string): SplitRow[] {
  const unified = parseUnifiedDiff(raw);
  const rows: SplitRow[] = [];
  let keyIndex = 0;
  let i = 0;

  while (i < unified.length) {
    const line = unified[i];

    if (line.type === 'file-header' || line.type === 'hunk') {
      rows.push({
        key: String(keyIndex++),
        isSpanning: true,
        spanContent: line.content,
        spanType: line.type,
      });
      i++;
      continue;
    }

    if (line.type === 'context') {
      rows.push({
        key: String(keyIndex++),
        isSpanning: false,
        left: { lineNo: line.oldNo, content: line.content, type: 'context' },
        right: { lineNo: line.newNo, content: line.content, type: 'context' },
      });
      i++;
      continue;
    }

    const dels: DiffLine[] = [];
    const adds: DiffLine[] = [];

    while (i < unified.length && (unified[i].type === 'del' || unified[i].type === 'add')) {
      if (unified[i].type === 'del') {
        dels.push(unified[i]);
      } else {
        adds.push(unified[i]);
      }
      i++;
    }

    const maxLen = Math.max(dels.length, adds.length);
    for (let j = 0; j < maxLen; j++) {
      const del = dels[j];
      const add = adds[j];
      rows.push({
        key: String(keyIndex++),
        isSpanning: false,
        left: del
          ? { lineNo: del.oldNo, content: del.content, type: 'del' }
          : { lineNo: null, content: '', type: 'empty' },
        right: add
          ? { lineNo: add.newNo, content: add.content, type: 'add' }
          : { lineNo: null, content: '', type: 'empty' },
      });
    }
  }

  return rows;
}
