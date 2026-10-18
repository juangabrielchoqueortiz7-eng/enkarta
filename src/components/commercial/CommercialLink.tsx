'use client';

import { useEffect, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import type { CommercialPackage } from '@/lib/commercial';
import { commercialConfirmationPath, commercialContactPath, commercialNavigationPaths } from '@/lib/commercial';

export default function CommercialLink({ children, packageKey = 'general', design = '', eventType = '', placement, returnPath, className = '', style, ariaLabel }: {
  children: ReactNode;
  packageKey?: CommercialPackage;
  design?: string;
  eventType?: string;
  placement: string;
  returnPath?: string;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}) {
  const [targets, setTargets] = useState({
    href: commercialContactPath({ packageKey, design, eventType, placement }),
    confirmationHref: commercialConfirmationPath({ packageKey, design, eventType, landingPath: returnPath }),
  });
  useEffect(() => {
    setTargets(commercialNavigationPaths({ packageKey, design, eventType, placement }, window.location, returnPath));
  }, [design, eventType, packageKey, placement, returnPath]);
  const leaveConfirmation = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    window.setTimeout(() => window.location.assign(targets.confirmationHref), 120);
  };
  return <a href={targets.href} target="_blank" rel="noopener noreferrer" onClick={leaveConfirmation} aria-label={ariaLabel} className={className} style={style}>{children}</a>;
}
