import {
  ADVISOR_ID_LENGTH,
  DomainError,
  NumbersUnavailableError,
  PIN_LENGTH,
  findAdvisorByName,
  findUnavailableNumbers,
  normalizeName,
  isRaffleOpen,
  isValidTicketNumber,
  resolveResult,
  type Advisor,
  type AdvisorRef,
  type Board,
  type BuyerAccess,
  type Order,
  type Raffle,
  type TicketLock,
  type WinnerDraft,
} from '../domain';
import { uploadImage } from './images';
import type {
  AccessCredentials,
  AccessRepository,
  AdminContext,
  AuditRepository,
  AuthGateway,
  BoardRepository,
  ImageStorage,
  LegacyMigrator,
  NewPayment,
  OrderRepository,
  RafflePatch,
  RaffleRepository,
  SecureRandom,
  SubmissionRepository,
} from './ports';
import {
  advisorNameSchema,
  numbersSchema,
  type BuyerFormValues,
  type PaymentFormValues,
  type PinLookupValues,
  type ProofFormValues,
  type RaffleFormValues,
} from './schemas';

export interface Dependencies {
  auth: AuthGateway;
  raffles: RaffleRepository;
  board: BoardRepository;
  orders: OrderRepository;
  submissions: SubmissionRepository;
  access: AccessRepository;
  audit: AuditRepository;
  legacy: LegacyMigrator;
  images: ImageStorage;
  random: SecureRandom;
}

export interface Availability {
  board: Board;
  locks: TicketLock[];
}

/** Un premio tal como lo edita el admin: las fotos ya publicadas más las nuevas por subir. */
export type WinnerInput = WinnerDraft & { newDeliveryPhotos: File[] };

export interface IssuedAccess {
  token: string;
  pin: string;
}

const hashPin = (random: SecureRandom, raffleId: string, phone: string, pin: string) =>
  random.sha256(`${raffleId}|${phone}|${pin}`);

const issueCredentials = async (
  random: SecureRandom,
  raffleId: string,
  phone: string,
): Promise<{ credentials: AccessCredentials; pin: string }> => {
  const pin = random.pin(PIN_LENGTH);
  const credentials = { token: random.token(), pinHash: await hashPin(random, raffleId, phone, pin) };
  return { credentials, pin };
};

const assertSelectableNumbers = (raffle: Raffle, numbers: string[], availability?: Availability, ownOrderId?: string) => {
  numbersSchema.parse(numbers);
  if (!numbers.every((n) => isValidTicketNumber(raffle, n))) {
    throw new DomainError('INVALID_NUMBERS', 'Hay números fuera del rango de esta rifa.');
  }
  if (!availability) return;
  const unavailable = findUnavailableNumbers(
    numbers,
    availability.board,
    availability.locks,
    raffle.reservationHours,
    Date.now(),
    ownOrderId,
  );
  if (unavailable.length > 0) throw new NumbersUnavailableError(unavailable);
};

const assertOpen = (raffle: Raffle) => {
  if (!isRaffleOpen(raffle)) throw new DomainError('RAFFLE_CLOSED', 'Esta rifa ya no recibe solicitudes.');
};

export interface ProofDraft extends ProofFormValues {
  file: File;
}

/** Casos de uso para compradores, sin login. */
export const createBuyerUseCases = ({ orders, submissions, access, images, random }: Dependencies) => ({
  async requestNumbers(input: {
    raffle: Raffle;
    numbers: string[];
    buyer: BuyerFormValues;
    proof: ProofDraft | null;
    availability: Availability;
  }): Promise<IssuedAccess> {
    const { raffle, numbers, buyer, proof, availability } = input;
    assertOpen(raffle);
    assertSelectableNumbers(raffle, numbers, availability);

    const receiptUrl = proof ? await uploadImage(images, raffle.id, 'receipt', proof.file) : null;
    const { credentials, pin } = await issueCredentials(random, raffle.id, buyer.phone);

    await orders.submitPublicRequest({
      raffle,
      numbers: [...numbers].sort(),
      buyer: { name: buyer.name, phone: buyer.phone },
      advisor: buyer.advisor,
      credentials,
      proof: proof && receiptUrl ? { amount: proof.amount, note: proof.note, receiptUrl } : null,
    });
    return { token: credentials.token, pin };
  },

  async findAccessToken(raffleId: string, values: PinLookupValues): Promise<string | null> {
    return access.findTokenByPinHash(raffleId, await hashPin(random, raffleId, values.phone, values.pin));
  },

  watchAccess: (token: string) => access.watch(token),

  async submitProof(buyerAccess: BuyerAccess, proof: ProofDraft): Promise<void> {
    const receiptUrl = await uploadImage(images, buyerAccess.raffleId, 'receipt', proof.file);
    await submissions.submit(buyerAccess, { amount: proof.amount, note: proof.note, receiptUrl });
  },
});

export interface PaymentDraft extends PaymentFormValues {
  file: File | null;
}

/** Casos de uso del panel de administración. Las reglas de Firestore exigen rol admin. */
export const createAdminUseCases = ({ raffles, orders, submissions, legacy, images, random }: Dependencies) => {
  const toPayment = async (raffleId: string, draft: PaymentDraft): Promise<NewPayment> => ({
    amount: draft.amount,
    method: draft.method,
    source: 'admin',
    receiptUrl: draft.file ? await uploadImage(images, raffleId, 'receipt', draft.file) : null,
  });

  const newAdvisorId = (existing: Advisor[]): string => {
    const taken = new Set(existing.map((a) => a.id));
    let id = '';
    while (id.length < ADVISOR_ID_LENGTH || taken.has(id)) {
      id = random.token().replace(/[^A-Za-z0-9]/g, '').slice(0, ADVISOR_ID_LENGTH);
    }
    return id;
  };

  /** Busca el asesor por nombre (sin importar mayúsculas ni tildes) o lo crea si no existe. */
  const ensureAdvisor = async (raffleId: string, rawName: string): Promise<Advisor> => {
    const name = advisorNameSchema.parse(rawName);
    let result: Advisor | null = null;
    await raffles.updateAdvisors(raffleId, (current) => {
      const found = findAdvisorByName(current, name);
      result = found ? { ...found, active: true } : { id: newAdvisorId(current), name, active: true };
      const created = result;
      return found ? current.map((a) => (a.id === created.id ? created : a)) : [...current, created];
    });
    return result!;
  };

  /** Texto del formulario → asesor registrado. Lo que el admin escribe en "Otro" queda creado. */
  const resolveAdvisor = async (raffle: Raffle, name: string | null): Promise<AdvisorRef | null> => {
    if (!name) return null;
    const found = findAdvisorByName(raffle.advisors, name);
    const advisor = found ?? (await ensureAdvisor(raffle.id, name));
    return { id: advisor.id, name: advisor.name };
  };

  const editAdvisor = (raffleId: string, id: string, change: Partial<Omit<Advisor, 'id'>>) =>
    raffles.updateAdvisors(raffleId, (current) => {
      if (change.name !== undefined) {
        const clash = findAdvisorByName(current, change.name);
        if (clash && clash.id !== id) throw new DomainError('DUPLICATE_ADVISOR', `Ya existe un asesor llamado ${clash.name}.`);
      }
      return current.map((a) => (a.id === id ? { ...a, ...change } : a));
    });

  return {
    listRaffles: () => raffles.listAll(),

    createAdvisor: (raffleId: string, name: string) => ensureAdvisor(raffleId, name),
    renameAdvisor: (raffleId: string, id: string, name: string) =>
      editAdvisor(raffleId, id, { name: advisorNameSchema.parse(name) }).then(() => undefined),
    setAdvisorActive: (raffleId: string, id: string, active: boolean) =>
      editAdvisor(raffleId, id, { active }).then(() => undefined),

    /** Asigna a varias órdenes el mismo asesor (crea el asesor si hace falta). Devuelve cuántas cambió. */
    async assignAdvisor(ctx: AdminContext, orderIds: string[], advisorName: string): Promise<number> {
      const advisor = await resolveAdvisor(ctx.raffle, advisorName);
      if (!advisor) return 0;
      for (const orderId of orderIds) await orders.assignAdvisor(ctx, orderId, advisor);
      return orderIds.length;
    },

    async createRaffle(values: RaffleFormValues, image: File | null): Promise<string> {
      const raffleId = await raffles.create({ ...values, imageUrl: null });
      if (image) await raffles.update(raffleId, { imageUrl: await uploadImage(images, raffleId, 'prize', image) });
      return raffleId;
    },

    updateRaffle: (raffleId: string, patch: RafflePatch) => raffles.update(raffleId, patch),
    uploadPrizeImage: (raffleId: string, file: File) => uploadImage(images, raffleId, 'prize', file),
    deleteRaffle: (raffleId: string) => raffles.remove(raffleId),

    /**
     * Publica los ganadores y cierra la rifa: ya no se venden números después del sorteo.
     * Sirve también para actualizar: agrega fotos de entrega nuevas a cada premio y,
     * si no llega una foto de soporte nueva, conserva la que ya estaba publicada.
     */
    async announceResult(
      raffle: Raffle,
      board: Board,
      winners: WinnerInput[],
      proof: { file: File | null; text: string },
    ): Promise<void> {
      // Valida todo (también el total de fotos por premio) antes de subir nada.
      const withPending = winners.map(({ newDeliveryPhotos, ...draft }) => ({
        ...draft,
        deliveryPhotoUrls: [...draft.deliveryPhotoUrls, ...newDeliveryPhotos.map((f) => f.name)],
      }));
      resolveResult(raffle, board, withPending, { imageUrl: null, text: proof.text }, Date.now());

      const upload = (kind: 'result' | 'winner', file: File) => uploadImage(images, raffle.id, kind, file);
      const imageUrl = proof.file ? await upload('result', proof.file) : (raffle.result?.proofImageUrl ?? null);
      const drafts: WinnerDraft[] = await Promise.all(
        winners.map(async ({ newDeliveryPhotos, ...draft }) => ({
          ...draft,
          deliveryPhotoUrls: [...draft.deliveryPhotoUrls, ...(await Promise.all(newDeliveryPhotos.map((f) => upload('winner', f))))],
        })),
      );
      const result = resolveResult(raffle, board, drafts, { imageUrl, text: proof.text }, Date.now());
      await raffles.update(raffle.id, { result, status: 'closed' });
    },

    clearResult: (raffleId: string) => raffles.update(raffleId, { result: null }),

    /** `advisorName` es el asesor elegido al aprobar; null deja la orden sin asesor. */
    async approveRequest(ctx: AdminContext, orderId: string, advisorName: string | null): Promise<void> {
      await orders.approve(ctx, orderId, await resolveAdvisor(ctx.raffle, advisorName));
    },
    rejectRequest: (ctx: AdminContext, orderId: string) => orders.reject(ctx, orderId),
    cancelOrder: (ctx: AdminContext, orderId: string) => orders.cancel(ctx, orderId),
    async updateOrderDetails(ctx: AdminContext, order: Order, buyer: BuyerFormValues): Promise<void> {
      // Un nombre antiguo sin asignar que no se tocó se deja igual: se resuelve desde "Unificar".
      const untouchedLegacy = order.advisorId === null && normalizeName(order.advisor ?? '') === (buyer.advisor ?? '');
      await orders.updateDetails(ctx, order.id, {
        buyer: { name: buyer.name, phone: buyer.phone },
        advisor: untouchedLegacy ? undefined : await resolveAdvisor(ctx.raffle, buyer.advisor),
      });
    },

    async createDirectOrder(
      ctx: AdminContext,
      input: { numbers: string[]; buyer: BuyerFormValues; payment: PaymentDraft | null; availability: Availability },
    ): Promise<IssuedAccess> {
      assertSelectableNumbers(ctx.raffle, input.numbers, input.availability);
      const { credentials, pin } = await issueCredentials(random, ctx.raffle.id, input.buyer.phone);
      await orders.createDirect(ctx, {
        numbers: [...input.numbers].sort(),
        buyer: { name: input.buyer.name, phone: input.buyer.phone },
        advisor: await resolveAdvisor(ctx.raffle, input.buyer.advisor),
        payment: input.payment ? await toPayment(ctx.raffle.id, input.payment) : null,
        credentials,
      });
      return { token: credentials.token, pin };
    },

    async addPayment(ctx: AdminContext, orderId: string, draft: PaymentDraft): Promise<void> {
      await orders.addPayment(ctx, orderId, await toPayment(ctx.raffle.id, draft));
    },

    removePayment: (ctx: AdminContext, orderId: string, paymentId: string) =>
      orders.removePayment(ctx, orderId, paymentId),

    approveSubmission: (ctx: AdminContext, submissionId: string, amount: number) =>
      submissions.approve(ctx, submissionId, amount),
    rejectSubmission: (ctx: AdminContext, submissionId: string) => submissions.reject(ctx, submissionId),

    hasLegacyData: (raffleId: string) => legacy.hasLegacyData(raffleId),
    migrateLegacy: (ctx: AdminContext) => legacy.migrate(ctx),
  };
};

export type BuyerUseCases = ReturnType<typeof createBuyerUseCases>;
export type AdminUseCases = ReturnType<typeof createAdminUseCases>;
