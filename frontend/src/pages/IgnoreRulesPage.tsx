import { FormEvent, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { Button, Input, Select } from '../components/forms';
import { IconButton } from '../components/IconButton';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { ErrorBlock, LoadingBlock, EmptyBlock } from '../components/StateBlock';
import { useIgnoreRules } from '../hooks/useIgnoreRules';
import type { IgnoreRuleType } from '../types/api';

export function IgnoreRulesPage() {
  const { serviceId = '' } = useParams();
  const { data = [], isLoading, error, add, remove } = useIgnoreRules(serviceId);
  const [fieldPath, setFieldPath] = useState('$.timestamp');
  const [ruleType, setRuleType] = useState<IgnoreRuleType>('IGNORE');
  const [formError, setFormError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError('');
    try {
      await add(fieldPath, ruleType);
      setFieldPath('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to add rule');
    }
  }

  return (
    <>
      <PageHeader title="Ignore rules" />
      <div className="space-y-3 p-4">
        <Panel>
          <form onSubmit={submit} className="grid grid-cols-[1fr_180px_80px] gap-3">
            <Input value={fieldPath} onChange={(e) => setFieldPath(e.target.value)} placeholder="$.timestamp" />
            <Select value={ruleType} onChange={(e) => setRuleType(e.target.value as IgnoreRuleType)}>
              <option value="IGNORE">IGNORE</option>
              <option value="MASK">MASK</option>
            </Select>
            <Button type="submit">+ Add</Button>
          </form>
          {formError && <p className="mt-2 text-xs text-red-300">{formError}</p>}
        </Panel>
        {isLoading && <LoadingBlock label="Loading rules" />}
        {error && <ErrorBlock message={error} />}
        {!isLoading && !error && data.length === 0 && <EmptyBlock message="No ignore rules configured." />}
        {data.length > 0 && (
          <Panel>
            <div className="space-y-1">
              {data.map((rule) => (
                <div key={rule.id} className="grid grid-cols-[minmax(0,1fr)_90px_40px] items-center gap-3 border-b border-[#444] py-2 text-xs last:border-0">
                  <span className="font-bold">{rule.fieldPath}</span>
                  <span className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-bold ${rule.ruleType === 'MASK' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-700'}`}>{rule.ruleType}</span>
                  <IconButton label="Delete rule" onClick={() => void remove(rule.id)}>
                    <Trash2 className="h-4 w-4 text-red-300" />
                  </IconButton>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </div>
    </>
  );
}
