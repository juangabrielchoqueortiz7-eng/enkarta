'use client';

import { useRef, useState, useCallback } from 'react';
import { compressImage } from '@/lib/image-compress';

interface Props {
  value?: string;
  onChange: (url: string) => void;
  /** Carpeta lógica en el bucket: covers, gallery, sections, music… */
  folder?: string;
  /** Id de la invitación, para organizar los archivos */
  ownerId?: string;
  label?: string;
  hint?: string;
  kind?: 'image' | 'audio';
  /** Relación de aspecto del preview */
  aspect?: 'portrait' | 'square' | 'landscape' | 'wide';
  /** Permite pegar una URL manualmente además de subir */
  allowUrl?: boolean;
  /** Control horizontal sin repetir la miniatura (para editores con preview propio). */
  compact?: boolean;
}

const ASPECTS: Record<string, string> = {
  portrait: 'aspect-[3/4]',
  square: 'aspect-square',
  landscape: 'aspect-[4/3]',
  wide: 'aspect-[16/9]',
};

const readableSize = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export default function ImageUploader({
  value,
  onChange,
  folder = 'misc',
  ownerId = 'shared',
  label,
  hint,
  kind = 'image',
  aspect = 'landscape',
  allowUrl = true,
  compact = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [optimization, setOptimization] = useState<string | null>(null);

  const upload = useCallback(async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      // Imágenes: comprimir/redimensionar en el cliente (no toca audio/SVG/GIF).
      if (kind === 'image') {
        const originalSize = file.size;
        file = await compressImage(file);
        setOptimization(file.size < originalSize ? `Optimizada: ${readableSize(originalSize)} → ${readableSize(file.size)}` : null);
      }
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', folder);
      fd.append('id', ownerId);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al subir');
      onChange(json.url as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al subir');
    } finally {
      setUploading(false);
    }
  }, [folder, ownerId, onChange, kind]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  }, [upload]);

  const accept = kind === 'audio' ? 'audio/*' : 'image/*';

  return (
    <div>
      {label && <label className="block text-xs text-gray-500 font-outfit mb-1.5">{label}</label>}

      {/* Preview / dropzone */}
      {compact ? (
        <div
          className={`flex items-center gap-2 rounded-xl border border-dashed px-2.5 py-2 transition-colors ${dragOver ? 'border-enkarta-gold bg-enkarta-gold/5' : 'border-[#ded8d0] bg-white'}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="flex min-h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-[#3f382f] px-3 text-[10px] font-semibold text-white transition-colors hover:bg-[#2f2923] disabled:opacity-60 font-outfit">
            {uploading ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
            ) : <span aria-hidden>↑</span>}
            {value ? 'Reemplazar foto' : 'Subir una foto'}
          </button>
          {value && <button type="button" onClick={() => onChange('')} className="min-h-9 rounded-lg border border-[#e7dfd6] px-3 text-[10px] text-[#a15d5d] hover:bg-red-50 font-outfit">Quitar</button>}
        </div>
      ) : value ? (
        <div className="relative group">
          {kind === 'image' ? (
            <div className={`rounded-xl overflow-hidden border border-gray-200 bg-gray-100 ${ASPECTS[aspect]}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value} alt="" className="w-full h-full object-cover" />
            </div>
          ) : (
            <audio src={value} controls className="w-full" />
          )}

          <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-2.5 py-1 text-xs font-outfit bg-white/95 text-gray-700 rounded-lg shadow hover:bg-white"
            >
              Cambiar
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="px-2.5 py-1 text-xs font-outfit bg-white/95 text-red-500 rounded-lg shadow hover:bg-white"
            >
              Quitar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          disabled={uploading}
          className={`w-full rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 py-7 px-4 ${
            dragOver
              ? 'border-enkarta-gold bg-enkarta-gold/5'
              : 'border-gray-200 hover:border-enkarta-gold/50 hover:bg-gray-50'
          }`}
        >
          {uploading ? (
            <>
              <svg className="w-6 h-6 text-enkarta-gold animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <span className="text-xs font-outfit text-gray-500">Subiendo…</span>
            </>
          ) : (
            <>
              <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5V19a2 2 0 002 2h14a2 2 0 002-2v-2.5M16 8l-4-4-4 4M12 4v12" />
              </svg>
              <span className="text-xs font-outfit text-gray-600 font-medium">
                {kind === 'audio' ? 'Subir audio' : 'Subir imagen'}
              </span>
              <span className="text-xs text-gray-400 font-outfit">Arrastra aquí o haz clic</span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = '';
        }}
      />

      {error && <p className="text-xs text-red-500 font-outfit mt-1.5">{error}</p>}
      {optimization && !error && <p className="mt-1.5 text-xs font-outfit text-emerald-600">✓ {optimization}</p>}
      {hint && !error && <p className="text-xs text-gray-400 font-outfit mt-1.5">{hint}</p>}

      {allowUrl && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowUrl(v => !v)}
            className="text-xs text-gray-400 hover:text-enkarta-gold font-outfit"
          >
            {showUrl ? '− Ocultar URL' : '+ O pegar una URL'}
          </button>
          {showUrl && (
            <input
              className="mt-1.5 w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-enkarta-gold focus:ring-2 focus:ring-enkarta-gold/20 outline-none font-outfit"
              value={value ?? ''}
              onChange={e => onChange(e.target.value)}
              placeholder="https://..."
            />
          )}
        </div>
      )}
    </div>
  );
}
