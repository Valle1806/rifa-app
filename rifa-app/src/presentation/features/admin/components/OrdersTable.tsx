import { Search } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { deriveAccessState, formatMoney, type AccessState } from '../../../../domain';
import { Badge, StatusBadge } from '../../../shared/ui/Badge';
import { Select, TextInput } from '../../../shared/ui/form';
import { EmptyState, Panel } from '../../../shared/ui/Panel';
import { STATUS_META } from '../../../shared/statusMeta';
import type { OrderRow } from '../hooks/useAdminRaffle';

type Filter = 'all' | AccessState;
const FILTERS: Filter[] = ['all', 'pending', 'reserved', 'partial', 'paid', 'rejected', 'cancelled'];


const matches = (row: OrderRow, term: string) => {
  if (!term) return true;
  const { order } = row;
  return [order.buyer.name, order.buyer.phone, order.advisor ?? '', ...order.numbers].some((v) =>
    v.toLowerCase().includes(term),
  );
};

export const OrdersTable = ({ rows, price, onOpen }: { rows: OrderRow[]; price: number; onOpen: (row: OrderRow) => void }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const term = useDeferredValue(search.trim().toLowerCase());

  const visible = useMemo(
    () => rows.filter((r) => (filter === 'all' || deriveAccessState(r.order, price) === filter) && matches(r, term)),
    [rows, filter, term, price],
  );

  return (
    <Panel
      title="Compradores"
      actions={
        <div className="flex gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <TextInput
              aria-label="Buscar por nombre, celular, asesor o número"
              placeholder="Buscar..."
              className="pl-9 py-2 w-40 sm:w-56"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select aria-label="Filtrar por estado" className="py-2 w-auto" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
            {FILTERS.map((f) => (
              <option key={f} value={f}>
                {f === 'all' ? 'Todos' : STATUS_META[f].label}
              </option>
            ))}
          </Select>
        </div>
      }
    >
      {visible.length === 0 ? (
        <EmptyState>No hay compradores que coincidan.</EmptyState>
      ) : (
        <div className="overflow-x-auto -mx-5 sm:-mx-6">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
              <tr>
                <th className="px-5 sm:px-6 py-3">Comprador</th>
                <th className="px-3 py-3">Números</th>
                <th className="px-3 py-3">Estado</th>
                <th className="px-3 py-3 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((row) => (
                <tr key={row.order.id} className="hover:bg-slate-50">
                  <td className="px-5 sm:px-6 py-3">
                    <button type="button" className="text-left hover:text-indigo-700" onClick={() => onOpen(row)}>
                      <span className="block font-bold text-slate-900">{row.order.buyer.name}</span>
                      <span className="block text-xs text-slate-500">
                        {row.order.buyer.phone}
                        {row.order.advisor && ` · ${row.order.advisor}`}
                      </span>
                    </button>
                  </td>
                  <td className="px-3 py-3 font-black text-indigo-700 tabular-nums">{row.order.numbers.join(', ')}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      <StatusBadge state={deriveAccessState(row.order, price)} />
                      {row.pendingProofs > 0 && <Badge tone="sky">Comprobante</Badge>}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-bold tabular-nums">{formatMoney(row.summary.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
};
