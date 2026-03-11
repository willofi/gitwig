export interface GitActionError {
  type: 'worktree-overwrite' | 'generic';
  message: string;
  files: string[];
}

function extractOverwriteFiles(message: string): string[] {
  const match = message.match(/overwritten by (?:checkout|merge):([\s\S]*?)Please commit/i);
  if (!match) return [];

  return match[1]
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !line.endsWith(':'));
}

export function mapGitActionError(error: unknown): GitActionError {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const files = extractOverwriteFiles(message);

  if (files.length > 0) {
    return {
      type: 'worktree-overwrite',
      message,
      files,
    };
  }

  return {
    type: 'generic',
    message,
    files: [],
  };
}
