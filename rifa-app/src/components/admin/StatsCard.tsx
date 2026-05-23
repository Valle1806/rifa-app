import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: 'indigo' | 'emerald' | 'amber' | 'rose';
  progress?: number;
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, subtitle, icon, color = 'indigo', progress }) => {
  const colors = {
    indigo: 'bg-indigo-100 text-indigo-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
    rose: 'bg-rose-100 text-rose-600',
  };

  const barColors = {
    indigo: 'bg-indigo-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
      <div className="flex items-center gap-4 mb-4">
        <div className={`${colors[color]} p-3 rounded-2xl`}>{icon}</div>
        <span className="text-slate-500 font-bold uppercase text-xs tracking-wider">{title}</span>
      </div>
      <div className="text-3xl font-black text-slate-900">{value}</div>
      {subtitle && <div className="text-xs text-slate-400 mt-1 font-bold">{subtitle}</div>}
      {progress !== undefined && (
        <div className="h-2 bg-slate-100 rounded-full mt-3 overflow-hidden">
          <div className={`h-full ${barColors[color]}`} style={{ width: `${progress}%` }}></div>
        </div>
      )}
    </div>
  );
};
