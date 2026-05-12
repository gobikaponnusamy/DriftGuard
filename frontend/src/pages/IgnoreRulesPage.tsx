import { FormEvent, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Button, Input, Select } from '../components/forms';
import { IconButton } from '../components/IconButton';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { ErrorBlock, LoadingBlock, EmptyBlock } from '../components/StateBlock';
import { useIgnoreRules } from '../hooks/useIgnoreRules';
import { useServices } from '../hooks/useServices';
import { syntheticStagingUrl } from '../config/runtimeSettings';
import type { IgnoreRule, IgnoreRuleType } from '../types/api';

export function IgnoreRulesPage() {
  const { serviceId = '' } = useParams();
  const navigate = useNavigate();
  const services = useServices();
  const { data = [], isLoading, error, add, remove } = useIgnoreRules(serviceId);
  const [fieldPath, setFieldPath] = useState('$.timestamp');
  const [ruleType, setRuleType] = useState<IgnoreRuleType>('IGNORE');
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<IgnoreRule>();
  const [isDeleting, setDeleting] = useState(false);

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

  async function confirmDelete(rule: IgnoreRule) {
    setDeleting(true);
    try {
      await remove(rule.id);
      setDeleteTarget(undefined);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader title="Ignore rules" />
      <div className="space-y-3 p-4">
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold">Service settings</div>
              <div className="mt-1 text-xs text-slate-400">Generated staging URL: {serviceId ? syntheticStagingUrl(serviceId) : '-'}</div>
            </div>
            <select
              className="h-9 rounded-md border border-[#59615b] bg-[#151815] px-3 text-xs font-semibold text-slate-100 outline-none"
              value={serviceId}
              onChange={(event) => navigate(`/services/${event.target.value}/ignore-rules`)}
            >
              {(services.data ?? []).map((service) => (
                <option key={service.id} value={service.id}>{service.name}</option>
              ))}
            </select>
          </div>
        </Panel>
        <Panel>
          <div className="mb-4">
            <div className="text-sm font-bold">Normalize expected noise before diffing</div>
            <p className="mt-1 text-xs text-slate-400">
              Use rules for timestamps, generated IDs, request IDs, and other values that legitimately change between production and staging.
            </p>
          </div>
          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <RuleExplainer title="IGNORE" body="Skips this field completely. Use for timestamps, nonces, trace IDs, and generated metadata." />
            <RuleExplainer title="MASK" body="Compares structure while hiding the value. Use when a field exists but the exact value is not important." />
          </div>
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
        {!isLoading && !error && data.length === 0 && <EmptyBlock message="No ignore rules configured. Add $.timestamp or $.requestId to remove expected noise from diffs." />}
        {data.length > 0 && (
          <Panel>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-bold">Active normalization rules</div>
              <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-bold text-slate-400">{data.length} rules</span>
            </div>
            <div className="space-y-1">
              {data.map((rule) => (
                <div key={rule.id} className="grid grid-cols-[minmax(0,1fr)_90px_40px] items-center gap-3 border-b border-[#444] py-2 text-xs last:border-0">
                  <span className="font-bold">{rule.fieldPath}</span>
                  <span className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-bold ${rule.ruleType === 'MASK' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-700'}`}>{rule.ruleType}</span>
                  <IconButton label="Delete rule" onClick={() => setDeleteTarget(rule)}>
                    <Trash2 className="h-4 w-4 text-red-300" />
                  </IconButton>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </div>
      {deleteTarget && (
        <ConfirmDialog
          title="Delete ignore rule"
          message={`This will remove the ${deleteTarget.ruleType} rule for ${deleteTarget.fieldPath}. Future diffs may start reporting this field again.`}
          confirmLabel="Delete rule"
          isWorking={isDeleting}
          onCancel={() => setDeleteTarget(undefined)}
          onConfirm={() => void confirmDelete(deleteTarget)}
        />
      )}
    </>
  );
}

function RuleExplainer({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs">
      <div className="font-bold text-slate-100">{title}</div>
      <p className="mt-1 leading-5 text-slate-400">{body}</p>
    </div>
  );
}
