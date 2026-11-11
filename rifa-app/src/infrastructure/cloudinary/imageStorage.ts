import type { ImageStorage, SecureRandom } from '../../application/ports';

const { VITE_CLOUDINARY_CLOUD_NAME: cloudName, VITE_CLOUDINARY_UPLOAD_PRESET: uploadPreset } = import.meta.env;

/** Formatos que los navegadores fuera de Apple no muestran: se entregan convertidos a JPG. */
const NON_WEB_FORMATS = /\.(heic|heif)$/i;

/** Cloudinary convierte al vuelo si se cambia la extensión de la URL de entrega. */
export const toWebFriendlyUrl = (url: string): string => url.replace(NON_WEB_FORMATS, '.jpg');

/**
 * Subida sin firma a Cloudinary. El public_id lo genera la app (128 bits aleatorios),
 * así dos archivos con el mismo nombre nunca chocan ni se adivinan, sin depender de
 * cómo quedó configurado el preset. El preset debe tener Overwrite desactivado.
 */
export const createCloudinaryStorage = (random: SecureRandom): ImageStorage => ({
  async upload(file, folder) {
    if (!cloudName || !uploadPreset) {
      throw new Error('Falta configurar VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET.');
    }
    const body = new FormData();
    body.append('file', file);
    body.append('upload_preset', uploadPreset);
    body.append('folder', folder);
    body.append('public_id', random.token());

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body });
    const payload = (await response.json()) as { secure_url?: string; error?: { message?: string } };
    if (!response.ok || !payload.secure_url) {
      throw new Error(payload.error?.message ?? 'No se pudo subir la imagen. Intenta de nuevo.');
    }
    return toWebFriendlyUrl(payload.secure_url);
  },
});
