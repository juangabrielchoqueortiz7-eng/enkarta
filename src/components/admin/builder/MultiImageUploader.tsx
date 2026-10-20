'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { compressImage } from '@/lib/image-compress';

interface Props {
  values: string[];
  onChange: (urls: string[]) => void;
  folder?: string;
  ownerId?: string;
  max?: number;
  /** Identidad del campo cuando el inspector reutiliza esta instancia. */
  destinationKey?: string;
  /** Synchronous guard while a parent replaces the destination before rendering. */
  isDestinationCurrent?: () => boolean;
}

function validUploadUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try { return ['https:', 'http:'].includes(new URL(value).protocol); }
  catch { return false; }
}

export default function MultiImageUploader({
  values,
  onChange,
  folder = 'gallery',
  ownerId = 'shared',
  max = 12,
  destinationKey = '',
  isDestinationCurrent,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  const active = useRef<AbortController | null>(null);
  const obsolete = useRef<AbortController[]>([]);
  const binding = useRef({ ownerId, folder, destinationKey, max, epoch: 0 });
  const before = binding.current;
  if (before.ownerId !== ownerId || before.folder !== folder || before.destinationKey !== destinationKey || before.max !== max) {
    if (active.current) obsolete.current.push(active.current);
    active.current = null;
    binding.current = { ownerId, folder, destinationKey, max, epoch: before.epoch + 1 };
  }
  const epoch = binding.current.epoch;
  const latest = useRef({ values, onChange, isDestinationCurrent });
  latest.current = { values, onChange, isDestinationCurrent };
  const [feedback, setFeedback] = useState({ epoch, uploading: false, error: null as string | null, savedBytes: 0 });
  const uploading = feedback.epoch === epoch && feedback.uploading;
  const error = feedback.epoch === epoch ? feedback.error : null;
  const savedBytes = feedback.epoch === epoch ? feedback.savedBytes : 0;

  useEffect(() => {
    for (const controller of obsolete.current.splice(0)) controller.abort();
  }, [epoch]);
  useEffect(() => {
    mounted.current = true;
    const pending = obsolete.current;
    return () => {
      mounted.current = false;
      active.current?.abort(); active.current = null;
      for (const controller of pending.splice(0)) controller.abort();
    };
  }, []);

  const change = (next: string[]) => {
    if (!mounted.current || binding.current.epoch !== epoch) return;
    const current = latest.current;
    latest.current = { ...current, values: next };
    current.onChange(next);
  };

  const uploadFiles = useCallback(async (files: FileList) => {
    const destinationIsCurrent = latest.current.isDestinationCurrent;
    if (!mounted.current || binding.current.epoch !== epoch || active.current || destinationIsCurrent?.() === false) return;
    const room = Math.max(0, max - latest.current.values.length);
    const batch = Array.from(files).slice(0, room);
    if (!batch.length) return;
    const controller = new AbortController();
    active.current = controller;
    const current = () => mounted.current && binding.current.epoch === epoch && active.current === controller && !controller.signal.aborted && destinationIsCurrent?.() !== false;
    const update = (patch: Partial<typeof feedback>) => {
      if (current()) setFeedback(previous => ({ ...(previous.epoch === epoch ? previous : { epoch, uploading: false, error: null, savedBytes: 0 }), ...patch, epoch }));
    };
    update({ uploading: true, error: null });
    try {
      for (const original of batch) {
        if (!current()) return;
        if (latest.current.values.length >= max) throw new Error('La galería alcanzó su límite. Las fotos ya añadidas se conservan.');
        const file = await compressImage(original, 1920, 0.82);
        if (!current()) return;
        if (latest.current.values.length >= max) throw new Error('La galería alcanzó su límite. Las fotos ya añadidas se conservan.');
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', folder);
        fd.append('id', ownerId);
        const res = await fetch('/api/admin/upload', { method: 'POST', body: fd, signal: controller.signal });
        if (!current()) return;
        const json = await res.json();
        if (!current()) return;
        if (!res.ok) throw new Error(typeof json?.error === 'string' ? json.error : 'Error al subir. Vuelve a elegir las fotos pendientes.');
        if (!validUploadUrl(json?.url)) throw new Error('No pudimos verificar la foto subida. Revisa la galería antes de volver a elegirla.');
        if (latest.current.values.length >= max) throw new Error('La foto se subió, pero no se añadió porque la galería alcanzó su límite. Revisa la galería antes de volver a intentarlo.');
        // Each confirmed photo joins the current list once. Never replay a batch
        // snapshot after the user removes or reorders an earlier photo.
        const latestValue = latest.current;
        const next = [...latestValue.values, json.url];
        latest.current = { ...latestValue, values: next };
        latestValue.onChange(next);
        if (current()) setFeedback(previous => ({ ...previous, savedBytes: previous.savedBytes + Math.max(0, original.size - file.size) }));
      }
    } catch (e) {
      update({ error: e instanceof Error ? e.message : 'Error al subir. Vuelve a elegir las fotos pendientes.' });
    } finally {
      update({ uploading: false });
      if (active.current === controller) active.current = null;
    }
  }, [folder, ownerId, max, epoch]);

  const indexNow = (i: number) => {
    let occurrence = values.slice(0, i).filter(url => url === values[i]).length;
    return latest.current.values.findIndex(url => url === values[i] && occurrence-- === 0);
  };
  const remove = (i: number) => {
    const index = indexNow(i);
    if (index >= 0) change(latest.current.values.filter((_, j) => j !== index));
  };
  const move = (i: number, dir: -1 | 1) => {
    const index = indexNow(i), j = index + dir;
    if (index < 0 || j < 0 || j >= latest.current.values.length) return;
    const next = [...latest.current.values];
    [next[index], next[j]] = [next[j], next[index]];
    change(next);
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {values.map((url, i) => (
          <div key={`${url}-${i}`} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-square bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <button type="button" aria-label={`Mover foto ${i + 1} a la izquierda`} onClick={() => move(i, -1)} disabled={i === 0}
                className="w-6 h-6 rounded bg-white/90 text-gray-700 text-xs disabled:opacity-30">←</button>
              <button type="button" aria-label={`Quitar foto ${i + 1}`} onClick={() => remove(i)}
                className="w-6 h-6 rounded bg-white/90 text-red-500 text-xs">✕</button>
              <button type="button" aria-label={`Mover foto ${i + 1} a la derecha`} onClick={() => move(i, 1)} disabled={i === values.length - 1}
                className="w-6 h-6 rounded bg-white/90 text-gray-700 text-xs disabled:opacity-30">→</button>
            </div>
          </div>
        ))}

        {values.length < max && (
          <button
            type="button"
            aria-label="Añadir fotos"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-lg border-2 border-dashed border-gray-200 hover:border-enkarta-gold/50 hover:bg-gray-50 flex flex-col items-center justify-center gap-1 transition-all"
          >
            {uploading ? (
              <svg aria-hidden="true" className="w-5 h-5 text-enkarta-gold animate-spin motion-reduce:animate-none" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : (
              <>
                <span className="text-xl text-gray-400 leading-none">+</span>
                <span className="text-xs text-gray-400 font-outfit">Foto</span>
              </>
            )}
          </button>
        )}
      </div>

      <p className="text-xs text-gray-400 font-outfit mt-2">
        {values.length}/{max} fotos · usa ← → para reordenar
      </p>
      <p role="status" aria-live="polite" className="text-xs text-gray-500 font-outfit mt-1">{uploading ? 'Subiendo fotos… Puedes quitar y reordenar las que ya aparecen.' : ''}</p>
      {savedBytes > 0 && <p className="mt-1 text-xs font-outfit text-emerald-600">✓ Galería optimizada · ahorraste {(savedBytes / 1024 / 1024).toFixed(1)} MB</p>}
      {error && <p role="alert" className="text-xs text-red-500 font-outfit mt-1">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        aria-label="Seleccionar fotos para la galería"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => {
          if (e.target.files?.length) uploadFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
