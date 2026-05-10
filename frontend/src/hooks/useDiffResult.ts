import { getReplayResult } from '../api/endpoints';
import { useAsyncResource } from './useAsyncResource';

export function useDiffResult(sessionId: string, resultId: string) {
  return useAsyncResource(() => getReplayResult(sessionId, resultId), [sessionId, resultId]);
}
