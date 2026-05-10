import { listBaselines } from '../api/endpoints';
import { useAsyncResource } from './useAsyncResource';

export function useBaselines(serviceId: string, page: number, size = 20) {
  return useAsyncResource(() => listBaselines(serviceId, page, size), [serviceId, page, size]);
}
