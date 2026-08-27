'use client';

import { useEffect, useMemo, useState } from 'react';
import type { BuilderConfig, InvitationParsed, TemplateTheme, TemplateTokens } from '@/lib/types';
import { FONT_CATALOG, DEFAULT_FAMILY, googleFontsUrl, type FontRole } from '@/lib/fonts';
import { themeForTemplate, tokensForTemplate } from '@/lib/template-themes';
import { Seam, SEAM_OPTIONS } from '@/components/invitations/shared';
import { SEAM_FX_OPTIONS } from '@/components/invitations/seam-fx';
import {
  applyDesignKitPatch,
  kitMatchScore,
  recommendedDesignKits,
  type DesignKit,
} from '@/lib/design-kits';
import { deleteUserDesignKit, listUserDesignKits, saveUserDesignKit } from '@/lib/user-design-kits';
import { auditDesignConsistency, cleanInvitationDesign } from '@/lib/design-audit';

interface Props {
  data: InvitationParsed;
  onChange: (patch: Partial<InvitationParsed>) => void;
}

const EVENT_LABEL = {
  boda: 'Boda', xv: 'XV años', cumpleanos: 'Cumpleaños', baby_shower: 'Baby shower', bautizo: 'Bautizo',
};

const FONT_ROLES: { role: FontRole; key: 'fontScript' | 'fontHeading' | 'fontBody'; label: string; desc: string; preview: string; previewSize: string }[] = [
  { role: 'script', key: 'fontScript', label: 'Caligráfica', desc: 'Nombres y títulos especiales', preview: 'Elena & Mateo', previewSize: '26px' },
  { role: 'heading', key: 'fontHeading', label: 'Títulos', desc: 'Secciones, fechas y números', preview: 'NUESTRA CELEBRACIÓN · 2026', previewSize: '14px' },
  { role: 'body', key: 'fontBody', label: 'Lectura', desc: 'Mensajes, lugares y detalles', preview: 'Acompáñanos en este día tan especial.', previewSize: '15px' },
];

const SEMANTIC_COLORS: { key: keyof TemplateTheme; label: string; desc: string }[] = [
  { key: 'bg', label: 'Papel', desc: 'Fondo general' },
  { key: 'text', label: 'Tinta', desc: 'Texto principal' },
  { key: 'primary', label: 'Primario', desc: 'Títulos y botones' },
  { key: 'accent', label: 'Acento', desc: 'Detalles especiales' },
  { key: 'surface', label: 'Superficie', desc: 'Tarjetas y paneles' },
  { key: 'line', label: 'Línea', desc: 'Bordes y divisores' },
];

const TYPE_SCALE: { key: keyof NonNullable<TemplateTokens['typeScale']>; label: string; sample: string }[] = [
  { key: 'title', label: 'Títulos', sample: 'Elena & Mateo' },
  { key: 'subtitle', label: 'Subtítulos', sample: 'Nuestra celebración' },
  { key: 'body', label: 'Texto', sample: 'Información del evento' },
  { key: 'label', label: 'Etiquetas', sample: 'SÁBADO · 18:00' },
];

const cardCls = 'rounded-2xl border border-[#ebe5dd] bg-white p-4 shadow-[0_10px_34px_rgba(51,42,31,0.035)]';
const titleCls = 'text-[10px] font-outfit font-semibold uppercase tracking-[0.16em] text-[#8b8175]';
const inputCls = 'w-full rounded-xl border border-[#e5dfd7] bg-white px-3 py-2 text-sm font-outfit text-[#4c453d] outline-none transition focus:border-enkarta-gold focus:ring-2 focus:ring-enkarta-gold/15';

function colorInputValue(value: string | undefined, fallback: string): string {
  if (/^#[0-9a-f]{6}$/i.test(value || '')) return value as string;
  if (/^#[0-9a-f]{3}$/i.test(value || '')) return `#${(value as string).slice(1).split('').map(char => char + char).join('')}`;
  return fallback;
}

function useCatalogFonts() {
  useEffect(() => {
    const url = googleFontsUrl([
      ...FONT_CATALOG.script.map(font => font.family),
      ...FONT_CATALOG.heading.map(font => font.family),
      ...FONT_CATALOG.body.map(font => font.family),
    ]);
    if (!url || document.querySelector('link[data-ek-font-catalog]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.setAttribute('data-ek-font-catalog', '1');
    document.head.appendChild(link);
  }, []);
}

function KitCard({ kit, active, recommended, onApply, onDelete }: {
  kit: DesignKit;
  active: boolean;
  recommended?: boolean;
  onApply: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl border-2 transition-all ${active ? 'border-enkarta-gold shadow-[0_10px_28px_rgba(184,151,90,.14)]' : 'border-[#eee9e2] hover:border-enkarta-gold/45'}`}>
      <button type="button" onClick={onApply} className="block w-full text-left">
        <span className="relative block h-[116px] overflow-hidden px-3 py-3" style={{ background: kit.theme.bg }}>
          <span className="absolute -right-6 -top-7 h-24 w-24 rounded-full opacity-15" style={{ background: kit.theme.primary }} />
          <span className="absolute bottom-0 left-0 h-8 w-full opacity-75" style={{ background: kit.theme.surface }} />
          <span className="relative block text-center leading-none" style={{ color: kit.theme.primary, fontFamily: `'${kit.fonts.fontScript}'`, fontSize: 23 }}>Elena & Mateo</span>
          <span className="relative mx-auto mt-2.5 block h-px w-14" style={{ background: kit.theme.line }} />
          <span className="relative mt-2 block text-center uppercase tracking-[0.18em]" style={{ color: kit.theme.text, fontFamily: `'${kit.fonts.fontHeading}'`, fontSize: 8 }}>Nuestra celebración</span>
          <span className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-0.5">
            {kit.colors.map((color, index) => <span key={`${kit.id}-${index}`} className="h-3 w-3 rounded-full border border-black/5" style={{ background: color }} />)}
          </span>
          {recommended && <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[7px] font-semibold uppercase tracking-[0.12em] text-[#8e6e35] shadow-sm">Recomendado</span>}
        </span>
        <span className="block bg-white p-2.5">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-outfit font-semibold text-[#4b443c]">{kit.name}</span>
            {active && <span className="text-[9px] font-outfit font-semibold text-enkarta-gold">Aplicado</span>}
          </span>
          <span className="mt-0.5 block min-h-[22px] text-[9px] font-outfit leading-tight text-[#948b81]">{kit.vibe}</span>
        </span>
      </button>
      {onDelete && (
        <button type="button" onClick={onDelete} aria-label={`Eliminar ${kit.name}`} className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-[11px] text-[#9b9186] opacity-0 shadow-sm transition hover:text-red-500 group-hover:opacity-100">×</button>
      )}
    </div>
  );
}

export default function StylePanel({ data, onChange }: Props) {
  useCatalogFonts();
  const cfg: BuilderConfig = data.config ?? {};
  const baseTheme = themeForTemplate(data.template);
  const theme: TemplateTheme = { ...baseTheme, ...(cfg.theme ?? {}) };
  const defaultTokens = tokensForTemplate(data.template);
  const tokens: TemplateTokens = {
    ...defaultTokens,
    ...(cfg.tokens ?? {}),
    typeScale: { ...(defaultTokens.typeScale ?? {}), ...(cfg.tokens?.typeScale ?? {}) },
  };
  const [customKits, setCustomKits] = useState<DesignKit[]>([]);
  const [kitName, setKitName] = useState('');
  const [showAllKits, setShowAllKits] = useState(false);
  const [confirmClean, setConfirmClean] = useState(false);
  useEffect(() => setCustomKits(listUserDesignKits()), []);

  const orderedKits = useMemo(() => recommendedDesignKits(data), [data]);
  const visibleKits = showAllKits ? orderedKits : orderedKits.slice(0, 4);
  const bestKit = orderedKits[0];
  const allKits = [...orderedKits, ...customKits];
  const activeKit = allKits.find(kit => kit.id === cfg.designKitId);
  const audit = useMemo(() => auditDesignConsistency(data), [data]);
  const seamBand = theme.primary || data.color_primary;
  const seamPaper = theme.bg || data.color_secondary;
  const previewBorder = tokens.cardBorder === 'none' ? '1px solid transparent' : `1px solid ${tokens.cardBorder === 'accent' ? theme.primary : theme.line}`;
  const previewShadow = tokens.shadow === 'none' ? 'none' : tokens.shadow === 'strong' ? '0 18px 38px #261d1628' : tokens.shadow === 'medium' ? '0 13px 30px #261d161d' : '0 8px 22px #261d1612';
  const previewButton = tokens.buttonStyle === 'outline'
    ? { background: 'transparent', color: theme.primary, border: `1px solid ${theme.primary}` }
    : tokens.buttonStyle === 'soft'
      ? { background: `color-mix(in srgb, ${theme.primary} 12%, ${theme.surface})`, color: theme.primary, border: `1px solid color-mix(in srgb, ${theme.primary} 26%, transparent)` }
      : { background: theme.primary, color: theme.onPrimary, border: '1px solid transparent' };

  const setFont = (key: 'fontScript' | 'fontHeading' | 'fontBody', value: string) =>
    onChange({ config: { ...cfg, [key]: value || undefined } });
  const setTokens = (patch: Partial<TemplateTokens>) =>
    onChange({ config: { ...cfg, tokens: { ...tokens, ...patch, typeScale: patch.typeScale ? { ...(tokens.typeScale ?? {}), ...patch.typeScale } : tokens.typeScale } } });
  const setThemeColor = (key: keyof TemplateTheme, value: string) => {
    const next: Partial<InvitationParsed> = { config: { ...cfg, theme: { ...theme, [key]: value } } };
    if (key === 'primary') next.color_primary = value;
    if (key === 'bg') next.color_secondary = value;
    if (key === 'text') next.color_accent = value;
    onChange(next);
  };
  const applyKit = (kit: DesignKit) => {
    onChange(applyDesignKitPatch(data, kit));
    setConfirmClean(false);
  };
  const saveCurrentKit = () => {
    setCustomKits(saveUserDesignKit(kitName, data));
    setKitName('');
  };
  const cleanDesign = () => {
    const kit = activeKit ?? bestKit;
    if (kit) onChange(cleanInvitationDesign(data, kit));
    setConfirmClean(false);
  };

  return (
    <div className="space-y-4 p-4 pb-8">
      <section className={cardCls}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className={titleCls}>Kits visuales oficiales</h4>
            <p className="mt-1 text-xs font-outfit leading-relaxed text-[#938a80]">Cambian paleta, tipografías, botones, formas, sombras, espaciado y elementos. Tu contenido no se modifica.</p>
          </div>
          <span className="flex-none rounded-full bg-[#f5efe4] px-2 py-1 text-[9px] font-outfit font-semibold text-[#9a7536]">{EVENT_LABEL[data.type]}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {visibleKits.map(kit => (
            <KitCard key={kit.id} kit={kit} active={cfg.designKitId === kit.id} recommended={kitMatchScore(kit, data) === kitMatchScore(bestKit, data)} onApply={() => applyKit(kit)} />
          ))}
        </div>
        {orderedKits.length > 4 && (
          <button type="button" onClick={() => setShowAllKits(value => !value)} className="mt-3 w-full rounded-xl border border-[#e9e3db] py-2 text-[11px] font-outfit font-medium text-[#746b61] hover:bg-[#faf8f5]">{showAllKits ? 'Ver recomendados' : `Ver los ${orderedKits.length} kits`}</button>
        )}
        {activeKit && <p className="mt-3 rounded-xl bg-[#f8f5ef] px-3 py-2 text-[10px] font-outfit text-[#756c62]">Base activa: <strong>{activeKit.name}</strong>. Puedes personalizarla y guardar tu propia versión.</p>}
      </section>

      <section className={cardCls}>
        <div className="flex items-center justify-between gap-3">
          <div><h4 className={titleCls}>Mis kits</h4><p className="mt-1 text-xs font-outfit text-[#938a80]">Guarda el estilo actual para reutilizarlo.</p></div>
          <span className="text-[10px] font-outfit text-[#aaa198]">{customKits.length}/30</span>
        </div>
        <div className="mt-3 flex gap-2">
          <input value={kitName} onChange={event => setKitName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') saveCurrentKit(); }} placeholder="Ej. Boda verde elegante" className={inputCls} />
          <button type="button" onClick={saveCurrentKit} className="flex-none rounded-xl bg-[#3f382f] px-4 text-xs font-outfit font-semibold text-white hover:bg-[#2f2a24]">Guardar</button>
        </div>
        {customKits.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {customKits.map(kit => <KitCard key={kit.id} kit={kit} active={cfg.designKitId === kit.id} onApply={() => applyKit(kit)} onDelete={() => setCustomKits(deleteUserDesignKit(kit.id))} />)}
          </div>
        )}
      </section>

      <section className={cardCls}>
        <h4 className={titleCls}>Colores semánticos</h4>
        <p className="mt-1 text-xs font-outfit leading-relaxed text-[#938a80]">Cada color tiene una función fija; así toda la invitación cambia de forma uniforme.</p>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {SEMANTIC_COLORS.map(item => {
            const fallback = item.key === 'line' ? colorInputValue(theme.primary, '#b8975a') : item.key === 'accent' ? colorInputValue(theme.primaryDeep, '#d5ad63') : '#ffffff';
            const value = colorInputValue(theme[item.key], fallback);
            return (
              <label key={item.key} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-[#ede8e1] bg-[#fbfaf8] p-2.5">
                <span className="relative h-9 w-9 flex-none overflow-hidden rounded-xl border border-black/10 shadow-inner" style={{ background: value }}>
                  <input type="color" value={value} onChange={event => setThemeColor(item.key, event.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                </span>
                <span className="min-w-0"><span className="block text-xs font-outfit font-medium text-[#544d45]">{item.label}</span><span className="block truncate text-[9px] font-outfit text-[#9f968d]">{item.desc}</span></span>
              </label>
            );
          })}
        </div>
      </section>

      <section className={cardCls}>
        <h4 className={titleCls}>Sistema tipográfico</h4>
        <p className="mt-1 text-xs font-outfit leading-relaxed text-[#938a80]">Tres familias coordinadas y cuatro tamaños globales para conservar jerarquía.</p>
        <div className="mt-4 space-y-2.5">
          {FONT_ROLES.map(({ role, key, label, desc, preview, previewSize }) => {
            const value = (cfg[key] as string | undefined) ?? '';
            const family = value || DEFAULT_FAMILY[role];
            return (
              <div key={key} className="rounded-xl border border-[#ede8e1] bg-[#fbfaf8] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div><p className="text-xs font-outfit font-medium text-[#554e46]">{label}</p><p className="text-[9px] font-outfit text-[#9c938a]">{desc}</p></div>
                  <select value={value} onChange={event => setFont(key, event.target.value)} className="max-w-[148px] rounded-lg border border-[#e3ddd5] bg-white px-2 py-1.5 text-[10px] font-outfit text-[#655d54] outline-none focus:border-enkarta-gold">
                    <option value="">Original ({DEFAULT_FAMILY[role]})</option>
                    {FONT_CATALOG[role].filter(font => font.family !== DEFAULT_FAMILY[role]).map(font => <option key={font.family} value={font.family}>{font.family}</option>)}
                  </select>
                </div>
                <p className="mt-2 truncate text-[#554d45]" style={{ fontFamily: `'${family}'`, fontSize: previewSize }}>{preview}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-4 space-y-3 rounded-xl bg-[#f8f5f0] p-3">
          {TYPE_SCALE.map(item => {
            const value = tokens.typeScale?.[item.key] ?? 1;
            return (
              <label key={item.key} className="block">
                <span className="mb-1 flex items-center justify-between text-[10px] font-outfit text-[#70675d]"><span>{item.label}</span><strong>{Math.round(value * 100)}%</strong></span>
                <input type="range" min={0.8} max={1.25} step={0.02} value={value} onChange={event => setTokens({ typeScale: { [item.key]: Number(event.target.value) } })} className="w-full accent-enkarta-gold" />
              </label>
            );
          })}
        </div>
      </section>

      <section className={cardCls}>
        <h4 className={titleCls}>Formas y ritmo</h4>
        <p className="mt-1 text-xs font-outfit text-[#938a80]">Un solo lenguaje para tarjetas, botones, campos, sombras y espacios.</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label><span className="mb-1 block text-[10px] font-outfit text-[#756d64]">Densidad</span><select className={inputCls} value={tokens.spacing ?? 'normal'} onChange={event => setTokens({ spacing: event.target.value as TemplateTokens['spacing'] })}><option value="compact">Compacta</option><option value="normal">Balanceada</option><option value="airy">Amplia</option></select></label>
          <label><span className="mb-1 block text-[10px] font-outfit text-[#756d64]">Acabado</span><select className={inputCls} value={tokens.surface ?? 'flat'} onChange={event => setTokens({ surface: event.target.value as TemplateTokens['surface'] })}><option value="flat">Plano</option><option value="soft">Suave</option><option value="card">Tarjeta</option><option value="glass">Cristal</option></select></label>
          <label><span className="mb-1 block text-[10px] font-outfit text-[#756d64]">Sombra</span><select className={inputCls} value={tokens.shadow ?? 'soft'} onChange={event => setTokens({ shadow: event.target.value as TemplateTokens['shadow'] })}><option value="none">Sin sombra</option><option value="soft">Suave</option><option value="medium">Media</option><option value="strong">Profunda</option></select></label>
          <label><span className="mb-1 block text-[10px] font-outfit text-[#756d64]">Ancho · {tokens.contentWidth ?? 680}px</span><input type="range" min={560} max={820} step={10} value={tokens.contentWidth ?? 680} onChange={event => setTokens({ contentWidth: Number(event.target.value) })} className="w-full accent-enkarta-gold" /></label>
          <label><span className="mb-1 block text-[10px] font-outfit text-[#756d64]">Botones</span><select className={inputCls} value={tokens.buttonStyle ?? 'solid'} onChange={event => setTokens({ buttonStyle: event.target.value as TemplateTokens['buttonStyle'] })}><option value="solid">Sólidos</option><option value="outline">Contorno</option><option value="soft">Tinte suave</option></select></label>
          <label><span className="mb-1 block text-[10px] font-outfit text-[#756d64]">Bordes</span><select className={inputCls} value={tokens.cardBorder ?? 'hairline'} onChange={event => setTokens({ cardBorder: event.target.value as TemplateTokens['cardBorder'] })}><option value="none">Sin borde</option><option value="hairline">Línea sutil</option><option value="accent">Con acento</option></select></label>
        </div>
        <div className="mt-4 space-y-3">
          {[
            { key: 'sectionRadius' as const, label: 'Secciones', min: 0, max: 40 },
            { key: 'cardRadius' as const, label: 'Tarjetas', min: 0, max: 40 },
            { key: 'buttonRadius' as const, label: 'Botones', min: 0, max: 50 },
            { key: 'fieldRadius' as const, label: 'Campos', min: 0, max: 28 },
            { key: 'mediaRadius' as const, label: 'Fotos y video', min: 0, max: 40 },
          ].map(item => (
            <label key={item.key} className="block"><span className="mb-1 flex justify-between text-[10px] font-outfit text-[#756d64]"><span>Radio de {item.label.toLowerCase()}</span><strong>{tokens[item.key] ?? 0}px</strong></span><input type="range" min={item.min} max={item.max} step={2} value={tokens[item.key] ?? 0} onChange={event => setTokens({ [item.key]: Number(event.target.value) })} className="w-full accent-enkarta-gold" /></label>
          ))}
          <label className="block"><span className="mb-1 flex justify-between text-[10px] font-outfit text-[#756d64]"><span>Escala de espacio</span><strong>{Math.round((tokens.spacingScale ?? 1) * 100)}%</strong></span><input type="range" min={0.8} max={1.25} step={0.05} value={tokens.spacingScale ?? 1} onChange={event => setTokens({ spacingScale: Number(event.target.value) })} className="w-full accent-enkarta-gold" /></label>
        </div>
        <div className="mt-4 grid grid-cols-[1fr_1.4fr] gap-3 rounded-xl border border-[#eee8e1] p-3">
          <label><span className="mb-1 block text-[10px] font-outfit text-[#756d64]">Color de iconos</span><input type="color" value={cfg.iconColor || theme.primary || '#b8975a'} onChange={event => onChange({ config: { ...cfg, iconColor: event.target.value } })} className="h-10 w-full cursor-pointer rounded-lg border border-[#e5dfd7] p-1" /></label>
          <label><span className="mb-1 flex justify-between text-[10px] font-outfit text-[#756d64]"><span>Tamaño de iconos</span><strong>{Math.round((cfg.iconScale ?? 1) * 100)}%</strong></span><input type="range" min={0.7} max={1.4} step={0.05} value={cfg.iconScale ?? 1} onChange={event => onChange({ config: { ...cfg, iconScale: Number(event.target.value) } })} className="mt-2 w-full accent-enkarta-gold" /></label>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-[#ebe5dd] p-4" style={{ background: theme.bg }}>
          <div className="mx-auto max-w-[260px] text-center">
            <p className="text-[8px] font-semibold uppercase tracking-[.22em]" style={{ color: theme.muted }}>Vista del sistema</p>
            <div className="mt-3 p-4" style={{ background: theme.surface, color: theme.text, border: previewBorder, borderRadius: tokens.cardRadius ?? 18, boxShadow: previewShadow }}>
              <span className="mx-auto block h-12 w-full bg-gradient-to-br from-black/5 to-black/10" style={{ borderRadius: tokens.mediaRadius ?? tokens.cardRadius ?? 16 }} />
              <p className="mt-3 text-base" style={{ color: theme.primary, fontFamily: `'${cfg.fontHeading || DEFAULT_FAMILY.heading}'` }}>Nuestra celebración</p>
              <p className="mt-1 text-[10px]" style={{ color: theme.muted, fontFamily: `'${cfg.fontBody || DEFAULT_FAMILY.body}'` }}>Tarjetas, medios y acciones coordinados.</p>
              <span className="mt-3 inline-flex min-h-8 items-center px-4 text-[8px] font-semibold uppercase tracking-[.12em]" style={{ ...previewButton, borderRadius: tokens.buttonRadius ?? 12 }}>Confirmar</span>
            </div>
          </div>
        </div>
      </section>

      <section className={cardCls}>
        <h4 className={titleCls}>Costura entre secciones</h4>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {SEAM_OPTIONS.map(option => {
            const on = (tokens.seam ?? 'curve') === option.key;
            return (
              <button key={option.key} type="button" onClick={() => setTokens({ seam: option.key })} className={`overflow-hidden rounded-xl border transition-all ${on ? 'border-enkarta-gold ring-1 ring-enkarta-gold/35' : 'border-[#ebe5de] hover:border-enkarta-gold/40'}`} title={option.label}>
                <span className="relative block h-10" style={{ background: seamPaper }}><Seam shape={option.key} from={seamBand} height={26} shadow={false} /></span>
                <span className={`block py-1 text-[9px] font-outfit leading-none ${on ? 'text-enkarta-gold' : 'text-[#8f867d]'}`}>{option.label}</span>
              </button>
            );
          })}
        </div>
        <label className="mt-3 block"><span className="mb-1 block text-[10px] font-outfit text-[#756d64]">Movimiento de la costura</span><select className={inputCls} value={tokens.seamFx ?? 'none'} onChange={event => setTokens({ seamFx: event.target.value as NonNullable<TemplateTokens['seamFx']> })}>{SEAM_FX_OPTIONS.map(option => <option key={option.key} value={option.key}>{option.label} — {option.desc}</option>)}</select></label>
      </section>

      <section className={`${cardCls} overflow-hidden`}>
        <div className="flex items-center gap-3">
          <span className={`grid h-12 w-12 flex-none place-items-center rounded-2xl text-lg font-outfit font-bold ${audit.score >= 85 ? 'bg-emerald-50 text-emerald-600' : audit.score >= 65 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>{audit.score}</span>
          <div><h4 className={titleCls}>Auditor de consistencia</h4><p className="mt-1 text-xs font-outfit text-[#82796f]">{audit.score >= 85 ? 'El sistema visual está bien coordinado.' : 'Hay estilos aislados que conviene unificar.'}</p></div>
        </div>
        <div className="mt-4 space-y-2">
          {audit.issues.map(issue => (
            <div key={issue.key} className="flex items-center justify-between gap-3 rounded-xl bg-[#faf8f5] px-3 py-2">
              <div className="min-w-0"><p className="text-[11px] font-outfit font-medium text-[#5e564d]">{issue.label}</p><p className="truncate text-[9px] font-outfit text-[#9c9389]">{issue.detail}</p></div>
              <span className={`flex-none rounded-full px-2 py-1 text-[9px] font-outfit font-semibold ${issue.level === 'good' ? 'bg-emerald-50 text-emerald-600' : issue.level === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>{issue.count}/{issue.limit}</span>
            </div>
          ))}
        </div>
        {!confirmClean ? (
          <button type="button" onClick={() => setConfirmClean(true)} className="mt-4 w-full rounded-xl border border-[#ded7ce] bg-white py-2.5 text-xs font-outfit font-semibold text-[#61584f] hover:border-enkarta-gold hover:text-enkarta-gold">Limpiar diseño</button>
        ) : (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-[10px] font-outfit leading-relaxed text-amber-800">Se normalizarán fuentes, colores, radios y espacios manuales usando <strong>{(activeKit ?? bestKit)?.name}</strong>. Textos, fotos, bloques e información del evento se conservan.</p>
            <div className="mt-2 flex gap-2"><button type="button" onClick={() => setConfirmClean(false)} className="flex-1 rounded-lg border border-amber-200 bg-white py-2 text-[10px] font-outfit text-amber-800">Cancelar</button><button type="button" onClick={cleanDesign} className="flex-1 rounded-lg bg-amber-700 py-2 text-[10px] font-outfit font-semibold text-white">Sí, normalizar</button></div>
          </div>
        )}
      </section>
    </div>
  );
}
