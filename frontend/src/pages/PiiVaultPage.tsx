import { FormEvent, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, Trash2 } from 'lucide-react';
import { Button, Input, Select } from '../components/forms';
import { IconButton } from '../components/IconButton';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../components/StateBlock';
import { useRedactionRules } from '../hooks/useRedactionRules';
import type { RedactionRuleType } from '../types/api';

export function PiiVaultPage() {
  const { serviceId = '' } = useParams();
  const { data = [], isLoading, error, add, remove } = useRedactionRules(serviceId);
  const [fieldPath, setFieldPath] = useState('$.customer.email');
  const [ruleType, setRuleType] = useState<RedactionRuleType>('HASH');
  const [formError, setFormError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError('');
    try {
      await add(fieldPath, ruleType);
      setFieldPath('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to add redaction rule');
    }
  }

  return (
    <>
      <PageHeader title="PII Redaction Vault" />
      <div className="space-y-3 p-4">
        <Panel>
          <div className="mb-3 flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-cyan-300" />
            <div>
              <div className="text-sm font-bold">Production traffic is redacted before storage</div>
              <p className="mt-1 text-xs text-slate-300">
                Rules apply to captured headers, request bodies, response bodies, and replayed responses before they are written to Postgres.
              </p>
            </div>
          </div>
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-[1fr_180px_90px]">
            <Input value={fieldPath} onChange={(e) => setFieldPath(e.target.value)} placeholder="$.payment.cardNumber" />
            <Select value={ruleType} onChange={(e) => setRuleType(e.target.value as RedactionRuleType)}>
              <option value="REDACT">REDACT</option>
              <option value="HASH">HASH</option>
              <option value="DROP">DROP</option>
            </Select>
            <Button type="submit">Add</Button>
          </form>
          {formError && <p className="mt-2 text-xs text-red-300">{formError}</p>}
        </Panel>

        <div className="grid gap-3 md:grid-cols-3">
          <Example label="Email" path="$.customer.email" action="HASH keeps comparisons stable without storing the value." />
          <Example label="Card" path="$.payment.cardNumber" action="REDACT replaces the value with [REDACTED]." />
          <Example label="Token" path="$.authorization" action="DROP or REDACT prevents secret storage." />
        </div>

        {isLoading && <LoadingBlock label="Loading redaction rules" />}
        {error && <ErrorBlock message={error} />}
        {!isLoading && !error && data.length === 0 && <EmptyBlock message="No PII redaction rules configured." />}
        {data.length > 0 && (
          <Panel>
            <div className="space-y-1">
              {data.map((rule) => (
                <div key={rule.id} className="grid grid-cols-[minmax(0,1fr)_90px_40px] items-center gap-3 border-b border-[#444] py-2 text-xs last:border-0">
                  <span className="font-bold">{rule.fieldPath}</span>
                  <span className={badge(rule.ruleType)}>{rule.ruleType}</span>
                  <IconButton label="Delete redaction rule" onClick={() => void remove(rule.id)}>
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

function Example({ label, path, action }: { label: string; path: string; action: string }) {
  return (
    <Panel>
      <div className="text-xs font-bold text-cyan-200">{label}</div>
      <code className="mt-2 block text-xs text-slate-100">{path}</code>
      <p className="mt-2 text-xs text-slate-400">{action}</p>
    </Panel>
  );
}

function badge(type: RedactionRuleType) {
  const tones = {
    REDACT: 'bg-red-100 text-red-700',
    HASH: 'bg-cyan-100 text-cyan-800',
    DROP: 'bg-amber-100 text-amber-800',
  };
  return `w-fit rounded-full px-2 py-0.5 text-[10px] font-bold ${tones[type]}`;
}
