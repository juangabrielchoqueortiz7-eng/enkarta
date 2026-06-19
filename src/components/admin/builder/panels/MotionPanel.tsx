'use client';

import { InvitationParsed, BuilderConfig, PageMotion } from '@/lib/types';
import { PAGE_MOTION_PRESETS } from '@/lib/scroll-motion';

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
              <span className="text-xl flex-shrink-0">{p.emoji}</span>
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
