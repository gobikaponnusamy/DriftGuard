import type { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`h-10 rounded-lg border border-white/10 bg-[#090a12] px-3 text-xs font-semibold text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-fuchsia-300 focus:ring-2 focus:ring-fuchsia-400/20 ${props.className ?? ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`h-10 rounded-lg border border-white/10 bg-[#090a12] px-3 text-xs font-semibold text-slate-100 outline-none transition focus:border-fuchsia-300 focus:ring-2 focus:ring-fuchsia-400/20 ${props.className ?? ''}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`no-scrollbar min-h-24 rounded-lg border border-white/10 bg-[#090a12] px-3 py-2 text-xs font-semibold text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-fuchsia-300 focus:ring-2 focus:ring-fuchsia-400/20 ${props.className ?? ''}`} />;
}

export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`h-9 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-xs font-bold text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-fuchsia-300/70 hover:bg-white/[0.10] disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ''}`} />;
}
