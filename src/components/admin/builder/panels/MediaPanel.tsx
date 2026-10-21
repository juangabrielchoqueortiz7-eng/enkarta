'use client';

import { useRef } from 'react';
import { InvitationParsed, BuilderConfig } from '@/lib/types';
import { resolveFeatures, PACKAGE_LABELS } from '@/lib/packages';
import { MUSIC_LIBRARY } from '@/lib/music';
import { captionsForImages, reorderGalleryCaptions } from '@/lib/gallery';
import ImageUploader from '../ImageUploader';
import MultiImageUploader from '../MultiImageUploader';
import { useLegacyDraft } from '../useLegacyDraft';

interface Props {
  data: InvitationParsed;
  onChange: (patch: Partial<InvitationParsed>) => void;
  editingRevision?: { readonly current: number };
  draftSource?: { readonly current: InvitationParsed };
}

function galleryLimit(config: BuilderConfig) {
  const max = resolveFeatures(config).galleryMax;
  return max > 0 && max < 99 ? max : 20;
}

function galleryRows(images: string[]) {
  const counts = new Map<string, number>();
  return images.map(url => {
    const occurrence = counts.get(url) ?? 0;
    counts.set(url, occurrence + 1);
    return { url, key: JSON.stringify([url, occurrence]) };
  });
}

/** Apply the child's list intent to the current gallery, not its old snapshot. */
function rebaseGallery(previous: string[], next: string[], current: string[], max: number): string[] {
  const before = galleryRows(previous), after = galleryRows(next), live = galleryRows(current);
  const beforeKeys = new Set(before.map(row => row.key)), afterKeys = new Set(after.map(row => row.key));
  const removed = new Set(before.filter(row => !afterKeys.has(row.key)).map(row => row.key));
  const retainedBefore = before.filter(row => afterKeys.has(row.key)).map(row => row.key);
  const retainedAfter = after.filter(row => beforeKeys.has(row.key)).map(row => row.key);
  const kept = live.filter(row => !removed.has(row.key));
  // Appending/removing does not request a reorder: preserve an external reorder.
  if (retainedBefore.some((key, index) => key !== retainedAfter[index])) {
    const byKey = new Map(kept.map(row => [row.key, row]));
    const ordered = retainedAfter.filter(key => byKey.has(key)).map(key => byKey.get(key)!);
    const reorderKeys = new Set(ordered.map(row => row.key));
    let index = 0;
    for (let slot = 0; slot < kept.length; slot++) if (reorderKeys.has(kept[slot].key)) kept[slot] = ordered[index++];
  }
  const added = after.filter(row => !beforeKeys.has(row.key));
  return [...kept.map(row => row.url), ...added.slice(0, Math.max(0, max - kept.length)).map(row => row.url)];
}

export default function MediaPanel({ data, onChange, editingRevision, draftSource }: Props) {
  const draft = useLegacyDraft(data, patch => { observeMedia({ ...draft.get(), ...patch }); onChange(patch); }, undefined, editingRevision, draftSource);
  const cfg = data.config ?? {};
  const coverCounter = useRef(0);
  const musicCounter = useRef(0);
  const observed = useRef<{
    id: string; template: string; designKey: string | undefined; revision: number | undefined; cover: string; music: string;
  } | null>(null);
  const observeMedia = (current = draft.get()) => {
    const next = { id: current.id, template: current.template, designKey: current.config?.designKey, revision: editingRevision?.current,
      cover: current.cover_image_url ?? '', music: current.config?.musicUrl ?? '' };
    const previous = observed.current;
    const changedContext = !!previous && (previous.id !== next.id || previous.template !== next.template || previous.designKey !== next.designKey || previous.revision !== next.revision);
    if (changedContext || (!!previous && previous.cover !== next.cover)) coverCounter.current += 1;
    if (changedContext || (!!previous && previous.music !== next.music)) musicCounter.current += 1;
    observed.current = next;
  };
  observeMedia();
  const observeRef = useRef(observeMedia);
  observeRef.current = observeMedia;
  // ImageUploader checks these after every wait. Observe the parent source even
  // before its next render; its onChange also handles legitimate manual URLs.
  const fieldRevisions = useRef({
    cover: { get current() { observeRef.current(); return coverCounter.current; } },
    music: { get current() { observeRef.current(); return musicCounter.current; } },
  });
  const setCfg = (patch: Partial<BuilderConfig> | ((current: BuilderConfig) => Partial<BuilderConfig> | null)) => draft.config(patch);
  const setData = (patch: Partial<InvitationParsed>) => draft.patch(patch);
  const feats = resolveFeatures(cfg);
  const pkgName = cfg.package ? PACKAGE_LABELS[cfg.package] : null;
  const galleryImages = cfg.galleryImages ?? [];
  const galleryCaptions = captionsForImages(galleryImages, cfg.galleryCaptions ?? []);
  const max = galleryLimit(cfg);
  // Each callback keeps the list that this rendered child knew. Multiple ACKs
  // in the same turn advance it synchronously without following another render.
  const galleryInput = { values: galleryImages };
  const isGalleryCurrent = () => draft.isCurrent() && galleryLimit(draft.get().config) === max;
  const setGalleryImages = (urls: string[]) => {
    if (!isGalleryCurrent()) return;
    setCfg(current => {
      const images = current.galleryImages ?? [];
      const next = rebaseGallery(galleryInput.values, urls, images, max);
      galleryInput.values = urls;
      return { galleryImages: next, galleryCaptions: reorderGalleryCaptions(images, captionsForImages(images, current.galleryCaptions ?? []), next) };
    });
  };
  const setGalleryCaption = (index: number, patch: Partial<(typeof galleryCaptions)[number]>) => {
    const image = galleryImages[index];
    if (image === undefined) return;
    setCfg(current => {
      const images = current.galleryImages ?? [];
      const target = images.indexOf(image);
      if (target < 0) return null;
      return { galleryCaptions: captionsForImages(images, current.galleryCaptions ?? []).map((caption, position) => position === target ? { ...caption, ...patch } : caption) };
    });
  };

  return (
    <div className="space-y-6 p-4">

      {/* Foto de portada */}
      <div>
        <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider mb-3">Foto de Portada</h4>
        <ImageUploader
          value={data.cover_image_url ?? ''}
          onChange={url => setData({ cover_image_url: url || null })}
          fieldRevision={fieldRevisions.current.cover}
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
                onClick={() => setCfg(current => ({ musicUrl: current.musicUrl === track.url ? undefined : track.url }))}
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
          fieldRevision={fieldRevisions.current.music}
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
          max={max}
          destinationKey={draft.destination('gallery')}
          isDestinationCurrent={isGalleryCurrent}
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
