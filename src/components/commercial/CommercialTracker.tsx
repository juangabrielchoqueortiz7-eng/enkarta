'use client';

import { useEffect } from 'react';
import type { CommercialViewEvent } from '@/lib/commercial';

function acquisition() {
  const query = new URLSearchParams(window.location.search);
  let referrerHost = '';
  try { referrerHost = document.referrer ? new URL(document.referrer).hostname : ''; } catch { /* Referencia inválida: se omite. */ }
  return {
    landingPath: window.location.pathname,
    referrerHost,
    utmSource: query.get('utm_source') || '',
    utmMedium: query.get('utm_medium') || '',
    utmCampaign: query.get('utm_campaign') || '',
    utmContent: query.get('utm_content') || '',
    utmTerm: query.get('utm_term') || '',
  };
}

export default function CommercialTracker({ event, design = '', eventType = '', placement = 'page' }: { event: CommercialViewEvent; design?: string; eventType?: string; placement?: string }) {
  useEffect(() => {
    const body = JSON.stringify({ event, design, eventType, placement, ...acquisition() });
    void fetch('/api/commercial/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  }, [design, event, eventType, placement]);
  return null;
}
