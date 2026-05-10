import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

export function IconButton({ label, children, className, ...props }: IconButtonProps) {
  return (
    <button
      {...props}
      aria-label={label}
      title={label}
      className={`inline-grid h-8 w-8 place-items-center rounded-md border border-[#666] text-slate-100 hover:bg-[#3a3c39] disabled:opacity-50 ${className ?? ''}`}
    >
      {children}
    </button>
  );
}
