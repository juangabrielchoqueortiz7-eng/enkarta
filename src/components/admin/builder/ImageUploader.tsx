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
  kind?: 'image' | 'audio' | 'video';
  /** Relación de aspecto del preview */
  aspect?: 'portrait' | 'square' | 'landscape' | 'wide';
  /** Permite pegar una URL manualmente además de subir */
  allowUrl?: boolean;
  /** Control horizontal sin repetir la miniatura (para editores con preview propio). */
  compact?: boolean;
  /** Límites opcionales para usos más estrictos, como el clip de entrada. */
  maxBytes?: number;
  maxDurationSeconds?: number;
}

const ASPECTS: Record<string, string> = {
  portrait: 'aspect-[3/4]',
  square: 'aspect-square',
  landscape: 'aspect-[4/3]',
  wide: 'aspect-[16/9]',
};

const readableSize = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const VIDEO_MAX_BYTES = 15 * 1024 * 1024;
const ANIMATED_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const VIDEO_MAX_SECONDS = 60;

function isAnimatedImageUrl(value: string) {
  return /\.(?:gif|webp)(?:[?#]|$)/i.test(value) || /^data:image\/(?:gif|webp)/i.test(value);
}

function isEmbeddedVideoUrl(value: string) {
  return /(?:youtube\.com|youtu\.be|vimeo\.com)/i.test(value);
}

function videoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const media = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    const clear = () => {
      media.onloadedmetadata = null;
      media.onerror = null;
      URL.revokeObjectURL(objectUrl);
      media.removeAttribute('src');
      media.load();
    };
    const timeout = window.setTimeout(() => {
      clear();
      reject(new Error('No pudimos leer la duración del video. Prueba exportándolo nuevamente como MP4 o WebM.'));
    }, 10_000);
    media.preload = 'metadata';
    media.onloadedmetadata = () => {
      window.clearTimeout(timeout);
      const duration = media.duration;
      clear();
      if (Number.isFinite(duration)) resolve(duration);
      else reject(new Error('El video no tiene una duración válida.'));
    };
    media.onerror = () => {
      window.clearTimeout(timeout);
      clear();
      reject(new Error('El navegador no puede reproducir este video. Usa MP4 (H.264) o WebM.'));
    };
    media.src = objectUrl;
  });
}

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
  maxBytes,
  maxDurationSeconds = VIDEO_MAX_SECONDS,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [optimization, setOptimization] = useState<string | null>(null);

  const upload = useCallback(async (file: File) => {
    setError(null);
    setOptimization(null);
    setUploading(true);
    try {
      // Imágenes: comprimir/redimensionar en el cliente (no toca audio/SVG/GIF).
      if (kind === 'image') {
        const originalSize = file.size;
        file = await compressImage(file);
        setOptimization(file.size < originalSize ? `Optimizada: ${readableSize(originalSize)} → ${readableSize(file.size)}` : null);
      }
      if (kind === 'video') {
        const isVideo = file.type === 'video/mp4' || file.type === 'video/webm';
        const isAnimatedImage = file.type === 'image/gif' || file.type === 'image/webp';
        if (!isVideo && !isAnimatedImage) {
          throw new Error('Formato no compatible. Usa MP4, WebM, GIF o WebP animado.');
        }
        const formatMaxBytes = isVideo ? VIDEO_MAX_BYTES : ANIMATED_IMAGE_MAX_BYTES;
        const allowedBytes = Math.min(formatMaxBytes, maxBytes ?? formatMaxBytes);
        if (file.size > allowedBytes) {
          throw new Error(`El archivo supera el máximo recomendado de ${Math.round(allowedBytes / 1024 / 1024)} MB.`);
        }
        if (isVideo) {
          const duration = await videoDuration(file);
          if (duration > maxDurationSeconds) {
            throw new Error(`El video dura ${Math.ceil(duration)} s. Para este uso debe durar máximo ${maxDurationSeconds} s.`);
          }
          setOptimization(`Video listo: ${readableSize(file.size)} · ${Math.max(1, Math.round(duration))} s`);
        } else {
          setOptimization(`Animación lista: ${readableSize(file.size)}`);
        }
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
  }, [folder, ownerId, onChange, kind, maxBytes, maxDurationSeconds]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  }, [upload]);

  const accept = kind === 'audio'
    ? 'audio/*'
    : kind === 'video'
      ? 'video/mp4,video/webm,image/gif,image/webp'
      : 'image/*';
  const itemLabel = kind === 'audio' ? 'audio' : kind === 'video' ? 'video o animación' : 'foto';

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
            {value ? `Reemplazar ${itemLabel}` : `Subir ${itemLabel}`}
          </button>
          {value && <button type="button" onClick={() => onChange('')} className="min-h-9 rounded-lg border border-[#e7dfd6] px-3 text-[10px] text-[#a15d5d] hover:bg-red-50 font-outfit">Quitar</button>}
        </div>
      ) : value ? (
        <div className="relative group">
          {kind === 'video' && isEmbeddedVideoUrl(value) ? (
            <div className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-[#24211e] px-4 text-center text-white ${ASPECTS[aspect]}`}>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-lg" aria-hidden>▶</span>
              <span className="text-xs font-semibold font-outfit">Enlace de YouTube/Vimeo listo</span>
              <span className="max-w-full truncate text-[10px] text-white/55 font-outfit">{value}</span>
            </div>
          ) : kind === 'image' || (kind === 'video' && isAnimatedImageUrl(value)) ? (
            <div className={`rounded-xl overflow-hidden border border-gray-200 bg-gray-100 ${ASPECTS[aspect]}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value} alt="" className="w-full h-full object-cover" />
            </div>
          ) : kind === 'video' ? (
            <video src={value} controls muted playsInline preload="metadata" className={`w-full rounded-xl border border-gray-200 bg-black object-cover ${ASPECTS[aspect]}`} />
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
                {kind === 'audio' ? 'Subir audio' : kind === 'video' ? 'Subir video o animación' : 'Subir imagen'}
              </span>
              <span className="text-xs text-gray-400 font-outfit">{kind === 'video' ? 'MP4, WebM, GIF o WebP · máximo 60 s' : 'Arrastra aquí o haz clic'}</span>
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
