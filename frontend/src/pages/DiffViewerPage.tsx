import { DiffEditor } from '@monaco-editor/react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { updateReplayResultTriage } from '../api/endpoints';
import { Button } from '../components/forms';
import { DriftBadge } from '../components/DriftBadge';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { ErrorBlock, LoadingBlock } from '../components/StateBlock';
import { useDiffResult } from '../hooks/useDiffResult';
import type { TriageStatus } from '../types/api';
import { pretty } from '../utils/format';

export function DiffViewerPage() {
  const { sessionId = '', resultId = '' } = useParams();
  const navigate = useNavigate();
  const { data: result, isLoading, error, reload } = useDiffResult(sessionId, resultId);
  const [triageNote, setTriageNote] = useState('');
  const [triageError, setTriageError] = useState('');
  const [triageMessage, setTriageMessage] = useState('');

  async function triage(status: TriageStatus) {
    setTriageError('');
    setTriageMessage('');
    try {
      await updateReplayResultTriage(sessionId, resultId, { status, note: triageNote });
      setTriageNote('');
      await reload();
      setTriageMessage(`Marked as ${status}. Release readiness and replay counts update when you return to Live Replay.`);
    } catch (err) {
      setTriageError(err instanceof Error ? err.message : 'Unable to update triage');
    }
  }

  return (
    <>
      <PageHeader title="Diff viewer" actions={<Button onClick={() => navigate(-1)}>Back</Button>} />
      <div className="space-y-3 p-4">
        {isLoading && <LoadingBlock label="Loading diff" />}
        {error && <ErrorBlock message={error} />}
        {result && (
          <>
            <Panel>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <span>Path <b>{result.path}</b></span>
                <span>Method <b>{result.method}</b></span>
                <span>Status <b>{result.baselineStatus} -&gt; {result.replayedStatus}</b></span>
                <span>Latency <b>{result.baselineResponseTimeMs} -&gt; {result.replayedResponseTimeMs} ms</b></span>
                <span>Triage <b>{result.triageStatus}</b></span>
                {result.triageNote && <span>Note <b>{result.triageNote}</b></span>}
              </div>
              <div className="mt-2"><DriftBadge type={result.driftType} /></div>
            </Panel>
            <Panel>
              <div className="mb-2 text-sm font-bold">Smart drift explanation</div>
              <div className="space-y-2 text-xs">
                {smartExplanations(result).map((explanation) => (
                  <div key={explanation} className="rounded-md border border-[#3f473f] bg-[#151815] p-3 text-slate-200">
                    {explanation}
                  </div>
                ))}
              </div>
            </Panel>
            <Panel>
              <div className="mb-3 text-sm font-bold">Drift triage</div>
              <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                <input
                  className="h-9 rounded-md border border-[#59615b] bg-[#151815] px-3 text-xs font-semibold outline-none focus:border-blue-400"
                  value={triageNote}
                  onChange={(event) => setTriageNote(event.target.value)}
                  placeholder="Optional triage note, e.g. accepted price formatting change"
                />
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => void triage('ACCEPTED')}>Accept</Button>
                  <Button onClick={() => void triage('IGNORED')}>Ignore</Button>
                  <Button onClick={() => void triage('FIXED')}>Fixed</Button>
                  <Button onClick={() => void triage('BLOCKING')} className="border-red-400/70 bg-red-950/40">Block</Button>
                  <Button onClick={() => void triage('OPEN')}>Reopen</Button>
                </div>
              </div>
              {triageError && <p className="mt-2 text-xs text-red-300">{triageError}</p>}
              {triageMessage && <p className="mt-2 rounded-md border border-lime-400/30 bg-lime-400/10 p-2 text-xs text-lime-100">{triageMessage}</p>}
            </Panel>
            <Panel>
              <div className="mb-2 grid grid-cols-2 text-xs font-bold"><span>Baseline production</span><span>Replayed staging</span></div>
              <div className="h-[430px] overflow-hidden rounded-md border border-[#444]">
                <DiffEditor
                  original={pretty(result.baselineResponseBody)}
                  modified={pretty(result.replayedBody)}
                  language="json"
                  theme="vs-dark"
                  keepCurrentOriginalModel
                  keepCurrentModifiedModel
                  options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12 }}
                />
              </div>
            </Panel>
            <Panel>
              <div className="mb-3 text-sm font-bold">Drift breakdown</div>
              <table className="w-full text-left text-xs">
                <thead><tr className="text-slate-300"><th className="py-2">Field path</th><th>Type</th><th>Baseline</th><th>Replayed</th></tr></thead>
                <tbody>
                  {(result.diffJson.drifts ?? []).map((drift) => (
                    <tr key={`${drift.path}-${drift.type}`} className="border-t border-[#444]">
                      <td className="py-3 font-bold">{drift.path}</td>
                      <td><span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-bold text-red-700">{drift.type}</span></td>
                      <td className="max-w-56 truncate">{String(drift.from ?? '-')}</td>
                      <td className="max-w-56 truncate">{String(drift.to ?? '-')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </>
        )}
      </div>
    </>
  );
}

type DiffViewerResult = NonNullable<ReturnType<typeof useDiffResult>['data']>;

function smartExplanations(result: DiffViewerResult) {
  const drifts = result.diffJson.drifts ?? [];
  if (result.driftType === 'NONE' || drifts.length === 0) {
    return ['No meaningful behavior drift was detected for this request.'];
  }
  const explanations = new Set<string>();
  if (result.baselineStatus !== result.replayedStatus) {
    explanations.add(`Status changed from ${result.baselineStatus} to ${result.replayedStatus}. Clients may handle this as a different success or failure path.`);
  }
  if (result.replayedResponseTimeMs > result.baselineResponseTimeMs * 1.2) {
    explanations.add(`Staging is slower for this request: ${result.baselineResponseTimeMs} ms became ${result.replayedResponseTimeMs} ms.`);
  }
  for (const drift of drifts.slice(0, 5)) {
    switch (drift.type) {
      case 'FIELD_REMOVED':
        explanations.add(`${drift.path} was removed in staging. This can break clients that still read that field.`);
        break;
      case 'FIELD_ADDED':
        explanations.add(`${drift.path} was added in staging. Usually safe, but check whether clients treat unknown fields strictly.`);
        break;
      case 'TYPE_CHANGED':
        explanations.add(`${drift.path} changed type from ${String(drift.from)} to ${String(drift.to)}. Keep the old type or version the API contract.`);
        break;
      case 'VALUE_CHANGED':
        explanations.add(`${drift.path} changed value from ${String(drift.from)} to ${String(drift.to)}. Confirm this is intentional business behavior.`);
        break;
      case 'LATENCY_REGRESSION':
        explanations.add(`${drift.path} shows a performance regression. Investigate staging code paths before release.`);
        break;
      default:
        explanations.add(`${drift.path} changed with drift type ${drift.type}. Review before approving this release.`);
    }
  }
  return [...explanations];
}
