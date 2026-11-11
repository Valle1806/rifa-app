import { useMemo } from 'react';
import { renderSVG } from 'uqr';

/**
 * QR como imagen SVG embebida (data URI): no depende de la red, cumple la CSP
 * y html-to-image lo incluye tal cual al exportar el comprobante.
 */
export const QrCode = ({ value, size, label }: { value: string; size: number; label: string }) => {
  const src = useMemo(
    () => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderSVG(value, { border: 1, ecc: 'M' }))}`,
    [value],
  );
  return <img src={src} width={size} height={size} alt={label} className="shrink-0 rounded-lg" />;
};
