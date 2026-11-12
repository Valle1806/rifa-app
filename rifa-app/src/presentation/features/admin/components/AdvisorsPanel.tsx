import { Check, Copy, ExternalLink, Eye, EyeOff, GitMerge, Pencil, UserPlus, Users, X } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import type { AdminContext } from '../../../../application/ports';
import { activeAdvisors, findAdvisorByName, formatMoney, type Advisor } from '../../../../domain';
import { advisorPath, advisorUrl } from '../../../shared/format';
import { useAsyncAction } from '../../../shared/hooks/useAsyncAction';
import { useServices } from '../../../shared/services';
import { useToast } from '../../../shared/toast';
import { cn } from '../../../shared/cn';
import { Badge } from '../../../shared/ui/Badge';
import { Button } from '../../../shared/ui/Button';
import { Select, TextInput } from '../../../shared/ui/form';
import { EmptyState, Panel } from '../../../shared/ui/Panel';
import type { AdvisorStats, UnassignedAdvisorGroup } from '../hooks/useAdminRaffle';

const IconButton = ({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
  >
    {children}
  </button>
);

const AddAdvisorForm = ({ raffleId }: { raffleId: string }) => {
  const { admin } = useServices();
  const { pending, run } = useAsyncAction();
  const [name, setName] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const created = await run(() => admin.createAdvisor(raffleId, name));
    if (created) setName('');
  };

  return (
    <form onSubmit={submit} className="flex gap-2">
      <TextInput
        aria-label="Nombre del nuevo asesor"
        placeholder="Nuevo asesor"
        className="py-2"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Button type="submit" size="sm" loading={pending} disabled={name.trim().length < 2} icon={<UserPlus size={14} />}>
        Agregar
      </Button>
    </form>
  );
};

const AdvisorItem = ({ ctx, advisor, stats }: { ctx: AdminContext; advisor: Advisor; stats: AdvisorStats | undefined }) => {
  const { admin } = useServices();
  const toast = useToast();
  const { pending, run } = useAsyncAction();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(advisor.name);
  const raffleId = ctx.raffle.id;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(advisorUrl(raffleId, advisor.id));
      toast.success(`Enlace de ${advisor.name} copiado`);
    } catch {
      toast.error(new Error('No se pudo copiar. Abre el enlace y cópialo desde el navegador.'));
    }
  };

  const rename = async (event: FormEvent) => {
    event.preventDefault();
    const ok = await run(() => admin.renameAdvisor(raffleId, advisor.id, name).then(() => true), 'Asesor renombrado');
    if (ok) setEditing(false);
  };

  if (editing) {
    return (
      <li>
        <form onSubmit={rename} className="flex gap-2">
          <TextInput aria-label="Nombre del asesor" className="py-2" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <Button type="submit" size="sm" variant="success" loading={pending} icon={<Check size={14} />} aria-label="Guardar nombre" />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            icon={<X size={14} />}
            aria-label="Cancelar"
            onClick={() => {
              setName(advisor.name);
              setEditing(false);
            }}
          />
        </form>
      </li>
    );
  }

  return (
    <li className={cn('flex items-center gap-2', !advisor.active && 'opacity-50')}>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-slate-800 truncate">
          {advisor.name}
          {!advisor.active && <span className="ml-2 text-[10px] font-bold uppercase text-slate-400">inactivo</span>}
        </p>
        <p className="text-[11px] text-slate-500 font-semibold tabular-nums">
          {stats?.numbers ?? 0} núm. · {formatMoney(stats?.collected ?? 0)}
          {(stats?.receivable ?? 0) > 0 && <span className="text-amber-700"> · debe {formatMoney(stats!.receivable)}</span>}
        </p>
      </div>
      <div className="flex shrink-0">
        <IconButton label={`Copiar enlace de ${advisor.name}`} onClick={copyLink}>
          <Copy size={15} />
        </IconButton>
        <a
          href={advisorPath(raffleId, advisor.id)}
          target="_blank"
          rel="noreferrer"
          aria-label={`Ver página de ${advisor.name}`}
          title="Ver su página"
          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
        >
          <ExternalLink size={15} />
        </a>
        <IconButton label={`Renombrar a ${advisor.name}`} onClick={() => setEditing(true)}>
          <Pencil size={15} />
        </IconButton>
        <IconButton
          label={advisor.active ? `Ocultar a ${advisor.name} del formulario` : `Mostrar a ${advisor.name} en el formulario`}
          onClick={() =>
            run(
              () => admin.setAdvisorActive(raffleId, advisor.id, !advisor.active),
              advisor.active ? `${advisor.name} ya no aparece en el formulario` : `${advisor.name} aparece de nuevo en el formulario`,
            )
          }
        >
          {advisor.active ? <EyeOff size={15} /> : <Eye size={15} />}
        </IconButton>
      </div>
    </li>
  );
};

const CREATE = '__create__';

const UnassignedItem = ({ ctx, group }: { ctx: AdminContext; group: UnassignedAdvisorGroup }) => {
  const { admin } = useServices();
  const { pending, run } = useAsyncAction();
  const match = findAdvisorByName(ctx.raffle.advisors, group.label);
  const [choice, setChoice] = useState(match?.name ?? CREATE);
  const options = match && !match.active ? [match, ...activeAdvisors(ctx.raffle.advisors)] : activeAdvisors(ctx.raffle.advisors);
  const target = choice === CREATE ? group.label : choice;
  const purchases = group.orderIds.length;

  return (
    <li className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-2">
      <p className="text-sm">
        <span className="font-bold text-slate-900">«{group.label}»</span>{' '}
        <span className="text-slate-500">
          · {purchases} {purchases === 1 ? 'compra' : 'compras'}, {group.numbers} núm.
        </span>
      </p>
      <div className="flex gap-2">
        <Select aria-label={`Asesor para «${group.label}»`} className="py-2 text-sm bg-white" value={choice} onChange={(e) => setChoice(e.target.value)}>
          {!match && <option value={CREATE}>Crear «{group.label}»</option>}
          {options.map((a) => (
            <option key={a.id} value={a.name}>
              Es {a.name}
            </option>
          ))}
        </Select>
        <Button
          size="sm"
          loading={pending}
          onClick={() => run(() => admin.assignAdvisor(ctx, group.orderIds, target), `Ventas de «${group.label}» asignadas a ${target}`)}
        >
          Aplicar
        </Button>
      </div>
    </li>
  );
};

interface AdvisorsPanelProps {
  ctx: AdminContext;
  stats: Map<string, AdvisorStats>;
  unassigned: UnassignedAdvisorGroup[];
  numbersWithoutAdvisor: number;
}

/** Asesores de la rifa: alta, enlace de cada uno, ventas y unificación de nombres escritos a mano. */
export const AdvisorsPanel = ({ ctx, stats, unassigned, numbersWithoutAdvisor }: AdvisorsPanelProps) => {
  const advisors = [...ctx.raffle.advisors].sort(
    (a, b) => Number(b.active) - Number(a.active) || (stats.get(b.id)?.numbers ?? 0) - (stats.get(a.id)?.numbers ?? 0),
  );

  return (
    <Panel
      title="Asesores"
      icon={<Users size={18} className="text-amber-500" />}
      actions={unassigned.length > 0 && <Badge tone="amber">{unassigned.length} por unificar</Badge>}
    >
      <div className="space-y-5">
        <AddAdvisorForm raffleId={ctx.raffle.id} />

        {advisors.length === 0 ? (
          <EmptyState>Aún no hay asesores registrados</EmptyState>
        ) : (
          <ul className="space-y-3">
            {advisors.map((a) => (
              <AdvisorItem key={a.id} ctx={ctx} advisor={a} stats={stats.get(a.id)} />
            ))}
          </ul>
        )}

        {unassigned.length > 0 && (
          <section className="space-y-3 border-t border-slate-100 pt-4">
            <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
              <GitMerge size={14} /> Por unificar
            </h4>
            <p className="text-xs text-slate-500">
              Ventas con el asesor escrito a mano. Asígnalas a un asesor de la lista para que salgan en su enlace.
            </p>
            <ul className="space-y-2">
              {unassigned.map((g) => (
                <UnassignedItem key={g.label} ctx={ctx} group={g} />
              ))}
            </ul>
          </section>
        )}

        {numbersWithoutAdvisor > 0 && (
          <p className="text-[11px] font-semibold text-slate-400">{numbersWithoutAdvisor} números vendidos sin asesor</p>
        )}
      </div>
    </Panel>
  );
};
