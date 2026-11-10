import { toBlob } from 'html-to-image';
import { useCallback, useState, type RefObject } from 'react';
import { useToast } from '../toast';

interface ShareOptions {
  fileName: string;
  title: string;
  text: string;
}

const render = async (node: HTMLElement) => {
  const blob = await toBlob(node, { pixelRatio: 2, cacheBust: true });
  if (!blob) throw new Error('No se pudo generar la imagen.');
  return blob;
};

const download = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: fileName });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const isCancel = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

/**
 * Convierte un nodo del DOM en PNG y lo comparte con el menú nativo del celular (WhatsApp, etc.).
 * Donde el navegador no puede compartir archivos, lo descarga.
 */
export const useShareImage = (ref: RefObject<HTMLElement | null>, options: ShareOptions) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const { fileName, title, text } = options;

  const withImage = useCallback(
    async (action: (blob: Blob) => Promise<void> | void) => {
      if (!ref.current) return;
      setBusy(true);
      try {
        await action(await render(ref.current));
      } catch (error) {
        if (!isCancel(error)) toast.error(error);
      } finally {
        setBusy(false);
      }
    },
    [ref, toast],
  );

  const save = useCallback(() => withImage((blob) => download(blob, fileName)), [withImage, fileName]);

  const share = useCallback(
    () =>
      withImage(async (blob) => {
        const file = new File([blob], fileName, { type: 'image/png' });
        if (!navigator.canShare?.({ files: [file] })) return download(blob, fileName);
        try {
          await navigator.share({ files: [file], title, text });
        } catch (error) {
          // Safari puede negar el permiso si la imagen tardó en generarse: se descarga en su lugar.
          if (error instanceof DOMException && error.name === 'NotAllowedError') return download(blob, fileName);
          throw error;
        }
      }),
    [withImage, fileName, title, text],
  );

  return { busy, share, save };
};
