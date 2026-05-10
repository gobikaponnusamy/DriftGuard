export function StatusPill({ label, tone = 'muted' }: { label: string; tone?: 'muted' | 'blue' | 'green' | 'red' }) {
  const tones = {
    muted: 'bg-[#3b3d3a] text-slate-200',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-lime-100 text-lime-700',
    red: 'bg-red-100 text-red-700',
  };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tones[tone]}`}>{label}</span>;
}
