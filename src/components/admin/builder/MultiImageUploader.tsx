'use client';

import { useRef, useState, useCallback } from 'react';

interface Props {
  values: string[];
  onChange: (urls: string[]) => void;
  folder?: string;
  ownerId?: string;
  max?: number;
}

export default function MultiImageUploader({
  values,
  onChange,
  folder = 'gallery',
  ownerId = 'shared',
  max = 12,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFiles = useCallback(async (files: FileList) => {
    setError(null);
    setUploading(true);
    const room = Math.max(0, max - values.length);
    const batch = Array.from(files).slice(0, room);
    const uploaded: string[] = [];
    try {
      for (const file of batch) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', folder);
        fd.append('id', ownerId);
        const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Error al subir');
        uploaded.push(json.url as string);
      }
      onChange([...values, ...uploaded]);
    } catch (e) {
      if (uploaded.length) onChange([...values, ...uploaded]);
      setError(e instanceof Error ? e.message : 'Error al subir');
    } finally {
      setUploading(false);
    }
  }, [values, onChange, folder, ownerId, max]);

  const remove = (i: number) => onChange(values.filter((_, j) => j !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= values.length) return;
    const next = [...values];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {values.map((url, i) => (
          <div key={`${url}-${i}`} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-square bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                className="w-6 h-6 rounded bg-white/90 text-gray-700 text-xs disabled:opacity-30">←</button>
              <button type="button" onClick={() => remove(i)}
                className="w-6 h-6 rounded bg-white/90 text-red-500 text-xs">✕</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === values.length - 1}
                className="w-6 h-6 rounded bg-white/90 text-gray-700 text-xs disabled:opacity-30">→</button>
            </div>
          </div>
        ))}

        {values.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-lg border-2 border-dashed border-gray-200 hover:border-enkarta-gold/50 hover:bg-gray-50 flex flex-col items-center justify-center gap-1 transition-all"
          >
            {uploading ? (
              <svg className="w-5 h-5 text-enkarta-gold animate-spin" fill="none" viewBox="0 0 24 24">
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
        {values.length}/{max} fotos · arrastra para reordenar con ← →
      </p>
      {error && <p className="text-xs text-red-500 font-outfit mt-1">{error}</p>}

      <input
        ref={inputRef}
        type="file"
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
