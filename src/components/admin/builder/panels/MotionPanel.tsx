'use client';

import { InvitationParsed, BuilderConfig, PageMotion, PageMotionPreset } from '@/lib/types';
import { PAGE_MOTION_PRESETS, PRESET_TO_VARIANT } from '@/lib/scroll-motion';

// Mini-teléfono animado: tres "secciones" entran en loop con el efecto real del
// preset, para elegir la transición viéndola (no leyéndola).
function MiniPreview({ preset }: { preset: PageMotionPreset }) {
  const v = PRESET_TO_VARIANT[preset];
  return (
    <span
      className="ekmp flex-shrink-0"
      data-v={v}
      aria-hidden
      style={{
        width: 38, height: 54, borderRadius: 7, background: '#fff',
        border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column',
        gap: 4, padding: 6, overflow: 'hidden', perspective: 90,
      }}
    >
      {[0, 1, 2].map(i => (
        <span key={i} className="ekmp-bar" style={{ animationDelay: `${i * 0.22}s`, width: i === 1 ? '70%' : '100%' }} />
      ))}
    </span>
  );
}

const MINI_CSS = `
.ekmp-bar { display:block; height:11px; border-radius:3px; flex-shrink:0;
  background:linear-gradient(90deg,#cdb680,#e6d8b2); opacity:1;
  animation-duration:2.8s; animation-timing-function:ease-in-out; animation-iteration-count:infinite; }
.ekmp[data-v="none"] .ekmp-bar { animation:none; }
.ekmp[data-v="fade"] .ekmp-bar { animation-name:ekmpFade; }
.ekmp[data-v="fadeUp"] .ekmp-bar { animation-name:ekmpFadeUp; }
.ekmp[data-v="fadeDown"] .ekmp-bar { animation-name:ekmpFadeDown; }
.ekmp[data-v="pop"] .ekmp-bar { animation-name:ekmpPop; }
.ekmp[data-v="tilt3d"] .ekmp-bar { animation-name:ekmpTilt; }
.ekmp[data-v="flip3d"] .ekmp-bar { animation-name:ekmpFlip; }
.ekmp[data-v="depth3d"] .ekmp-bar { animation-name:ekmpDepth; }
.ekmp[data-v="swing3d"] .ekmp-bar { animation-name:ekmpSwing; transform-origin:left center; }
.ekmp[data-v="unfold3d"] .ekmp-bar { animation-name:ekmpUnfold; }
@keyframes ekmpFade { 0%{opacity:0} 30%,78%{opacity:1} 94%,100%{opacity:0} }
@keyframes ekmpFadeUp { 0%{opacity:0;transform:translateY(7px)} 30%,78%{opacity:1;transform:none} 94%,100%{opacity:0;transform:translateY(7px)} }
@keyframes ekmpFadeDown { 0%{opacity:0;transform:translateY(-7px)} 30%,78%{opacity:1;transform:none} 94%,100%{opacity:0;transform:translateY(-7px)} }
@keyframes ekmpPop { 0%{opacity:0;transform:scale(.45)} 32%,78%{opacity:1;transform:scale(1)} 94%,100%{opacity:0;transform:scale(.45)} }
@keyframes ekmpTilt { 0%{opacity:0;transform:translateY(5px) rotateX(38deg)} 32%,78%{opacity:1;transform:none} 94%,100%{opacity:0;transform:translateY(5px) rotateX(38deg)} }
@keyframes ekmpFlip { 0%{opacity:0;transform:rotateX(82deg)} 34%,78%{opacity:1;transform:none} 94%,100%{opacity:0;transform:rotateX(82deg)} }
@keyframes ekmpDepth { 0%{opacity:0;transform:scale(.7);filter:blur(2px)} 32%,78%{opacity:1;transform:scale(1);filter:blur(0)} 94%,100%{opacity:0;transform:scale(.7);filter:blur(2px)} }
@keyframes ekmpSwing { 0%{opacity:0;transform:rotateY(-62deg)} 32%,78%{opacity:1;transform:none} 94%,100%{opacity:0;transform:rotateY(-62deg)} }
@keyframes ekmpUnfold { 0%{opacity:0;transform:rotateY(84deg) scale(.94)} 34%,78%{opacity:1;transform:none} 94%,100%{opacity:0;transform:rotateY(84deg) scale(.94)} }
`;

interface Props {
  data: InvitationParsed;
  onChange: (patch: Partial<InvitationParsed>) => void;
}

const PREMIUM = ['azure', 'primicia', 'passport', 'paradise', 'obsidiana', 'dolcevita', 'grazia', 'carmesi_v2', 'napoly', 'euforia', 'rosegold', 'allegria'];

// Presets con efecto 3D → mostramos el control de profundidad.
const PRESETS_3D = ['cinematic3d', 'parallaxBook'];

function Section({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="border-t border-gray-100 pt-5 first:border-0 first:pt-0">
      <h4 className="text-xs font-outfit font-semibold text-gray-400 uppercase tracking-wider mb-1">{title}</h4>
      {hint && <p className="text-xs text-gray-400 font-outfit mb-3">{hint}</p>}
      {!hint && <div className="mb-3" />}
      {children}
    </div>
  );
}

export default function MotionPanel({ data, onChange }: Props) {
  const cfg = data.config ?? {};
  const motion = cfg.motion ?? {};
  const preset = motion.preset ?? 'elegant';
  const intensity = motion.intensity ?? 1;
  const perspective = motion.perspective ?? 1000;

  const setMotion = (patch: Partial<PageMotion>) =>
    onChange({ config: { ...cfg, motion: { ...motion, ...patch } } as BuilderConfig });

  if (!PREMIUM.includes(data.template)) {
    return (
      <div className="p-4">
        <div className="p-4 bg-gray-50 rounded-xl text-center">
          <p className="text-sm font-outfit text-gray-500">
            Las transiciones de scroll/3D están disponibles para las plantillas premium.
          </p>
        </div>
      </div>
    );
  }

  const is3D = PRESETS_3D.includes(preset);

  return (
    <div className="space-y-6 p-4">

      <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
        <p className="text-xs text-indigo-700 font-outfit">
          🎞️ Elige cómo aparecen las secciones a medida que bajas por la invitación.
          El efecto se aplica a toda la plantilla y se ve en la vista previa de la derecha.
        </p>
      </div>

      {/* Preset global */}
      <Section title="Estilo de transición">
        <style>{MINI_CSS}</style>
        <div className="grid grid-cols-1 gap-2">
          {PAGE_MOTION_PRESETS.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => setMotion({ preset: p.value })}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all hover:border-enkarta-gold/50 ${
                preset === p.value ? 'border-enkarta-gold bg-enkarta-gold/5' : 'border-gray-100 bg-gray-50'
              }`}
            >
              <MiniPreview preset={p.value} />
              <span className="min-w-0">
                <span className="block text-sm font-outfit text-gray-700">{p.label}</span>
                <span className="block text-xs text-gray-400 font-outfit leading-tight">{p.desc}</span>
              </span>
              {preset === p.value && (
                <svg className="w-4 h-4 ml-auto text-enkarta-gold flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </Section>

      {/* Intensidad */}
      {preset !== 'none' && (
        <Section title="Intensidad" hint="Qué tan marcado es el movimiento de cada sección.">
          <div className="flex justify-between text-xs font-outfit text-gray-500 mb-1">
            <span>Sutil</span>
            <span>{Math.round(intensity * 100)}%</span>
            <span>Fuerte</span>
          </div>
          <input
            type="range" min={50} max={150} step={5}
            value={Math.round(intensity * 100)}
            onChange={e => setMotion({ intensity: parseInt(e.target.value) / 100 })}
            className="w-full accent-enkarta-gold"
          />
        </Section>
      )}

      {/* Profundidad 3D (solo presets 3D) */}
      {is3D && (
        <Section title="Profundidad 3D" hint="Cuánta perspectiva tiene el efecto de inclinación / volteo.">
          <div className="flex justify-between text-xs font-outfit text-gray-500 mb-1">
            <span>Plana</span>
            <span>{perspective}px</span>
            <span>Profunda</span>
          </div>
          <input
            type="range" min={600} max={1600} step={50}
            value={perspective}
            onChange={e => setMotion({ perspective: parseInt(e.target.value) })}
            className="w-full accent-enkarta-gold"
          />
          <p className="text-xs text-gray-400 font-outfit mt-2">
            Valores más bajos = perspectiva más exagerada (más &ldquo;3D&rdquo;).
          </p>
        </Section>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange({ config: { ...cfg, motion: {} } as BuilderConfig })}
          className="text-xs text-gray-400 hover:underline font-outfit"
        >
          Restaurar (Elegante)
        </button>
      </div>

      <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
        <p className="text-xs text-amber-700 font-outfit">
          💡 El ajuste fino por sección (animar cada bloque distinto) llegará con el
          editor de bloques. Por ahora el preset se aplica a toda la invitación.
        </p>
      </div>

    </div>
  );
}
