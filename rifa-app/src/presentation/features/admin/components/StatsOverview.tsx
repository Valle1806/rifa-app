import { Clock, DollarSign, HandCoins, Ticket } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatMoney, type TicketCounts } from '../../../../domain';
import { cn } from '../../../shared/cn';

interface StatProps {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  accent: string;
}

const Stat = ({ label, value, detail, icon, accent }: StatProps) => (
  <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 min-w-0">
    <div className="flex items-center gap-3 mb-3">
      <div className={cn('p-2.5 rounded-2xl', accent)}>{icon}</div>
      <span className="text-slate-500 font-bold uppercase text-xs tracking-wider">{label}</span>
    </div>
    <p className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums truncate">{value}</p>
    <p className="text-xs text-slate-400 mt-1 font-semibold">{detail}</p>
  </div>
);

interface StatsOverviewProps {
  counts: TicketCounts;
  total: number;
  collected: number;
  receivable: number;
}

export const StatsOverview = ({ counts, total, collected, receivable }: StatsOverviewProps) => {
  const sold = counts.reserved + counts.partial + counts.paid;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <Stat label="Recaudado" value={formatMoney(collected)} detail="Pagos verificados" icon={<DollarSign size={22} />} accent="bg-emerald-100 text-emerald-700" />
      <Stat label="Por cobrar" value={formatMoney(receivable)} detail="Saldo de números asignados" icon={<HandCoins size={22} />} accent="bg-amber-100 text-amber-700" />
      <Stat
        label="Asignados"
        value={`${sold} / ${total}`}
        detail={`${counts.paid} pagados · ${counts.partial} abonados · ${counts.reserved} reservados`}
        icon={<Ticket size={22} />}
        accent="bg-indigo-100 text-indigo-700"
      />
      <Stat label="En revisión" value={String(counts.pending)} detail={`${counts.available} disponibles`} icon={<Clock size={22} />} accent="bg-sky-100 text-sky-700" />
    </div>
  );
};
