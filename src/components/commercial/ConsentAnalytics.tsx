'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type ConsentDecision = 'accepted' | 'rejected';
type Props = { gaMeasurementId?: string; metaPixelId?: string };

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string };
    _fbq?: Window['fbq'];
  }
}

const STORAGE_KEY = 'enkarta-marketing-consent-v1';

function installGoogle(id: string) {
  if (!id || document.querySelector(`script[data-enkarta-ga="${id}"]`)) return;
  const script = document.createElement('script');
  script.async = true; script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`; script.dataset.enkartaGa = id;
  document.head.appendChild(script);
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || ((...args: unknown[]) => { window.dataLayer!.push(args); });
  window.gtag('js', new Date());
}

function installMeta(id: string) {
  if (!id || window.fbq) return;
  type Fbq = NonNullable<Window['fbq']>;
  const fbq = ((...args: unknown[]) => fbq.callMethod ? fbq.callMethod(...args) : fbq.queue!.push(args)) as Fbq;
  fbq.queue = []; fbq.loaded = true; fbq.version = '2.0'; window.fbq = fbq; window._fbq = fbq;
  const script = document.createElement('script');
  script.async = true; script.src = 'https://connect.facebook.net/en_US/fbevents.js'; script.dataset.enkartaMeta = id;
  document.head.appendChild(script);
  fbq('init', id);
}

export default function ConsentAnalytics({ gaMeasurementId = '', metaPixelId = '' }: Props) {
  const pathname = usePathname();
  const [decision, setDecision] = useState<ConsentDecision | null | undefined>(undefined);
  const previousPath = useRef('');
  const configured = Boolean(gaMeasurementId || metaPixelId);

  useEffect(() => {
    if (!configured) return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    setDecision(stored === 'accepted' || stored === 'rejected' ? stored : null);
  }, [configured]);

  useEffect(() => {
    if (decision !== 'accepted' || !configured || previousPath.current === pathname) return;
    previousPath.current = pathname;
    if (gaMeasurementId) {
      installGoogle(gaMeasurementId);
      window.gtag?.('config', gaMeasurementId, { page_path: pathname, anonymize_ip: true });
    }
    if (metaPixelId) {
      installMeta(metaPixelId);
      window.fbq?.('track', 'PageView');
    }
  }, [decision, configured, gaMeasurementId, metaPixelId, pathname]);

  if (!configured || decision !== null) return null;
  const choose = (value: ConsentDecision) => { window.localStorage.setItem(STORAGE_KEY, value); setDecision(value); };
  return <aside role="dialog" aria-label="Preferencias de medición" className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-3xl rounded-2xl border border-[#d9cdbb] bg-[#fffdf9] p-4 shadow-[0_18px_60px_rgba(44,37,25,.2)] sm:flex sm:items-center sm:gap-5 sm:p-5">
    <div className="flex-1"><p className="font-outfit text-sm font-semibold text-[#3e352a]">Medición opcional</p><p className="mt-1 font-outfit text-[11px] leading-5 text-[#756b5e]">Con tu permiso usamos Google Analytics y/o Meta Pixel para conocer qué campañas funcionan. Enkarta seguirá funcionando si eliges solo lo necesario. <Link href="/legal/privacidad" className="font-semibold underline">Privacidad</Link></p></div>
    <div className="mt-3 flex flex-col gap-2 sm:mt-0 sm:flex-row"><button type="button" onClick={() => choose('rejected')} className="rounded-full border border-[#cfc3b1] px-4 py-2.5 font-outfit text-xs font-semibold text-[#695c4a]">Solo necesarias</button><button type="button" onClick={() => choose('accepted')} className="rounded-full bg-[#806b48] px-4 py-2.5 font-outfit text-xs font-semibold text-white">Permitir medición</button></div>
  </aside>;
}
