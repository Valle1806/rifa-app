import { AlertCircle, CalendarClock, Gift, PackageCheck, Trophy } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { isDelivered, type Raffle, type RaffleResult, type Winner } from '../../../domain';
import { formatDateTime } from '../../shared/format';
import { useWatch } from '../../shared/hooks/useWatch';
import { useServices } from '../../shared/services';
import { Panel } from '../../shared/ui/Panel';
import { PageLoader } from '../../shared/ui/Spinner';
import { CenteredMessage, PublicShell } from './PublicShell';

const PrizeImage = ({ raffle }: { raffle: Raffle }) =>
  raffle.imageUrl ? (
    <img src={raffle.imageUrl} alt={`Premio: ${raffle.title}`} className="block w-48 h-auto mx-auto rounded-2xl shadow-lg border-4 border-white" />
  ) : (
    <div className="w-40 h-40 mx-auto rounded-2xl bg-slate-900 flex items-center justify-center" aria-hidden="true">
      <Gift size={56} className="text-indigo-400" />
    </div>
  );

const DeliveryPhotos = ({ winner }: { winner: Winner }) => (
  <div className="space-y-2">
    <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-700">
      <PackageCheck size={14} /> Premio entregado
    </p>
    <ul className="grid grid-cols-3 gap-2">
      {winner.deliveryPhotoUrls.map((url, i) => (
        <li key={url}>
          <a href={url} target="_blank" rel="noreferrer">
            <img
              src={url}
              alt={`Entrega de ${winner.prize}, foto ${i + 1}`}
              loading="lazy"
              className="aspect-square w-full rounded-xl object-cover border border-slate-200"
            />
          </a>
        </li>
      ))}
    </ul>
  </div>
);

const WinnerCard = ({ winner }: { winner: Winner }) => (
  <li className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-4">
    <div className="flex items-center gap-4">
      <span className="min-w-20 px-3 py-2 rounded-xl bg-slate-900 text-white text-3xl font-black text-center tabular-nums">
        {winner.winningNumber}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-widest text-amber-600 break-words">{winner.prize}</p>
        <p className="text-lg font-bold text-slate-900 break-words">
          {winner.winnerAlias ? `¡Felicitaciones, ${winner.winnerAlias}!` : 'Número no vendido'}
        </p>
      </div>
    </div>
    {isDelivered(winner) && <DeliveryPhotos winner={winner} />}
  </li>
);

const Announced = ({ result }: { result: RaffleResult }) => (
  <div className="space-y-6">
    <div className="text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
        <Trophy size={34} />
      </div>
      <p className="mt-3 text-xs font-black uppercase tracking-widest text-slate-400">
        {result.winners.length === 1 ? 'Número ganador' : 'Números ganadores'}
      </p>
    </div>
    <ul className="space-y-3 max-w-md mx-auto">
      {result.winners.map((w) => (
        <WinnerCard key={w.winningNumber} winner={w} />
      ))}
    </ul>
    {result.proofText && (
      <div className="max-w-md mx-auto rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
        <p className="text-xs font-black uppercase tracking-widest text-indigo-500">Resultado oficial</p>
        <p className="mt-1 text-slate-800 whitespace-pre-line break-words">{result.proofText}</p>
      </div>
    )}
    {result.proofImageUrl && (
      <figure className="max-w-md mx-auto space-y-2">
        <a href={result.proofImageUrl} target="_blank" rel="noreferrer">
          <img
            src={result.proofImageUrl}
            alt="Soporte del resultado del sorteo"
            className="w-full rounded-2xl border border-slate-200 bg-slate-900 object-contain max-h-[480px]"
          />
        </a>
        <figcaption className="text-center text-xs text-slate-500">Soporte del resultado. Toca la imagen para verla completa.</figcaption>
      </figure>
    )}
    <p className="text-center text-sm text-slate-500">Publicado el {formatDateTime(result.announcedAt)}</p>
  </div>
);

const NotYet = ({ raffle }: { raffle: Raffle }) => (
  <div className="text-center space-y-4">
    <div className="mx-auto w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
      <CalendarClock size={34} />
    </div>
    <p className="text-xl font-bold text-slate-900">El sorteo aún no se ha realizado</p>
    <p className="text-slate-600 whitespace-pre-line break-words">{raffle.description}</p>
    <p className="text-sm text-slate-500">Vuelve a esta página después del sorteo para ver el número ganador.</p>
  </div>
);

/** Página pública del resultado: a ella lleva el QR del comprobante. */
export const WinnerPage = () => {
  const { raffleId = null } = useParams();
  const { raffles } = useServices();
  const raffle = useWatch(raffleId, raffles.watch, null);

  if (raffle.loading) return <PageLoader />;
  if (!raffle.data) {
    return (
      <CenteredMessage icon={<AlertCircle size={64} />} title="Esta rifa no existe">
        Revisa el enlace que te compartieron.
      </CenteredMessage>
    );
  }

  const { data } = raffle;
  return (
    <PublicShell title={data.title} homeHref={`/r/${data.id}`}>
      <Panel>
        <div className="space-y-6 py-4">
          <PrizeImage raffle={data} />
          <h1 className="text-center text-2xl sm:text-3xl font-black text-slate-900 text-balance">{data.title}</h1>
          {data.result ? <Announced result={data.result} /> : <NotYet raffle={data} />}
        </div>
      </Panel>
      <p className="text-center">
        <Link to={`/r/${data.id}`} className="text-sm font-bold text-indigo-700 hover:underline">
          Ver la rifa
        </Link>
      </p>
    </PublicShell>
  );
};
