import type { PropsWithChildren } from 'react';

export function Panel({ children }: PropsWithChildren) {
  return <section className="rounded-lg border border-[#465047] bg-[#222620] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">{children}</section>;
}
