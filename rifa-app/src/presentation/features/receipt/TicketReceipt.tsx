import { Ban, CheckCircle2, Clock, Ticket, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatMoney, type AccessState } from '../../../domain';
import { cn } from '../../shared/cn';
import { formatDateTime, resultUrl } from '../../shared/format';
import { QrCode } from './QrCode';
import type { ReceiptData } from './receiptData';

interface Headline {
  title: string;
  icon: ReactNode;
  band: string;
  /** Qué cifra se destaca: lo pagado o lo que falta por pagar. */
  amount: 'paid' | 'total';
}

const HEADLINES: Record<AccessState, Headline> = {
  pending: { title: 'Solicitud recibida', icon: <Clock size={30} />, band: 'from-sky-500 to-sky-600', amount: 'total' },
  reserved: { title: 'Números reservados', icon: <Ticket size={30} />, band: 'from-amber-500 to-orange-500', amount: 'total' },
  partial: { title: 'Abono registrado', icon: <Wallet size={30} />, band: 'from-indigo-500 to-violet-600', amount: 'paid' },
  paid: { title: '¡Pago completo!', icon: <CheckCircle2 size={30} />, band: 'from-emerald-500 to-teal-600', amount: 'paid' },
  rejected: { title: 'Solicitud rechazada', icon: <Ban size={30} />, band: 'from-rose-500 to-rose-600', amount: 'total' },
  cancelled: { title: 'Números liberados', icon: <Ban size={30} />, band: 'from-rose-500 to-rose-600', amount: 'total' },
};

const Row = ({ label, children, strong }: { label: string; children: ReactNode; strong?: boolean }) => (
  <div className="flex items-baseline justify-between gap-4 py-2">
    <dt className="text-[13px] text-slate-500">{label}</dt>
    <dd className={cn('text-right text-[14px] tabular-nums', strong ? 'font-black text-slate-900' : 'font-semibold text-slate-800')}>
      {children}
    </dd>
  </div>
);

/**
 * Comprobante tipo transacción bancaria, pensado para pantallazo o para exportarse como imagen.
 * Usa medidas fijas para que la imagen salga igual en cualquier pantalla.
 */
export const TicketReceipt = ({ data }: { data: ReceiptData }) => {
  const headline = HEADLINES[data.state];
  const highlight = headline.amount === 'paid' ? data.paid : data.total;

  return (
    <div className="w-full max-w-[360px] mx-auto bg-white rounded-[28px] overflow-hidden shadow-xl border border-slate-100 text-slate-900">
      <header className={cn('bg-gradient-to-br text-white px-6 pt-7 pb-6 text-center', headline.band)}>
        <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">{headline.icon}</div>
        <p className="text-xl font-black leading-tight">{headline.title}</p>
        <p className="text-sm text-white/85 mt-1 leading-snug">{data.raffleTitle}</p>
      </header>

      <div className="px-6 pt-5 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
          {headline.amount === 'paid' ? 'Total abonado' : 'Valor a pagar'}
        </p>
        <p className="text-4xl font-black tabular-nums mt-1">{formatMoney(highlight)}</p>
      </div>

      <div className="px-6 pt-5">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
          {data.numbers.length === 1 ? 'Tu número' : 'Tus números'}
        </p>
        <ul className="flex flex-wrap gap-2">
          {data.numbers.map((n) => (
            <li key={n} className="min-w-12 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xl font-black text-center tabular-nums">
              {n}
            </li>
          ))}
        </ul>
      </div>

      <dl className="px-6 pt-4 divide-y divide-slate-100">
        <Row label="A nombre de">{data.holder}</Row>
        <Row label="Valor total">{formatMoney(data.total)}</Row>
        <Row label="Abonado">{formatMoney(data.paid)}</Row>
        <Row label="Saldo pendiente" strong>
          {formatMoney(data.balance)}
        </Row>
        <Row label="Fecha">{formatDateTime(data.issuedAt)}</Row>
      </dl>

      {/* Borde de "papel rasgado" entre el detalle y la referencia */}
      <div className="relative my-4" aria-hidden="true">
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-100" />
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-100" />
        <div className="mx-6 border-t-2 border-dashed border-slate-200" />
      </div>

      <div className="px-6 flex items-center gap-4">
        <QrCode value={resultUrl(data.raffleId)} size={84} label="Código QR del resultado del sorteo" />
        <div className="min-w-0 text-xs text-slate-500 leading-snug">
          <p className="font-bold text-slate-800 text-[13px]">Resultado del sorteo</p>
          <p>Escanea el código para ver el número ganador cuando se publique.</p>
        </div>
      </div>

      <footer className="px-6 pt-4 pb-6 flex items-center justify-between text-xs text-slate-500">
        <span>
          Referencia <strong className="font-mono text-slate-800">{data.reference}</strong>
        </span>
        <span className="font-black text-indigo-600">RifaMaster</span>
      </footer>
    </div>
  );
};
