import type { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from 'react';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`h-9 rounded-md border border-[#59615b] bg-[#151815] px-3 text-xs font-semibold text-slate-100 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 ${props.className ?? ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`h-9 rounded-md border border-[#59615b] bg-[#151815] px-3 text-xs font-semibold text-slate-100 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 ${props.className ?? ''}`} />;
}

export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`h-8 rounded-md border border-[#667069] bg-[#2b302b] px-3 text-xs font-bold text-slate-100 transition hover:border-blue-400/70 hover:bg-[#353b35] disabled:opacity-50 ${className ?? ''}`} />;
}
