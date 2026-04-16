import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

export function InputField({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return <label className="space-y-1.5"><span className="text-sm font-semibold text-slate-700">{label}</span><input {...props} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none" />{hint ? <p className="text-xs text-slate-400">{hint}</p> : null}</label>;
}

export function SelectField({ label, options, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: Array<{ value: string; label: string }> }) {
  return <label className="space-y-1.5"><span className="text-sm font-semibold text-slate-700">{label}</span><select {...props} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

export function CheckField({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"><input type="checkbox" {...props} />{label}</label>;
}
