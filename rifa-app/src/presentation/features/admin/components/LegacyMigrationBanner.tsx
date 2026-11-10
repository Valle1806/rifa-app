import { DatabaseZap } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AdminContext } from '../../../../application/ports';
import { useAsyncAction } from '../../../shared/hooks/useAsyncAction';
import { useServices } from '../../../shared/services';
import { Button } from '../../../shared/ui/Button';

/**
 * Aparece solo si la rifa todavía tiene datos del modelo anterior.
 * Migrarlos crea las órdenes y borra los nombres y comprobantes que eran públicos.
 */
export const LegacyMigrationBanner = ({ ctx }: { ctx: AdminContext }) => {
  const { admin } = useServices();
  const { pending, run } = useAsyncAction();
  const [check, setCheck] = useState<{ raffleId: string; hasLegacy: boolean } | null>(null);
  const raffleId = ctx.raffle.id;

  useEffect(() => {
    let active = true;
    admin
      .hasLegacyData(raffleId)
      .catch(() => false)
      .then((hasLegacy) => active && setCheck({ raffleId, hasLegacy }));
    return () => {
      active = false;
    };
  }, [admin, raffleId]);

  if (check?.raffleId !== raffleId || !check.hasLegacy) return null;

  const migrate = async () => {
    const count = await run(() => admin.migrateLegacy(ctx));
    if (count !== undefined) setCheck({ raffleId, hasLegacy: false });
  };

  return (
    <div role="alert" className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-3xl border border-amber-200 bg-amber-50 p-5">
      <DatabaseZap className="text-amber-600 shrink-0" size={28} />
      <div className="flex-1 text-sm text-amber-900">
        <p className="font-bold">Esta rifa tiene datos del sistema anterior.</p>
        <p>
          Mientras no los migres, la página pública muestra todos los números como disponibles. La migración crea las
          órdenes con sus pagos y borra los nombres y comprobantes que estaban expuestos.
        </p>
      </div>
      <Button onClick={migrate} loading={pending}>
        Migrar ahora
      </Button>
    </div>
  );
};
