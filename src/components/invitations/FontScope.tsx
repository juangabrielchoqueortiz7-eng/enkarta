'use client';

import { useEffect, useMemo } from 'react';
import { resolveFonts } from '@/lib/fonts';
import type { BuilderConfig } from '@/lib/types';

/**
 * Aplica la tipografía elegida en el builder (config.fontScript/fontHeading/fontBody)
 * a todo lo que envuelve: define las variables CSS que leen las clases globales
 * (font-great, font-cinzel, font-cormorant, …) y carga la fuente de Google Fonts.
 * Si no hay fuentes personalizadas, no añade nada.
 */
export default function FontScope({ config, children }: {
  config?: Pick<BuilderConfig, 'fontScript' | 'fontHeading' | 'fontBody'> | null;
  children: React.ReactNode;
}) {
  const { vars, url } = useMemo(() => resolveFonts(config), [config]);

  useEffect(() => {
    if (!url) return;
    // Preconnect a los servidores de Google Fonts para que la fuente llegue antes
    // (reduce el parpadeo de tipografía al cargar la invitación).
    const ensurePreconnect = (href: string, crossOrigin?: boolean) => {
      if (document.querySelector(`link[data-ek-pc="${href}"]`)) return;
      const l = document.createElement('link');
      l.rel = 'preconnect';
      l.href = href;
      l.setAttribute('data-ek-pc', href);
      if (crossOrigin) l.crossOrigin = 'anonymous';
      document.head.appendChild(l);
    };
    ensurePreconnect('https://fonts.googleapis.com');
    ensurePreconnect('https://fonts.gstatic.com', true);

    let link = document.querySelector<HTMLLinkElement>('link[data-ek-fonts]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.setAttribute('data-ek-fonts', '1');
      document.head.appendChild(link);
    }
    if (link.href !== url) link.href = url;
  }, [url]);

  if (!Object.keys(vars).length) return <>{children}</>;
  // display:contents → no afecta el layout, pero las variables CSS sí heredan.
  return <div style={{ display: 'contents', ...vars }}>{children}</div>;
}
