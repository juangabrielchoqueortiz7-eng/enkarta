'use client';

import { useRef, useState } from 'react';
import ImageUploader from './ImageUploader';
import {
  imageAspect,
  imageColorOverlayStyle,
  imageFilter,
  imageFrameStyle,
  imageMask,
  imageTemperatureStyle,
  imageTransform,
  imageViewportStyle,
  type ImageMask,
} from '@/lib/image-effects';

interface Props {
  value?: string;
  settings: Record<string, unknown>;
  onImageChange: (url: string) => void;
  onSettingsChange: (patch: Record<string, unknown>) => void;
  ownerId?: string;
  usedMedia?: string[];
  accent?: string;
}

type StudioTab = 'crop' | 'look' | 'frame' | 'overlay';

const TABS: { key: StudioTab; label: string; icon: string }[] = [
  { key: 'crop', label: 'Encuadre', icon: '⌗' },
  { key: 'look', label: 'Color', icon: '◐' },
  { key: 'frame', label: 'Forma', icon: '◇' },
  { key: 'overlay', label: 'Capa', icon: '◫' },
];

const ASPECTS = [
  { value: 'original', label: 'Libre', shape: 'w-7 h-5' },
  { value: 'square', label: '1:1', shape: 'w-5 h-5' },
  { value: 'portrait', label: '4:5', shape: 'w-4 h-5' },
  { value: 'story', label: '9:16', shape: 'w-3.5 h-6' },
  { value: 'landscape', label: '16:9', shape: 'w-7 h-4' },
  { value: 'classic', label: '4:3', shape: 'w-6 h-[18px]' },
];

const LOOKS: { key: string; label: string; swatch: string; props: Record<string, number> }[] = [
  { key: 'natural', label: 'Natural', swatch: 'linear-gradient(135deg,#d9c8b2,#77937a)', props: { brightness: 1, contrast: 1, imageSaturation: 1, grayscale: 0, sepia: 0, temperature: 0, blur: 0 } },
  { key: 'warm', label: 'Cálido', swatch: 'linear-gradient(135deg,#edbd8b,#9e5545)', props: { brightness: 1.04, contrast: 1.02, imageSaturation: 1.08, grayscale: 0, sepia: 0.08, temperature: 38, blur: 0 } },
  { key: 'cool', label: 'Frío', swatch: 'linear-gradient(135deg,#bdd7dc,#5d718e)', props: { brightness: 1.02, contrast: 1.04, imageSaturation: 0.92, grayscale: 0, sepia: 0, temperature: -34, blur: 0 } },
  { key: 'mono', label: 'B/N', swatch: 'linear-gradient(135deg,#eee,#303030)', props: { brightness: 1, contrast: 1.13, imageSaturation: 0, grayscale: 1, sepia: 0, temperature: 0, blur: 0 } },
  { key: 'film', label: 'Película', swatch: 'linear-gradient(135deg,#66715f,#b98b68)', props: { brightness: 0.97, contrast: 0.94, imageSaturation: 0.8, grayscale: 0.06, sepia: 0.18, temperature: 18, blur: 0 } },
  { key: 'pastel', label: 'Pastel', swatch: 'linear-gradient(135deg,#f0cfd7,#cadbec)', props: { brightness: 1.08, contrast: 0.85, imageSaturation: 0.78, grayscale: 0, sepia: 0.04, temperature: 8, blur: 0 } },
  { key: 'vivid', label: 'Vibrante', swatch: 'linear-gradient(135deg,#278ca1,#df9d38)', props: { brightness: 1.02, contrast: 1.1, imageSaturation: 1.34, grayscale: 0, sepia: 0, temperature: 3, blur: 0 } },
  { key: 'soft', label: 'Suave', swatch: 'linear-gradient(135deg,#efe5d8,#a7b9ad)', props: { brightness: 1.06, contrast: 0.9, imageSaturation: 0.88, grayscale: 0, sepia: 0.05, temperature: 12, blur: 0.5 } },
];

const MASKS: { value: ImageMask; label: string; style: React.CSSProperties }[] = [
  { value: 'none', label: 'Libre', style: { borderRadius: 5 } },
  { value: 'circle', label: 'Círculo', style: { borderRadius: '9999px', aspectRatio: '1 / 1', width: 24 } },
  { value: 'arch', label: 'Arco', style: { borderRadius: '999px 999px 5px 5px', width: 22 } },
  { value: 'postal', label: 'Postal', style: { clipPath: 'polygon(8% 0,18% 5%,28% 0,38% 5%,48% 0,58% 5%,68% 0,78% 5%,88% 0,100% 10%,95% 25%,100% 40%,95% 55%,100% 70%,95% 85%,100% 100%,88% 95%,78% 100%,68% 95%,58% 100%,48% 95%,38% 100%,28% 95%,18% 100%,8% 95%,0 100%,5% 85%,0 70%,5% 55%,0 40%,5% 25%,0 10%)' } },
  { value: 'ticket', label: 'Ticket', style: { clipPath: 'polygon(0 0,100% 0,100% 37%,90% 43%,90% 57%,100% 63%,100% 100%,0 100%,0 63%,10% 57%,10% 43%,0 37%)' } },
  { value: 'polaroid', label: 'Polaroid', style: { border: '4px solid white', borderBottomWidth: 10, boxShadow: '0 3px 7px #0003' } },
  { value: 'organic', label: 'Orgánica', style: { borderRadius: '42% 58% 62% 38% / 48% 37% 63% 52%' } },
];

const controlLabel = 'mb-1.5 flex items-center justify-between text-[10px] font-medium text-[#6d645b] font-outfit';
const rangeClass = 'w-full accent-enkarta-gold';

const numeric = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

function focalPoint(value: unknown) {
  const match = /(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/.exec(String(value || '50% 50%'));
  return { x: match ? Number(match[1]) : 50, y: match ? Number(match[2]) : 50 };
}

function Slider({ label, value, display, min, max, step = 1, onChange }: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className={controlLabel}><span>{label}</span><span className="rounded-md bg-[#f2eee8] px-1.5 py-0.5 tabular-nums text-[#8d7041]">{display}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))} className={rangeClass} />
    </label>
  );
}

export default function ImageStudio({ value, settings, onImageChange, onSettingsChange, ownerId, usedMedia = [], accent = '#b99350' }: Props) {
  const [tab, setTab] = useState<StudioTab>('crop');
  const dragging = useRef(false);
  const focal = focalPoint(settings.focal);
  const mask = imageMask(settings.mask);
  const frameStyle = imageFrameStyle(settings);
  const viewportStyle = imageViewportStyle(settings);
  const temperatureStyle = imageTemperatureStyle(settings);
  const overlayStyle = imageColorOverlayStyle(settings);
  const chosenAspect = String(settings.aspect || 'original');
  const previewAspect = imageAspect(settings) || '4 / 3';
  const media = usedMedia.filter((url, index, all) => url && url !== value && all.indexOf(url) === index).slice(0, 12);

  const setFocalFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
    onSettingsChange({ focal: `${x.toFixed(1)}% ${y.toFixed(1)}%` });
  };

  const reset = () => onSettingsChange({
    aspect: 'original', focal: '50% 50%', zoom: 1, imageRotate: 0,
    imageFlipH: false, imageFlipV: false, brightness: 1, contrast: 1,
    imageSaturation: 1, grayscale: 0, sepia: 0, temperature: 0, blur: 0,
    mask: 'none', overlayColor: '#5d3d76', overlayOpacity: 0,
    overlayMode: 'solid', overlayBlend: 'normal',
  });
  const rotateBy = (delta: number) => {
    const next = numeric(settings.imageRotate, 0) + delta;
    onSettingsChange({ imageRotate: ((next + 180) % 360 + 360) % 360 - 180 });
  };

  return (
    <div className="space-y-3">
      <div className="rounded-[20px] border border-[#e5ddd2] bg-[linear-gradient(145deg,#f7f2eb,#eee7dd)] p-3 shadow-inner">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#997536] font-outfit">Estudio de imagen</p>
            <p className="mt-0.5 text-[10px] text-[#857b70] font-outfit">Toca o arrastra sobre la foto para elegir su protagonista.</p>
          </div>
          <span className="rounded-full bg-white/80 px-2 py-1 text-[8px] font-medium text-[#776b5e] shadow-sm font-outfit">Vista en vivo</span>
        </div>

        <div className="mx-auto w-full max-w-[360px]" style={{ ...frameStyle, aspectRatio: previewAspect }}>
          <div
            style={viewportStyle}
            className={`group touch-none select-none ${value ? 'cursor-crosshair' : ''}`}
            onPointerDown={event => {
              if (!value) return;
              dragging.current = true;
              event.currentTarget.setPointerCapture(event.pointerId);
              setFocalFromPointer(event);
            }}
            onPointerMove={event => { if (dragging.current) setFocalFromPointer(event); }}
            onPointerUp={event => { dragging.current = false; event.currentTarget.releasePointerCapture(event.pointerId); }}
            onPointerCancel={() => { dragging.current = false; }}
          >
            {value ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={value}
                alt="Vista previa del encuadre"
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover transition-[filter,transform,object-position] duration-150"
                style={{ objectPosition: String(settings.focal || '50% 50%'), filter: imageFilter(settings), transform: imageTransform(settings) }}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_50%_35%,#fff,#e7dfd4)] px-6 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl shadow-sm">⌁</span>
                <span className="text-[11px] text-[#7d7368] font-outfit">Sube una foto o recupérala de tu biblioteca</span>
              </div>
            )}
            {value && <>
              {temperatureStyle && <span className="pointer-events-none absolute inset-0" style={temperatureStyle} />}
              {overlayStyle && <span className="pointer-events-none absolute inset-0" style={overlayStyle} />}
              <span className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_1px_7px_#0008]" style={{ left: `${focal.x}%`, top: `${focal.y}%`, background: `${accent}bb` }}>
                <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
              </span>
              <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-2 py-1 text-[8px] text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 font-outfit">Punto focal</span>
            </>}
          </div>
        </div>
      </div>

      <ImageUploader value={value} onChange={onImageChange} folder="blocks" ownerId={ownerId} aspect="landscape" compact hint="Al reemplazarla se conservan el recorte, la forma y los filtros." />

      {media.length > 0 && (
        <details className="group rounded-2xl border border-[#e8e1d8] bg-white p-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-semibold text-[#61584f] font-outfit">
            <span>Fotos usadas en esta invitación <span className="ml-1 text-[#a69a8e]">({media.length})</span></span>
            <span className="text-[#a89b8d] transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <div className="mt-3 grid grid-cols-4 gap-2 border-t border-[#eee8e0] pt-3">
            {media.map((url, index) => (
              <button key={url} type="button" onClick={() => onImageChange(url)} className="group/media relative aspect-square overflow-hidden rounded-xl border border-[#e8e1d8] bg-[#f2eee8] transition-all hover:border-enkarta-gold hover:ring-2 hover:ring-enkarta-gold/10" title="Usar esta foto conservando los ajustes" aria-label={`Usar foto ${index + 1} de la biblioteca`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover transition-transform group-hover/media:scale-105" />
              </button>
            ))}
          </div>
        </details>
      )}

      <div className="grid grid-cols-4 rounded-2xl border border-[#e7dfd5] bg-[#f5f1eb] p-1">
        {TABS.map(item => (
          <button key={item.key} type="button" onClick={() => setTab(item.key)} className={`rounded-xl py-2 text-center transition-all ${tab === item.key ? 'bg-white text-[#9b742d] shadow-sm' : 'text-[#8b8176] hover:text-[#504940]'}`}>
            <span className="block text-sm leading-none">{item.icon}</span>
            <span className="mt-1 block text-[8px] font-semibold font-outfit">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="rounded-[18px] border border-[#e8e1d8] bg-white p-3">
        {tab === 'crop' && (
          <div className="space-y-4">
            <div>
              <p className={controlLabel}>Formato de recorte</p>
              <div className="grid grid-cols-6 gap-1.5">
                {ASPECTS.map(item => (
                  <button key={item.value} type="button" onClick={() => onSettingsChange({ aspect: item.value })} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border transition-all ${chosenAspect === item.value ? 'border-enkarta-gold bg-enkarta-gold/8 text-[#9b742d]' : 'border-[#ebe5de] text-[#8e8478] hover:border-enkarta-gold/40'}`}>
                    <span className={`${item.shape} rounded-[2px] border border-current`} />
                    <span className="text-[8px] font-outfit">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <Slider label="Zoom" value={Math.round(numeric(settings.zoom, 1) * 100)} display={`${Math.round(numeric(settings.zoom, 1) * 100)}%`} min={100} max={250} step={2} onChange={next => onSettingsChange({ zoom: next / 100 })} />
            <Slider label="Giro fino" value={numeric(settings.imageRotate, 0)} display={`${numeric(settings.imageRotate, 0)}°`} min={-180} max={180} onChange={next => onSettingsChange({ imageRotate: next })} />
            <div className="grid grid-cols-4 gap-1.5">
              <button type="button" onClick={() => rotateBy(-90)} className="rounded-xl border border-[#e8e1d8] py-2 text-[9px] text-[#6c6258] font-outfit">↶ 90°</button>
              <button type="button" onClick={() => rotateBy(90)} className="rounded-xl border border-[#e8e1d8] py-2 text-[9px] text-[#6c6258] font-outfit">↷ 90°</button>
              <button type="button" onClick={() => onSettingsChange({ imageFlipH: !settings.imageFlipH })} className={`rounded-xl border py-2 text-[9px] font-outfit ${settings.imageFlipH ? 'border-enkarta-gold bg-enkarta-gold/8 text-[#9b742d]' : 'border-[#e8e1d8] text-[#6c6258]'}`}>↔ Espejo</button>
              <button type="button" onClick={() => onSettingsChange({ imageFlipV: !settings.imageFlipV })} className={`rounded-xl border py-2 text-[9px] font-outfit ${settings.imageFlipV ? 'border-enkarta-gold bg-enkarta-gold/8 text-[#9b742d]' : 'border-[#e8e1d8] text-[#6c6258]'}`}>↕ Voltear</button>
            </div>
          </div>
        )}

        {tab === 'look' && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {LOOKS.map(look => (
                <button key={look.key} type="button" onClick={() => onSettingsChange(look.props)} className="rounded-xl border border-[#ebe5de] bg-white p-1.5 text-left transition-all hover:-translate-y-0.5 hover:border-enkarta-gold/50 hover:shadow-sm">
                  <span className="block h-8 rounded-lg" style={{ background: look.swatch }} />
                  <span className="mt-1 block text-center text-[8px] text-[#6f665c] font-outfit">{look.label}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-4">
              <Slider label="Luz" value={Math.round(numeric(settings.brightness, 1) * 100)} display={`${Math.round(numeric(settings.brightness, 1) * 100)}%`} min={50} max={160} step={2} onChange={next => onSettingsChange({ brightness: next / 100 })} />
              <Slider label="Contraste" value={Math.round(numeric(settings.contrast, 1) * 100)} display={`${Math.round(numeric(settings.contrast, 1) * 100)}%`} min={50} max={170} step={2} onChange={next => onSettingsChange({ contrast: next / 100 })} />
              <Slider label="Saturación" value={Math.round(numeric(settings.imageSaturation, 1) * 100)} display={`${Math.round(numeric(settings.imageSaturation, 1) * 100)}%`} min={0} max={200} step={2} onChange={next => onSettingsChange({ imageSaturation: next / 100 })} />
              <Slider label="Temperatura" value={numeric(settings.temperature, 0)} display={`${numeric(settings.temperature, 0) > 0 ? '+' : ''}${numeric(settings.temperature, 0)}`} min={-100} max={100} onChange={next => onSettingsChange({ temperature: next })} />
              <Slider label="Blanco y negro" value={Math.round(numeric(settings.grayscale, 0) * 100)} display={`${Math.round(numeric(settings.grayscale, 0) * 100)}%`} min={0} max={100} step={2} onChange={next => onSettingsChange({ grayscale: next / 100 })} />
              <Slider label="Desenfoque" value={numeric(settings.blur, 0)} display={`${numeric(settings.blur, 0)} px`} min={0} max={12} step={0.5} onChange={next => onSettingsChange({ blur: next })} />
            </div>
          </div>
        )}

        {tab === 'frame' && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {MASKS.map(item => (
                <button key={item.value} type="button" onClick={() => onSettingsChange({ mask: item.value })} className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border transition-all ${mask === item.value ? 'border-enkarta-gold bg-enkarta-gold/8 text-[#98712c]' : 'border-[#ebe5de] text-[#756c62] hover:border-enkarta-gold/40'}`}>
                  <span className="h-8 w-7 bg-[linear-gradient(145deg,#e7bd88,#877161)]" style={item.style} />
                  <span className="text-[8px] font-outfit">{item.label}</span>
                </button>
              ))}
            </div>
            {mask === 'none' && <Slider label="Redondeo" value={numeric(settings.rounded, 16)} display={`${numeric(settings.rounded, 16)} px`} min={0} max={80} onChange={next => onSettingsChange({ rounded: next })} />}
            <p className="rounded-xl bg-[#f7f3ee] px-3 py-2 text-[9px] leading-relaxed text-[#81776d] font-outfit">La máscara también se conserva cuando cambias de foto y se adapta automáticamente al móvil.</p>
          </div>
        )}

        {tab === 'overlay' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-[#ebe5de] p-2.5">
              <input type="color" value={String(settings.overlayColor || '#5d3d76')} onChange={event => onSettingsChange({ overlayColor: event.target.value })} className="h-10 w-12 cursor-pointer rounded-lg border border-[#ded6cc] bg-white p-1" aria-label="Color de la capa" />
              <div className="min-w-0 flex-1"><p className="text-[10px] font-medium text-[#5f574f] font-outfit">Color de atmósfera</p><p className="text-[8px] text-[#9a9085] font-outfit">Úsalo para integrar la foto con la paleta.</p></div>
            </div>
            <Slider label="Intensidad" value={Math.round(numeric(settings.overlayOpacity, 0) * 100)} display={`${Math.round(numeric(settings.overlayOpacity, 0) * 100)}%`} min={0} max={90} onChange={next => onSettingsChange({ overlayOpacity: next / 100 })} />
            <div className="grid grid-cols-2 gap-2">
              {[['solid', 'Color uniforme'], ['gradient', 'Degradado suave']].map(([key, label]) => <button key={key} type="button" onClick={() => onSettingsChange({ overlayMode: key })} className={`rounded-xl border py-2 text-[9px] font-outfit ${(settings.overlayMode || 'solid') === key ? 'border-enkarta-gold bg-enkarta-gold/8 text-[#98712c]' : 'border-[#ebe5de] text-[#71685e]'}`}>{label}</button>)}
            </div>
            <label className="block"><span className={controlLabel}>Mezcla con la foto</span><select value={String(settings.overlayBlend || 'normal')} onChange={event => onSettingsChange({ overlayBlend: event.target.value })} className="min-h-10 w-full rounded-xl border border-[#ded8d0] bg-white px-3 text-[11px] text-[#514a43] outline-none focus:border-enkarta-gold font-outfit"><option value="normal">Normal</option><option value="multiply">Multiplicar</option><option value="soft-light">Luz suave</option><option value="screen">Aclarar</option></select></label>
          </div>
        )}
      </div>

      <button type="button" onClick={reset} className="w-full rounded-xl border border-[#e4ddd4] bg-white py-2.5 text-[10px] font-medium text-[#7a7066] transition-colors hover:bg-[#f8f5f1] hover:text-[#403a34] font-outfit">Restablecer todos los ajustes de imagen</button>
    </div>
  );
}
