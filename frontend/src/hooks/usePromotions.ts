import { listReplayPromotions } from '../api/endpoints';
import { useAsyncResource } from './useAsyncResource';

export function usePromotions(sessionId: string) {
  return useAsyncResource(() => listReplayPromotions(sessionId), [sessionId]);
}
