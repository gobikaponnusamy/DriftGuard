import { getReplaySession } from '../api/endpoints';
import { useAsyncResource } from './useAsyncResource';

export function useReplaySession(sessionId: string) {
  return useAsyncResource(() => getReplaySession(sessionId), [sessionId]);
}
