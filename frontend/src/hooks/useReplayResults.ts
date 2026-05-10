import { listReplayResults } from '../api/endpoints';
import { useAsyncResource } from './useAsyncResource';

export function useReplayResults(sessionId: string) {
  return useAsyncResource(() => listReplayResults(sessionId), [sessionId]);
}
