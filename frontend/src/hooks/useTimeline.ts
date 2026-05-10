import { getTimeline } from '../api/endpoints';
import { useAsyncResource } from './useAsyncResource';

export function useTimeline(serviceId: string) {
  return useAsyncResource(() => getTimeline(serviceId), [serviceId]);
}
