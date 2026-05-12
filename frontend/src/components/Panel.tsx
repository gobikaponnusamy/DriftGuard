import type { PropsWithChildren } from 'react';

export function Panel({ children }: PropsWithChildren) {
  return <section className="rounded-xl border border-white/10 bg-[#0d1117]/80 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.30)] backdrop-blur-xl">{children}</section>;
}
