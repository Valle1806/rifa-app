import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

/** Texto seleccionable con botón de copiar (con respaldo si el portapapeles falla). */
export const CopyField = ({ label, value }: { label: string; value: string }) => {
  const [copied, setCopied] = useState(false);

  const copy = async (input: HTMLInputElement | null) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      input?.select();
    }
  };

  return (
    <div className="space-y-1">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <div className="flex gap-2">
        <input
          readOnly
          value={value}
          onFocus={(e) => e.target.select()}
          className="flex-1 min-w-0 font-mono text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5"
        />
        <button
          type="button"
          onClick={(e) => copy(e.currentTarget.previousElementSibling as HTMLInputElement | null)}
          className="shrink-0 rounded-xl bg-indigo-600 text-white px-3 hover:bg-indigo-700 transition"
          aria-label={`Copiar ${label.toLowerCase()}`}
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
        </button>
      </div>
    </div>
  );
};
