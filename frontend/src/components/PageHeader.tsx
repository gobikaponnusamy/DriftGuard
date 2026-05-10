import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  actions?: ReactNode;
}

export function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <header className="flex h-12 items-center justify-between border-b border-[#3f473f] bg-[#1b1f1b] px-5">
      <h1 className="text-sm font-bold tracking-wide text-slate-100">{title}</h1>
      <div className="flex items-center gap-2">{actions}</div>
    </header>
  );
}
