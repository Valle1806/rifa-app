import { DomainError } from './errors';
import { isValidTicketNumber, type Raffle } from './raffle';
import type { Board } from './ticket';

/** Lo que el admin registra por cada premio. */
export interface WinnerDraft {
  prize: string;
  winningNumber: string;
  /** Fotos de la entrega del premio; se pueden agregar al publicar o después. */
  deliveryPhotoUrls: string[];
}

/** Un premio ya resuelto. Solo guarda el alias público, nunca el nombre completo. */
export interface Winner extends WinnerDraft {
  /** Alias del dueño del número, o null si el número no se vendió. */
  winnerAlias: string | null;
}

/** Resultado publicado del sorteo: uno o varios premios y la foto que respalda los números que salieron. */
export interface RaffleResult {
  winners: Winner[];
  /** Captura o foto del resultado oficial (lotería, transmisión...). */
  proofImageUrl: string | null;
  /** Texto del resultado oficial, p. ej. "Lotería de Medellín: 4521". */
  proofText: string;
  announcedAt: number;
}

export const MAX_WINNERS = 10;
export const MAX_DELIVERY_PHOTOS = 5;
export const MAX_PROOF_TEXT = 500;

/** Soporte del resultado: foto y/o texto, ambos opcionales. */
export interface ResultProof {
  imageUrl: string | null;
  text: string;
}

export const defaultPrizeLabel = (index: number): string => `Premio ${index + 1}`;

/** Arma el resultado a partir de los números que cayeron y de quién los tiene en el tablero. */
export const resolveResult = (
  raffle: Pick<Raffle, 'totalTickets' | 'digitCount'>,
  board: Board,
  drafts: WinnerDraft[],
  proof: ResultProof,
  now: number,
): RaffleResult => {
  if (drafts.length === 0 || drafts.length > MAX_WINNERS) {
    throw new DomainError('INVALID_NUMBERS', `Registra entre 1 y ${MAX_WINNERS} premios.`);
  }
  const invalid = drafts.find((d) => !isValidTicketNumber(raffle, d.winningNumber));
  if (invalid) {
    throw new DomainError(
      'INVALID_NUMBERS',
      `"${invalid.winningNumber}" no es válido: cada número debe tener ${raffle.digitCount} cifras y estar entre los de la rifa.`,
    );
  }
  if (drafts.some((d) => d.deliveryPhotoUrls.length > MAX_DELIVERY_PHOTOS)) {
    throw new DomainError('INVALID_FILE', `Máximo ${MAX_DELIVERY_PHOTOS} fotos de entrega por premio.`);
  }
  if (proof.text.length > MAX_PROOF_TEXT) {
    throw new DomainError('INVALID_NUMBERS', `El texto del resultado admite máximo ${MAX_PROOF_TEXT} caracteres.`);
  }
  const numbers = drafts.map((d) => d.winningNumber);
  if (new Set(numbers).size !== numbers.length) {
    throw new DomainError('INVALID_NUMBERS', 'Hay números ganadores repetidos.');
  }

  return {
    winners: drafts.map((d, i) => ({
      prize: d.prize.trim() || defaultPrizeLabel(i),
      winningNumber: d.winningNumber,
      winnerAlias: board[d.winningNumber]?.alias ?? null,
      deliveryPhotoUrls: d.deliveryPhotoUrls,
    })),
    proofImageUrl: proof.imageUrl,
    proofText: proof.text.trim(),
    announcedAt: now,
  };
};

export const isDelivered = (winner: Winner): boolean => winner.deliveryPhotoUrls.length > 0;

/** Premios que ganó un comprador con sus números. */
export const prizesWonBy = (result: RaffleResult | null, numbers: string[]): Winner[] =>
  result ? result.winners.filter((w) => numbers.includes(w.winningNumber)) : [];
