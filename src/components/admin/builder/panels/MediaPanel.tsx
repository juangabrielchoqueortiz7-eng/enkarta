'use client';

import { useRef } from 'react';
import { InvitationParsed, BuilderConfig } from '@/lib/types';
import { resolveFeatures, PACKAGE_LABELS } from '@/lib/packages';
import { MUSIC_LIBRARY } from '@/lib/music';
import { captionsForImages, reorderGalleryCaptions } from '@/lib/gallery';
import ImageUploader from '../ImageUploader';
import MultiImageUploader from '../MultiImageUploader';

interface Props {
  data: InvitationParsed;
  onChange: (patch: Partial<InvitationParsed>) => void;
}

export default function MediaPanel({ data, onChange }: Props) {
  const cfg = data.config ?? {};
  const owner = useRef({ id: data.id, epoch: 0 });
  if (owner.current.id !== data.id) owner.current = { id: data.id, epoch: owner.current.epoch + 1 };
  const ownerEpoch = owner.current.epoch;
  const latest = useRef({ data, onChange, cfg });
  latest.current = { data, onChange, cfg };
  const musicRevision = useRef(0);
  const setCfg = (patch: Partial<BuilderConfig>) => {
    if (owner.current.epoch !== ownerEpoch) return;
    const current = latest.current;
    if ('musicUrl' in patch && (current.cfg.musicUrl ?? '') !== (patch.musicUrl ?? '')) musicRevision.current += 1;
    const config = { ...current.cfg, ...patch };
    latest.current = { ...current, cfg: config, data: { ...current.data, config } };
    current.onChange({ config });
  };
  const setData = (patch: Partial<InvitationParsed>) => {
    if (owner.current.epoch !== ownerEpoch) return;
    const current = latest.current;
    latest.current = { ...current, data: { ...current.data, ...patch } };
    current.onChange(patch);
  };
  const feats = resolveFeatures(cfg);
  const pkgName = cfg.package ? PACKAGE_LABELS[cfg.package] : null;
  const galleryImages = cfg.galleryImages ?? [];
  const galleryCaptions = captionsForImages(galleryImages, cfg.galleryCaptions ?? []);
  const setGalleryImages = (urls: string[]) => {
    const current = latest.current.cfg;
    const images = current.galleryImages ?? [];
    setCfg({ galleryImages: urls, galleryCaptions: reorderGalleryCaptions(images, captionsForImages(images, current.galleryCaptions ?? []), urls) });
  };
  const setGalleryCaption = (index: number, patch: Partial<(typeof galleryCaptions)[number]>) => {
    const current = latest.current.cfg, images = current.galleryImages ?? [];
    const target = images.indexOf(galleryImages[index]);
    if (target < 0) return;
    setCfg({ galleryCaptions: captionsForImages(images, current.galleryCaptions ?? []).map((caption, position) => position === target ? { ...caption, ...patch } : caption) });
  };

  return (
    <div className="space-y-6 p-4">

      {/* Foto de portada */}
      <div>
        <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider mb-3">Foto de Portada</h4>
        <ImageUploader
          value={data.cover_image_url ?? ''}
          onChange={url => setData({ cover_image_url: url || null })}
          folder="covers"
          ownerId={data.id}
          aspect="portrait"
          hint="Ideal vertical, mínimo 800×1200px. Se usa como foto principal de la invitación."
        />
      </div>

      {/* Música */}
      <div className="border-t border-gray-100 pt-5">
        <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider mb-3">🎵 Música de Fondo</h4>
        {!feats.music && (
          <p className="text-xs text-amber-600 font-outfit mb-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
            ⚠️ El paquete {pkgName} no incluye música: no sonará en la invitación aunque subas
            un archivo. Actívala en Configuración → Paquete si el cliente la pagó.
          </p>
        )}
        {/* Colección Enkarta: un clic asigna una de nuestras pistas. */}
        <p className="text-xs text-gray-400 font-outfit mb-2">Elige una de nuestras canciones o sube la tuya.</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {MUSIC_LIBRARY.map(track => {
            const active = cfg.musicUrl === track.url;
            return (
              <button
                key={track.id}
                type="button"
                onClick={() => setCfg({ musicUrl: latest.current.cfg.musicUrl === track.url ? undefined : track.url })}
                className={`px-3 py-1.5 text-xs font-outfit rounded-full border transition-colors ${
                  active
                    ? 'bg-enkarta-gold/10 border-enkarta-gold text-enkarta-gold'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-enkarta-gold/50'
                }`}
              >
                {active ? '♪ ' : ''}{track.label}
              </button>
            );
          })}
        </div>

        <ImageUploader
          kind="audio"
          value={cfg.musicUrl ?? ''}
          onChange={url => setCfg({ musicUrl: url || undefined })}
          folder="music"
          ownerId={data.id}
          fieldRevision={musicRevision}
          hint="Sube un MP3 (máx 15 MB) o pega un enlace directo a un audio. Sonará de fondo al abrir la invitación."
        />
      </div>

      {/* Galería de fotos */}
      <div className="border-t border-gray-100 pt-5">
        <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider mb-3">📷 Galería de Fotos</h4>
        <p className="text-xs text-gray-400 font-outfit mb-3">
          Sube fotos de la pareja/evento. Se mostrarán en una galería dentro de la invitación.
          {pkgName && feats.galleryMax > 0 && feats.galleryMax < 99 && ` El paquete ${pkgName} incluye hasta ${feats.galleryMax} fotos.`}
        </p>
        {feats.galleryMax === 0 && (
          <p className="text-xs text-amber-600 font-outfit mb-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
            ⚠️ El paquete {pkgName} no incluye galería: las fotos no se mostrarán en la invitación.
          </p>
        )}
        <MultiImageUploader
          values={galleryImages}
          onChange={setGalleryImages}
          folder="gallery"
          ownerId={data.id}
          max={feats.galleryMax > 0 && feats.galleryMax < 99 ? feats.galleryMax : 20}
        />

        {galleryImages.length > 0 && (
          <details className="mt-4 overflow-hidden rounded-2xl border border-[#e7ded2] bg-[#fcfaf7]" open>
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-outfit text-xs font-semibold text-[#655b50]">
              <span>Relato y accesibilidad · {galleryImages.length} foto{galleryImages.length === 1 ? '' : 's'}</span>
              <span className="text-enkarta-gold">Editar ▾</span>
            </summary>
            <div className="space-y-3 border-t border-[#ebe3d8] p-3">
              <p className="font-outfit text-[11px] leading-relaxed text-[#8a8075]">El título y el pie aparecerán en las galerías editoriales y en el visor. La descripción accesible ayuda a personas que usan lectores de pantalla.</p>
              {galleryCaptions.map((caption, index) => (
                <div key={caption.image || index} className="grid gap-3 rounded-xl border border-[#ebe4da] bg-white p-3 sm:grid-cols-[96px_1fr]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={galleryImages[index]} alt="" className="h-24 w-full rounded-lg object-cover" />
                  <div className="min-w-0 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-outfit text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a18f77]">Foto {index + 1}</span>
                      <span className="font-outfit text-[10px] text-[#b1a79c]">El texto seguirá a esta imagen</span>
                    </div>
                    <input className="w-full rounded-lg border border-gray-200 px-3 py-2 font-outfit text-xs outline-none focus:border-enkarta-gold" value={caption.title ?? ''} onChange={event => setGalleryCaption(index, { title: event.target.value })} placeholder="Título · Nuestro primer viaje" />
                    <textarea className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 font-outfit text-xs outline-none focus:border-enkarta-gold" rows={2} value={caption.caption ?? ''} onChange={event => setGalleryCaption(index, { caption: event.target.value })} placeholder="Pie de foto · Una frase breve que cuente este momento" />
                    <input className="w-full rounded-lg border border-gray-200 px-3 py-2 font-outfit text-xs outline-none focus:border-enkarta-gold" value={caption.alt ?? ''} onChange={event => setGalleryCaption(index, { alt: event.target.value })} placeholder="Descripción accesible de lo que aparece" />
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}

        <div className="mt-4">
          <label className="block text-xs text-gray-500 font-outfit mb-1">Link de galería compartida (opcional)</label>
          <input
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-enkarta-gold focus:ring-2 focus:ring-enkarta-gold/20 outline-none font-outfit"
            value={data.gallery_url ?? ''}
            onChange={e => setData({ gallery_url: e.target.value })}
            placeholder="https://photos.google.com/..."
          />
          <p className="text-xs text-gray-400 font-outfit mt-1">
            Álbum donde los invitados podrán subir sus propias fotos del evento.
          </p>
        </div>
      </div>

    </div>
  );
}
