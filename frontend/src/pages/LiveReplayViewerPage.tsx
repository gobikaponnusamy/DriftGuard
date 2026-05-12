import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, ShieldCheck, ShieldX } from 'lucide-react';
import { getEndpointHistory, getTimeline, promoteReplaySession, triggerBaselineReplay } from '../api/endpoints';
import { DriftBadge } from '../components/DriftBadge';
import { Button, Input } from '../components/forms';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { StatusPill } from '../components/StatusPill';
import { ErrorBlock, LoadingBlock } from '../components/StateBlock';
import { usePromotions } from '../hooks/usePromotions';
import { useReplayResults } from '../hooks/useReplayResults';
import { useReplaySession } from '../hooks/useReplaySession';
import { useWebSocket } from '../hooks/useWebSocket';
import { useReadiness } from '../hooks/useReadiness';
import { useServices } from '../hooks/useServices';
import type { DriftType, EndpointHistoryPoint, ReleaseReadiness, ReplayProgressEvent } from '../types/api';
import { statusTone } from '../utils/format';

export function LiveReplayViewerPage() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const session = useReplaySession(sessionId);
  const results = useReplayResults(sessionId);
  const readiness = useReadiness(session.data?.serviceId ?? '');
  const promotions = usePromotions(sessionId);
  const services = useServices();
  const socket = useWebSocket(sessionId);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [historyEndpoint, setHistoryEndpoint] = useState<{ method: string; path: string }>();
  const [actionError, setActionError] = useState('');
  const [search, setSearch] = useState('');
  const progressEvent = socket.events.at(-1);
  const total = progressEvent?.total || session.data?.totalRequests || results.data?.length || 0;
  const progress = progressEvent?.progress || results.data?.length || 0;
  const drifted = progressEvent?.driftedCount ?? session.data?.driftedCount ?? countDrifted(results.data ?? []);
  const [sort, setSort] = useState<ReplaySort>({ key: 'path', direction: 'asc' });
  const rows = useMemo(() => mergeRows(socket.events, results.data ?? []), [socket.events, results.data]);
  const filteredRows = useMemo(() => filterReplayRows(rows, search), [rows, search]);
  const sortedRows = useMemo(() => sortReplayRows(filteredRows, sort), [filteredRows, sort]);
  const endpointRisks = useMemo(() => endpointRiskSummary(results.data ?? []), [results.data]);
  const contractSummary = useMemo(() => contractChangeSummary(results.data ?? []), [results.data]);
  const releaseImpact = useMemo(() => releaseImpactAnalysis(results.data ?? [], readiness.data), [results.data, readiness.data]);
  const latestPromotion = promotions.data?.[0];
  const isPromoted = Boolean(latestPromotion);

  useEffect(() => {
    if (sessionId || services.isLoading || !services.data?.length) {
      return;
    }
    let cancelled = false;
    async function openDefaultReplay() {
      const preferredService = services.data!.find((service) => service.name.toLowerCase() === 'checkout-api') ?? services.data![0];
      try {
        const points = await getTimeline(preferredService.id);
        const latestSession = points.at(-1)?.sessionId;
        if (!cancelled && latestSession) {
          navigate(`/replay/${latestSession}`, { replace: true });
        }
      } catch {
        // Keep the selector visible if this service has no replay history yet.
      }
    }
    void openDefaultReplay();
    return () => {
      cancelled = true;
    };
  }, [sessionId, services.isLoading, services.data, navigate]);

  useEffect(() => {
    if (!sessionId || session.data?.status === 'DONE' || session.data?.status === 'FAILED') {
      return;
    }
    const timer = window.setInterval(() => {
      void session.reload();
      void results.reload();
      void readiness.reload();
    }, 1500);
    return () => window.clearInterval(timer);
  }, [sessionId, session.data?.status, session.reload, results.reload, readiness.reload]);

  async function selectService(serviceId: string) {
    const points = await getTimeline(serviceId);
    const latestSession = points.at(-1)?.sessionId;
    if (latestSession) {
      navigate(`/replay/${latestSession}`);
    }
  }

  return (
    <>
      <PageHeader
        title="Live replay"
        actions={(
          <>
            <Button onClick={() => exportReplayReport(sessionId, session.data, results.data ?? [], readiness.data)}>
              Export report
            </Button>
            <Button onClick={() => setPromoteOpen(true)} disabled={session.data?.status !== 'DONE' || isPromoted}>
              {isPromoted ? 'Baseline accepted' : 'Accept staging as baseline'}
            </Button>
            <StatusPill label={session.data?.status ?? (socket.isConnected ? 'RUNNING' : 'PENDING')} tone={statusTone(session.data?.status)} />
          </>
        )}
      />
      <div className="space-y-3 p-4">
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold">Replay workspace</div>
              <div className="mt-1 text-xs text-slate-400">Pick a service to open its latest replay session.</div>
            </div>
            <select
              className="h-9 rounded-md border border-[#59615b] bg-[#151815] px-3 text-xs font-semibold text-slate-100 outline-none"
              value={session.data?.serviceId ?? ''}
              onChange={(event) => void selectService(event.target.value)}
            >
              <option value="" disabled>Select service</option>
              {(services.data ?? []).map((service) => (
                <option key={service.id} value={service.id}>{service.name}</option>
              ))}
            </select>
          </div>
        </Panel>
        {session.isLoading && <LoadingBlock label="Loading replay session" />}
        {session.error && <ErrorBlock message={session.error} />}
        {socket.error && <ErrorBlock message={socket.error} />}
        {actionError && <ErrorBlock message={actionError} />}
        {readiness.data && readiness.data.sessionId === sessionId && (
          <ReadinessCard readiness={readiness.data} />
        )}
        {latestPromotion && (
          <Panel>
            <div className="mb-2 text-sm font-bold">Accepted baseline record</div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-md border border-[#3f473f] bg-[#151815] p-3">
                <span>{latestPromotion.promotedCount} staging responses accepted by <b>{latestPromotion.promotedBy}</b></span>
                <span className="text-slate-400">{new Date(latestPromotion.promotedAt).toLocaleString()}</span>
              </div>
            </div>
          </Panel>
        )}
        {session.data && (
          <Panel>
            <div className="mb-2 flex justify-between text-xs">
              <span>Staging: {session.data.stagingUrl}</span>
              <b>{progress} / {total} requests</b>
            </div>
            <div className="h-2 rounded bg-[#1b1d1b]"><div className="h-2 rounded bg-indigo-500" style={{ width: `${total ? (progress / total) * 100 : 0}%` }} /></div>
            <div className="mt-3 grid grid-cols-4 gap-3">
              <Summary label="Breaking" value={count(results.data, 'BREAKING')} />
              <Summary label="Warning" value={count(results.data, 'WARNING')} />
              <Summary label="Perf" value={count(results.data, 'PERFORMANCE')} />
              <Summary label="None" value={count(results.data, 'NONE')} />
            </div>
          </Panel>
        )}
        {readiness.data && readiness.data.sessionId === sessionId && (
          <ReleaseGateSimulator readiness={readiness.data} />
        )}
        {results.data && results.data.length > 0 && (
          <Panel>
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-bold">Release impact analysis</div>
                <p className="mt-1 text-xs text-slate-400">Turns replay drift into the decision a release owner needs.</p>
              </div>
              <StatusPill label={releaseImpact.decision} tone={releaseImpact.blocking ? 'red' : releaseImpact.review ? 'blue' : 'green'} />
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <ImpactMetric label="Affected endpoints" value={releaseImpact.affectedEndpoints} detail={`${releaseImpact.totalEndpoints} replayed`} />
              <ImpactMetric label="Contract breaks" value={releaseImpact.contractBreaks} detail="status, removed fields, or type changes" danger={releaseImpact.contractBreaks > 0} />
              <ImpactMetric label="Customer-visible" value={releaseImpact.customerVisible} detail="value changes in response payloads" />
              <ImpactMetric label="Latency regressions" value={releaseImpact.latencyRegressions} detail="response time crossed threshold" />
            </div>
            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs leading-5 text-slate-300">
              <b className="text-slate-100">Recommended action:</b> {releaseImpact.recommendation}
            </div>
          </Panel>
        )}
        {endpointRisks.length > 0 && (
          <Panel>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-bold">Endpoint risk score</div>
              <span className="text-[11px] text-slate-400">Prioritizes high-impact staging drift first</span>
            </div>
            <div className="grid gap-2 lg:grid-cols-2">
              {endpointRisks.slice(0, 6).map((risk) => (
                <div
                  key={`${risk.method}-${risk.path}`}
                  role={risk.resultId ? 'button' : undefined}
                  tabIndex={risk.resultId ? 0 : undefined}
                  onClick={() => {
                    if (risk.resultId) {
                      navigate(`/replay/${sessionId}/results/${risk.resultId}`);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (risk.resultId && (event.key === 'Enter' || event.key === ' ')) {
                      navigate(`/replay/${sessionId}/results/${risk.resultId}`);
                    }
                  }}
                  className="cursor-pointer rounded-md border border-[#3f473f] bg-[#151815] p-3 text-xs transition hover:border-cyan-300/70 hover:bg-[#1d231d]"
                >
                  <div className="grid grid-cols-[56px_minmax(0,1fr)_80px] items-center gap-3">
                    <span className="rounded bg-[#1b1d1b] px-2 py-1 text-center text-[10px] font-bold">{risk.method}</span>
                    <div>
                      <div className="truncate font-bold text-slate-100">{risk.path}</div>
                      <div className="mt-1 text-slate-400">{risk.reason}</div>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-center text-[10px] font-bold ${risk.tone}`}>{risk.label}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="rounded border border-white/10 px-2 py-1 font-bold text-slate-200" onClick={(event) => {
                      event.stopPropagation();
                      setHistoryEndpoint({ method: risk.method, path: risk.path });
                    }}>History</button>
                    {risk.resultId && <Link onClick={(event) => event.stopPropagation()} className="rounded border border-white/10 px-2 py-1 font-bold text-slate-200" to={`/replay/${sessionId}/results/${risk.resultId}`}>Open diff</Link>}
                    {session.data && risk.baselineId && (
                      <button className="rounded border border-white/10 px-2 py-1 font-bold text-slate-200" onClick={(event) => {
                        event.stopPropagation();
                        void rerunEndpoint(session.data!.serviceId, risk.baselineId!, session.data!.stagingUrl, setActionError, navigate);
                      }}>Re-run</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}
        {contractSummary.length > 0 && (
          <Panel>
            <div className="mb-1 text-sm font-bold">API contract changelog</div>
            <p className="mb-3 text-xs text-slate-400">Aggregated field-level changes from this replay session.</p>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {contractSummary.map((item) => (
                <div key={item.type} className="rounded-md border border-[#3f473f] bg-[#151815] p-3 text-xs">
                  <div className="font-bold text-cyan-100">{item.label}</div>
                  <div className="mt-1 text-lg font-bold">{item.count}</div>
                  <div className="mt-1 truncate text-slate-400" title={item.examples.join(', ')}>
                    {item.examples.slice(0, 2).join(', ') || 'No examples'}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}
        <Panel>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-bold">Replay results</div>
            <Input
              className="w-full sm:w-72"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search method, path, drift, triage"
            />
          </div>
          <div className="grid grid-cols-[64px_minmax(0,1fr)_100px_110px_90px] items-center border-b border-[#444] pb-2 text-xs text-slate-300">
            <SortHeader label="Method" column="method" sort={sort} onSort={setSort} />
            <SortHeader label="Path" column="path" sort={sort} onSort={setSort} />
            <SortHeader label="Drift" column="driftType" sort={sort} onSort={setSort} />
            <div className="flex justify-end"><SortHeader label="Latency" column="latencyMs" sort={sort} onSort={setSort} /></div>
            <div className="flex justify-end"><SortHeader label="Triage" column="triageStatus" sort={sort} onSort={setSort} /></div>
          </div>
          <div className="space-y-1">
            {sortedRows.map((row) => (
              <Link
                key={row.key}
                to={row.resultId ? `/replay/${sessionId}/results/${row.resultId}` : '#'}
                className="grid grid-cols-[64px_minmax(0,1fr)_100px_110px_90px] items-center border-b border-[#444] py-2 text-xs transition hover:bg-[#1b211b] last:border-0"
              >
                <span className="rounded bg-[#1b1d1b] px-2 py-1 text-[10px]">{row.method ?? 'GET'}</span>
                <span className="truncate pr-3 font-semibold text-slate-100">{row.path}</span>
                {row.driftType ? <DriftBadge type={row.driftType} /> : <StatusPill label="Pending" />}
                <span className="text-right text-slate-300">{row.latency ?? '-'}</span>
                <span className="text-right text-slate-300">{row.triageStatus ?? '-'}</span>
              </Link>
            ))}
          </div>
        </Panel>
        <Panel>
          <div className="text-sm font-bold">Summary</div>
          <div className="mt-2 grid grid-cols-3 gap-3 text-xs"><span>Total {total}</span><span>Drifted {drifted}</span><span>Breaking {count(results.data, 'BREAKING')}</span></div>
        </Panel>
      </div>
      {promoteOpen && session.data && readiness.data && !isPromoted && (
        <PromoteModal
          sessionId={sessionId}
          decision={readiness.data.decision}
          openCount={readiness.data.openCount}
          blockingCount={readiness.data.blockingCount}
          onClose={() => setPromoteOpen(false)}
          onPromoted={async () => {
            await promotions.reload();
            await readiness.reload();
          }}
        />
      )}
      {historyEndpoint && session.data && (
        <EndpointHistoryModal
          serviceId={session.data.serviceId}
          endpoint={historyEndpoint}
          onClose={() => setHistoryEndpoint(undefined)}
        />
      )}
    </>
  );
}

async function rerunEndpoint(
  serviceId: string,
  baselineId: string,
  stagingUrl: string,
  setError: (message: string) => void,
  navigate: ReturnType<typeof useNavigate>,
) {
  setError('');
  try {
    const session = await triggerBaselineReplay({ serviceId, baselineId, stagingUrl });
    navigate(`/replay/${session.id}`);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Unable to re-run endpoint');
  }
}

function EndpointHistoryModal({ serviceId, endpoint, onClose }: {
  serviceId: string;
  endpoint: { method: string; path: string };
  onClose: () => void;
}) {
  const [points, setPoints] = useState<EndpointHistoryPoint[]>();
  const [error, setError] = useState('');

  useEffect(() => {
    void getEndpointHistory(serviceId, endpoint.path)
      .then(setPoints)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load endpoint history'));
  }, [serviceId, endpoint.path]);

  return (
    <Modal title={`Endpoint history - ${endpoint.method} ${endpoint.path}`} onClose={onClose} size="lg">
      <div className="space-y-3 text-xs">
        <p className="text-slate-400">Drift outcome for this endpoint across replay sessions.</p>
        {error && <ErrorBlock message={error} />}
        {!points && !error && <LoadingBlock label="Loading endpoint history" />}
        {points && points.length === 0 && <div className="rounded-xl border border-white/10 p-4 text-slate-400">No history yet.</div>}
        {points && points.length > 0 && (
          <div className="space-y-2">
            {points.map((point) => (
              <div key={point.sessionId + point.replayedAt} className="grid grid-cols-[1fr_110px_90px_90px] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <span className="truncate font-bold">{new Date(point.replayedAt).toLocaleString()}</span>
                <DriftBadge type={point.driftType} />
                <span>{point.triageStatus}</span>
                <span className="text-right">{point.responseTimeMs} ms</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

function ReleaseGateSimulator({ readiness }: { readiness: ReleaseReadiness }) {
  const isFinal = readiness.status === 'DONE';
  const score = isFinal ? readinessScore(readiness) : 0;
  const blocked = readiness.decision === 'BLOCKED';
  const ready = readiness.decision === 'READY';
  const Icon = blocked ? ShieldX : ready ? ShieldCheck : AlertTriangle;
  const tone = blocked
    ? 'border-red-500/60 bg-red-950/20 text-red-100'
    : ready
      ? 'border-lime-500/60 bg-lime-950/20 text-lime-100'
      : 'border-amber-500/60 bg-amber-950/20 text-amber-100';
  return (
    <Panel>
      <div className={`rounded-md border p-4 ${tone}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Icon className="mt-0.5 h-5 w-5" />
            <div>
              <div className="text-sm font-bold">CI deploy gate simulator: {blocked ? 'BLOCK DEPLOY' : ready ? 'ALLOW DEPLOY' : 'NEEDS REVIEW'}</div>
              <div className="mt-1 text-xs opacity-90">
                {blocked
                  ? 'A pipeline would fail because breaking or blocking drift is still open.'
                  : ready
                    ? 'A pipeline would pass because drift is triaged and release-ready.'
                    : 'A pipeline would pause for reviewer approval before production.'}
              </div>
            </div>
          </div>
          <div className="min-w-40">
            <div className="mb-1 flex justify-between text-[11px] font-bold"><span>Readiness score</span><span>{isFinal ? `${score}/100` : 'Calculating'}</span></div>
            <div className="h-2 rounded bg-[#111410]"><div className="h-2 rounded bg-current" style={{ width: `${score}%` }} /></div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function readinessScore(readiness: ReleaseReadiness) {
  const score = 100
    - readiness.breakingCount * 25
    - readiness.warningCount * 8
    - readiness.performanceCount * 6
    - readiness.openCount * 5
    - readiness.blockingCount * 40;
  return Math.max(0, Math.min(100, score));
}

type SortDirection = 'asc' | 'desc';
type ReplaySortKey = 'method' | 'path' | 'driftType' | 'latencyMs' | 'triageStatus';
type ReplaySort = { key: ReplaySortKey; direction: SortDirection };

function SortHeader({ label, column, sort, onSort }: {
  label: string;
  column: ReplaySortKey;
  sort: ReplaySort;
  onSort: (sort: ReplaySort) => void;
}) {
  const active = sort.key === column;
  const Icon = !active ? ArrowUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown;
  const nextDirection: SortDirection = active && sort.direction === 'asc' ? 'desc' : 'asc';
  return (
    <button
      type="button"
      title={`Sort by ${label} ${nextDirection === 'asc' ? 'ascending' : 'descending'}`}
      onClick={() => onSort({ key: column, direction: nextDirection })}
      className={`inline-flex items-center gap-1 rounded px-1 py-1 font-bold transition hover:bg-[#252b25] ${active ? 'text-cyan-200' : 'text-slate-300'}`}
    >
      {label}
      <Icon className="h-4 w-4" />
    </button>
  );
}

function PromoteModal({ sessionId, decision, openCount, blockingCount, onClose, onPromoted }: {
  sessionId: string;
  decision: string;
  openCount: number;
  blockingCount: number;
  onClose: () => void;
  onPromoted: () => Promise<void>;
}) {
  const [promotedBy, setPromotedBy] = useState('demo@driftguard.local');
  const [note, setNote] = useState('');
  const [force, setForce] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setResult('');
    try {
      const promotion = await promoteReplaySession(sessionId, { force, promotedBy, note });
      setResult(`Accepted ${promotion.promotedCount} replayed responses as the new baseline.`);
      await onPromoted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to promote baselines');
    }
  }

  return (
    <Modal title="Accept staging as new baseline" onClose={onClose} size="lg">
      <form onSubmit={submit} className="space-y-4 text-xs">
        <div className="rounded-md border border-[#465047] bg-[#151815] p-3">
          <div className="font-bold">Current readiness: {decision}</div>
          <div className="mt-1 text-slate-300">{openCount} open drift items | {blockingCount} blocking items</div>
          <div className="mt-2 text-slate-400">This means the reviewed staging responses become the expected baseline for future comparisons.</div>
        </div>
        <label className="block font-bold">
          Accepted by
          <Input className="mt-1 w-full" value={promotedBy} onChange={(event) => setPromotedBy(event.target.value)} />
        </label>
        <label className="block font-bold">
          Review note
          <Input className="mt-1 w-full" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Approved checkout response changes for release" />
        </label>
        <label className="flex items-center gap-2 font-bold">
          <input className="h-4 w-4 accent-cyan-400" type="checkbox" checked={force} onChange={(event) => setForce(event.target.checked)} />
          Accept even if drift remains open or blocking
        </label>
        <Button type="submit" className="border-cyan-400/60 bg-cyan-950/40">Accept as baseline</Button>
        {result && <p className="text-lime-300">{result}</p>}
        {error && <p className="text-red-300">{error}</p>}
      </form>
    </Modal>
  );
}

function ReadinessCard({ readiness }: { readiness: ReleaseReadiness }) {
  const tone = readiness.decision === 'READY'
    ? 'border-lime-500/60 bg-lime-950/20 text-lime-100'
    : readiness.decision === 'BLOCKED'
      ? 'border-red-500/60 bg-red-950/20 text-red-100'
      : 'border-amber-500/60 bg-amber-950/20 text-amber-100';
  return (
    <Panel>
      <div className={`rounded-md border p-3 ${tone}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold">Release readiness: {readiness.decision}</div>
            <div className="mt-1 text-xs opacity-90">{readiness.message}</div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <Mini label="Open" value={readiness.openCount} />
            <Mini label="Accepted" value={readiness.acceptedCount} />
            <Mini label="Fixed" value={readiness.fixedCount} />
            <Mini label="Blocking" value={readiness.blockingCount} />
          </div>
        </div>
      </div>
    </Panel>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return <div><div className="text-base font-bold">{value}</div><div className="text-[10px]">{label}</div></div>;
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div className="rounded bg-[#242624] p-3 text-center"><div className="text-lg font-bold">{value}</div><div className="text-[10px] text-slate-300">{label}</div></div>;
}

function ImpactMetric({ label, value, detail, danger }: { label: string; value: number; detail: string; danger?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${danger ? 'border-rose-400/30 bg-rose-400/10' : 'border-white/10 bg-[#151815]'}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className={`mt-2 text-2xl font-black ${danger ? 'text-rose-100' : 'text-slate-50'}`}>{value}</div>
      <div className="mt-1 text-[11px] text-slate-400">{detail}</div>
    </div>
  );
}

function count(results = [] as { driftType: DriftType }[], type: DriftType) {
  return results.filter((result) => result.driftType === type).length;
}

function countDrifted(results = [] as { driftType: DriftType }[]) {
  return results.filter((result) => result.driftType !== 'NONE').length;
}

type ReplayRow = {
  key: string;
  resultId?: string;
  method?: string;
  path: string;
  driftType?: DriftType;
  latency?: string;
  latencyMs?: number;
  triageStatus?: string;
};

function mergeRows(events: ReplayProgressEvent[], results: Awaited<ReturnType<typeof useReplayResults>>['data'] = []): ReplayRow[] {
  const byBaseline = new Map(results.map((result) => [result.baselineId, result]));
  const eventRows = events.filter((event) => event.status === 'done').map((event) => {
    const result = event.baselineId ? byBaseline.get(event.baselineId) : undefined;
    return {
      key: event.baselineId ?? `${event.path}-${event.progress}`,
      resultId: result?.id,
      method: result?.method,
      path: event.path ?? result?.path ?? '-',
      driftType: event.driftType ?? result?.driftType,
      latency: result ? `${result.baselineResponseTimeMs} -> ${result.replayedResponseTimeMs} ms` : undefined,
      latencyMs: result?.replayedResponseTimeMs,
      triageStatus: result?.triageStatus,
    };
  });
  return eventRows.length ? eventRows : results.map((result) => ({
    key: result.id,
    resultId: result.id,
    method: result.method,
    path: result.path,
    driftType: result.driftType,
    latency: `${result.baselineResponseTimeMs} -> ${result.replayedResponseTimeMs} ms`,
    latencyMs: result.replayedResponseTimeMs,
    triageStatus: result.triageStatus,
  }));
}

function sortReplayRows(rows: ReplayRow[], sort: ReplaySort) {
  return [...rows].sort((left, right) => {
    const modifier = sort.direction === 'asc' ? 1 : -1;
    const leftValue = replaySortValue(left, sort.key);
    const rightValue = replaySortValue(right, sort.key);
    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return (leftValue - rightValue) * modifier;
    }
    return String(leftValue).localeCompare(String(rightValue)) * modifier;
  });
}

function replaySortValue(row: ReplayRow, key: ReplaySortKey) {
  return key === 'latencyMs' ? row.latencyMs ?? -1 : row[key] ?? '';
}

function filterReplayRows(rows: ReplayRow[], search: string) {
  const query = search.trim().toLowerCase();
  if (!query) {
    return rows;
  }
  return rows.filter((row) => [
    row.method,
    row.path,
    row.driftType,
    row.triageStatus,
    row.latency,
  ].some((value) => String(value ?? '').toLowerCase().includes(query)));
}

function endpointRiskSummary(results: Awaited<ReturnType<typeof useReplayResults>>['data'] = []) {
  const byEndpoint = new Map<string, {
    method: string;
    path: string;
    score: number;
    breaking: number;
    warning: number;
    performance: number;
    resultId?: string;
    baselineId?: string;
  }>();
  for (const result of results) {
    const key = `${result.method} ${result.path}`;
    const current = byEndpoint.get(key) ?? {
      method: result.method,
      path: result.path,
      score: 0,
      breaking: 0,
      warning: 0,
      performance: 0,
      resultId: result.id,
      baselineId: result.baselineId,
    };
    const methodWeight = result.method === 'POST' || result.method === 'PUT' || result.method === 'DELETE' ? 10 : 0;
    const driftWeight = result.driftType === 'BREAKING' ? 70 : result.driftType === 'WARNING' ? 35 : result.driftType === 'PERFORMANCE' ? 25 : 0;
    current.score += driftWeight + methodWeight;
    current.breaking += result.driftType === 'BREAKING' ? 1 : 0;
    current.warning += result.driftType === 'WARNING' ? 1 : 0;
    current.performance += result.driftType === 'PERFORMANCE' ? 1 : 0;
    if (!current.resultId || result.driftType === 'BREAKING') {
      current.resultId = result.id;
      current.baselineId = result.baselineId;
    }
    byEndpoint.set(key, current);
  }
  return [...byEndpoint.values()]
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => {
      const label = item.score >= 110 ? 'Critical' : item.score >= 45 ? 'Medium' : 'Low';
      const tone = item.score >= 110 ? 'bg-red-100 text-red-700' : item.score >= 45 ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800';
      const reason = [
        item.breaking ? `${item.breaking} breaking` : '',
        item.warning ? `${item.warning} warning` : '',
        item.performance ? `${item.performance} performance` : '',
      ].filter(Boolean).join(', ');
      return { ...item, label, tone, reason };
    });
}

function contractChangeSummary(results: Awaited<ReturnType<typeof useReplayResults>>['data'] = []) {
  const labels: Record<string, string> = {
    FIELD_REMOVED: 'Removed fields',
    FIELD_ADDED: 'Added fields',
    TYPE_CHANGED: 'Type changes',
    VALUE_CHANGED: 'Value changes',
    LATENCY_REGRESSION: 'Latency regressions',
    STATUS_CHANGED: 'Status changes',
  };
  const groups = new Map<string, { type: string; label: string; count: number; examples: string[] }>();
  for (const result of results) {
    for (const drift of result.diffJson.drifts ?? []) {
      const group = groups.get(drift.type) ?? {
        type: drift.type,
        label: labels[drift.type] ?? drift.type.replace(/_/g, ' ').toLowerCase(),
        count: 0,
        examples: [],
      };
      group.count += 1;
      if (group.examples.length < 3) {
        group.examples.push(`${result.path} ${drift.path}`);
      }
      groups.set(drift.type, group);
    }
  }
  return [...groups.values()].sort((a, b) => b.count - a.count);
}

function releaseImpactAnalysis(
  results: Awaited<ReturnType<typeof useReplayResults>>['data'] = [],
  readiness: ReleaseReadiness | undefined,
) {
  const totalEndpoints = new Set(results.map((result) => `${result.method} ${result.path}`)).size;
  const affectedEndpoints = new Set(results
    .filter((result) => result.driftType !== 'NONE')
    .map((result) => `${result.method} ${result.path}`)).size;
  const drifts = results.flatMap((result) => result.diffJson.drifts ?? []);
  const contractBreaks = drifts.filter((drift) => ['STATUS_CHANGED', 'FIELD_REMOVED', 'TYPE_CHANGED'].includes(drift.type)).length;
  const customerVisible = drifts.filter((drift) => drift.type === 'VALUE_CHANGED').length;
  const latencyRegressions = drifts.filter((drift) => drift.type === 'LATENCY_REGRESSION').length;
  const blocking = readiness?.decision === 'BLOCKED' || contractBreaks > 0;
  const review = !blocking && (customerVisible > 0 || latencyRegressions > 0);
  const decision = blocking ? 'Block release' : review ? 'Needs review' : 'Ready';
  const recommendation = blocking
    ? 'Do not promote this build. Fix contract-breaking response changes first, or explicitly accept the staging behavior as the new baseline after review.'
    : review
      ? 'Route this replay to an API owner. The contract is stable, but value or latency drift should be accepted or fixed before deploy.'
      : 'No meaningful drift detected. This build can proceed through the release gate.';
  return {
    totalEndpoints,
    affectedEndpoints,
    contractBreaks,
    customerVisible,
    latencyRegressions,
    blocking,
    review,
    decision,
    recommendation,
  };
}

function exportReplayReport(
  sessionId: string,
  session: Awaited<ReturnType<typeof useReplaySession>>['data'],
  results: Awaited<ReturnType<typeof useReplayResults>>['data'] = [],
  readiness: ReleaseReadiness | undefined,
) {
  const payload = {
    generatedAt: new Date().toISOString(),
    session,
    readiness,
    summary: {
      total: results.length,
      breaking: count(results, 'BREAKING'),
      warning: count(results, 'WARNING'),
      performance: count(results, 'PERFORMANCE'),
      none: count(results, 'NONE'),
    },
    contractChanges: contractChangeSummary(results),
    results: results.map((result) => ({
      id: result.id,
      method: result.method,
      path: result.path,
      driftType: result.driftType,
      triageStatus: result.triageStatus,
      summary: result.driftSummary,
      drifts: result.diffJson.drifts ?? [],
    })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `driftguard-replay-${sessionId}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
