import type { PropsWithChildren } from 'react';

interface ModalProps extends PropsWithChildren {
  title: string;
  onClose: () => void;
  size?: 'md' | 'lg' | 'xl';
}

const widths = {
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({ title, onClose, children, size = 'md' }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-md">
      <div className={`flex max-h-[calc(100vh-3rem)] w-full ${widths[size]} flex-col rounded-2xl border border-white/10 bg-[#0b0f16] p-1 shadow-[0_30px_90px_rgba(0,0,0,0.55)]`}>
        <div className="flex shrink-0 items-center justify-between rounded-t-[0.85rem] border-b border-white/10 bg-white/[0.03] px-5 py-4">
          <h2 className="text-sm font-bold tracking-wide text-slate-100">{title}</h2>
          <button onClick={onClose} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-200 hover:border-teal-300/70 hover:bg-white/[0.08]">Close</button>
        </div>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto rounded-b-[0.85rem] p-5 pb-7">
          {children}
        </div>
      </div>
    </div>
  );
}
