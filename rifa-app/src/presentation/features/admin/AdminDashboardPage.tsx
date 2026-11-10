import { ExternalLink, Lock, LockOpen, LogOut, Plus, Settings, Ticket, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import type { AdminContext } from '../../../application/ports';
import type { IssuedAccess } from '../../../application/useCases';
import { useAsyncAction } from '../../shared/hooks/useAsyncAction';
import { useServices } from '../../shared/services';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { Select } from '../../shared/ui/form';
import { PageLoader } from '../../shared/ui/Spinner';
import { useSession } from '../auth/session';
import { AccessIssuedModal } from '../raffle/AccessIssuedModal';
import { AdminTicketBoard } from './components/AdminTicketBoard';
import { DirectSaleModal } from './components/DirectSaleModal';
import { InboxPanel } from './components/InboxPanel';
import { LegacyMigrationBanner } from './components/LegacyMigrationBanner';
import { OrderDetailModal } from './components/OrderDetailModal';
import { OrdersTable } from './components/OrdersTable';
import { RaffleFormModal } from './components/RaffleFormModal';
import { RaffleSidebar } from './components/RaffleSidebar';
import { AdvisorRanking, AuditFeed } from './components/SidePanels';
import { StatsOverview } from './components/StatsOverview';
import { useAdminRaffle, type AdminRaffleData } from './hooks/useAdminRaffle';
import { useRaffleList } from './hooks/useRaffleList';

type FormMode = 'create' | 'edit' | null;

const RaffleHeader = ({
  ctx,
  onEdit,
  onDelete,
}: {
  ctx: AdminContext;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const { admin } = useServices();
  const { pending, run } = useAsyncAction();
  const { raffle } = ctx;
  const open = raffle.status === 'active';

  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 truncate">{raffle.title}</h1>
          {!open && <Badge tone="neutral">Cerrada</Badge>}
        </div>
        <p className="text-slate-500 font-medium text-sm">Aprueba solicitudes, registra pagos y asigna números</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={`/r/${raffle.id}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          Ver pública <ExternalLink size={14} />
        </a>
        <Button
          variant="secondary"
          loading={pending}
          icon={open ? <Lock size={16} /> : <LockOpen size={16} />}
          onClick={() =>
            run(
              () => admin.updateRaffle(raffle.id, { status: open ? 'closed' : 'active' }),
              open ? 'Rifa cerrada: ya no recibe solicitudes' : 'Rifa abierta de nuevo',
            )
          }
        >
          {open ? 'Cerrar' : 'Abrir'}
        </Button>
        <Button variant="ghost" icon={<Settings size={18} />} onClick={onEdit} aria-label="Configurar rifa" />
        <Button variant="ghost" icon={<Trash2 size={18} />} onClick={onDelete} aria-label="Eliminar rifa" className="hover:text-rose-600" />
      </div>
    </header>
  );
};

const RaffleWorkspace = ({ data, ctx, onEdit, onDelete }: { data: AdminRaffleData; ctx: AdminContext; onEdit: () => void; onDelete: () => void }) => {
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [saleNumbers, setSaleNumbers] = useState<string[] | null>(null);
  const [issued, setIssued] = useState<{ access: IssuedAccess; numbers: string[] } | null>(null);
  const openRow = openOrderId ? data.ordersById.get(openOrderId) : undefined;

  return (
    <div className="space-y-8">
      <RaffleHeader ctx={ctx} onEdit={onEdit} onDelete={onDelete} />
      <LegacyMigrationBanner ctx={ctx} />
      <StatsOverview counts={data.counts} total={ctx.raffle.totalTickets} collected={data.collected} receivable={data.receivable} />
      <InboxPanel ctx={ctx} requests={data.pendingRequests} submissions={data.submissions} ordersById={data.ordersById} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8 min-w-0">
          <AdminTicketBoard
            views={data.views}
            rowByNumber={data.rowByNumber}
            onOpenOrder={(row) => setOpenOrderId(row.order.id)}
            onSell={setSaleNumbers}
          />
          <OrdersTable rows={data.rows} price={ctx.raffle.price} onOpen={(row) => setOpenOrderId(row.order.id)} />
        </div>
        <div className="space-y-8 min-w-0">
          <AdvisorRanking advisors={data.advisors} />
          <AuditFeed entries={data.audit} />
        </div>
      </div>

      <OrderDetailModal key={openOrderId} ctx={ctx} row={openRow} onClose={() => setOpenOrderId(null)} />
      <DirectSaleModal
        ctx={ctx}
        open={saleNumbers !== null}
        numbers={saleNumbers ?? []}
        availability={data.availability}
        onClose={() => setSaleNumbers(null)}
        onCreated={(access, numbers) => {
          setSaleNumbers(null);
          setIssued({ access, numbers });
        }}
      />
      <AccessIssuedModal
        issued={issued}
        title="Números asignados"
        intro="Comparte el enlace y el PIN con el comprador para que consulte su saldo y suba comprobantes."
        onClose={() => setIssued(null)}
      />
    </div>
  );
};

export const AdminDashboardPage = () => {
  const { raffleId } = useParams();
  const navigate = useNavigate();
  const session = useSession();
  const { admin, auth } = useServices();
  const list = useRaffleList();
  const data = useAdminRaffle(raffleId ?? null, session?.uid ?? '');
  const remove = useAsyncAction();
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!list.loaded) return <PageLoader />;
  if (!raffleId && list.raffles.length > 0) return <Navigate to={`/admin/${list.raffles[0].id}`} replace />;

  const signOut = () => auth.signOut().then(() => navigate('/login'));

  const deleteRaffle = async () => {
    const raffleToDelete = data.raffle;
    if (!raffleToDelete) return;
    const ok = await remove.run(() => admin.deleteRaffle(raffleToDelete.id).then(() => true), 'Rifa eliminada');
    setConfirmDelete(false);
    if (ok) {
      await list.reload();
      navigate('/admin', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <RaffleSidebar raffles={list.raffles} onCreate={() => setFormMode('create')} onSignOut={signOut} />

      <main className="flex-1 min-w-0 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
        <div className="flex lg:hidden items-center gap-2">
          <Select aria-label="Elegir rifa" className="py-2" value={raffleId ?? ''} onChange={(e) => navigate(`/admin/${e.target.value}`)}>
            {list.raffles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </Select>
          <Button variant="secondary" icon={<Plus size={18} />} onClick={() => setFormMode('create')} aria-label="Nueva rifa" />
          <Button variant="secondary" icon={<LogOut size={18} />} onClick={signOut} aria-label="Cerrar sesión" />
        </div>

        {list.raffles.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-24 gap-4">
            <div className="bg-indigo-100 p-6 rounded-3xl text-indigo-600">
              <Ticket size={48} />
            </div>
            <h1 className="text-3xl font-black text-slate-900">Bienvenido a RifaMaster</h1>
            <p className="text-slate-500 max-w-md">Aún no tienes rifas. Crea la primera para empezar a vender números.</p>
            <Button size="lg" icon={<Plus size={20} />} onClick={() => setFormMode('create')}>
              Crear mi primera rifa
            </Button>
          </div>
        ) : data.loading ? (
          <PageLoader />
        ) : data.ctx ? (
          <RaffleWorkspace data={data} ctx={data.ctx} onEdit={() => setFormMode('edit')} onDelete={() => setConfirmDelete(true)} />
        ) : (
          <p className="text-center text-slate-500 py-24">Esta rifa no existe o fue eliminada.</p>
        )}
      </main>

      <RaffleFormModal
        open={formMode !== null}
        raffle={formMode === 'edit' ? (data.raffle ?? undefined) : undefined}
        onClose={() => setFormMode(null)}
        onSaved={async (id) => {
          setFormMode(null);
          await list.reload();
          navigate(`/admin/${id}`);
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="¿Eliminar la rifa completa?"
        confirmLabel="Eliminar rifa"
        loading={remove.pending}
        onConfirm={deleteRaffle}
        onCancel={() => setConfirmDelete(false)}
      >
        Se eliminarán <strong>{data.raffle?.title}</strong>, todas sus compras, pagos y datos de compradores. El historial se
        conserva. Esta acción no se puede deshacer.
      </ConfirmDialog>
    </div>
  );
};
