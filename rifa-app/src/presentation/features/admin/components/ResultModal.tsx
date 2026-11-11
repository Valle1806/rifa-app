import { ExternalLink, Plus, Trash2, Trophy } from 'lucide-react';
import { useState } from 'react';
import type { AdminContext } from '../../../../application/ports';
import type { WinnerInput } from '../../../../application/useCases';
import { MAX_DELIVERY_PHOTOS, MAX_PROOF_TEXT, MAX_WINNERS, defaultPrizeLabel, formatMoney, isValidTicketNumber, type Board } from '../../../../domain';
import { formatDateTime, resultPath } from '../../../shared/format';
import { useAsyncAction } from '../../../shared/hooks/useAsyncAction';
import { useServices } from '../../../shared/services';
import { Button } from '../../../shared/ui/Button';
import { Field, TextArea, TextInput } from '../../../shared/ui/form';
import { ImagePicker } from '../../../shared/ui/ImagePicker';
import { Modal } from '../../../shared/ui/Modal';
import { MultiImagePicker } from '../../../shared/ui/MultiImagePicker';
import type { OrderRow } from '../hooks/useAdminRaffle';

interface ResultModalProps {
  ctx: AdminContext;
  board: Board;
  rowByNumber: Map<string, OrderRow>;
  onClose: () => void;
}

/** Quién tiene el número, para confirmar antes de publicar (aquí sí se ve el nombre completo). */
const OwnerPreview = ({ row }: { row: OrderRow | undefined }) => {
  if (!row) return <p className="text-xs text-slate-500">No vendido: se publicará sin ganador.</p>;
  const { order, summary } = row;
  return (
    <p className="text-xs text-slate-600">
      <strong className="text-slate-900">{order.buyer.name}</strong> · {order.buyer.phone || 'sin celular'} · pagó{' '}
      {formatMoney(summary.paid)} de {formatMoney(summary.total)}
      {summary.balance > 0 && <span className="block font-semibold text-amber-700">Tiene saldo pendiente.</span>}
    </p>
  );
};

const emptyDraft = (index: number): WinnerInput => ({
  prize: defaultPrizeLabel(index),
  winningNumber: '',
  deliveryPhotoUrls: [],
  newDeliveryPhotos: [],
});

export const ResultModal = ({ ctx, board, rowByNumber, onClose }: ResultModalProps) => {
  const { admin } = useServices();
  const { pending, run } = useAsyncAction();
  const { raffle } = ctx;
  const [drafts, setDrafts] = useState<WinnerInput[]>(() =>
    raffle.result
      ? raffle.result.winners.map(({ prize, winningNumber, deliveryPhotoUrls }) => ({
          prize,
          winningNumber,
          deliveryPhotoUrls,
          newDeliveryPhotos: [],
        }))
      : [emptyDraft(0)],
  );
  const [proof, setProof] = useState<File | null>(null);
  const [proofText, setProofText] = useState(raffle.result?.proofText ?? '');
  const allValid = drafts.every((d) => isValidTicketNumber(raffle, d.winningNumber));

  const edit = (index: number, patch: Partial<WinnerInput>) =>
    setDrafts((list) => list.map((d, i) => (i === index ? { ...d, ...patch } : d)));

  const publish = async () => {
    const done = await run(() => admin.announceResult(raffle, board, drafts, { file: proof, text: proofText }).then(() => true), 'Resultado publicado');
    if (done) onClose();
  };
  const clear = async () => {
    const done = await run(() => admin.clearResult(raffle.id).then(() => true), 'Resultado retirado');
    if (done) onClose();
  };

  return (
    <Modal open onClose={onClose} title="Resultado del sorteo" size="lg">
      <div className="space-y-6">
        {raffle.result && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex flex-wrap items-center justify-between gap-2">
            <span>Publicado el {formatDateTime(raffle.result.announcedAt)}.</span>
            <a href={resultPath(raffle.id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold underline">
              Ver página del resultado <ExternalLink size={14} />
            </a>
          </div>
        )}

        <Field label="Resultado oficial (opcional)" htmlFor="result-text" hint="Por ejemplo: Lotería de Medellín del 20 de junio: 4521, juega con las 2 últimas cifras (21).">
          <TextArea
            id="result-text"
            rows={3}
            maxLength={MAX_PROOF_TEXT}
            value={proofText}
            onChange={(e) => setProofText(e.target.value)}
          />
        </Field>

        <ImagePicker
          id="result-proof"
          label="Foto del resultado (opcional)"
          hint="Captura de la lotería o del sorteo que respalda los números que salieron."
          value={proof}
          onChange={setProof}
          currentUrl={raffle.result?.proofImageUrl}
        />

        <fieldset className="space-y-3">
          <legend className="text-sm font-bold text-slate-700 mb-2">Premios y números ganadores</legend>
          {drafts.map((draft, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 p-3 space-y-2">
              <div className="flex gap-2">
                <TextInput
                  aria-label={`Nombre del premio ${i + 1}`}
                  value={draft.prize}
                  maxLength={60}
                  onChange={(e) => edit(i, { prize: e.target.value })}
                  className="flex-1 min-w-0"
                />
                <TextInput
                  aria-label={`Número ganador del premio ${i + 1}`}
                  placeholder={'0'.repeat(raffle.digitCount)}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={raffle.digitCount}
                  value={draft.winningNumber}
                  onChange={(e) => edit(i, { winningNumber: e.target.value.replace(/\D/g, '') })}
                  className="w-24 text-center text-xl font-black tabular-nums"
                />
                {drafts.length > 1 && (
                  <Button
                    variant="ghost"
                    icon={<Trash2 size={16} />}
                    aria-label={`Quitar premio ${i + 1}`}
                    onClick={() => setDrafts((list) => list.filter((_, j) => j !== i))}
                  />
                )}
              </div>
              {isValidTicketNumber(raffle, draft.winningNumber) && <OwnerPreview row={rowByNumber.get(draft.winningNumber)} />}
              <MultiImagePicker
                id={`delivery-${i}`}
                label="Fotos de la entrega"
                hint={`Opcional. Puedes agregarlas ahora o cuando entregues el premio (máximo ${MAX_DELIVERY_PHOTOS}).`}
                urls={draft.deliveryPhotoUrls}
                onUrlsChange={(deliveryPhotoUrls) => edit(i, { deliveryPhotoUrls })}
                files={draft.newDeliveryPhotos}
                onFilesChange={(newDeliveryPhotos) => edit(i, { newDeliveryPhotos })}
                max={MAX_DELIVERY_PHOTOS}
              />
            </div>
          ))}
          {drafts.length < MAX_WINNERS && (
            <Button
              variant="secondary"
              size="sm"
              icon={<Plus size={16} />}
              onClick={() => setDrafts((list) => [...list, emptyDraft(list.length)])}
            >
              Agregar premio
            </Button>
          )}
        </fieldset>

        <p className="text-xs text-slate-500">
          Al publicar, la rifa se cierra y la página del resultado muestra cada número con el nombre abreviado de su dueño.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          {raffle.result && (
            <Button variant="secondary" fullWidth loading={pending} onClick={clear}>
              Quitar resultado
            </Button>
          )}
          <Button fullWidth icon={<Trophy size={16} />} disabled={!allValid} loading={pending} onClick={publish}>
            {raffle.result ? 'Actualizar resultado' : 'Publicar resultado'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
