import { UserX } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { listAdvisorSales, type PaymentLevel } from '../../../domain';
import { cn } from '../../shared/cn';
import { STATUS_META } from '../../shared/statusMeta';
import { StatusBadge } from '../../shared/ui/Badge';
import { EmptyState, Panel } from '../../shared/ui/Panel';
import { PageLoader } from '../../shared/ui/Spinner';
import { CenteredMessage, PublicShell } from '../public/PublicShell';
import { useRaffleBoard } from '../raffle/useRaffleBoard';

type Filter = 'all' | PaymentLevel;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'reserved', label: 'Sin pagar' },
  { value: 'partial', label: 'Abonado' },
  { value: 'paid', label: 'Pagado' },
];

const SUMMARY: { state: PaymentLevel; label: string }[] = [
  { state: 'reserved', label: 'Sin pagar' },
  { state: 'partial', label: 'Abonado' },
  { state: 'paid', label: 'Pagado' },
];

/**
 * Página pública de un asesor: a quién le vendió y quién le falta por pagar.
 * Solo usa el tablero público (alias + estado), sin celulares ni montos.
 */
export const AdvisorSalesPage = () => {
  const { raffleId = null, advisorId = '' } = useParams();
  const { raffle, availability, loading } = useRaffleBoard(raffleId);
  const [filter, setFilter] = useState<Filter>('all');

  const sales = useMemo(() => listAdvisorSales(availability.board, advisorId), [availability.board, advisorId]);
  const numbersByState = useMemo(() => {
    const counts: Record<PaymentLevel, number> = { reserved: 0, partial: 0, paid: 0 };
    sales.forEach((s) => (counts[s.state] += s.numbers.length));
    return counts;
  }, [sales]);

  if (loading) return <PageLoader />;
  const advisor = raffle?.advisors.find((a) => a.id === advisorId);
  if (!raffle || !advisor) {
    return (
      <CenteredMessage icon={<UserX size={64} />} title="Enlace no válido">
        Pide al organizador de la rifa que te envíe de nuevo tu enlace de asesor.
      </CenteredMessage>
    );
  }

  const visible = filter === 'all' ? sales : sales.filter((s) => s.state === filter);
  const totalNumbers = sales.reduce((acc, s) => acc + s.numbers.length, 0);

  return (
    <PublicShell title={raffle.title} homeHref={`/r/${raffle.id}`}>
      <section className="space-y-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Asesor</p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{advisor.name}</h1>
          <p className="text-sm text-slate-500">
            {totalNumbers} {totalNumbers === 1 ? 'número vendido' : 'números vendidos'} · se actualiza en tiempo real
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {SUMMARY.map(({ state, label }) => (
            <div key={state} className={cn('rounded-2xl border p-3 sm:p-4', STATUS_META[state].cell)}>
              <p className="text-2xl sm:text-3xl font-black tabular-nums">{numbersByState[state]}</p>
              <p className="text-xs font-bold uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <Panel>
        <div className="flex flex-wrap gap-2 mb-5" role="group" aria-label="Filtrar por estado">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-bold border transition',
                filter === f.value
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <EmptyState>{sales.length === 0 ? 'Aún no tienes ventas aprobadas en esta rifa.' : 'No hay compradores en este estado.'}</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100">
            {visible.map((s) => (
              <li key={`${s.alias}|${s.state}`} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">{s.alias || 'Sin nombre'}</p>
                  <p className="text-sm font-mono text-indigo-700 break-words">#{s.numbers.join(' #')}</p>
                </div>
                <StatusBadge state={s.state} />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <p className="text-xs text-slate-400 text-center">
        Solo aparecen las ventas aprobadas por el organizador. Los pagos se reflejan cuando él los registra.
      </p>
    </PublicShell>
  );
};
