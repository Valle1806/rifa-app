import { describe, expect, it } from 'vitest';
import { activeAdvisors, advisorKey, findAdvisorByName, listAdvisorSales, type Advisor, type Board } from './index';

const advisors: Advisor[] = [
  { id: 'aaa111', name: 'Juan Pérez', active: true },
  { id: 'bbb222', name: 'Ana', active: false },
  { id: 'ccc333', name: 'Carlos', active: true },
];

describe('advisor', () => {
  it('compara nombres sin importar espacios, mayúsculas ni tildes', () => {
    expect(advisorKey('  juan   PEREZ ')).toBe(advisorKey('Juan Pérez'));
    expect(findAdvisorByName(advisors, 'juan perez')?.id).toBe('aaa111');
    expect(findAdvisorByName(advisors, 'Pedro')).toBeNull();
    expect(findAdvisorByName(advisors, null)).toBeNull();
  });

  it('ofrece solo los activos, en orden alfabético', () => {
    expect(activeAdvisors(advisors).map((a) => a.name)).toEqual(['Carlos', 'Juan Pérez']);
  });

  it('agrupa las ventas del asesor por comprador y deja primero a quien no ha pagado', () => {
    const board: Board = {
      '07': { state: 'paid', alias: 'Luis M.', advisor: 'aaa111' },
      '03': { state: 'reserved', alias: 'Rosa T.', advisor: 'aaa111' },
      '01': { state: 'reserved', alias: 'Rosa T.', advisor: 'aaa111' },
      '05': { state: 'partial', alias: 'Eva', advisor: 'aaa111' },
      '09': { state: 'reserved', alias: 'Otro', advisor: 'ccc333' },
      '11': { state: 'reserved', alias: 'Sin asesor' },
    };
    expect(listAdvisorSales(board, 'aaa111')).toEqual([
      { alias: 'Rosa T.', state: 'reserved', numbers: ['01', '03'] },
      { alias: 'Eva', state: 'partial', numbers: ['05'] },
      { alias: 'Luis M.', state: 'paid', numbers: ['07'] },
    ]);
    expect(listAdvisorSales(board, 'zzz999')).toEqual([]);
  });
});
