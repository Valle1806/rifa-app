const dateTime = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

export const formatDateTime = (millis: number): string => dateTime.format(millis);

export const accessUrl = (token: string): string => `${window.location.origin}/mis-numeros/${token}`;

/** Enlace público de la rifa, donde el comprador escoge y separa sus números. */
export const raffleUrl = (raffleId: string): string => `${window.location.origin}/r/${raffleId}`;

/** Página pública donde un asesor ve sus ventas y a quién le falta pagar. */
export const advisorPath = (raffleId: string, advisorId: string): string => `/r/${raffleId}/asesor/${advisorId}`;
export const advisorUrl = (raffleId: string, advisorId: string): string => `${window.location.origin}${advisorPath(raffleId, advisorId)}`;

/** Ruta de la página del resultado del sorteo; absoluta cuando va en un QR o se comparte. */
export const resultPath = (raffleId: string): string => `/r/${raffleId}/ganador`;
export const resultUrl = (raffleId: string): string => `${window.location.origin}${resultPath(raffleId)}`;
