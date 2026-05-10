import { listServices } from '../api/endpoints';
import { useAsyncResource } from './useAsyncResource';

export function useServices() {
  return useAsyncResource(() => listServices(), []);
}
