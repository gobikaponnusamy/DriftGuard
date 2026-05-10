import { useCallback } from 'react';
import { addRedactionRule, deleteRedactionRule, listRedactionRules } from '../api/endpoints';
import type { RedactionRuleType } from '../types/api';
import { useAsyncResource } from './useAsyncResource';

export function useRedactionRules(serviceId: string) {
  const resource = useAsyncResource(() => listRedactionRules(serviceId), [serviceId]);

  const add = useCallback(async (fieldPath: string, ruleType: RedactionRuleType) => {
    await addRedactionRule(serviceId, { fieldPath, ruleType });
    await resource.reload();
  }, [resource.reload, serviceId]);

  const remove = useCallback(async (ruleId: string) => {
    await deleteRedactionRule(serviceId, ruleId);
    await resource.reload();
  }, [resource.reload, serviceId]);

  return { ...resource, add, remove };
}
