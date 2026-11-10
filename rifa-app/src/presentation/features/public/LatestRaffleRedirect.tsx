import { Ticket } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import type { Raffle } from '../../../domain';
import { useServices } from '../../shared/services';
import { PageLoader } from '../../shared/ui/Spinner';
import { CenteredMessage } from './PublicShell';

/** "/" lleva a la rifa activa más reciente. */
export const LatestRaffleRedirect = () => {
  const { raffles } = useServices();
  const [result, setResult] = useState<{ raffle: Raffle | null } | null>(null);

  useEffect(() => {
    let active = true;
    raffles
      .findLatestActive()
      .catch(() => null)
      .then((raffle) => active && setResult({ raffle }));
    return () => {
      active = false;
    };
  }, [raffles]);

  if (!result) return <PageLoader />;
  if (result.raffle) return <Navigate to={`/r/${result.raffle.id}`} replace />;
  return (
    <CenteredMessage icon={<Ticket size={64} />} title="No hay rifas activas">
      En este momento no hay ninguna rifa disponible. Vuelve más tarde.
    </CenteredMessage>
  );
};
