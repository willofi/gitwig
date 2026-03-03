export interface ConflictHunk {
  ours: string;
  theirs: string;
  common?: string;
}

export function parseConflict(content: string) {
  const lines = content.split('\n');
  const result: (string | ConflictHunk)[] = [];
  
  let currentHunk: Partial<ConflictHunk> | null = null;
  let mode: 'ours' | 'theirs' | 'common' | null = null;
  
  for (const line of lines) {
    if (line.startsWith('<<<<<<<')) {
      currentHunk = { ours: '', theirs: '' };
      mode = 'ours';
    } else if (line.startsWith('=======')) {
      mode = 'theirs';
    } else if (line.startsWith('>>>>>>>')) {
      if (currentHunk) {
        result.push(currentHunk as ConflictHunk);
      }
      currentHunk = null;
      mode = null;
    } else if (mode === 'ours') {
      currentHunk!.ours += line + '\n';
    } else if (mode === 'theirs') {
      currentHunk!.theirs += line + '\n';
    } else if (mode === null) {
      result.push(line + '\n');
    }
  }
  
  return result;
}
