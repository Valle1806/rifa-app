import { describe, expect, it } from 'vitest';
import { DomainError } from './errors';
import { prizesWonBy, resolveResult } from './result';
import type { Board } from './ticket';

const raffle = { totalTickets: 100, digitCount: 2 };
const board: Board = { '07': { state: 'paid', alias: 'Carlos P.' } };
const NO_PROOF = { imageUrl: null, text: '' };

describe('resolveResult', () => {
  it('resuelve varios premios con el alias público y la foto de soporte', () => {
    const result = resolveResult(
      raffle,
      board,
      [
        { prize: 'Celular', winningNumber: '07', deliveryPhotoUrls: ['https://res.cloudinary.com/x/entrega.jpg'] },
        { prize: '  ', winningNumber: '42', deliveryPhotoUrls: [] },
      ],
      { imageUrl: 'https://res.cloudinary.com/x/proof.jpg', text: '  Lotería de Medellín: 4507 ' },
      123,
    );
    expect(result).toEqual({
      winners: [
        { prize: 'Celular', winningNumber: '07', winnerAlias: 'Carlos P.', deliveryPhotoUrls: ['https://res.cloudinary.com/x/entrega.jpg'] },
        { prize: 'Premio 2', winningNumber: '42', winnerAlias: null, deliveryPhotoUrls: [] },
      ],
      proofImageUrl: 'https://res.cloudinary.com/x/proof.jpg',
      proofText: 'Lotería de Medellín: 4507',
      announcedAt: 123,
    });
  });

  it.each(['7', '100', 'ab', ''])('rechaza el número inválido "%s"', (n) => {
    expect(() => resolveResult(raffle, board, [{ prize: '', winningNumber: n, deliveryPhotoUrls: [] }], NO_PROOF, 1)).toThrow(DomainError);
  });

  it('rechaza números repetidos y listas vacías', () => {
    const twice = [
      { prize: 'A', winningNumber: '07', deliveryPhotoUrls: [] },
      { prize: 'B', winningNumber: '07', deliveryPhotoUrls: [] },
    ];
    expect(() => resolveResult(raffle, board, twice, NO_PROOF, 1)).toThrow('repetidos');
    expect(() => resolveResult(raffle, board, [], NO_PROOF, 1)).toThrow(DomainError);
  });

  it('limita el texto del resultado', () => {
    const one = [{ prize: 'A', winningNumber: '07', deliveryPhotoUrls: [] }];
    expect(() => resolveResult(raffle, board, one, { imageUrl: null, text: 'x'.repeat(501) }, 1)).toThrow('máximo');
  });

  it('limita las fotos de entrega por premio', () => {
    const photos = Array.from({ length: 6 }, (_, i) => `https://res.cloudinary.com/x/${i}.jpg`);
    expect(() => resolveResult(raffle, board, [{ prize: 'A', winningNumber: '07', deliveryPhotoUrls: photos }], NO_PROOF, 1)).toThrow(
      'Máximo',
    );
  });
});

describe('prizesWonBy', () => {
  it('devuelve solo los premios de los números del comprador', () => {
    const drafts = [
      { prize: 'A', winningNumber: '07', deliveryPhotoUrls: [] },
      { prize: 'B', winningNumber: '42', deliveryPhotoUrls: [] },
    ];
    const result = resolveResult(raffle, board, drafts, NO_PROOF, 1);
    expect(prizesWonBy(result, ['07', '10']).map((w) => w.prize)).toEqual(['A']);
    expect(prizesWonBy(null, ['07'])).toEqual([]);
  });
});
