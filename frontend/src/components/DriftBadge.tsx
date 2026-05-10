import type { DriftType } from '../types/api';

const styles: Record<DriftType, string> = {
  BREAKING: 'bg-red-100 text-red-700',
  WARNING: 'bg-amber-100 text-amber-800',
  PERFORMANCE: 'bg-blue-100 text-blue-700',
  NONE: 'bg-lime-100 text-lime-700',
};

const labels: Record<DriftType, string> = {
  BREAKING: 'Breaking',
  WARNING: 'Warning',
  PERFORMANCE: 'Perf',
  NONE: 'None',
};

export function DriftBadge({ type }: { type: DriftType }) {
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${styles[type]}`}>{labels[type]}</span>;
}
