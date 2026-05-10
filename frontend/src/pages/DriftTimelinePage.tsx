import { Link, useParams } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { IconButton } from '../components/IconButton';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { ErrorBlock, LoadingBlock, EmptyBlock } from '../components/StateBlock';
import { useTimeline } from '../hooks/useTimeline';

export function DriftTimelinePage() {
  const { serviceId = '' } = useParams();
  const { data = [], isLoading, error } = useTimeline(serviceId);

  return (
    <>
      <PageHeader title="Drift timeline" />
      <div className="space-y-3 p-4">
        {isLoading && <LoadingBlock label="Loading timeline" />}
        {error && <ErrorBlock message={error} />}
        {!isLoading && !error && data.length === 0 && <EmptyBlock message="No replay timeline data yet." />}
        {data.length > 0 && (
          <>
            <Panel>
              <div className="mb-3 text-xs font-bold">Drift count per deploy</div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data}>
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#202220', border: '1px solid #555' }} />
                    <Line type="monotone" dataKey="breaking" stroke="#ef4444" strokeWidth={2} />
                    <Line type="monotone" dataKey="warning" stroke="#f59e0b" strokeWidth={2} />
                    <Line type="monotone" dataKey="performance" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel>
              <table className="w-full text-left text-xs">
                <thead><tr className="text-slate-300"><th className="py-2">Session</th><th>Date</th><th>Breaking</th><th>Warning</th><th>Perf</th><th /></tr></thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row.sessionId} className="border-t border-[#444]">
                      <td className="py-3 font-bold">{row.sessionId.slice(0, 8)}</td>
                      <td>{row.date}</td>
                      <td>{row.breaking}</td>
                      <td>{row.warning}</td>
                      <td>{row.performance}</td>
                      <td className="text-right">
                        <Link to={`/replay/${row.sessionId}`}>
                          <IconButton label="View replay">
                            <Eye className="h-4 w-4" />
                          </IconButton>
                        </Link>
                      </td>
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
