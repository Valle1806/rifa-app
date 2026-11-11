import { AlertCircle, Search, Share2, Trophy } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { IssuedAccess } from '../../../application/useCases';
import { MAX_NUMBERS_PER_REQUEST, isRaffleOpen, type TicketView } from '../../../domain';
import { resultPath } from '../../shared/format';
import { Button } from '../../shared/ui/Button';
import { PageLoader } from '../../shared/ui/Spinner';
import { AvailableNumbersModal } from '../raffle/AvailableNumbersModal';
import { RaffleHero } from '../raffle/RaffleHero';
import { TicketGrid, TicketLegend } from '../raffle/TicketGrid';
import { useRaffleBoard } from '../raffle/useRaffleBoard';
import { useTicketSelection } from '../raffle/useTicketSelection';
import { AccessIssuedModal } from '../raffle/AccessIssuedModal';
import { PaymentMethods } from './PaymentMethods';
import { CenteredMessage, PublicShell } from './PublicShell';
import { PurchaseRequestModal } from './PurchaseRequestModal';
import { SelectionBar } from './SelectionBar';

const isAvailable = (t: TicketView) => t.state === 'available';
const publicTooltip = (t: TicketView) => t.alias;
const never = () => false;

export const PublicRafflePage = () => {
  const { raffleId = null } = useParams();
  const { raffle, views, counts, availability, loading } = useRaffleBoard(raffleId);
  const selection = useTicketSelection(MAX_NUMBERS_PER_REQUEST);
  const [requestOpen, setRequestOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [issued, setIssued] = useState<{ access: IssuedAccess; numbers: string[] } | null>(null);

  const { toggle, clear } = selection;
  const handleTicketClick = useCallback((t: TicketView) => toggle(t.number), [toggle]);

  if (loading) return <PageLoader />;
  if (!raffle) {
    return (
      <CenteredMessage icon={<AlertCircle size={64} />} title="Esta rifa no existe">
        Revisa el enlace que te compartieron.
      </CenteredMessage>
    );
  }

  const open = isRaffleOpen(raffle);
  const soldCount = counts.reserved + counts.partial + counts.paid;

  return (
    <PublicShell
      title={raffle.title}
      homeHref={`/r/${raffle.id}`}
      actions={
        <>
          {raffle.result && (
            <Link
              to={resultPath(raffle.id)}
              className="flex items-center gap-1.5 text-sm font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-3 py-2 rounded-xl transition"
            >
              <Trophy size={16} /> Ganador
            </Link>
          )}
          <Link
            to={`/r/${raffle.id}/consultar`}
            className="flex items-center gap-1.5 text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-xl transition"
          >
            <Search size={16} /> Mis números
          </Link>
        </>
      }
    >
      <RaffleHero raffle={raffle} soldCount={soldCount} />

      <section className="space-y-6" aria-labelledby="pick-title">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 id="pick-title" className="text-2xl font-bold text-slate-900">
              {open ? 'Elige tus números' : 'Rifa cerrada'}
            </h2>
            <p className="text-slate-500">
              {open
                ? `Toca los números disponibles que quieras (hasta ${MAX_NUMBERS_PER_REQUEST}) y envía tu solicitud.`
                : 'Esta rifa ya no recibe solicitudes.'}
            </p>
            {open && (
              <Button variant="secondary" size="sm" className="mt-3" icon={<Share2 size={14} />} onClick={() => setShareOpen(true)}>
                Compartir números disponibles
              </Button>
            )}
          </div>
          <TicketLegend />
        </div>
        <TicketGrid
          tickets={views}
          selected={selection.selected}
          isClickable={open ? isAvailable : never}
          onTicketClick={handleTicketClick}
          tooltipFor={publicTooltip}
        />
      </section>

      <PaymentMethods />

      <AvailableNumbersModal raffle={raffle} views={views} open={shareOpen} onClose={() => setShareOpen(false)} />

      <SelectionBar
        numbers={selection.numbers}
        price={raffle.price}
        max={MAX_NUMBERS_PER_REQUEST}
        onClear={clear}
        onContinue={() => setRequestOpen(true)}
      />

      <PurchaseRequestModal
        open={requestOpen}
        raffle={raffle}
        numbers={selection.numbers}
        availability={availability}
        onClose={() => setRequestOpen(false)}
        onSubmitted={(access, numbers) => {
          setRequestOpen(false);
          clear();
          setIssued({ access, numbers });
        }}
      />

      <AccessIssuedModal
        issued={issued}
        title="¡Solicitud enviada!"
        intro="El organizador revisará tu solicitud y te confirmará."
        onClose={() => setIssued(null)}
      />
    </PublicShell>
  );
};
