'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { InvitationParsed } from '@/lib/types';
import { paradiseReferenceHeading } from '@/lib/paradise-reference';
import { resolveFeatures } from '@/lib/packages';
import { emitInvitationAnalytics } from './InvitationAnalytics';
import styles from './ParadiseReference.module.css';

const ENVELOPE_LEFT = '/invitations/mariana-y-jesus/Recurso-1Sobres-copia-scaled.webp';
const ENVELOPE_RIGHT = '/invitations/mariana-y-jesus/Recurso-2Sobres-copia-scaled.webp';
const SEAL = '/invitations/laura-andres/SELLO-VERDE-copia_2.webp';

/** Own entry lifecycle: no changes to the entrance or data of Verdealma. */
export function ParadiseReferenceEntry({ children, label = 'Ver invitación' }: {
  children: ReactNode;
  label?: string;
}) {
  const [phase, setPhase] = useState<'closed' | 'opening' | 'open'>('closed');
  const opening = useRef(false);
  const active = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const gateRef = useRef<HTMLDivElement>(null);
  const opened = phase === 'open';

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    const content = contentRef.current;
    if (opened) {
      content?.removeAttribute('inert');
      const heading = content?.querySelector<HTMLElement>('h1');
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    } else {
      content?.setAttribute('inert', '');
      gateRef.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    }
    return () => { content?.removeAttribute('inert'); };
  }, [opened]);

  useEffect(() => {
    if (opened) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [opened]);

  const enter = () => {
    if (opening.current || !active.current) return;
    opening.current = true;
    setPhase('opening');
    emitInvitationAnalytics('entry_open');
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // A timer is also the fallback when CSS transition events never arrive.
    timer.current = setTimeout(() => {
      timer.current = null;
      if (!active.current) return;
      setPhase('open');
      window.dispatchEvent(new CustomEvent('enkarta:enter'));
    }, reduced ? 0 : 1100);
  };

  return <>
    <div ref={contentRef} aria-hidden={!opened} className={styles.content}>{children}</div>
    {!opened && <div
      ref={gateRef}
      role="dialog"
      aria-modal="true"
      aria-label={label || 'Ver invitación'}
      aria-busy={phase === 'opening'}
      data-paradise-entry={phase}
      className={styles.entry}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); enter(); }
        if (event.key !== 'Tab') return;
        const items = gateRef.current?.querySelectorAll<HTMLButtonElement>('button');
        if (!items?.length) return;
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}
    >
      <div className={styles.envelopeLeft} style={{ backgroundImage: `url("${ENVELOPE_LEFT}")` }} aria-hidden="true" />
      <div className={styles.envelopeRight} style={{ backgroundImage: `url("${ENVELOPE_RIGHT}")` }} aria-hidden="true" />
      <button type="button" className={styles.sealButton} onClick={enter} aria-label={label || 'Ver invitación'} aria-disabled={phase === 'opening'}>
        <span className={styles.entryLabel}>{label}</span>
        <svg className={styles.entryArrow} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><path d="m5 6 7 7 7-7M5 13l7 7 7-7" /></svg>
        <img src={SEAL} alt="" width={100} height={100} draggable={false} decoding="async" />
      </button>
    </div>}
  </>;
}

/** Editable composition measured from the specific public Paradise reference. */
export function ParadiseReferenceHero({ data }: { data: InvitationParsed }) {
  const heading = paradiseReferenceHeading(data);
  // Preserve the measured composition for the sample and fit longer edits.
  const longestName = Math.max(heading.bride.length, heading.groom.length);
  const longestLast = Math.max(heading.brideLast.length, heading.groomLast.length);
  const scale = Math.max(.5, Math.min(1, 9 / Math.max(9, longestName), 12 / Math.max(12, longestLast)));
  const colors = {
    '--pr-ink': data.config.theme?.text ?? '#ede4d2',
    '--pr-name-scale': scale,
  } as CSSProperties;
  return <section className={styles.hero} style={colors} data-paradise-reference-hero aria-label="Portada de la invitación">
    <div className={styles.nameColumn}>
      <div className={styles.nameComposition}>
        <h1 className={styles.names} aria-label={[heading.bride, heading.brideLast, 'y', heading.groom, heading.groomLast].filter(Boolean).join(' ')}>
          <span className={styles.firstLine}><span className={styles.bride}>{heading.bride}</span><span className={styles.lastName}>{heading.brideLast}</span></span>
          <span className={styles.ampersand} aria-hidden="true">&amp;</span>
          <span className={styles.secondLine}><span className={styles.groom}>{heading.groom}</span><span className={styles.lastName}>{heading.groomLast}</span></span>
        </h1>
      </div>
    </div>
    <div className={styles.photoGroup}>
      <div className={styles.dateColumn}><time className={styles.date} dateTime={heading.dateLine ? data.event_date ?? undefined : undefined}>{heading.dateLine}</time></div>
      <div className={styles.portrait}>{heading.coverImage && <img src={heading.coverImage} alt="Fotografía de la pareja" loading="eager" decoding="async" />}</div>
      <div className={styles.cityColumn}><p className={styles.city}>{heading.city}</p></div>
    </div>
  </section>;
}

export default function ParadiseReference({ data, preview = false, skipEntry = false }: {
  data: InvitationParsed;
  preview?: boolean;
  demo?: boolean;
  skipEntry?: boolean;
  deadlinePassed?: boolean;
}) {
  const hero = <ParadiseReferenceHero data={data} />;
  const entryEnabled = data.config.entry?.enabled ?? resolveFeatures(data.config).entry;
  return <div className={styles.profile} data-paradise-reference data-paradise-reference-page={preview ? undefined : ''}>
    {preview || skipEntry || !entryEnabled ? hero : <ParadiseReferenceEntry label={data.config.entry?.label ?? 'Ver invitación'}>{hero}</ParadiseReferenceEntry>}
  </div>;
}
