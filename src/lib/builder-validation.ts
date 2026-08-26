import type { Block, InvitationParsed } from './types';
import { resolveFeatures } from './packages';
import { auditDesignConsistency } from './design-audit';
import { collectPublicationResources, publicationMetrics } from './publication-audit';

export interface BuilderIssue {
  severity: 'error' | 'warning';
  title: string;
  detail: string;
  category?: 'contenido' | 'diseño' | 'accesibilidad' | 'publicación' | 'rendimiento';
  blockId?: string;
}

export interface BuilderValidation {
  errors: BuilderIssue[];
  warnings: BuilderIssue[];
}

function isHttpUrl(value: string | null | undefined) {
  if (!value) return false;
  return /^https?:\/\//i.test(value.trim());
}

function enabledBlocks(data: InvitationParsed) {
  return (data.config?.layout?.blocks ?? []).filter(block => block.enabled !== false);
}

function flattenBlocks(blocks: Block[]): Block[] {
  return blocks.flatMap(block => [block, ...(Array.isArray(block.children) ? flattenBlocks(block.children.filter(child => child.enabled !== false)) : [])]);
}

function rgb(hex?: string) {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return null;
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)] as const;
}

function contrast(a?: string, b?: string) {
  const aa = rgb(a); const bb = rgb(b);
  if (!aa || !bb) return null;
  const lum = (v: readonly number[]) => {
    const c = v.map(x => { const n = x / 255; return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; });
    return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
  };
  const l1 = lum(aa); const l2 = lum(bb);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export function validateInvitationBuilder(data: InvitationParsed): BuilderValidation {
  const issues: BuilderIssue[] = [];
  const cfg = data.config ?? {};
  const feats = resolveFeatures(cfg);
  const topBlocks = enabledBlocks(data);
  const blocks = flattenBlocks(topBlocks);
  const hasLayout = blocks.length > 0;
  const hasType = (type: string) => blocks.some(block => block.type === type);
  const resources = collectPublicationResources(data);
  const metrics = publicationMetrics(data);
  const consistency = auditDesignConsistency(data);

  if (!data.names?.trim()) {
    issues.push({ severity: 'error', title: 'Faltan los nombres', detail: 'La invitación necesita los nombres principales para portada, calendario y encabezados.' });
  }
  if (!data.event_date) {
    issues.push({ severity: 'error', title: 'Falta la fecha del evento', detail: 'Sin fecha no se puede renderizar bien la cuenta regresiva ni el guardado en calendario.' });
  }
  if (!data.ceremony_place?.trim() && !data.reception_place?.trim()) {
    issues.push({ severity: 'error', title: 'Falta al menos una ubicación', detail: 'Conviene tener ceremonia o recepción con lugar definido para no publicar una invitación vacía.' });
  }
  if (hasLayout && !hasType('cover')) {
    issues.push({ severity: 'warning', title: 'No hay portada en bloques', detail: 'La invitación por bloques quedó sin bloque de portada activo; puede sentirse abrupta al abrir.' });
  }
  if (hasLayout && !hasType('rsvp')) {
    issues.push({ severity: 'warning', title: 'No hay bloque de confirmación', detail: 'Si el cliente necesita respuestas, añade o reactiva un bloque RSVP.' });
  }
  if (hasLayout && !blocks.some(block => block.type === 'eventCard' || block.type === 'itinerary')) {
    issues.push({ severity: 'warning', title: 'No hay detalles del evento visibles', detail: 'Falta una tarjeta de ceremonia/recepción o un itinerario que ayude a ubicar al invitado.' });
  }
  if (feats.smartRsvp === false && hasLayout && hasType('rsvp') && !data.phone_whatsapp?.trim()) {
    issues.push({ severity: 'error', title: 'RSVP sin destino', detail: 'El botón de confirmar necesita un WhatsApp cuando la confirmación inteligente no está activa.' });
  }
  if (feats.galleryMax === 0 && (cfg.galleryImages?.length || data.gallery_url)) {
    issues.push({ severity: 'warning', title: 'Galería cargada pero no incluida', detail: 'El paquete actual oculta la galería; esas fotos o enlaces no se verán.' });
  }
  if (feats.galleryMax > 0 && hasLayout && hasType('gallery') && !(cfg.galleryImages?.length || data.gallery_url)) {
    issues.push({ severity: 'warning', title: 'Galería vacía', detail: 'Hay un bloque de galería activo, pero todavía no tiene fotos ni enlace compartido.' });
  }
  if (cfg.musicUrl && feats.music === false) {
    issues.push({ severity: 'warning', title: 'Música fuera de paquete', detail: 'El audio está cargado, pero el paquete actual no lo muestra al invitado.' });
  }
  if (cfg.musicUrl && !isHttpUrl(cfg.musicUrl)) {
    issues.push({ severity: 'warning', title: 'URL de música no validada', detail: 'Revisa que el audio sea un enlace directo o un archivo subido correctamente.' });
  }
  if (cfg.features?.music === true && !cfg.musicUrl) {
    issues.push({ severity: 'warning', category: 'contenido', title: 'Música activada sin archivo', detail: 'La función está encendida, pero no hay una canción seleccionada.' });
  }
  if (cfg.features?.calendar === true && !data.event_date) {
    issues.push({ severity: 'error', category: 'contenido', title: 'Calendario sin fecha', detail: 'La función de calendario necesita la fecha del evento para generar una cita válida.' });
  }
  if (data.gallery_url && !isHttpUrl(data.gallery_url)) {
    issues.push({ severity: 'warning', title: 'Enlace de galería inválido', detail: 'El link de galería debería empezar con http:// o https://.' });
  }
  if (data.phone_whatsapp && data.phone_whatsapp.replace(/[^\d]/g, '').length < 8) {
    issues.push({ severity: 'warning', title: 'WhatsApp incompleto', detail: 'El número parece demasiado corto; revisa código de país y dígitos.' });
  }
  if ((cfg.entry?.enabled ?? feats.entry) && !String(cfg.entry?.label ?? '').trim()) {
    issues.push({ severity: 'warning', title: 'Portada sin texto de entrada', detail: 'La pantalla de entrada está activa; conviene personalizar el texto del botón.' });
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug || '')) {
    issues.push({ severity: 'error', category: 'publicación', title: 'URL no válida', detail: 'El slug debe usar minúsculas, números y guiones, sin espacios ni caracteres especiales.' });
  }
  if (data.event_date && data.event_date.slice(0, 10) < new Date().toISOString().slice(0, 10)) {
    issues.push({ severity: 'warning', category: 'publicación', title: 'La fecha del evento ya pasó', detail: 'Comprueba que no estés publicando una invitación con una fecha anterior a hoy.' });
  }
  if (data.expires_at && data.event_date && data.expires_at.slice(0, 10) < data.event_date.slice(0, 10)) {
    issues.push({ severity: 'warning', category: 'publicación', title: 'El enlace vence antes del evento', detail: 'La fecha de expiración es anterior a la celebración.' });
  }

  const textContrast = contrast(cfg.theme?.text || data.color_accent, cfg.theme?.bg || data.color_secondary);
  if (textContrast != null && textContrast < 3) {
    issues.push({ severity: 'error', category: 'accesibilidad', title: 'Contraste de texto insuficiente', detail: `Texto y fondo tienen una relación ${textContrast.toFixed(1)}:1; usa colores más separados para que sea legible.` });
  } else if (textContrast != null && textContrast < 4.5) {
    issues.push({ severity: 'warning', category: 'accesibilidad', title: 'Contraste de texto bajo', detail: `La relación es ${textContrast.toFixed(1)}:1; se recomienda al menos 4.5:1 para texto normal.` });
  }
  const buttonContrast = contrast(cfg.theme?.onPrimary, cfg.theme?.primary);
  if (buttonContrast != null && buttonContrast < 3) {
    issues.push({ severity: 'warning', category: 'accesibilidad', title: 'Botones con poco contraste', detail: 'El texto sobre el color principal puede ser difícil de leer.' });
  }

  for (const block of blocks) {
    const props = block.props ?? {};
    if ((block.type === 'heading' || block.type === 'text') && !String(props.text || '').trim()) {
      issues.push({ severity: 'warning', category: 'contenido', blockId: block.id, title: 'Sección de texto vacía', detail: 'Este bloque está visible, pero no contiene texto.' });
    }
    if (block.type === 'image' && !String(props.url || '').trim()) {
      issues.push({ severity: 'warning', category: 'contenido', blockId: block.id, title: 'Imagen faltante', detail: 'El bloque de imagen está activo, pero todavía no tiene un archivo.' });
    }
    if (block.type === 'beforeAfter' && (!String(props.before || '').trim() || !String(props.after || '').trim())) {
      issues.push({ severity: 'warning', category: 'contenido', blockId: block.id, title: 'Comparador incompleto', detail: 'El bloque antes/después necesita sus dos imágenes.' });
    }
    if (block.type === 'eventCard' && !String(props.place || props.title || '').trim()) {
      issues.push({ severity: 'warning', category: 'contenido', blockId: block.id, title: 'Tarjeta de evento vacía', detail: 'Añade el lugar o título que debe ver el invitado.' });
    }
    if (block.type === 'image' && String(props.url || '').trim() && !String(props.alt || '').trim()) {
      issues.push({ severity: 'warning', category: 'accesibilidad', blockId: block.id, title: 'Imagen sin descripción', detail: 'Añade una descripción accesible al bloque de imagen.' });
    }
    if (block.type === 'video' && !String(props.url || '').trim()) {
      issues.push({ severity: 'warning', category: 'contenido', blockId: block.id, title: 'Video vacío', detail: 'El bloque de video está visible pero no tiene enlace.' });
    }
    if (block.type === 'map' && !String(props.query || '').trim()) {
      issues.push({ severity: 'warning', category: 'contenido', blockId: block.id, title: 'Mapa sin dirección', detail: 'El bloque de mapa necesita un lugar o dirección.' });
    }
    if (block.type === 'button' && !String(props.href || '').trim()) {
      issues.push({ severity: 'warning', category: 'contenido', blockId: block.id, title: 'Botón sin enlace', detail: `El botón “${String(props.label || 'Botón')}” no lleva a ningún destino.` });
    }
    if (block.type === 'button' && /^http:\/\//i.test(String(props.href || ''))) {
      issues.push({ severity: 'warning', category: 'publicación', blockId: block.id, title: 'Enlace de botón inseguro', detail: 'Usa una URL HTTPS para evitar advertencias y bloqueos en el navegador.' });
    }
    if (block.visibility && feats.guestNames === false && block.visibility.audience === 'personalized') {
      issues.push({ severity: 'warning', category: 'publicación', blockId: block.id, title: 'Condición incompatible con el paquete', detail: 'Este bloque pide un enlace personalizado, pero el paquete no incluye nombres por invitado.' });
    }
    const mobile = block.layout?.mobile ?? {};
    const desktop = block.layout?.desktop ?? {};
    const geometryAt = (device: 'mobile' | 'desktop') => {
      const override = device === 'mobile' ? mobile : desktop;
      if (override.mode === 'auto') return { x: 0, w: undefined as number | undefined };
      if (override.mode === 'inherit') return { x: block.layout?.x ?? 0, w: block.layout?.w };
      return { x: override.x ?? block.layout?.x ?? 0, w: override.w ?? block.layout?.w };
    };
    const failingWidths = [360, 390, 768, 1024, 1440].filter(width => {
      const device = width < 640 ? 'mobile' : 'desktop';
      const geometry = geometryAt(device);
      const safe = width - (device === 'mobile' ? 32 : 64);
      return Math.abs(geometry.x) > safe * 0.45 || (typeof geometry.w === 'number' && geometry.w > safe);
    });
    if (failingWidths.length) {
      issues.push({ severity: 'warning', category: 'diseño', blockId: block.id, title: 'Posible desborde responsive', detail: `Revisa este bloque a ${failingWidths.join(', ')} px. Usa el modo Automático, reduce el ancho o recéntralo.` });
    }
    const hiddenMobile = mobile.hidden ?? block.layout?.hideOn === 'mobile';
    const hiddenDesktop = desktop.hidden ?? block.layout?.hideOn === 'desktop';
    if (hiddenMobile && hiddenDesktop) {
      issues.push({ severity: 'warning', category: 'diseño', blockId: block.id, title: 'Bloque oculto en todos los dispositivos', detail: 'Está oculto tanto en móvil como en escritorio; no aparecerá en la invitación publicada.' });
    }
    const mobileScale = mobile.fontScale ?? 1;
    const desktopScale = desktop.fontScale ?? 1;
    if (mobileScale < 0.85 || desktopScale < 0.85) {
      issues.push({ severity: 'warning', category: 'accesibilidad', blockId: block.id, title: 'Texto demasiado reducido', detail: 'La escala tipográfica puede dificultar la lectura. Mantén al menos 85% o comprueba el resultado a 360 px.' });
    }
    const explicitSize = typeof props.size === 'number' ? props.size : 0;
    const mobileWidth = mobile.w ?? block.layout?.w;
    if (explicitSize > 52 && typeof mobileWidth === 'number' && mobileWidth < 300) {
      issues.push({ severity: 'warning', category: 'diseño', blockId: block.id, title: 'Texto con riesgo de corte', detail: 'El tamaño tipográfico es grande para el ancho móvil asignado. Reduce la fuente o usa ancho automático.' });
    }
  }

  consistency.issues.filter(issue => issue.level !== 'good').forEach(issue => {
    issues.push({
      severity: issue.level === 'critical' ? 'error' : 'warning',
      category: 'diseño',
      title: `Demasiados ${issue.label.toLowerCase()}`,
      detail: `${issue.count} detectados; el límite recomendado es ${issue.limit}. ${issue.detail}`,
    });
  });

  resources.forEach(resource => {
    if (/^http:\/\//i.test(resource.url)) {
      issues.push({ severity: 'warning', category: 'publicación', blockId: resource.blockId, title: 'Recurso servido sin HTTPS', detail: `${resource.label} puede ser bloqueado o mostrar una advertencia de seguridad.` });
    }
    if (resource.url.startsWith('data:') && resource.url.length > 2_800_000) {
      issues.push({ severity: 'warning', category: 'rendimiento', blockId: resource.blockId, title: 'Imagen incrustada demasiado pesada', detail: `${resource.label} supera aproximadamente 2 MB. Súbela optimizada antes de publicar.` });
    }
  });
  if (metrics.images > 30) {
    issues.push({ severity: 'warning', category: 'rendimiento', title: 'Demasiadas imágenes en una sola invitación', detail: `${metrics.images} imágenes pueden retrasar la primera carga. Conserva solo las necesarias o reparte la galería.` });
  }
  if (metrics.approximateDocumentKb > 500) {
    issues.push({ severity: 'warning', category: 'rendimiento', title: 'Documento del diseño muy pesado', detail: `La configuración ocupa aproximadamente ${metrics.approximateDocumentKb} KB antes de cargar imágenes.` });
  }
  if (metrics.animatedBlocks > 12 || metrics.animationStyles > 4) {
    issues.push({ severity: 'warning', category: 'diseño', title: 'Exceso de animaciones', detail: `${metrics.animatedBlocks} bloques animados y ${metrics.animationStyles} estilos distintos pueden hacer la experiencia pesada e inconsistente.` });
  }

  const floating = blocks.filter(block => block.type === 'element');
  for (const device of ['mobile', 'desktop'] as const) {
    let overlapFound = false;
    for (let i = 0; i < floating.length && !overlapFound; i++) {
      const a = floating[i].layout?.[device] ?? {};
      if (a.hidden) continue;
      for (let j = i + 1; j < floating.length; j++) {
        const b = floating[j].layout?.[device] ?? {};
        if (b.hidden) continue;
        const sameAnchor = (a.anchor ?? floating[i].layout?.anchor ?? 'tc') === (b.anchor ?? floating[j].layout?.anchor ?? 'tc');
        const close = Math.abs((a.x ?? floating[i].layout?.x ?? 0) - (b.x ?? floating[j].layout?.x ?? 0)) < 70
          && Math.abs((a.y ?? floating[i].layout?.y ?? 0) - (b.y ?? floating[j].layout?.y ?? 0)) < 70;
        if (sameAnchor && close) { overlapFound = true; break; }
      }
    }
    if (overlapFound) {
      issues.push({ severity: 'warning', category: 'diseño', title: `Elementos posiblemente superpuestos en ${device === 'mobile' ? 'móvil' : 'escritorio'}`, detail: 'Dos adornos comparten casi la misma ancla y posición. Sepáralos o revisa sus capas en la vista responsive.' });
    }
  }

  return {
    errors: issues.filter(issue => issue.severity === 'error'),
    warnings: issues.filter(issue => issue.severity === 'warning'),
  };
}
