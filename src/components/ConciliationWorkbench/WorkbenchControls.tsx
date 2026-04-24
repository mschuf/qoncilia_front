import type { ChangeEvent, ComponentType, DragEvent } from "react";
import { useRef, useState } from "react";
import { FiFile, FiSave, FiTrash2, FiUploadCloud } from "react-icons/fi";

export function KpiCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-brand-50 p-3 text-brand-700">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function Metric({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "emerald" | "amber" | "rose";
}) {
  const color =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "rose"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-slate-200 bg-white text-slate-700";
  return (
    <div className={`rounded-2xl border p-4 ${color}`}>
      <p className="text-xs font-bold uppercase tracking-[0.14em]">{label}</p>
      <p className="mt-2 text-2xl font-extrabold">{value}</p>
    </div>
  );
}

export function SelectBlock({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  options: Array<{ value: number; label: string }>;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function UploadCard({
  title,
  file,
  onChange,
  onClear,
  onSave,
}: {
  title: string;
  file: File | null;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  onSave?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      const syntheticEvent = {
        target: { files: e.dataTransfer.files },
      } as unknown as ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClear();
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex cursor-pointer flex-col items-center rounded-3xl border-2 border-dashed p-6 transition ${
        dragging
          ? "border-brand-400 bg-brand-50/60"
          : file
            ? "border-emerald-300 bg-emerald-50/40"
            : "border-slate-300 bg-slate-50/70 hover:border-brand-300 hover:bg-brand-50/30"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={onChange}
        className="hidden"
      />

      {file ? (
        <>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <FiFile className="h-5 w-5" />
          </div>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
            {title}
          </p>
          <p className="mt-1 max-w-full truncate text-sm font-semibold text-slate-800">
            {file.name}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            {(file.size / 1024).toFixed(1)} KB
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
            >
              <FiTrash2 className="h-3.5 w-3.5" /> Quitar
            </button>
            {onSave ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSave();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-600 transition hover:bg-brand-50 hover:text-brand-700"
              >
                <FiSave className="h-3.5 w-3.5" /> Guardar
              </button>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <FiUploadCloud className="h-5 w-5" />
          </div>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
            {title}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Arrastra un archivo o <span className="font-semibold text-brand-600">click para elegir</span>
          </p>
          <p className="mt-0.5 text-xs text-slate-400">.xlsx, .xls</p>
        </>
      )}
    </div>
  );
}
