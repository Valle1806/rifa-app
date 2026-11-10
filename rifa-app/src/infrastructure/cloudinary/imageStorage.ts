import type { ImageStorage } from '../../application/ports';

const { VITE_CLOUDINARY_CLOUD_NAME: cloudName, VITE_CLOUDINARY_UPLOAD_PRESET: uploadPreset } = import.meta.env;

/**
 * Subida sin firma a Cloudinary. El preset debe restringir formatos, tamaño y
 * prohibir sobrescribir; el nombre final lo genera Cloudinary (no el cliente).
 */
export const cloudinaryStorage: ImageStorage = {
  async upload(file, folder) {
    if (!cloudName || !uploadPreset) {
      throw new Error('Falta configurar VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET.');
    }
    const body = new FormData();
    body.append('file', file);
    body.append('upload_preset', uploadPreset);
    body.append('folder', folder);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body });
    const payload = (await response.json()) as { secure_url?: string; error?: { message?: string } };
    if (!response.ok || !payload.secure_url) {
      throw new Error(payload.error?.message ?? 'No se pudo subir la imagen. Intenta de nuevo.');
    }
    return payload.secure_url;
  },
};
