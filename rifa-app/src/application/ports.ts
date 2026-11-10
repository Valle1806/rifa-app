import type {
  AuditEntry,
  Board,
  Buyer,
  BuyerAccess,
  Order,
  Payment,
  PaymentSubmission,
  Raffle,
  RaffleDraft,
  RaffleStatus,
  TicketLock,
} from '../domain';

/**
 * Contratos que la capa de aplicación necesita del exterior.
 * Firebase, Cloudinary y el navegador los implementan en `infrastructure/`.
 */

export type Unsubscribe = () => void;
export type ErrorHandler = (error: Error) => void;
export type Watch<T> = (onNext: (value: T) => void, onError: ErrorHandler) => Unsubscribe;

export interface Session {
  uid: string;
  email: string | null;
  isAdmin: boolean;
}

export interface AuthGateway {
  watchSession(onChange: (session: Session | null) => void): Unsubscribe;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
}

export type RafflePatch = Partial<RaffleDraft> & { status?: RaffleStatus };

export interface RaffleRepository {
  listAll(): Promise<Raffle[]>;
  findLatestActive(): Promise<Raffle | null>;
  watch(raffleId: string): Watch<Raffle | null>;
  create(draft: RaffleDraft): Promise<string>;
  update(raffleId: string, patch: RafflePatch): Promise<void>;
  remove(raffleId: string): Promise<void>;
}

export interface BoardRepository {
  watchBoard(raffleId: string): Watch<Board>;
  watchLocks(raffleId: string): Watch<TicketLock[]>;
}

/** Datos de acceso del comprador que se crean junto con su orden. */
export interface AccessCredentials {
  token: string;
  pinHash: string;
}

export interface PublicRequestCommand {
  raffle: Raffle;
  numbers: string[];
  buyer: Buyer;
  advisor: string | null;
  credentials: AccessCredentials;
  proof: ProofInput | null;
}

export interface ProofInput {
  amount: number | null;
  receiptUrl: string;
  note: string | null;
}

export type NewPayment = Omit<Payment, 'id' | 'createdAt'>;

export interface AdminContext {
  raffle: Raffle;
  actor: string;
}

export interface OrderRepository {
  watchAll(raffleId: string): Watch<Order[]>;
  submitPublicRequest(command: PublicRequestCommand): Promise<string>;
  createDirect(
    ctx: AdminContext,
    input: { numbers: string[]; buyer: Buyer; advisor: string | null; payment: NewPayment | null; credentials: AccessCredentials },
  ): Promise<string>;
  approve(ctx: AdminContext, orderId: string): Promise<void>;
  reject(ctx: AdminContext, orderId: string): Promise<void>;
  cancel(ctx: AdminContext, orderId: string): Promise<void>;
  updateDetails(ctx: AdminContext, orderId: string, details: { buyer: Buyer; advisor: string | null }): Promise<void>;
  addPayment(ctx: AdminContext, orderId: string, payment: NewPayment): Promise<void>;
  removePayment(ctx: AdminContext, orderId: string, paymentId: string): Promise<void>;
}

export interface SubmissionRepository {
  submit(access: BuyerAccess, proof: ProofInput): Promise<void>;
  watchAll(raffleId: string): Watch<PaymentSubmission[]>;
  approve(ctx: AdminContext, submissionId: string, amount: number): Promise<void>;
  reject(ctx: AdminContext, submissionId: string): Promise<void>;
}

export interface AccessRepository {
  watch(token: string): Watch<BuyerAccess | null>;
  findTokenByPinHash(raffleId: string, pinHash: string): Promise<string | null>;
}

export interface AuditRepository {
  watchRecent(raffleId: string, max: number): Watch<AuditEntry[]>;
}

export interface LegacyMigrator {
  hasLegacyData(raffleId: string): Promise<boolean>;
  migrate(ctx: AdminContext): Promise<number>;
}

export interface ImageStorage {
  upload(file: File, folder: string): Promise<string>;
}

export interface SecureRandom {
  token(): string;
  pin(length: number): string;
  sha256(text: string): Promise<string>;
}
