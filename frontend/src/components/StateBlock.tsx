export function LoadingBlock({ label = 'Loading' }: { label?: string }) {
  return <div className="rounded-md border border-[#555] bg-[#242624] p-4 text-xs text-slate-300">{label}...</div>;
}

export function ErrorBlock({ message }: { message?: string }) {
  return <div className="rounded-md border border-red-500/50 bg-red-950/30 p-4 text-xs text-red-200">{message}</div>;
}

export function EmptyBlock({ message }: { message: string }) {
  return <div className="rounded-md border border-[#555] bg-[#242624] p-4 text-xs text-slate-400">{message}</div>;
}
