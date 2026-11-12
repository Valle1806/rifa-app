import { Check, Image as ImageIcon, Inbox, X } from 'lucide-react';
import { useState } from 'react';
import type { AdminContext } from '../../../../application/ports';
import { activeAdvisors, findAdvisorByName, formatMoney, type PaymentSubmission } from '../../../../domain';
import { formatDateTime } from '../../../shared/format';
import { useAsyncAction } from '../../../shared/hooks/useAsyncAction';
import { useServices } from '../../../shared/services';
import { Badge } from '../../../shared/ui/Badge';
import { Button } from '../../../shared/ui/Button';
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog';
import { Select } from '../../../shared/ui/form';
import { EmptyState, Panel } from '../../../shared/ui/Panel';
import type { OrderRow } from '../hooks/useAdminRaffle';
import { SubmissionReviewModal } from './SubmissionReviewModal';

interface InboxPanelProps {
  ctx: AdminContext;
  requests: OrderRow[];
  submissions: PaymentSubmission[];
  ordersById: Map<string, OrderRow>;
}

const RequestItem = ({ ctx, row, onReject }: { ctx: AdminContext; row: OrderRow; onReject: (row: OrderRow) => void }) => {
  const { admin } = useServices();
  const { pending, run } = useAsyncAction();
  const { order, summary, pendingProofs } = row;
  const known = findAdvisorByName(ctx.raffle.advisors, order.advisor);
  const isNewAdvisor = !!order.advisor && !known;
  // Asesor escrito en "Otro": por defecto se agrega a la lista; el admin puede corregirlo.
  const [advisorChoice, setAdvisorChoice] = useState<string>(order.advisor ?? '');
  const advisorToApply = isNewAdvisor ? advisorChoice || null : (known?.name ?? null);

  return (
    <li className="rounded-2xl border border-slate-100 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0 space-y-1">
        <p className="font-bold text-slate-900 truncate">{order.buyer.name}</p>
        <p className="text-xs text-slate-500">
          {order.buyer.phone} · {formatDateTime(order.createdAt)}
          {known && ` · Asesor: ${known.name}`}
        </p>
        {isNewAdvisor && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5 space-y-1.5">
            <label htmlFor={`advisor-${order.id}`} className="block text-xs font-bold text-amber-900">
              Asesor nuevo: «{order.advisor}»
            </label>
            <Select
              id={`advisor-${order.id}`}
              className="py-2 text-sm bg-white"
              value={advisorChoice}
              onChange={(e) => setAdvisorChoice(e.target.value)}
            >
              <option value={order.advisor ?? ''}>Agregar «{order.advisor}» como asesor</option>
              {activeAdvisors(ctx.raffle.advisors).map((a) => (
                <option key={a.id} value={a.name}>
                  Es {a.name}
                </option>
              ))}
              <option value="">Sin asesor</option>
            </Select>
          </div>
        )}
        <p className="text-sm">
          <span className="font-black text-indigo-700">#{order.numbers.join(', #')}</span>{' '}
          <span className="text-slate-500">({formatMoney(summary.total)})</span>
        </p>
        {pendingProofs > 0 && <Badge tone="sky">Con comprobante</Badge>}
      </div>
      <div className="flex gap-2 shrink-0">
        <Button variant="secondary" size="sm" icon={<X size={14} />} onClick={() => onReject(row)}>
          Rechazar
        </Button>
        <Button
          variant="success"
          size="sm"
          loading={pending}
          icon={<Check size={14} />}
          onClick={() => run(() => admin.approveRequest(ctx, order.id, advisorToApply), `Números de ${order.buyer.name} aprobados`)}
        >
          Aprobar
        </Button>
      </div>
    </li>
  );
};

/** Bandeja de lo que espera una decisión del admin: solicitudes y comprobantes. */
export const InboxPanel = ({ ctx, requests, submissions, ordersById }: InboxPanelProps) => {
  const { admin } = useServices();
  const { pending, run } = useAsyncAction();
  const [rejecting, setRejecting] = useState<OrderRow | null>(null);
  const [reviewing, setReviewing] = useState<PaymentSubmission | null>(null);
  const total = requests.length + submissions.length;

  const confirmReject = async () => {
    if (!rejecting) return;
    await run(() => admin.rejectRequest(ctx, rejecting.order.id), 'Solicitud rechazada; los números quedan libres');
    setRejecting(null);
  };

  return (
    <Panel
      title="Por revisar"
      icon={<Inbox size={18} className="text-indigo-500" />}
      actions={total > 0 && <Badge tone="indigo">{total}</Badge>}
    >
      {total === 0 ? (
        <EmptyState>No hay solicitudes ni comprobantes pendientes.</EmptyState>
      ) : (
        <div className="space-y-6">
          {requests.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Solicitudes de números</h4>
              <ul className="space-y-3">
                {requests.map((row) => (
                  <RequestItem key={row.order.id} ctx={ctx} row={row} onReject={setRejecting} />
                ))}
              </ul>
            </div>
          )}
          {submissions.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Comprobantes</h4>
              <ul className="space-y-3">
                {submissions.map((s) => {
                  const row = ordersById.get(s.orderId);
                  return (
                    <li key={s.id} className="rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
                      <ImageIcon size={20} className="text-slate-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 truncate">{row?.order.buyer.name ?? 'Orden eliminada'}</p>
                        <p className="text-xs text-slate-500">
                          {row && `#${row.order.numbers.join(', #')} · `}
                          {s.amount ? formatMoney(s.amount) : 'Sin valor'} · {formatDateTime(s.createdAt)}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => setReviewing(s)}>
                        Revisar
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={rejecting !== null}
        title="¿Rechazar solicitud?"
        confirmLabel="Rechazar"
        loading={pending}
        onConfirm={confirmReject}
        onCancel={() => setRejecting(null)}
      >
        Los números <strong>#{rejecting?.order.numbers.join(', #')}</strong> de {rejecting?.order.buyer.name} vuelven a
        quedar disponibles.
      </ConfirmDialog>

      <SubmissionReviewModal
        ctx={ctx}
        submission={reviewing}
        row={reviewing ? ordersById.get(reviewing.orderId) : undefined}
        onClose={() => setReviewing(null)}
      />
    </Panel>
  );
};
