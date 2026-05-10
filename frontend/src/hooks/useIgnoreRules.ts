import { addIgnoreRule, deleteIgnoreRule, listIgnoreRules } from '../api/endpoints';
import type { IgnoreRuleType } from '../types/api';
import { useAsyncResource } from './useAsyncResource';

export function useIgnoreRules(serviceId: string) {
  const resource = useAsyncResource(() => listIgnoreRules(serviceId), [serviceId]);

  async function add(fieldPath: string, ruleType: IgnoreRuleType) {
    await addIgnoreRule(serviceId, { fieldPath, ruleType });
    await resource.reload();
  }

  async function remove(ruleId: string) {
    await deleteIgnoreRule(serviceId, ruleId);
    await resource.reload();
  }

  return { ...resource, add, remove };
}
