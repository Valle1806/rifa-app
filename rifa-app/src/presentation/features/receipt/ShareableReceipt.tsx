import { Download, Share2 } from 'lucide-react';
import { useRef } from 'react';
import { useShareImage } from '../../shared/hooks/useShareImage';
import { Button } from '../../shared/ui/Button';
import { receiptFileName, receiptShareText, type ReceiptData } from './receiptData';
import { TicketReceipt } from './TicketReceipt';

/** Comprobante con botones para enviarlo por WhatsApp o guardarlo como imagen. */
export const ShareableReceipt = ({ data }: { data: ReceiptData }) => {
  const frame = useRef<HTMLDivElement>(null);
  const { busy, share, save } = useShareImage(frame, {
    fileName: receiptFileName(data),
    title: data.raffleTitle,
    text: receiptShareText(data),
  });

  return (
    <div className="space-y-4">
      {/* El marco gris forma parte de la imagen: le da aire al comprobante y color a las muescas. */}
      <div ref={frame} className="bg-slate-100 p-5 rounded-3xl">
        <TicketReceipt data={data} />
      </div>
      <div className="grid grid-cols-2 gap-3 max-w-[360px] mx-auto">
        <Button onClick={share} loading={busy} icon={<Share2 size={16} />}>
          Compartir
        </Button>
        <Button variant="secondary" onClick={save} disabled={busy} icon={<Download size={16} />}>
          Descargar
        </Button>
      </div>
    </div>
  );
};
