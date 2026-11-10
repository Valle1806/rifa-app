export type DomainErrorCode =
  | 'NUMBERS_UNAVAILABLE'
  | 'RAFFLE_CLOSED'
  | 'INVALID_NUMBERS'
  | 'ORDER_NOT_PENDING'
  | 'NOT_FOUND'
  | 'INVALID_FILE';

/** Error de negocio con un mensaje apto para mostrar al usuario. */
export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}

export class NumbersUnavailableError extends DomainError {
  readonly numbers: string[];

  constructor(numbers: string[]) {
    super('NUMBERS_UNAVAILABLE', `Estos números ya no están disponibles: ${numbers.join(', ')}`);
    this.numbers = numbers;
  }
}
