import { ChevronRight, LogOut, Plus, ShieldCheck } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import type { Raffle } from '../../../../domain';
import { cn } from '../../../shared/cn';
import { Badge } from '../../../shared/ui/Badge';

interface RaffleSidebarProps {
  raffles: Raffle[];
  onCreate: () => void;
  onSignOut: () => void;
}

export const RaffleSidebar = ({ raffles, onCreate, onSignOut }: RaffleSidebarProps) => (
  <aside className="hidden lg:flex flex-col w-72 shrink-0 bg-slate-900 text-white p-6 sticky top-0 h-screen overflow-y-auto">
    <div className="flex items-center gap-3 mb-10">
      <div className="bg-indigo-500 p-2 rounded-xl">
        <ShieldCheck size={24} />
      </div>
      <span className="font-bold text-xl tracking-tight">RifaMaster</span>
    </div>

    <nav className="flex-1 space-y-4" aria-label="Rifas">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Tus rifas</h2>
        <button type="button" onClick={onCreate} aria-label="Nueva rifa" className="p-1 hover:bg-slate-800 rounded-md text-indigo-300">
          <Plus size={18} />
        </button>
      </div>
      <ul className="space-y-1.5">
        {raffles.map((r) => (
          <li key={r.id}>
            <NavLink
              to={`/admin/${r.id}`}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-between gap-2 p-3 rounded-xl text-sm font-bold transition',
                  isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                )
              }
            >
              <span className="truncate">{r.title}</span>
              {r.status === 'closed' ? <Badge tone="neutral">Cerrada</Badge> : <ChevronRight size={14} />}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>

    <button type="button" onClick={onSignOut} className="flex items-center gap-3 text-slate-400 hover:text-white p-3 rounded-xl transition mt-10">
      <LogOut size={20} /> Cerrar sesión
    </button>
  </aside>
);
