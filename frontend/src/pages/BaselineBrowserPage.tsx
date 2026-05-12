import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Pencil, Trash2 } from 'lucide-react';
import { deleteBaseline, triggerReplay, updateBaseline } from '../api/endpoints';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Button, Input } from '../components/forms';
import { IconButton } from '../components/IconButton';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../components/StateBlock';
import { useBaselines } from '../hooks/useBaselines';
import { useServices } from '../hooks/useServices';
import { syntheticStagingUrl } from '../config/runtimeSettings';
import type { Baseline } from '../types/api';
import { pretty, shortDate } from '../utils/format';

export function BaselineBrowserPage() {
  const { serviceId = '' } = useParams();
  const navigate = useNavigate();
  const services = useServices();
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string>();
  const [selected, setSelected] = useState<Baseline>();
  const [editTarget, setEditTarget] = useState<Baseline>();
  const [deleteTarget, setDeleteTarget] = useState<Baseline>();
  const [search, setSearch] = useState('');
  const [replayOpen, setReplayOpen] = useState(false);
  const [isDeleting, setDeleting] = useState(false);
  const [sort, setSort] = useState<BaselineSort>({ key: 'capturedAt', direction: 'desc' });
  const { data, isLoading, error, reload } = useBaselines(serviceId, page, 20);
  const selectedService = (services.data ?? []).find((service) => service.id === serviceId);
  const visibleBaselines = useMemo(
    () => sortBaselines(filterBaselines(data?.content ?? [], search), sort),
    [data?.content, search, sort],
  );

  async function remove(baseline: Baseline) {
    setDeleting(true);
    try {
      await deleteBaseline(serviceId, baseline.id);
      setDeleteTarget(undefined);
      await reload();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader title="Baselines" actions={<Button onClick={() => setReplayOpen(true)}>Replay all</Button>} />
      <div className="space-y-3 p-4">
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold">Service baselines</div>
              <div className="mt-1 text-xs text-slate-400">Generated staging URL: {serviceId ? syntheticStagingUrl(serviceId) : '-'}</div>
            </div>
            <select
              className="h-9 rounded-md border border-[#59615b] bg-[#151815] px-3 text-xs font-semibold text-slate-100 outline-none"
              value={serviceId}
              onChange={(event) => {
                setPage(0);
                navigate(`/services/${event.target.value}/baselines`);
              }}
            >
              {(services.data ?? []).map((service) => (
                <option key={service.id} value={service.id}>{service.name}</option>
              ))}
            </select>
          </div>
        </Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-bold">{selectedService?.name ?? 'Service'} | {data?.totalElements ?? 0} snapshots</div>
          <Input
            className="w-full sm:w-80"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search method, path, status"
          />
          {data && data.totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={data.totalPages}
              onPageChange={(nextPage) => {
                setExpanded(undefined);
                setPage(nextPage);
              }}
            />
          )}
        </div>
        {isLoading && <LoadingBlock label="Loading baselines" />}
        {error && <ErrorBlock message={error} />}
        {data && data.content.length === 0 && <EmptyBlock message="No baselines captured for this service." />}
        {data && data.content.length > 0 && (
          <Panel>
            <table className="w-full text-left text-xs">
              <thead className="text-slate-300">
                <tr>
                  <th className="py-2"><SortHeader label="Method" column="method" sort={sort} onSort={setSort} /></th>
                  <th><SortHeader label="Path" column="path" sort={sort} onSort={setSort} /></th>
                  <th><SortHeader label="Status" column="responseStatus" sort={sort} onSort={setSort} /></th>
                  <th><SortHeader label="Response time" column="responseTimeMs" sort={sort} onSort={setSort} /></th>
                  <th><SortHeader label="Captured" column="capturedAt" sort={sort} onSort={setSort} /></th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visibleBaselines.map((baseline) => (
                  <BaselineRow
                    key={baseline.id}
                    baseline={baseline}
                    expanded={expanded === baseline.id}
                    onToggle={() => setExpanded(expanded === baseline.id ? undefined : baseline.id)}
                    onView={() => setSelected(baseline)}
                    onEdit={() => setEditTarget(baseline)}
                    onDelete={() => setDeleteTarget(baseline)}
                  />
                ))}
              </tbody>
            </table>
          </Panel>
        )}
      </div>
      {replayOpen && <ReplayAllModal serviceId={serviceId} onClose={() => setReplayOpen(false)} />}
      {selected && <BaselineDetailModal baseline={selected} onClose={() => setSelected(undefined)} />}
      {editTarget && <EditBaselineModal serviceId={serviceId} baseline={editTarget} onClose={() => setEditTarget(undefined)} onSaved={reload} />}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete baseline"
          message={`This will permanently remove the captured ${deleteTarget.method} ${deleteTarget.path} production behavior snapshot. Future replay runs will no longer test this case.`}
          confirmLabel="Delete baseline"
          isWorking={isDeleting}
          onCancel={() => setDeleteTarget(undefined)}
          onConfirm={() => void remove(deleteTarget)}
        />
      )}
    </>
  );
}

type SortDirection = 'asc' | 'desc';
type BaselineSortKey = 'method' | 'path' | 'responseStatus' | 'responseTimeMs' | 'capturedAt';
type BaselineSort = { key: BaselineSortKey; direction: SortDirection };

function SortHeader({ label, column, sort, onSort }: {
  label: string;
  column: BaselineSortKey;
  sort: BaselineSort;
  onSort: (sort: BaselineSort) => void;
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

function sortBaselines(items: Baseline[], sort: BaselineSort) {
  return [...items].sort((left, right) => {
    const modifier = sort.direction === 'asc' ? 1 : -1;
    const leftValue = baselineSortValue(left, sort.key);
    const rightValue = baselineSortValue(right, sort.key);
    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return (leftValue - rightValue) * modifier;
    }
    return String(leftValue).localeCompare(String(rightValue)) * modifier;
  });
}

function filterBaselines(items: Baseline[], search: string) {
  const query = search.trim().toLowerCase();
  if (!query) {
    return items;
  }
  return items.filter((baseline) => [
    baseline.method,
    baseline.path,
    baseline.responseStatus,
    baseline.responseTimeMs,
  ].some((value) => String(value).toLowerCase().includes(query)));
}

function baselineSortValue(baseline: Baseline, key: BaselineSortKey) {
  return key === 'capturedAt' ? Date.parse(baseline.capturedAt) : baseline[key];
}

function BaselineRow({ baseline, expanded, onToggle, onView, onEdit, onDelete }: {
  baseline: Baseline; expanded: boolean; onToggle: () => void; onView: () => void; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <>
      <tr className="border-t border-[#444]">
        <td className="py-3"><span className="rounded bg-[#1b1d1b] px-2 py-1 text-[10px]">{baseline.method}</span></td>
        <td className="font-semibold">{baseline.path}</td>
        <td><span className="rounded-full bg-lime-100 px-2 py-0.5 text-[10px] font-bold text-lime-700">{baseline.responseStatus}</span></td>
        <td>{baseline.responseTimeMs} ms</td>
        <td>{shortDate(baseline.capturedAt)}</td>
        <td className="flex justify-end gap-2 py-2">
          <IconButton label="Open baseline detail" onClick={onView}>
            <Eye className="h-4 w-4" />
          </IconButton>
          <IconButton label="Edit API baseline" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </IconButton>
          <IconButton label="Delete baseline" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-red-300" />
          </IconButton>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="pb-3">
            <div className="grid grid-cols-2 gap-3">
              <Code title="Request" value={pretty({ headers: baseline.requestHeaders, body: baseline.requestBody })} />
              <Code title="Response" value={pretty({ status: baseline.responseStatus, headers: baseline.responseHeaders, body: baseline.responseBody })} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function EditBaselineModal({ serviceId, baseline, onClose, onSaved }: {
  serviceId: string;
  baseline: Baseline;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [value, setValue] = useState(() => JSON.stringify({
    method: baseline.method,
    path: baseline.path,
    requestHeaders: baseline.requestHeaders,
    requestBody: baseline.requestBody,
    responseStatus: baseline.responseStatus,
    responseHeaders: baseline.responseHeaders,
    responseBody: baseline.responseBody,
    responseTimeMs: baseline.responseTimeMs,
  }, null, 2));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    setError('');
    setSaving(true);
    try {
      const parsed = JSON.parse(value) as Partial<Baseline>;
      if (!parsed.method || !parsed.path || !parsed.responseStatus || parsed.responseTimeMs == null) {
        throw new Error('method, path, responseStatus, and responseTimeMs are required.');
      }
      await updateBaseline(serviceId, baseline.id, {
        method: parsed.method,
        path: parsed.path,
        requestHeaders: parsed.requestHeaders,
        requestBody: parsed.requestBody,
        responseStatus: parsed.responseStatus,
        responseHeaders: parsed.responseHeaders,
        responseBody: parsed.responseBody,
        responseTimeMs: parsed.responseTimeMs,
      });
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update API baseline');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Edit API baseline - ${baseline.method} ${baseline.path}`} onClose={onClose} size="lg">
      <div className="space-y-3 text-xs">
        <p className="text-slate-400">Update this API baseline. Future replays will compare staging against this edited behavior.</p>
        <textarea
          className="no-scrollbar min-h-80 w-full resize-none rounded-lg border border-white/10 bg-[#090a12] px-3 py-2 font-mono text-xs font-semibold text-slate-100 outline-none focus:border-fuchsia-300"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <Button onClick={() => void save()} disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</Button>
        {error && <p className="text-red-300">{error}</p>}
      </div>
    </Modal>
  );
}

function BaselineDetailModal({ baseline, onClose }: { baseline: Baseline; onClose: () => void }) {
  return (
    <Modal title={`${baseline.method} ${baseline.path}`} onClose={onClose} size="xl">
      <div className="space-y-3 text-xs">
        <div className="grid gap-3 sm:grid-cols-4">
          <Detail label="Status" value={String(baseline.responseStatus)} />
          <Detail label="Latency" value={`${baseline.responseTimeMs} ms`} />
          <Detail label="Captured" value={shortDate(baseline.capturedAt)} />
          <Detail label="Baseline ID" value={baseline.id.slice(0, 8)} />
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <Code title="Production request" value={pretty({
            method: baseline.method,
            path: baseline.path,
            headers: baseline.requestHeaders,
            body: baseline.requestBody,
          })} />
          <Code title="Production response" value={pretty({
            status: baseline.responseStatus,
            headers: baseline.responseHeaders,
            body: baseline.responseBody,
          })} />
        </div>
      </div>
    </Modal>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 truncate font-bold text-slate-100">{value}</div>
    </div>
  );
}

function Pagination({ page, totalPages, onPageChange }: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const items = paginationItems(page, totalPages);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-[#3f473f] bg-[#1a1e1a] px-3 py-2 text-xs">
      <div className="mr-1 whitespace-nowrap font-semibold text-slate-300">Page {page + 1} of {totalPages}</div>
      <div className="flex flex-wrap items-center gap-1">
        <Button className="min-w-16" disabled={page === 0} onClick={() => onPageChange(page - 1)}>Prev</Button>
        {items.map((item, index) => (
          item === '...'
            ? <span key={`ellipsis-${index}`} className="px-2 text-slate-500">...</span>
            : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                className={`h-8 min-w-8 rounded-md border px-2 text-xs font-bold transition ${
                  item === page
                    ? 'border-cyan-300 bg-cyan-950/60 text-cyan-100'
                    : 'border-[#59615b] bg-[#151815] text-slate-200 hover:border-blue-400/70 hover:bg-[#252b25]'
                }`}
                aria-current={item === page ? 'page' : undefined}
              >
                {item + 1}
              </button>
            )
        ))}
        <Button className="min-w-16" disabled={page >= totalPages - 1} onClick={() => onPageChange(page + 1)}>Next</Button>
      </div>
    </div>
  );
}

function paginationItems(page: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index);
  }

  const pages = new Set([0, totalPages - 1, page - 1, page, page + 1]);
  const sorted = [...pages]
    .filter((item) => item >= 0 && item < totalPages)
    .sort((a, b) => a - b);

  return sorted.flatMap((item, index) => {
    const previous = sorted[index - 1];
    return index > 0 && item - previous > 1 ? ['...' as const, item] : [item];
  });
}

function Code({ title, value }: { title: string; value: string }) {
  return <pre className="max-h-64 overflow-auto rounded bg-[#171917] p-3 text-[11px] text-slate-200"><b>{title}</b>{'\n'}{value}</pre>;
}

function ReplayAllModal({ serviceId, onClose }: { serviceId: string; onClose: () => void }) {
  const navigate = useNavigate();
  const [stagingUrl, setStagingUrl] = useState(() => syntheticStagingUrl(serviceId));
  const [error, setError] = useState('');

  async function start() {
    try {
      const session = await triggerReplay({ serviceId, stagingUrl });
      navigate(`/replay/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start replay');
    }
  }

  return (
    <Modal title="Replay all baselines" onClose={onClose}>
      <div className="space-y-3">
        <Input className="w-full" value={stagingUrl} onChange={(e) => setStagingUrl(e.target.value)} />
        <Button onClick={() => void start()}>Replay all</Button>
        {error && <p className="text-xs text-red-300">{error}</p>}
      </div>
    </Modal>
  );
}
