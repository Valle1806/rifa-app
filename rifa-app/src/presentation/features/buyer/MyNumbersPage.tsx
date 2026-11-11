import { KeyRound, Trophy } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { formatMoney, prizesWonBy, type AccessState, type RaffleResult } from '../../../domain';
import { formatDateTime, resultPath } from '../../shared/format';
import { useWatch } from '../../shared/hooks/useWatch';
import { useServices } from '../../shared/services';
import { StatusBadge } from '../../shared/ui/Badge';
import { Panel } from '../../shared/ui/Panel';
import { PageLoader } from '../../shared/ui/Spinner';
import { ProgressBar } from '../raffle/ProgressBar';
import { CenteredMessage, PublicShell } from '../public/PublicShell';
import { receiptFromAccess } from '../receipt/receiptData';
import { ShareableReceipt } from '../receipt/ShareableReceipt';
import { ProofUploadForm } from './ProofUploadForm';

const STATE_HELP: Record<AccessState, string> = {
  pending: 'Tu solicitud está en revisión. Mientras tanto ya puedes subir comprobantes.',
  reserved: 'Tus números están reservados. Sube el comprobante cuando pagues.',
  partial: 'Recibimos parte del pago. Puedes seguir abonando y subir cada comprobante.',
  paid: '¡Tus números están pagados! Mucha suerte en el sorteo.',
  rejected: 'Esta solicitud fue rechazada. Si crees que es un error, contacta al organizador.',
  cancelled: 'Estos números fueron liberados. Contacta al organizador si tienes dudas.',
};

/** Texto del botón al resultado: felicita si alguno de sus números ganó. */
const resultLabel = (result: RaffleResult | null, numbers: string[]): string => {
  if (!result) return 'Ver resultado del sorteo';
  const won = prizesWonBy(result, numbers);
  return won.length > 0
    ? `¡Ganaste ${won.map((w) => `${w.prize} con el ${w.winningNumber}`).join(' y ')}!`
    : 'Ver resultado del sorteo';
};

const ACCEPTS_PROOFS: AccessState[] = ['pending', 'reserved', 'partial'];

/** Enlace personal del comprador: estado, saldo y subida de comprobantes. */
export const MyNumbersPage = () => {
  const { token = null } = useParams();
  const { buyer, raffles } = useServices();
  const access = useWatch(token, buyer.watchAccess, null);
  const raffle = useWatch(access.data?.raffleId ?? null, raffles.watch, null);

  if (access.loading || raffle.loading) return <PageLoader />;
  if (!access.data) {
    return (
      <CenteredMessage icon={<KeyRound size={64} />} title="Enlace no válido">
        Revisa que el enlace esté completo, o consulta tus números con tu celular y PIN.
      </CenteredMessage>
    );
  }

  const { data: me } = access;
  const balance = Math.max(me.total - me.paid, 0);

  return (
    <PublicShell title={raffle.data?.title ?? 'Mis números'} homeHref={`/r/${me.raffleId}`}>
      <Panel>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Hola, {me.alias}</p>
            <h1 className="text-2xl font-black text-slate-900">Tus números</h1>
          </div>
          <StatusBadge state={me.state} />
        </div>

        <ul className="flex flex-wrap gap-2 mt-5" aria-label="Números">
          {me.numbers.map((n) => (
            <li key={n} className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-black text-lg tabular-nums">
              {n}
            </li>
          ))}
        </ul>

        <dl className="grid grid-cols-3 gap-3 mt-6 text-center">
          {[
            ['Total', me.total],
            ['Abonado', me.paid],
            ['Saldo', balance],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-slate-50 p-3">
              <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</dt>
              <dd className="font-black text-slate-900 tabular-nums">{formatMoney(value as number)}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5">
          <ProgressBar label="Pagado" value={me.paid} total={me.total} />
        </div>

        <p className="mt-5 text-sm text-slate-600">{STATE_HELP[me.state]}</p>
        <p className="mt-1 text-xs text-slate-400">Actualizado: {formatDateTime(me.updatedAt)}</p>

        <Link
          to={resultPath(me.raffleId)}
          className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 hover:bg-amber-100 transition"
        >
          <Trophy size={18} />
          {resultLabel(raffle.data?.result ?? null, me.numbers)}
        </Link>
      </Panel>

      <Panel title="Tu comprobante">
        <p className="text-sm text-slate-500 mb-4">Compártelo por WhatsApp o guárdalo como imagen.</p>
        <ShareableReceipt data={receiptFromAccess(me, raffle.data?.title ?? 'Rifa')} />
      </Panel>

      {ACCEPTS_PROOFS.includes(me.state) && (
        <Panel title="Subir comprobante">
          <ProofUploadForm access={me} />
        </Panel>
      )}
    </PublicShell>
  );
};
