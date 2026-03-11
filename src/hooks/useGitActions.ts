import { useCallback } from 'react';
import { useRepoStore } from '@/store/repoStore';

export function useGitActions() {
  const addGitLog = useRepoStore(state => state.addGitLog);
  const updateGitLog = useRepoStore(state => state.updateGitLog);

  const runWithLog = useCallback(async <T>(command: string, action: () => Promise<T>): Promise<T> => {
    const logId = addGitLog({ command, status: 'pending' });
    const startTime = Date.now();

    try {
      const result = await action();
      updateGitLog(logId, { status: 'success', duration: Date.now() - startTime });
      return result;
    } catch (error: any) {
      updateGitLog(logId, {
        status: 'error',
        error: error?.message || 'Action failed',
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }, [addGitLog, updateGitLog]);

  return { runWithLog };
}
