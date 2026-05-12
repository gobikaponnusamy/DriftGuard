import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowRight, Database, Play, Radar, Server, Trash2 } from 'lucide-react';
import { deleteService, getReadiness, getReplaySession, getTimeline, listBaselines, recordBaseline, runDemoCapture, triggerReplay } from '../api/endpoints';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Button, Input } from '../components/forms';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../components/StateBlock';
import { syntheticStagingUrl } from '../config/runtimeSettings';
import { useServices } from '../hooks/useServices';
import type { ReadinessDecision, RegisteredService, ReplayStatus } from '../types/api';

export function DashboardPage() {
  const { data: services = [], isLoading, error, reload } = useServices();
  const [stats, setStats] = useState<Record<string, ServiceStats>>({});
  const [replayService, setReplayService] = useState<RegisteredService>();
  const [manageApiService, setManageApiService] = useState<RegisteredService>();
  const [deleteTarget, setDeleteTarget] = useState<RegisteredService>();
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [isDeleting, setDeleting] = useState(false);
  const totals = Object.values(stats).reduce((acc, stat) => ({
    services: services.length,
    baselines: acc.baselines + stat.baselines,
    replays: acc.replays + stat.replays,
    breaking: acc.breaking + stat.breaking,
    warning: acc.warning + stat.warning,
    performance: acc.performance + stat.performance,
  }), { services: services.length, baselines: 0, replays: 0, breaking: 0, warning: 0, performance: 0 });
  const driftRate = totals.baselines ? Math.round(((totals.breaking + totals.warning + totals.performance) / totals.baselines) * 100) : 0;
  const gateDecision = totals.breaking > 0 ? 'Block release' : totals.warning || totals.performance ? 'Review release' : 'Ready to promote';
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      const entries = await Promise.all(services.map(async (service) => {
        const [baselines, timeline, readiness] = await Promise.all([
          listBaselines(service.id, 0, 1),
          getTimeline(service.id),
          getReadiness(service.id).catch(() => undefined),
        ]);
        const latest = timeline.at(-1);
        const latestSession = readiness
          ? await getReplaySession(readiness.sessionId).catch(() => undefined)
          : latest
            ? await getReplaySession(latest.sessionId).catch(() => undefined)
            : undefined;
        return [service.id, {
          baselines: baselines.totalElements,
          requests: readiness?.totalRequests || latestSession?.totalRequests || baselines.totalElements,
          replays: timeline.length,
          breaking: timeline.reduce((sum, point) => sum + point.breaking, 0),
          warning: readiness?.warningCount ?? latest?.warning ?? 0,
          performance: readiness?.performanceCount ?? latest?.performance ?? 0,
          latestBreaking: readiness?.breakingCount ?? latest?.breaking ?? 0,
          readinessDecision: readiness?.decision,
          latestStatus: readiness?.status,
          readinessMessage: readiness?.message,
        }] as const;
      }));
      if (!cancelled) {
        setStats(Object.fromEntries(entries));
      }
    }
    if (services.length > 0) {
      void loadStats();
    }
    return () => {
      cancelled = true;
    };
  }, [services]);

  async function capture(service: RegisteredService) {
    setActionError('');
    setActionMessage('');
    try {
      const result = await runDemoCapture(service.id);
      setActionMessage(`Captured ${result.capturedCount} live baselines from ${result.productionBaseUrl}`);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Demo capture failed');
    }
  }

  async function runScenario(service: RegisteredService) {
    setActionError('');
    setActionMessage('');
    try {
      if (service.name.toLowerCase() === 'checkout-api') {
        const baselinePage = await listBaselines(service.id, 0, 1);
        if (baselinePage.totalElements === 0) {
          setActionError('checkout-api has no baselines in this environment. Add or capture API baselines before testing staging.');
          return;
        }
        const session = await triggerReplay({ serviceId: service.id, stagingUrl: syntheticStagingUrl(service.id) });
        setActionMessage(`Started checkout staging test with ${baselinePage.totalElements} saved baseline requests.`);
        navigate(`/replay/${session.id}`);
        return;
      }
      setReplayService(service);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Demo run failed');
    }
  }

  async function removeService(service: RegisteredService) {
    setActionError('');
    setActionMessage('');
    setDeleting(true);
    try {
      await deleteService(service.id);
      setActionMessage(`${service.name} deleted.`);
      setDeleteTarget(undefined);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to delete service');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader title="Dashboard" />
      <div className="space-y-5 p-6">
        <section className="glass-line animate-drift-fade-up relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d1020]/88 shadow-[0_24px_80px_rgba(0,0,0,0.30)]">
          <div className="animate-drift-glow pointer-events-none absolute -top-24 left-1/4 h-48 w-96 rounded-full bg-gradient-to-r from-indigo-400/24 via-fuchsia-400/20 to-amber-300/16 blur-3xl" />
          <div className="grid items-center gap-7 p-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/25 bg-fuchsia-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-fuchsia-100">
                <Radar className="h-3.5 w-3.5" /> Production behavior radar
              </div>
              <h2 className="mt-4 max-w-2xl text-[34px] font-black leading-[1.08] tracking-tight text-slate-50">
                Catch silent API drift before staging reaches users.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400">
                DriftGuard records real request/response behavior, replays it against staging, and turns response changes into release decisions.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric icon={Server} label="Services" value={totals.services} delay="0ms" />
              <Metric icon={Database} label="Baselines" value={totals.baselines} delay="60ms" />
              <Metric icon={Activity} label="Replays" value={totals.replays} delay="120ms" />
              <Metric icon={AlertTriangle} label="Breaking drift" value={totals.breaking} tone="red" delay="180ms" />
            </div>
          </div>
          <div className="grid border-t border-white/10 bg-white/[0.03] text-xs text-slate-300 md:grid-cols-3">
            <PipelineStep label="1. Record behavior" value="Capture production traffic as baselines" />
            <PipelineStep label="2. Test staging" value="Replay the same requests against a new build" />
            <PipelineStep label="3. Gate release" value="Review drift, accept changes, or block deploy" />
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-50">Service inventory</h2>
            <p className="mt-1 text-xs text-slate-500">Each service owns baselines, replay history, ignore rules, and release readiness.</p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-slate-300">
            {services.length} registered
          </div>
        </div>

        <section className="grid gap-3 lg:grid-cols-3">
          <DecisionTile label="Replay coverage" value={`${totals.baselines} baselines`} detail={`${totals.services} services under watch`} />
          <DecisionTile label="Drift rate" value={`${driftRate}%`} detail={`${totals.breaking + totals.warning + totals.performance} changes across replay history`} />
          <DecisionTile label="Gate recommendation" value={gateDecision} detail="Derived from current breaking, warning, and performance drift" alert={totals.breaking > 0} />
        </section>

        {isLoading && <LoadingBlock label="Loading services" />}
        {error && <ErrorBlock message={error} />}
        {actionError && <ErrorBlock message={actionError} />}
        {actionMessage && <div className="rounded-xl border border-lime-400/30 bg-lime-400/10 p-3 text-xs font-semibold text-lime-100">{actionMessage}</div>}
        {!isLoading && !error && services.length === 0 && <EmptyBlock message="No services registered yet." />}
        <div className="grid gap-4 xl:grid-cols-2">
          {services.map((service) => (
            <ServiceRow
              key={service.id}
              service={service}
              stats={stats[service.id]}
              onCapture={() => void capture(service)}
              onRunDemo={() => void runScenario(service)}
              onReplay={() => setReplayService(service)}
              onManageApis={() => setManageApiService(service)}
              onDelete={() => setDeleteTarget(service)}
            />
          ))}
        </div>
      </div>
      {replayService && <ReplayModal service={replayService} onClose={() => setReplayService(undefined)} />}
      {manageApiService && <ManageApisModal service={manageApiService} onClose={() => setManageApiService(undefined)} onSaved={reload} />}
      {deleteTarget && (
        <ConfirmDialog
          title={`Delete ${deleteTarget.name}`}
          message="This will permanently remove the service, its baselines, replay sessions, replay results, ignore rules, and reports from DriftGuard."
          confirmLabel="Delete service"
          isWorking={isDeleting}
          onCancel={() => setDeleteTarget(undefined)}
          onConfirm={() => void removeService(deleteTarget)}
        />
      )}
    </>
  );
}

function DecisionTile({ label, value, detail, alert }: { label: string; value: string; detail: string; alert?: boolean }) {
  return (
    <div className={`panel-hover rounded-2xl border p-4 ${alert ? 'border-rose-300/20 bg-rose-400/10' : 'border-white/10 bg-white/[0.045]'}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className={`mt-2 text-xl font-black ${alert ? 'text-rose-100' : 'text-slate-50'}`}>{value}</div>
      <div className="mt-1 text-xs leading-5 text-slate-400">{detail}</div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone, delay }: { icon: typeof Server; label: string; value: number; tone?: 'red'; delay?: string }) {
  return (
    <div className="panel-hover animate-drift-fade-up rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.025] p-4" style={{ animationDelay: delay }}>
      <div className="flex items-center justify-between">
        <div className={`grid h-9 w-9 place-items-center rounded-xl ${tone === 'red' ? 'bg-rose-400/14 text-rose-200 shadow-[0_0_24px_rgba(251,113,133,0.16)]' : 'bg-indigo-400/14 text-indigo-100 shadow-[0_0_24px_rgba(129,140,248,0.16)]'}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className={`text-2xl font-black ${tone === 'red' ? 'text-rose-200' : 'text-slate-50'}`}>{value}</div>
      </div>
      <div className="mt-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</div>
    </div>
  );
}

function PipelineStep({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-white/10 p-4 transition hover:bg-white/[0.035] md:border-r md:last:border-r-0">
      <div className="font-black text-slate-100">{label}</div>
      <div className="mt-1 text-slate-500">{value}</div>
    </div>
  );
}

interface ServiceStats {
  baselines: number;
  requests: number;
  replays: number;
  breaking: number;
  warning: number;
  performance: number;
  latestBreaking: number;
  readinessDecision?: ReadinessDecision;
  latestStatus?: ReplayStatus;
  readinessMessage?: string;
}

function ServiceRow({ service, stats, onCapture, onRunDemo, onReplay, onManageApis, onDelete }: {
  service: RegisteredService;
  stats?: ServiceStats;
  onCapture: () => void;
  onRunDemo: () => void;
  onReplay: () => void;
  onManageApis: () => void;
  onDelete: () => void;
}) {
  const isDemoService = service.name.toLowerCase() === 'checkout-api';
  const blocked = stats?.readinessDecision === 'BLOCKED' || Boolean(stats?.latestBreaking);
  const driftLabel = !stats
    ? 'Loading'
    : stats.baselines === 0
      ? 'No baselines'
      : stats.readinessDecision === 'BLOCKED'
    ? 'Blocked'
    : stats?.readinessDecision === 'PENDING'
      ? 'Pending'
      : stats?.readinessDecision === 'NEEDS_REVIEW'
        ? 'Needs review'
      : stats?.latestBreaking
    ? `${stats.latestBreaking} breaking`
    : stats?.warning
      ? `${stats.warning} warnings`
      : stats?.performance
        ? `${stats.performance} perf`
        : 'Ready';
  const pillTone = !stats || stats.baselines === 0
    ? 'muted'
    : blocked
      ? 'red'
      : stats.readinessDecision === 'PENDING' || stats.readinessDecision === 'NEEDS_REVIEW'
        ? 'blue'
        : 'green';
  return (
    <div className="panel-hover animate-drift-fade-up rounded-xl border border-white/10 bg-gradient-to-br from-[#11162a]/90 to-[#090a13]/92 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.30)] backdrop-blur-xl">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-indigo-300/25 bg-indigo-300/10 shadow-[0_0_24px_rgba(129,140,248,0.14)]">
                <Server className="h-4 w-4 text-indigo-100" />
              </span>
              <div className="min-w-0">
                <div className="truncate text-base font-black text-slate-50">{service.name}</div>
                <div className="mt-1 truncate text-xs text-slate-500">{service.baseUrl}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${service.replayAuthConfigured ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100' : 'border-white/10 bg-white/[0.04] text-slate-500'}`}>
                    Replay auth {service.replayAuthConfigured ? service.replayAuthType.replace(/_/g, ' ').toLowerCase() : 'not configured'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <StatusPill label={driftLabel} tone={pillTone} />
        </div>

        <div className="grid grid-cols-4 gap-2">
          <MiniMetric label="Requests" value={stats?.requests ?? stats?.baselines ?? 0} />
          <MiniMetric label="Baselines" value={stats?.baselines ?? 0} />
          <MiniMetric label="Replay runs" value={stats?.replays ?? 0} />
          <MiniMetric label="Breaking" value={stats?.latestBreaking ?? 0} danger={Boolean(stats?.latestBreaking)} />
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span title={stats?.readinessMessage ?? 'Estimated readiness from replay activity and current drift severity. Red means blocking drift remains.'}>Release readiness path</span>
            <span>Created {new Date(service.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#05070a]">
            <div
              className={`h-full rounded-full ${blocked ? 'bg-gradient-to-r from-red-500 to-rose-300' : 'bg-gradient-to-r from-emerald-500 to-lime-300'}`}
              style={{ width: `${Math.min(100, 30 + (stats?.replays ?? 0) * 18)}%` }}
            />
          </div>
          <div className="mt-2 flex items-center gap-3 text-[10px] font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1"><i className="h-1.5 w-5 rounded-full bg-gradient-to-r from-emerald-500 to-lime-300" /> healthy/reviewed</span>
            <span className="inline-flex items-center gap-1"><i className="h-1.5 w-5 rounded-full bg-gradient-to-r from-red-500 to-rose-300" /> blocking drift</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={isDemoService ? onRunDemo : onReplay} title="Replay saved baselines against staging." className="border-fuchsia-300/50 bg-fuchsia-300/15 text-fuchsia-50">
            <Play className="mr-1 inline h-3.5 w-3.5" /> Test staging
          </Button>
          {isDemoService && <Button onClick={onCapture} title="Local Docker only: record responses from the mock production checkout API.">Record demo traffic</Button>}
          <Button onClick={onManageApis} title="Add new API baselines for this service. Existing APIs can be changed from Baselines.">Add APIs</Button>
          <Link className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-bold transition hover:border-fuchsia-300/60 hover:bg-white/[0.08]" to={`/services/${service.id}/baselines`}>Baselines <ArrowRight className="h-3.5 w-3.5" /></Link>
          <Link className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-bold transition hover:border-fuchsia-300/60 hover:bg-white/[0.08]" to={`/services/${service.id}/reports`}>Reports <ArrowRight className="h-3.5 w-3.5" /></Link>
          <button
            type="button"
            onClick={onDelete}
            title={`Delete ${service.name}`}
            aria-label={`Delete ${service.name}`}
            className="ml-auto inline-grid h-9 w-9 place-items-center rounded-lg border border-rose-400/30 bg-rose-400/10 text-rose-200 transition hover:border-rose-300 hover:bg-rose-400/15"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#080b10]/65 p-3">
      <div className={`text-lg font-black ${danger ? 'text-rose-200' : 'text-slate-50'}`}>{value}</div>
      <div className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</div>
    </div>
  );
}

function ReplayModal({ service, onClose }: { service: RegisteredService; onClose: () => void }) {
  const [stagingUrl, setStagingUrl] = useState(() => syntheticStagingUrl(service.id));
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const session = await triggerReplay({ serviceId: service.id, stagingUrl });
      navigate(`/replay/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start replay');
    }
  }

  return (
    <Modal title={`Trigger replay - ${service.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Input className="w-full" value={stagingUrl} onChange={(e) => setStagingUrl(e.target.value)} />
        <Button type="submit">Trigger replay</Button>
        {error && <p className="text-xs text-red-300">{error}</p>}
      </form>
    </Modal>
  );
}

function ManageApisModal({ service, onClose, onSaved }: { service: RegisteredService; onClose: () => void; onSaved: () => Promise<void> }) {
  const navigate = useNavigate();
  const [examples, setExamples] = useState('[\n  {\n    "method": "GET",\n    "path": "/products/sku_123",\n    "responseStatus": 200,\n    "responseBody": "{\\"sku\\":\\"sku_123\\",\\"available\\":true,\\"price\\":\\"49.0\\"}",\n    "responseTimeMs": 96\n  }\n]');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const parsed = parseApiExamples(examples);
      await Promise.all(parsed.map((endpoint) => recordBaseline(service.id, endpoint)));
      await onSaved();
      const session = await triggerReplay({ serviceId: service.id, stagingUrl: syntheticStagingUrl(service.id) });
      setMessage(`Added ${parsed.length} API baseline${parsed.length === 1 ? '' : 's'} and started a new replay.`);
      onClose();
      navigate(`/replay/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update APIs');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Add APIs - ${service.name}`} onClose={onClose} size="lg">
      <div className="space-y-3 text-xs">
        <p className="text-slate-400">Add new endpoint baselines. DriftGuard will immediately start a fresh replay so the new APIs appear in Live Replay.</p>
        <textarea
          className="no-scrollbar min-h-72 w-full resize-none rounded-lg border border-white/10 bg-[#090a12] px-3 py-2 font-mono text-xs font-semibold text-slate-100 outline-none focus:border-fuchsia-300"
          value={examples}
          onChange={(event) => setExamples(event.target.value)}
        />
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-slate-300">
          Generated staging URL: <span className="font-bold text-slate-100">{syntheticStagingUrl(service.id)}</span>
        </div>
        <Button onClick={() => void save()} disabled={saving}>{saving ? 'Saving and replaying...' : 'Save APIs and replay'}</Button>
        {message && <p className="rounded-xl border border-lime-400/30 bg-lime-400/10 p-3 text-lime-100">{message}</p>}
        {error && <p className="text-red-300">{error}</p>}
      </div>
    </Modal>
  );
}

function parseApiExamples(value: string) {
  const parsed = JSON.parse(value) as Array<{
    method?: string;
    path?: string;
    requestHeaders?: Record<string, unknown>;
    requestBody?: string;
    responseStatus?: number;
    responseHeaders?: Record<string, unknown>;
    responseBody?: string;
    responseTimeMs?: number;
  }>;
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('API examples must be a non-empty JSON array.');
  }
  return parsed.map((item, index) => {
    if (!item.method || !item.path || !item.responseBody) {
      throw new Error(`API example ${index + 1} needs method, path, and responseBody.`);
    }
    return {
      method: item.method.toUpperCase(),
      path: item.path.startsWith('/') ? item.path : `/${item.path}`,
      requestHeaders: item.requestHeaders ?? { 'content-type': 'application/json' },
      requestBody: item.requestBody,
      responseStatus: item.responseStatus ?? 200,
      responseHeaders: item.responseHeaders ?? { 'content-type': 'application/json' },
      responseBody: typeof item.responseBody === 'string' ? item.responseBody : JSON.stringify(item.responseBody),
      responseTimeMs: item.responseTimeMs ?? 100,
    };
  });
}
