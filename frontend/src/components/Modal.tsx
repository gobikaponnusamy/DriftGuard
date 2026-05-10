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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4 backdrop-blur-sm">
      <div className={`flex max-h-[calc(100vh-2rem)] w-full ${widths[size]} flex-col overflow-hidden rounded-lg border border-[#4b534d] bg-[#20231f] shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-[#3e463f] px-5 py-4">
          <h2 className="text-sm font-bold tracking-wide text-slate-100">{title}</h2>
          <button onClick={onClose} className="rounded-md border border-[#59615b] px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-[#30362f]">Close</button>
        </div>
        <div className="overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </div>
  );
}
