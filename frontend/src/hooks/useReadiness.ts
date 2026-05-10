import { getReadiness } from '../api/endpoints';
import type { ReleaseReadiness } from '../types/api';
import { useAsyncResource } from './useAsyncResource';

export function useReadiness(serviceId: string) {
  return useAsyncResource<ReleaseReadiness | undefined>(
    () => serviceId ? getReadiness(serviceId) : Promise.resolve(undefined),
    [serviceId],
  );
}
