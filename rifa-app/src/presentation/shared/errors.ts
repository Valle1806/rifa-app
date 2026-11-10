import { ZodError } from 'zod';
import { DomainError } from '../../domain';

const MESSAGES_BY_CODE: Record<string, string> = {
  'permission-denied': 'No se pudo guardar: los datos cambiaron o no tienes permiso. Recarga la página e intenta de nuevo.',
  unavailable: 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.',
  'resource-exhausted': 'Se alcanzó el límite diario del plan gratuito. Intenta más tarde.',
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/user-not-found': 'Correo o contraseña incorrectos.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos o restablece tu contraseña.',
  'auth/network-request-failed': 'No hay conexión. Revisa tu internet.',
};

const FALLBACK = 'Algo salió mal. Intenta de nuevo.';

/** Traduce cualquier error a un mensaje para el usuario. */
export const errorMessage = (error: unknown): string => {
  if (error instanceof DomainError) return error.message;
  if (error instanceof ZodError) return error.issues[0]?.message ?? FALLBACK;
  if (typeof error === 'object' && error !== null) {
    const { code, message } = error as { code?: unknown; message?: unknown };
    if (typeof code === 'string' && MESSAGES_BY_CODE[code]) return MESSAGES_BY_CODE[code];
    if (typeof code !== 'string' && typeof message === 'string' && message) return message;
  }
  return FALLBACK;
};
