'use client';

import type { BlockType } from '@/lib/types';

type VisualGroup = 'content' | 'event' | 'media' | 'action' | 'decor' | 'layout';

const GROUPS: Record<VisualGroup, { label: string; bg: string; ink: string; border: string }> = {
  content: { label: 'Contenido', bg: '#f4eef8', ink: '#79528f', border: '#e9ddef' },
  event: { label: 'Evento', bg: '#eaf3fb', ink: '#39729f', border: '#d8e9f6' },
  media: { label: 'Multimedia', bg: '#fbecef', ink: '#a44f68', border: '#f4dbe2' },
  action: { label: 'Interacción', bg: '#eaf6f1', ink: '#3f7f68', border: '#d7ede4' },
  decor: { label: 'Decoración', bg: '#fbf3df', ink: '#9a742a', border: '#f1e4bf' },
  layout: { label: 'Composición', bg: '#eef0f4', ink: '#596273', border: '#e0e4ea' },
};

const TYPE_GROUP: Partial<Record<BlockType, VisualGroup>> = {
  cover: 'content', heading: 'content', text: 'content', quote: 'content', parents: 'content', story: 'content', timeline: 'content', monogram: 'content',
  countdown: 'event', dateBadge: 'event', eventCard: 'event', itinerary: 'event', calendar: 'event', map: 'event', lodging: 'event', tableFinder: 'event',
  image: 'media', gallery: 'media', video: 'media', beforeAfter: 'media',
  rsvp: 'action', accessPass: 'action', button: 'action', guestbook: 'action', gift: 'action', hashtag: 'action', dressCode: 'action',
  divider: 'decor', spacer: 'decor', ornament: 'decor', element: 'decor',
  group: 'layout', passportHero: 'layout', passportTicket: 'layout',
};

export function blockVisual(type: BlockType) {
  const group = TYPE_GROUP[type] ?? 'content';
  return { group, ...GROUPS[group] };
}

function GlyphPath({ group }: { group: VisualGroup }) {
  if (group === 'event') return <><rect x="4" y="5.5" width="16" height="14" rx="2" /><path d="M8 3.5v4M16 3.5v4M4 9.5h16M8 13h3M13 13h3M8 16h3" /></>;
  if (group === 'media') return <><rect x="3.5" y="5" width="17" height="14" rx="2.5" /><circle cx="9" cy="10" r="1.5" /><path d="m5.5 17 4.2-4.2 2.6 2.4 2.2-2.2 4 4" /></>;
  if (group === 'action') return <><path d="M13.7 3.5 6.3 13h5.2l-1.2 7.5 7.4-9.5h-5.2l1.2-7.5Z" /><path d="M4 5.5h4M16 18.5h4" /></>;
  if (group === 'decor') return <><path d="m12 3 1.6 5.2L19 10l-5.4 1.8L12 17l-1.6-5.2L5 10l5.4-1.8L12 3Z" /><path d="m18.5 15 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" /></>;
  if (group === 'layout') return <><rect x="3.5" y="4" width="7" height="7" rx="1.5" /><rect x="13.5" y="4" width="7" height="7" rx="1.5" /><rect x="3.5" y="14" width="7" height="6" rx="1.5" /><rect x="13.5" y="14" width="7" height="6" rx="1.5" /></>;
  return <><path d="M5 5.5h14M5 10h10M5 14.5h14M5 19h8" /><path d="M17 9v7M14.5 12.5h5" /></>;
}

export function BlockGlyph({ type, size = 'md' }: { type: BlockType; size?: 'sm' | 'md' | 'lg' }) {
  const visual = blockVisual(type);
  const px = size === 'sm' ? 30 : size === 'lg' ? 44 : 36;
  const icon = size === 'sm' ? 15 : size === 'lg' ? 21 : 18;
  return (
    <span
      className="inline-flex flex-shrink-0 items-center justify-center"
      style={{ width: px, height: px, borderRadius: size === 'lg' ? 14 : 11, color: visual.ink, background: visual.bg, border: `1px solid ${visual.border}` }}
      aria-hidden
    >
      <svg width={icon} height={icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round">
        <GlyphPath group={visual.group} />
      </svg>
    </span>
  );
}

export function LockGlyph({ locked }: { locked: boolean }) {
  return locked
    ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M16 10V7a4 4 0 0 0-7.5-2" /></svg>;
}

export function EyeGlyph({ hidden }: { hidden: boolean }) {
  return hidden
    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 3l18 18M10.5 10.7a2.2 2.2 0 0 0 2.8 2.8M9.2 5.2A10.8 10.8 0 0 1 12 4.8c5.5 0 9 7.2 9 7.2a15.5 15.5 0 0 1-2.2 3.2M6.1 6.1C4.2 7.5 3 9.8 3 12c0 0 3.5 7.2 9 7.2 1.2 0 2.3-.3 3.3-.8" /></svg>
    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 12s3.5-7.2 9-7.2 9 7.2 9 7.2-3.5 7.2-9 7.2S3 12 3 12Z" /><circle cx="12" cy="12" r="2.8" /></svg>;
}

export const editorCardCls = 'rounded-2xl border border-[#ece7df] bg-white p-4 shadow-[0_8px_30px_rgba(52,42,28,0.035)]';
export const editorSectionTitleCls = 'text-[10px] font-outfit font-semibold uppercase tracking-[0.16em] text-[#8b8175]';
