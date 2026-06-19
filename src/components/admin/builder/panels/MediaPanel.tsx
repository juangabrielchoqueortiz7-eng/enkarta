'use client';

import { InvitationParsed, BuilderConfig } from '@/lib/types';
import { resolveFeatures, PACKAGE_LABELS } from '@/lib/packages';
import ImageUploader from '../ImageUploader';
import MultiImageUploader from '../MultiImageUploader';

interface Props {
  data: InvitationParsed;
  onChange: (patch: Partial<InvitationParsed>) => void;
}

export default function MediaPanel({ data, onChange }: Props) {
  const cfg = data.config ?? {};
  const setCfg = (patch: Partial<BuilderConfig>) => onChange({ config: { ...cfg, ...patch } });
  const feats = resolveFeatures(cfg);
  const pkgName = cfg.package ? PACKAGE_LABELS[cfg.package] : null;

  return (
    <div className="space-y-6 p-4">

      {/* Foto de portada */}
      <div>
        <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider mb-3">Foto de Portada</h4>
        <ImageUploader
          value={data.cover_image_url ?? ''}
          onChange={url => onChange({ cover_image_url: url || null })}
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
        <ImageUploader
          kind="audio"
          value={cfg.musicUrl ?? ''}
          onChange={url => setCfg({ musicUrl: url || undefined })}
          folder="music"
          ownerId={data.id}
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
          values={cfg.galleryImages ?? []}
          onChange={urls => setCfg({ galleryImages: urls })}
          folder="gallery"
          ownerId={data.id}
          max={feats.galleryMax > 0 && feats.galleryMax < 99 ? feats.galleryMax : 20}
        />

        <div className="mt-4">
          <label className="block text-xs text-gray-500 font-outfit mb-1">Link de galería compartida (opcional)</label>
          <input
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-enkarta-gold focus:ring-2 focus:ring-enkarta-gold/20 outline-none font-outfit"
            value={data.gallery_url ?? ''}
            onChange={e => onChange({ gallery_url: e.target.value })}
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
