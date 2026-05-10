import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Trash2 } from 'lucide-react';
import { deleteBaseline, triggerReplay } from '../api/endpoints';
import { Button, Input } from '../components/forms';
import { IconButton } from '../components/IconButton';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../components/StateBlock';
import { getRuntimeSettings } from '../config/runtimeSettings';
import { useBaselines } from '../hooks/useBaselines';
import type { Baseline } from '../types/api';
import { pretty, shortDate } from '../utils/format';

export function BaselineBrowserPage() {
  const { serviceId = '' } = useParams();
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string>();
  const [replayOpen, setReplayOpen] = useState(false);
  const [sort, setSort] = useState<BaselineSort>({ key: 'capturedAt', direction: 'desc' });
  const { data, isLoading, error, reload } = useBaselines(serviceId, page, 20);
  const sortedBaselines = useMemo(
    () => sortBaselines(data?.content ?? [], sort),
    [data?.content, sort],
  );

  async function remove(id: string) {
    await deleteBaseline(serviceId, id);
    await reload();
  }

  return (
    <>
      <PageHeader title="Baselines" actions={<Button onClick={() => setReplayOpen(true)}>Replay all</Button>} />
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-bold">{data?.totalElements ?? 0} snapshots</div>
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
                {sortedBaselines.map((baseline) => (
                  <BaselineRow
                    key={baseline.id}
                    baseline={baseline}
                    expanded={expanded === baseline.id}
                    onToggle={() => setExpanded(expanded === baseline.id ? undefined : baseline.id)}
                    onDelete={() => void remove(baseline.id)}
                  />
                ))}
              </tbody>
            </table>
          </Panel>
        )}
      </div>
      {replayOpen && <ReplayAllModal serviceId={serviceId} onClose={() => setReplayOpen(false)} />}
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
      <Icon className="h-3.5 w-3.5" />
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

function baselineSortValue(baseline: Baseline, key: BaselineSortKey) {
  return key === 'capturedAt' ? Date.parse(baseline.capturedAt) : baseline[key];
}

function BaselineRow({ baseline, expanded, onToggle, onDelete }: {
  baseline: Baseline; expanded: boolean; onToggle: () => void; onDelete: () => void;
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
          <IconButton label="View baseline" onClick={onToggle}>
            <Eye className="h-4 w-4" />
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
  const [stagingUrl, setStagingUrl] = useState(() => getRuntimeSettings().defaultStagingUrl);
  const [error, setError] = useState('');
  const navigate = useNavigate();

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
