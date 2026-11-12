import { normalizeName } from './buyer';
import type { PaymentLevel } from './order';
import type { Board } from './ticket';

/** Asesor registrado en una rifa. El `id` es corto y va en su enlace y en el tablero público. */
export interface Advisor {
  id: string;
  name: string;
  /** Inactivo: no aparece en el formulario, pero conserva sus ventas. */
  active: boolean;
}

/** Referencia que guarda una orden: el código y el nombre en ese momento. */
export interface AdvisorRef {
  id: string;
  name: string;
}

export const ADVISOR_ID_LENGTH = 6;

/** Clave para comparar nombres escritos a mano: "  juan   PÉREZ" ≈ "Juan Pérez". */
export const advisorKey = (name: string): string =>
  normalizeName(name)
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export const findAdvisorByName = (advisors: Advisor[], name: string | null): Advisor | null => {
  if (!name) return null;
  const key = advisorKey(name);
  return advisors.find((a) => advisorKey(a.name) === key) ?? null;
};

export const activeAdvisors = (advisors: Advisor[]): Advisor[] =>
  advisors.filter((a) => a.active).sort((a, b) => a.name.localeCompare(b.name, 'es'));

/** Lo que ve un asesor de un comprador suyo: el alias público, sus números y el estado. */
export interface AdvisorSale {
  alias: string;
  state: PaymentLevel;
  numbers: string[];
}

const STATE_ORDER: Record<PaymentLevel, number> = { reserved: 0, partial: 1, paid: 2 };

/**
 * Ventas de un asesor a partir del tablero público. Agrupa por alias y estado (los números
 * de una misma compra comparten ambos) y deja primero a quien no ha pagado.
 */
export const listAdvisorSales = (board: Board, advisorId: string): AdvisorSale[] => {
  const groups = new Map<string, AdvisorSale>();
  Object.entries(board).forEach(([number, entry]) => {
    if (entry.advisor !== advisorId) return;
    const key = `${entry.alias}|${entry.state}`;
    const group = groups.get(key) ?? { alias: entry.alias, state: entry.state, numbers: [] };
    group.numbers.push(number);
    groups.set(key, group);
  });
  return [...groups.values()]
    .map((g) => ({ ...g, numbers: g.numbers.sort() }))
    .sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state] || a.alias.localeCompare(b.alias, 'es'));
};
