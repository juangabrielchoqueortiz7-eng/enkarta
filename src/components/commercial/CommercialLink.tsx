'use client';

import { useEffect, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import type { CommercialPackage } from '@/lib/commercial';
import { commercialConfirmationPath, commercialContactPath } from '@/lib/commercial';

export default function CommercialLink({ children, packageKey = 'general', design = '', eventType = '', placement, className = '', style, ariaLabel }: {
  children: ReactNode;
  packageKey?: CommercialPackage;
  design?: string;
  eventType?: string;
  placement: string;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}) {
  const base = commercialContactPath({ packageKey, design, eventType, placement });
  const [href, setHref] = useState(base);
  const [confirmationHref, setConfirmationHref] = useState(commercialConfirmationPath({ packageKey, design, eventType }));
  useEffect(() => {
    const destination = new URL(base, window.location.origin);
    const current = new URLSearchParams(window.location.search);
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
      const value = current.get(key);
      if (value) destination.searchParams.set(key, value.slice(0, 120));
    }
    destination.searchParams.set('landing_path', window.location.pathname);
    setHref(`${destination.pathname}${destination.search}`);
    setConfirmationHref(commercialConfirmationPath({ packageKey, design, eventType, landingPath: window.location.pathname }));
  }, [base, design, eventType, packageKey]);
  const leaveConfirmation = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    window.setTimeout(() => window.location.assign(confirmationHref), 120);
  };
  return <a href={href} target="_blank" rel="noopener noreferrer" onClick={leaveConfirmation} aria-label={ariaLabel} className={className} style={style}>{children}</a>;
}
