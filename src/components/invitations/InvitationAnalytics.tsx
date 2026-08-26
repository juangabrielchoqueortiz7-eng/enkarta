'use client';

import { useEffect } from 'react';

export type InvitationAnalyticsEvent =
  | 'view' | 'entry_open' | 'rsvp_start' | 'rsvp_submit' | 'map_open'
  | 'calendar_add' | 'gallery_open' | 'share' | 'link_open' | 'music_toggle'
  | 'scroll_25' | 'scroll_50' | 'scroll_75' | 'scroll_100' | 'cta_click';

export const ANALYTICS_EVENT = 'enkarta:analytics';

export function emitInvitationAnalytics(type: InvitationAnalyticsEvent, metadata?: Record<string, string | number | boolean>) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(ANALYTICS_EVENT, { detail: { type, metadata } }));
}

function sessionFor(slug: string) {
  const key = `enkarta_analytics_session_${slug}`;
  try {
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;
    const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    window.sessionStorage.setItem(key, id);
    return id;
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
}

function acquisitionSource() {
  const params = new URLSearchParams(window.location.search);
  const campaign = params.get('utm_source');
  if (campaign) return campaign.slice(0, 80);
  try { return document.referrer ? new URL(document.referrer).hostname : 'directo'; } catch { return 'directo'; }
}

export default function InvitationAnalytics({ slug, guestPublicId }: { slug: string; guestPublicId?: string }) {
  useEffect(() => {
    const sessionId = sessionFor(slug);
    const base = {
      source: acquisitionSource(),
      device: window.innerWidth < 768 ? 'mobile' : 'desktop',
    };
    const send = (type: InvitationAnalyticsEvent, metadata: Record<string, string | number | boolean> = {}) => {
      const body = JSON.stringify({ slug, type, sessionId, guestPublicId, metadata: { ...base, ...metadata } });
      if (document.visibilityState === 'hidden' && navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics', new Blob([body], { type: 'application/json' }));
      } else {
        void fetch('/api/analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
      }
    };

    send('view');
    let rsvpStarted = false;
    const reached = new Set<number>();
    let scrollFrame = 0;
    const onCustom = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: InvitationAnalyticsEvent; metadata?: Record<string, string | number | boolean> }>).detail;
      if (detail?.type) send(detail.type, detail.metadata);
    };
    const onFocus = (event: FocusEvent) => {
      if (!rsvpStarted && event.target instanceof Element && event.target.closest('#enkarta-confirmar')) {
        rsvpStarted = true; send('rsvp_start');
      }
    };
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const control = event.target.closest('a,button');
      if (!control) return;
      const text = (control.textContent || '').trim().toLowerCase();
      const href = control instanceof HTMLAnchorElement ? control.href.toLowerCase() : '';
      const label = ((control.getAttribute('aria-label') || text || 'acción').trim().replace(/\s+/g, ' ').slice(0, 80));
      send('cta_click', { label, element: control.tagName.toLowerCase() });
      if (/google\.[^/]+\/maps|maps\.app|maps\.google|goo\.gl\/maps/.test(href) || /ubicaci[oó]n|c[oó]mo llegar/.test(text)) send('map_open');
      else if (/calendar|text\/calendar/.test(href) || /calendario/.test(text)) send('calendar_add');
      else if (/galer[ií]a|fotos|photos/.test(href + text)) send('gallery_open');
      else if (/compartir|share/.test(text)) send('share');
      else if (/m[uú]sica|audio/.test((control.getAttribute('aria-label') || '') + text)) send('music_toggle');
      else if (control instanceof HTMLAnchorElement && href && !href.startsWith(window.location.origin.toLowerCase()) && !href.startsWith('data:')) send('link_open');
    };
    const onScroll = () => {
      if (scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        const depth = Math.min(100, Math.round((window.scrollY / scrollable) * 100));
        ([25, 50, 75, 100] as const).forEach(threshold => {
          if (depth >= threshold && !reached.has(threshold)) {
            reached.add(threshold);
            send(`scroll_${threshold}` as InvitationAnalyticsEvent, { depth: threshold });
          }
        });
      });
    };

    window.addEventListener(ANALYTICS_EVENT, onCustom);
    document.addEventListener('focusin', onFocus);
    document.addEventListener('click', onClick);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener(ANALYTICS_EVENT, onCustom);
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('click', onClick);
      window.removeEventListener('scroll', onScroll);
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
    };
  }, [guestPublicId, slug]);
  return null;
}
