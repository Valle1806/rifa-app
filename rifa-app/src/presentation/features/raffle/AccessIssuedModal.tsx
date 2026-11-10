import { CheckCircle2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { IssuedAccess } from '../../../application/useCases';
import { accessUrl } from '../../shared/format';
import { CopyField } from '../../shared/ui/CopyField';
import { Modal } from '../../shared/ui/Modal';

interface AccessIssuedModalProps {
  issued: { access: IssuedAccess; numbers: string[] } | null;
  title: string;
  intro: string;
  onClose: () => void;
}

/**
 * Muestra el enlace personal y el PIN recién generados. El PIN solo se puede ver aquí:
 * se guarda cifrado y nadie, ni el admin, puede recuperarlo después.
 */
export const AccessIssuedModal = ({ issued, title, intro, onClose }: AccessIssuedModalProps) => (
  <Modal open={issued !== null} onClose={onClose} title={title}>
    {issued && (
      <div className="space-y-5">
        <div className="flex items-start gap-3 text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
          <CheckCircle2 className="shrink-0 mt-0.5" size={20} />
          <p className="text-sm">
            {intro} Números: <strong>{issued.numbers.join(', ')}</strong>.
          </p>
        </div>

        <CopyField label="Enlace personal" value={accessUrl(issued.access.token)} />
        <CopyField label="Código PIN" value={issued.access.pin} />

        <p className="text-xs text-slate-500 leading-relaxed">
          Guarda el enlace o el PIN: con cualquiera de los dos se consultan los números y se suben comprobantes. Por
          seguridad el PIN no se vuelve a mostrar.
        </p>

        <Link
          to={`/mis-numeros/${issued.access.token}`}
          className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition"
        >
          Ver mis números <ExternalLink size={16} />
        </Link>
      </div>
    )}
  </Modal>
);
