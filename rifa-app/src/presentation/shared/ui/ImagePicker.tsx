import { ImagePlus, X } from 'lucide-react';
import { useState } from 'react';
import { ACCEPTED_IMAGE_TYPES, assertValidImage } from '../../../application/images';
import { errorMessage } from '../errors';
import { Field } from './form';

interface ImagePickerProps {
  id: string;
  label: string;
  value: File | null;
  onChange: (file: File | null) => void;
  /** Imagen ya guardada, para mostrarla mientras no se elija otra. */
  currentUrl?: string | null;
  hint?: string;
  disabled?: boolean;
}

/** Selector de imagen con vista previa y validación de tipo y tamaño antes de subir. */
export const ImagePicker = ({ id, label, value, onChange, currentUrl, hint, disabled }: ImagePickerProps) => {
  const [error, setError] = useState<string>();
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);

  const shown = value ? (preview?.file === value ? preview.url : null) : currentUrl;

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    try {
      assertValidImage(file);
      setError(undefined);
      const reader = new FileReader();
      reader.onload = () => setPreview({ file, url: reader.result as string });
      reader.readAsDataURL(file);
      onChange(file);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Field label={label} htmlFor={id} error={error} hint={hint ?? 'JPG, PNG o WEBP de máximo 5 MB'}>
      {shown && (
        <div className="relative w-full max-w-[220px]">
          <img src={shown} alt="Vista previa" className="w-full max-h-56 object-contain rounded-2xl border border-slate-200 bg-slate-900" />
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label="Quitar imagen"
              className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5 text-rose-600 shadow"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}
      <label
        htmlFor={id}
        className="flex items-center gap-2 w-full cursor-pointer rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 px-4 py-3 text-sm font-bold text-indigo-700 hover:bg-indigo-50 has-[:disabled]:opacity-50"
      >
        <ImagePlus size={18} />
        {value ? value.name : shown ? 'Cambiar imagen' : 'Elegir imagen'}
        <input
          id={id}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          disabled={disabled}
          className="sr-only"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </label>
    </Field>
  );
};
