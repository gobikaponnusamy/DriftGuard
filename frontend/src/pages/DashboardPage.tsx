import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getTimeline, listBaselines, runDemoCapture, runDemoReplay, runDemoScenario, triggerReplay } from '../api/endpoints';
import { Button, Input } from '../components/forms';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { StatusPill } from '../components/StatusPill';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../components/StateBlock';
import { getRuntimeSettings } from '../config/runtimeSettings';
import { useServices } from '../hooks/useServices';
import type { RegisteredService } from '../types/api';

export function DashboardPage() {
  const { data: services = [], isLoading, error, reload } = useServices();
  const [stats, setStats] = useState<Record<string, ServiceStats>>({});
  const [replayService, setReplayService] = useState<RegisteredService>();
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const totals = Object.values(stats).reduce((acc, stat) => ({
    services: services.length,
    baselines: acc.baselines + stat.baselines,
    replays: acc.replays + stat.replays,
    breaking: acc.breaking + stat.breaking,
  }), { services: services.length, baselines: 0, replays: 0, breaking: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      const entries = await Promise.all(services.map(async (service) => {
        const [baselines, timeline] = await Promise.all([
          listBaselines(service.id, 0, 1),
          getTimeline(service.id),
        ]);
        const latest = timeline.at(-1);
        return [service.id, {
          baselines: baselines.totalElements,
          replays: timeline.length,
          breaking: timeline.reduce((sum, point) => sum + point.breaking, 0),
          warning: latest?.warning ?? 0,
          performance: latest?.performance ?? 0,
          latestBreaking: latest?.breaking ?? 0,
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

  async function replay(service: RegisteredService) {
    setActionError('');
    setActionMessage('');
    try {
      const session = await runDemoReplay(service.id);
      navigate(`/replay/${session.id}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Demo replay failed');
    }
  }

  async function runScenario(service: RegisteredService) {
    setActionError('');
    setActionMessage('');
    try {
      const run = await runDemoScenario(service.id);
      setActionMessage(`Captured ${run.capturedCount} baselines and started replay against ${run.stagingUrl}`);
      navigate(`/replay/${run.sessionId}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Demo run failed');
    }
  }

  return (
    <>
      <PageHeader title="Dashboard" />
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Services" value={totals.services} />
          <Metric label="Baselines captured" value={totals.baselines} />
          <Metric label="Replays run" value={totals.replays} />
          <Metric label="Breaking drifts" value={totals.breaking} tone="red" />
        </div>
        {isLoading && <LoadingBlock label="Loading services" />}
        {error && <ErrorBlock message={error} />}
        {actionError && <ErrorBlock message={actionError} />}
        {actionMessage && <div className="rounded-md border border-lime-500/50 bg-lime-950/30 p-3 text-xs text-lime-200">{actionMessage}</div>}
        {!isLoading && !error && services.length === 0 && <EmptyBlock message="No services registered yet." />}
        <div className="space-y-2">
          {services.map((service) => (
            <ServiceRow
              key={service.id}
              service={service}
              stats={stats[service.id]}
              onCapture={() => void capture(service)}
              onDemoReplay={() => void replay(service)}
              onRunDemo={() => void runScenario(service)}
              onReplay={() => setReplayService(service)}
            />
          ))}
        </div>
      </div>
      {replayService && <ReplayModal service={replayService} onClose={() => setReplayService(undefined)} />}
    </>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: 'red' }) {
  return (
    <Panel>
      <div className={`text-xs font-bold ${tone === 'red' ? 'text-red-400' : 'text-slate-200'}`}>{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </Panel>
  );
}

interface ServiceStats {
  baselines: number;
  replays: number;
  breaking: number;
  warning: number;
  performance: number;
  latestBreaking: number;
}

function ServiceRow({ service, stats, onCapture, onDemoReplay, onRunDemo, onReplay }: {
  service: RegisteredService;
  stats?: ServiceStats;
  onCapture: () => void;
  onDemoReplay: () => void;
  onRunDemo: () => void;
  onReplay: () => void;
}) {
  const driftLabel = stats?.latestBreaking
    ? `${stats.latestBreaking} breaking`
    : stats?.warning
      ? `${stats.warning} warnings`
      : stats?.performance
        ? `${stats.performance} perf`
        : 'No drift';
  return (
    <Panel>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold">{service.name}</div>
          <div className="text-xs text-slate-400">
            {stats?.baselines ?? 0} baselines | {stats?.replays ?? 0} replays | Created {new Date(service.createdAt).toLocaleString()}
          </div>
        </div>
        <StatusPill label={driftLabel} tone={stats?.latestBreaking ? 'red' : 'green'} />
        <div className="flex gap-2">
          <Button onClick={onRunDemo} className="bg-indigo-950/50">Run demo</Button>
          <Button onClick={onCapture}>Capture</Button>
          <Button onClick={onDemoReplay}>Demo replay</Button>
          <Button onClick={onReplay}>Replay</Button>
          <Link className="rounded-md border border-[#777] px-3 py-2 text-xs font-bold" to={`/services/${service.id}/baselines`}>Baselines</Link>
          <Link className="rounded-md border border-[#777] px-3 py-2 text-xs font-bold" to={`/services/${service.id}/reports`}>Reports</Link>
        </div>
      </div>
    </Panel>
  );
}

function ReplayModal({ service, onClose }: { service: RegisteredService; onClose: () => void }) {
  const [stagingUrl, setStagingUrl] = useState(() => getRuntimeSettings().defaultStagingUrl || service.baseUrl);
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
