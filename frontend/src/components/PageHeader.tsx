import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  actions?: ReactNode;
}

export function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/10 bg-[#070814]/88 px-7 backdrop-blur-xl">
      <div>
        <div className="text-[10px] font-bold uppercase leading-none tracking-[0.28em] text-fuchsia-300/80">DriftGuard</div>
        <h1 className="mt-2 text-lg font-bold leading-none tracking-wide text-slate-50">{title}</h1>
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </header>
  );
}
