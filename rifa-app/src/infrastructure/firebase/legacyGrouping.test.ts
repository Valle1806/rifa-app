import { describe, expect, it } from 'vitest';
import { groupLegacyTickets, type LegacyTicket } from './legacyGrouping';

const ticket = (overrides: Partial<LegacyTicket>): LegacyTicket => ({
  id: '00',
  status: 'pagado_transferencia',
  buyerName: 'carlos perez',
  buyerPhone: '300 123 4567',
  advisor: null,
  receiptUrl: 'https://res.cloudinary.com/x/a.jpg',
  reservedAt: 1000,
  updatedAt: 2000,
  ...overrides,
});

describe('groupLegacyTickets', () => {
  it('agrupa por celular en una orden con todos los números y pagos', () => {
    const groups = groupLegacyTickets(
      [
        ticket({ id: '42', reservedAt: 3000 }),
        ticket({ id: '07', buyerPhone: '3001234567', status: 'pagado_efectivo', reservedAt: 1500 }),
        ticket({ id: '15', buyerPhone: '3109998888', buyerName: 'ana' }),
        ticket({ id: '99', status: 'disponible' }),
      ],
      30000,
    );

    expect(groups).toHaveLength(2);
    const carlos = groups.find((g) => g.numbers.includes('42'))!;
    expect(carlos.numbers).toEqual(['07', '42']);
    expect(carlos.payments.map((p) => [p.id, p.method, p.amount])).toEqual([
      ['legacy-42', 'transfer', 30000],
      ['legacy-07', 'cash', 30000],
    ]);
    expect(carlos.createdAt).toBe(1500);
  });

  it('separa personas distintas registradas con el mismo celular, pero ignora tildes y mayúsculas', () => {
    const groups = groupLegacyTickets(
      [
        ticket({ id: '01', buyerName: 'José Pérez' }),
        ticket({ id: '02', buyerName: 'jose perez ' }),
        ticket({ id: '03', buyerName: 'María Gómez' }),
      ],
      30000,
    );
    expect(groups.map((g) => g.numbers)).toEqual([['01', '02'], ['03']]);
  });

  it('deja los reservados sin pago y su comprobante como pendiente', () => {
    const [group] = groupLegacyTickets([ticket({ id: '10', status: 'reservado' })], 30000);
    expect(group.payments).toEqual([]);
    expect(group.pendingReceipts).toEqual([{ ticketId: '10', receiptUrl: 'https://res.cloudinary.com/x/a.jpg' }]);
  });

  it('no mezcla compradores sin celular y usa "Sin nombre" si falta', () => {
    const groups = groupLegacyTickets(
      [ticket({ id: '01', buyerPhone: '', buyerName: '' }), ticket({ id: '02', buyerPhone: '' })],
      30000,
    );
    expect(groups.map((g) => g.key)).toEqual(['ticket:01', 'ticket:02']);
    expect(groups[0].buyer.name).toBe('Sin nombre');
  });

  it('es estable: la misma entrada produce las mismas claves e ids de pago', () => {
    const input = [ticket({ id: '05' }), ticket({ id: '06' })];
    expect(groupLegacyTickets(input, 1)).toEqual(groupLegacyTickets(input, 1));
  });
});
