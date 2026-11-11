import { Download, Share2 } from 'lucide-react';
import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { formatMoney, type Raffle, type TicketView } from '../../../domain';
import { cn } from '../../shared/cn';
import { raffleUrl } from '../../shared/format';
import { useShareImage } from '../../shared/hooks/useShareImage';
import { Button } from '../../shared/ui/Button';
import { Modal } from '../../shared/ui/Modal';

/** Hasta este tamaño la imagen muestra el tablero completo; por encima, solo los disponibles. */
const FULL_BOARD_LIMIT = 100;

/** Ancho fijo de la imagen: sale igual desde el celular o el computador. */
const CARD_WIDTH = 540;

/**
 * Escala para mostrar la tarjeta de 540 px dentro de pantallas angostas sin cambiar su tamaño real,
 * que es el que se captura. Devuelve la escala y el alto ya escalado que debe ocupar.
 */
const useFitToWidth = (outer: RefObject<HTMLElement | null>, inner: RefObject<HTMLElement | null>, active: boolean) => {
  const [fit, setFit] = useState({ scale: 1, height: 0 });
  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const update = () => {
      const scale = Math.min(1, o.clientWidth / CARD_WIDTH);
      setFit({ scale, height: i.offsetHeight * scale });
    };
    const observer = new ResizeObserver(update);
    observer.observe(o);
    observer.observe(i);
    update();
    return () => observer.disconnect();
  }, [outer, inner, active]);
  return fit;
};

const shareText = (raffle: Raffle, available: string[]) =>
  available.length === 0
    ? `¡Todos los números de "${raffle.title}" están vendidos!`
    : `¡Aún hay números para "${raffle.title}"! ${formatMoney(raffle.price)} cada uno.\n` +
      `Disponibles: ${available.join(', ')}\n` +
      `Separa el tuyo aquí: ${raffleUrl(raffle.id)}`;

/** Tarjeta que se convierte en imagen: números libres resaltados y los ocupados tachados. */
const AvailableNumbersCard = ({ raffle, tickets, availableCount }: { raffle: Raffle; tickets: TicketView[]; availableCount: number }) => {
  const showAll = raffle.totalTickets <= FULL_BOARD_LIMIT;
  const cells = showAll ? tickets : tickets.filter((t) => t.state === 'available');

  return (
    <div className="bg-white p-5 space-y-4">
      <div className="bg-indigo-600 text-white rounded-2xl px-5 py-4 text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-200">Números disponibles</p>
        <h3 className="text-2xl font-black leading-tight break-words">{raffle.title}</h3>
        <p className="mt-1 text-sm font-semibold text-indigo-100">
          {availableCount === 0 ? (
            '¡Todos vendidos!'
          ) : (
            <>
              Quedan <span className="font-black text-white">{availableCount}</span> de {raffle.totalTickets} ·{' '}
              {formatMoney(raffle.price)} c/u
            </>
          )}
        </p>
      </div>

      {cells.length > 0 && (
        <ul className="grid grid-cols-10 gap-1">
          {cells.map((t) => {
            const free = t.state === 'available';
            return (
              <li
                key={t.number}
                className={cn(
                  'aspect-square rounded-md flex items-center justify-center text-sm font-black tabular-nums',
                  free ? 'bg-white text-indigo-700 border-2 border-indigo-300' : 'bg-slate-100 text-slate-300 line-through',
                )}
              >
                {t.number}
              </li>
            );
          })}
        </ul>
      )}

      {showAll && (
        <div className="flex items-center justify-center gap-5 text-xs font-bold text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded border-2 border-indigo-300 bg-white" /> Disponible
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-slate-200" /> Ocupado
          </span>
        </div>
      )}

      <p className="text-center text-xs font-semibold text-slate-500 break-all">
        Separa el tuyo en <span className="text-indigo-600">{raffleUrl(raffle.id)}</span>
      </p>
    </div>
  );
};

/**
 * Imagen de los números libres para mandar por WhatsApp a posibles compradores.
 * Los números en revisión cuentan como ocupados: no se pueden ofrecer.
 */
export const AvailableNumbersModal = ({
  raffle,
  views,
  open,
  onClose,
}: {
  raffle: Raffle;
  views: TicketView[];
  open: boolean;
  onClose: () => void;
}) => {
  const outer = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const { scale, height } = useFitToWidth(outer, frame, open);
  const available = useMemo(() => views.filter((t) => t.state === 'available').map((t) => t.number), [views]);
  const { busy, share, save } = useShareImage(frame, {
    fileName: `numeros-disponibles-${raffle.id}.png`,
    title: raffle.title,
    text: shareText(raffle, available),
  });

  return (
    <Modal open={open} onClose={onClose} title="Números disponibles" size="lg">
      <div className="space-y-4">
        <div ref={outer} className="w-full max-w-[540px] mx-auto overflow-hidden" style={{ height: height || undefined }}>
          <div style={{ width: CARD_WIDTH, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <div ref={frame} className="rounded-2xl overflow-hidden border border-slate-200">
              <AvailableNumbersCard raffle={raffle} tickets={views} availableCount={available.length} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 max-w-[360px] mx-auto">
          <Button onClick={share} loading={busy} icon={<Share2 size={16} />}>
            Compartir
          </Button>
          <Button variant="secondary" onClick={save} disabled={busy} icon={<Download size={16} />}>
            Descargar
          </Button>
        </div>
        <p className="text-center text-xs text-slate-500">
          Al compartir también se envía el texto con la lista de disponibles y el enlace de la rifa.
        </p>
      </div>
    </Modal>
  );
};
