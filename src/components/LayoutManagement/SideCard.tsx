import type { ReactNode } from "react";

export default function SideCard({ title, children }: { title: string; children: ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{title}</p><div className="mt-4 grid gap-3">{children}</div></div>;
}
