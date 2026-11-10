import { DomainError } from '../domain';
import type { ImageStorage } from './ports';

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const assertValidImage = (file: File): void => {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new DomainError('INVALID_FILE', 'Sube una imagen JPG, PNG, WEBP o HEIC.');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new DomainError('INVALID_FILE', 'La imagen pesa más de 5 MB. Toma una captura más liviana.');
  }
};

export type ImageKind = 'receipt' | 'prize' | 'winner';

const FOLDERS: Record<ImageKind, string> = {
  receipt: 'comprobantes',
  prize: 'premio',
  winner: 'ganador',
};

export const uploadImage = (storage: ImageStorage, raffleId: string, kind: ImageKind, file: File): Promise<string> => {
  assertValidImage(file);
  return storage.upload(file, `rifas/${raffleId}/${FOLDERS[kind]}`);
};
