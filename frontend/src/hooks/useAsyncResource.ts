import { useCallback, useEffect, useState } from 'react';
import type { DependencyList } from 'react';

export function useAsyncResource<T>(loader: () => Promise<T>, deps: DependencyList) {
  const [data, setData] = useState<T>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      setData(await loader());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setIsLoading(false);
    }
  }, deps);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, isLoading, error, reload };
}
