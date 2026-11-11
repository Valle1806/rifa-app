import { ImagePlus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ACCEPTED_IMAGE_TYPES, assertValidImage } from '../../../application/images';
import { errorMessage } from '../errors';
import { Field } from './form';

interface MultiImagePickerProps {
  id: string;
  label: string;
  hint?: string;
  /** Fotos ya publicadas. */
  urls: string[];
  onUrlsChange: (urls: string[]) => void;
  /** Fotos elegidas que se subirán al guardar. */
  files: File[];
  onFilesChange: (files: File[]) => void;
  max: number;
}

const Thumb = ({ src, label, onRemove }: { src: string; label: string; onRemove: () => void }) => (
  <li className="relative w-20 h-20">
    <img src={src} alt={label} className="w-full h-full object-cover rounded-xl border border-slate-200" />
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Quitar ${label}`}
      className="absolute -top-2 -right-2 bg-white rounded-full p-1 text-rose-600 shadow border border-slate-100"
    >
      <X size={14} />
    </button>
  </li>
);

/** Varias fotos con vista previa: las ya publicadas y las nuevas, cada una se puede quitar. */
export const MultiImagePicker = ({ id, label, hint, urls, onUrlsChange, files, onFilesChange, max }: MultiImagePickerProps) => {
  const [error, setError] = useState<string>();
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p)), [previews]);

  const room = max - urls.length - files.length;

  const add = (list: FileList | null) => {
    if (!list) return;
    try {
      const picked = [...list];
      picked.forEach(assertValidImage);
      if (picked.length > room) throw new Error(`Puedes agregar ${room} foto(s) más (máximo ${max}).`);
      setError(undefined);
      onFilesChange([...files, ...picked]);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Field label={label} htmlFor={id} error={error} hint={hint ?? `Hasta ${max} fotos JPG, PNG o WEBP de máximo 5 MB`}>
      {(urls.length > 0 || files.length > 0) && (
        <ul className="flex flex-wrap gap-3 pt-2">
          {urls.map((url, i) => (
            <Thumb key={url} src={url} label={`foto ${i + 1}`} onRemove={() => onUrlsChange(urls.filter((u) => u !== url))} />
          ))}
          {previews.map((src, i) => (
            <Thumb
              key={src}
              src={src}
              label={`foto nueva ${i + 1}`}
              onRemove={() => onFilesChange(files.filter((_, j) => j !== i))}
            />
          ))}
        </ul>
      )}
      {room > 0 && (
        <label
          htmlFor={id}
          className="inline-flex items-center gap-2 cursor-pointer rounded-xl bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-100"
        >
          <ImagePlus size={16} /> Agregar fotos
          <input
            id={id}
            type="file"
            multiple
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            className="sr-only"
            onChange={(e) => {
              add(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
      )}
    </Field>
  );
};
