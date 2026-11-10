interface ProgressBarProps {
  label: string;
  value: number;
  total: number;
}

export const ProgressBar = ({ label, value, total }: ProgressBarProps) => {
  const percent = total > 0 ? Math.min((value / total) * 100, 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm font-bold text-slate-500">
        <span>{label}</span>
        <span className="tabular-nums">
          {value} / {total}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={total}
        className="h-3 bg-slate-100 rounded-full overflow-hidden"
      >
        <div className="h-full bg-indigo-500 transition-all duration-700" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};
