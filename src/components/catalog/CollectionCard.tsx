'use client';
import Link from 'next/link';


import Image from 'next/image';
import Reveal from '@/components/motion/Reveal';
import Tilt3D from '@/components/motion/Tilt3D';
import type { CollectionCatalogEntry } from '@/lib/collection-catalog';
import CommercialLink from '@/components/commercial/CommercialLink';
import { PACKAGE_CATALOG } from '@/lib/packages';
import { partnerEntryPath, partnerNewDesignPath } from '@/lib/partner-journey';

// ── White phone frame (catalog cards) ───────────────────────────────────────
function CatalogPhone({ bg, textColor = '#333', children, className = '' }: {
  bg: string; textColor?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`relative select-none ${className}`}>
      <div className="relative overflow-hidden" style={{ borderRadius: '1.9rem', border: '8px solid #e0e0e0', backgroundColor: '#e0e0e0', boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.9)' }}>
        <div className="flex items-center justify-between px-4 pt-2 pb-1 text-[8px]" style={{ backgroundColor: bg, color: textColor }}>
          <span className="opacity-55 font-medium">9:41</span>
          <div className="w-11 h-[11px] rounded-full bg-black/80" />
          <div className="flex gap-[2px] opacity-50">
            <svg width="11" height="7" viewBox="0 0 11 7" fill="currentColor" aria-hidden>
              <rect x="0" y="3" width="2" height="4" rx="0.4" opacity="0.4"/><rect x="3" y="1.5" width="2" height="5.5" rx="0.4" opacity="0.7"/>
              <rect x="6" y="0" width="2" height="7" rx="0.4"/><rect x="9" y="0.5" width="2" height="4.5" rx="0.7" fill="none" stroke="currentColor" strokeWidth="0.8"/>
            </svg>
          </div>
        </div>
        <div className="overflow-hidden" style={{ backgroundColor: bg }}>{children}</div>
        <div className="flex justify-center py-1.5" style={{ backgroundColor: bg }}>
          <div className="w-14 h-[3px] rounded-full" style={{ backgroundColor: textColor === '#ffffff' || textColor === 'white' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.18)' }} />
        </div>
      </div>
      <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: '1.9rem', background: 'linear-gradient(145deg, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.05) 35%, transparent 55%)' }} />
      <div className="absolute -right-[8px] top-[88px] w-[5px] h-9 rounded-r-md" style={{ backgroundColor: '#cecece' }} />
      <div className="absolute -left-[8px] top-[72px] w-[5px] h-7 rounded-l-md" style={{ backgroundColor: '#cecece' }} />
      <div className="absolute -left-[8px] top-[108px] w-[5px] h-7 rounded-l-md" style={{ backgroundColor: '#cecece' }} />
    </div>
  );
}

// ── Cover screen (photo full-bleed, no monogram) ─────────────────────────────
function CoverScreen({ t }: { t: CollectionCatalogEntry }) {
  return (
    <div className="relative overflow-hidden" style={{ minHeight: '230px' }}>
      <Image src={t.img} alt={t.name} fill className="object-cover" style={{ objectPosition: 'center 15%' }} sizes="(max-width: 1024px) 30vw, 180px" draggable={false} />
      <div className="absolute bottom-0 left-0 right-0" style={{ height: '45%', background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)' }} />
      <div className="absolute bottom-3 left-0 right-0 text-center px-3">
        <p className="font-great text-white leading-tight drop-shadow-lg" style={{ fontSize: '15px' }}>{t.n1}</p>
        <p className="font-outfit text-white/60 text-[6px] my-px drop-shadow-md">&amp;</p>
        <p className="font-great text-white leading-tight drop-shadow-lg" style={{ fontSize: '15px' }}>{t.n2}</p>
      </div>
    </div>
  );
}

// ── Miniature invitation shown in the rear phone ─────────────────────────────
function DetailScreen({ t }: { t: CollectionCatalogEntry }) {
  const headerText = '#ffffff';
  return (
    <div className="overflow-hidden" style={{ backgroundColor: t.bg, minHeight: '290px' }}>
      <div className="relative text-center" style={{ background: `linear-gradient(175deg, ${t.ink} 0%, ${t.ink}e6 62%, ${t.bg} 100%)`, padding: '10px 8px 18px' }}>
        <div className="flex justify-center items-center gap-1 opacity-30 mb-1">
          <div className="h-px w-8" style={{ backgroundColor: headerText }} />
          <div className="w-1 h-1 rounded-full" style={{ backgroundColor: t.accent }} />
          <div className="h-px w-8" style={{ backgroundColor: headerText }} />
        </div>
        <p className="font-outfit" style={{ fontSize: '5px', textTransform: 'uppercase', letterSpacing: '0.22em', color: `${headerText}80`, marginBottom: '1px' }}>{t.tag} · {t.series}</p>
        <p className="font-great leading-tight" style={{ fontSize: '16px', color: headerText }}>{t.n1}</p>
        <p className="font-outfit" style={{ fontSize: '7px', color: t.accent }}>&amp;</p>
        <p className="font-great leading-tight" style={{ fontSize: '16px', color: headerText }}>{t.n2}</p>
      </div>

      <div className="px-2 pt-1.5 pb-2">
        <div className="flex items-start gap-1.5 mb-1.5">
          <div className="text-center px-2 py-1 rounded-lg" style={{ backgroundColor: `${t.accent}18`, border: `1px solid ${t.accent}30`, flexShrink: 0 }}>
            <p className="font-outfit leading-none" style={{ fontSize: '4.5px', color: t.accent, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Fecha</p>
            <p className="font-playfair font-bold leading-none mt-1" style={{ fontSize: '11px', color: t.text }}>{t.dateStr.split(' de ')[0] || '14'}</p>
          </div>
          <div className="flex flex-col gap-0.5 flex-1">
            {[['02','días'],['14','hrs'],['32','min']].map(([n, label]) => (
              <div key={label} className="flex items-center justify-between px-1.5 py-0.5 rounded" style={{ backgroundColor: `${t.accent}18` }}>
                <span className="font-playfair font-bold" style={{ fontSize: '9px', color: t.text }}>{n}</span>
                <span className="font-outfit" style={{ fontSize: '4px', color: t.text, opacity: 0.55 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-1 mb-1.5">
          {[['Ceremonia','5:00 PM'],['Recepción','8:00 PM']].map(([label,time]) => (
            <div key={label} className="flex-1 text-center rounded-lg py-1.5" style={{ backgroundColor: `${t.accent}10`, border: `1px solid ${t.accent}25` }}>
              <p className="font-outfit" style={{ fontSize: '4px', color: t.accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
              <p className="font-playfair font-bold" style={{ fontSize: '9px', color: t.text }}>{time}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1 mb-1.5 flex-wrap">
          {['Formal','♪ Música','Maps'].map(chip => (
            <div key={chip} className="px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${t.accent}14`, border: `1px solid ${t.accent}22` }}>
              <span className="font-outfit" style={{ fontSize: '4px', color: t.accent }}>{chip}</span>
            </div>
          ))}
        </div>
        <div className="py-1 rounded-lg flex items-center justify-center" style={{ backgroundColor: t.accent }}>
          <p className="font-outfit font-semibold text-white" style={{ fontSize: '6px' }}>Confirmar asistencia ✓</p>
        </div>
      </div>
    </div>
  );
}

// ── Original dual-phone catalogue card ───────────────────────────────────────
function DualPhoneCard({ t, showMeta = false }: { t: CollectionCatalogEntry; showMeta?: boolean }) {
  return (
    <div className="flex flex-col items-center transition-all duration-500 group-hover:-translate-y-2">
      <div className="relative w-full" style={{ height: '350px' }}>
        <div className="transition-transform duration-500 group-hover:rotate-[12deg]" style={{ position: 'absolute', right: '-2%', top: '20px', width: '57%', transformOrigin: 'top center', transform: 'rotate(9deg)', zIndex: 1, filter: 'brightness(0.92) saturate(0.95) drop-shadow(0 14px 26px rgba(90,78,52,0.18))' }}>
          <CatalogPhone bg={t.bg} textColor={t.text} className="w-full">
            <DetailScreen t={t} />
          </CatalogPhone>
        </div>
        <div className="transition-transform duration-500 group-hover:rotate-[-13deg]" style={{ position: 'absolute', left: '-2%', top: '8px', width: '57%', transformOrigin: 'top center', transform: 'rotate(-10deg)', zIndex: 2, filter: 'drop-shadow(0 22px 38px rgba(90,78,52,0.30))' }}>
          <CatalogPhone bg={t.ink} textColor="#ffffff" className="w-full">
            <CoverScreen t={t} />
          </CatalogPhone>
        </div>
      </div>
      <p className="font-playfair font-semibold text-xl sm:text-2xl mt-5 text-center transition-colors duration-300" style={{ color: '#8B7D5F' }}>{t.name}</p>
      {showMeta && (
        <>
          <p className="font-outfit text-[9px] uppercase tracking-[0.24em] mt-2 text-center" style={{ color: 'rgba(44,37,25,0.42)' }}>{t.tag} · Serie {t.series}</p>
          <p className="font-cormorant mt-2.5 max-w-[250px] text-center" style={{ color: 'rgba(44,37,25,0.62)', fontSize: '17px', lineHeight: 1.45, fontWeight: 500 }}>{t.desc}</p>
        </>
      )}
      <span className="font-outfit text-[11px] uppercase tracking-[0.22em] mt-3" style={{ color: '#B8975A' }}>Abrir invitación</span>
    </div>
  );
}

/**
 * Ficha enlazable de una colección. `showMeta` añade estilo, serie y descripción
 * (se usa en /catalogo, donde el visitante compara muchos diseños a la vez).
 */
export default function CollectionCard({ design, delay = 0, showMeta = false }: {
  design: CollectionCatalogEntry; delay?: number; showMeta?: boolean;
}) {
  return (
    <Reveal delay={delay} y={44}>
      <a
        href={design.demoPath}
        aria-label={`Ver invitación ${design.name}`}
        className="group block w-full max-w-[280px] mx-auto rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4d5944]"
      >
        <Tilt3D max={6} scale={1.02}>
          <DualPhoneCard t={design} showMeta={showMeta} />
        </Tilt3D>
      </a>
      {showMeta && <div className="mx-auto mt-5 max-w-[280px] rounded-2xl border border-[#d8d0c2] bg-white/80 p-4 text-center font-outfit">
        <p className="text-sm font-semibold text-[#514735]">Desde Bs {PACKAGE_CATALOG.plus.bs} por evento</p>
        <p className="mt-1 text-xs leading-5 text-[#625946]">Plus: invitación y respuesta por WhatsApp. Premium añade formulario; Exclusive, panel y QR.</p>
        <CommercialLink design={design.key} placement="catalog_design" className="mt-3 block rounded-full bg-[#514735] px-4 py-3 text-sm font-semibold text-white">Encargar al equipo</CommercialLink>
        <Link href="/#precios" className="mt-2 inline-block min-h-11 py-3 text-xs text-[#514735] underline">Comparar paquetes</Link>
        <Link href={partnerEntryPath(partnerNewDesignPath(design.key))} className="mt-2 flex min-h-11 items-center justify-center rounded-xl border border-[#d8d0c2] px-3 py-2 text-sm text-[#514735] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Usar en el constructor de Socios</Link>
        <p className="mt-2 text-xs leading-5 text-[#625946]">Socios: borrador gratis; publicación con suscripción mensual.</p>
      </div>}
    </Reveal>
  );
}
