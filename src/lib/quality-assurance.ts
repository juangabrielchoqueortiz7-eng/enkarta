import type { InvitationPackage, InvitationParsed, QualityCheckRecord, QualityControlConfig } from './types';

export interface QualityCheckDefinition { id: string; label: string; detail: string; category: 'experiencia' | 'servicio' | 'seguridad' | 'recuperación'; packages: InvitationPackage[]; }
const every: InvitationPackage[] = ['plus', 'premium', 'exclusive'];
export const QUALITY_CHECKS: QualityCheckDefinition[] = [
  { id: 'mobile_360', label: 'Móvil 360 px', detail: 'Lectura completa sin desborde ni controles cortados.', category: 'experiencia', packages: every },
  { id: 'mobile_390', label: 'Móvil 390 px', detail: 'Portada, navegación, galerías y formularios utilizables.', category: 'experiencia', packages: every },
  { id: 'slow_network', label: 'Conexión lenta', detail: 'Poster, estados de carga y contenido esencial aparecen sin pantalla vacía.', category: 'experiencia', packages: every },
  { id: 'network_recovery', label: 'Pérdida y recuperación de red', detail: 'No se inventan éxitos ni ceros; el reintento conserva los datos.', category: 'recuperación', packages: every },
  { id: 'permissions', label: 'Aislamiento de permisos', detail: 'Invitado, revisión, anfitrión y puerta solo acceden a su alcance.', category: 'seguridad', packages: every },
  { id: 'backup_restore', label: 'Respaldo y restauración', detail: 'El JSON abre de nuevo y existe una versión de rollback identificada.', category: 'recuperación', packages: every },
  { id: 'client_approval', label: 'Aprobación del cliente', detail: 'La versión exacta y sus observaciones quedaron registradas.', category: 'servicio', packages: every },
  { id: 'plus_whatsapp', label: 'Plus · Confirmación por WhatsApp', detail: 'El CTA abre el mensaje correcto sin afirmar entrega.', category: 'servicio', packages: ['plus'] },
  { id: 'plus_limits', label: 'Plus · Límites reales', detail: 'No expone formulario, planilla, nombres, galería ni QR.', category: 'seguridad', packages: ['plus'] },
  { id: 'premium_form', label: 'Premium · Formulario', detail: 'Registra, corrige y recupera una confirmación sin duplicarla.', category: 'servicio', packages: ['premium'] },
  { id: 'premium_sheet', label: 'Premium · Planilla', detail: 'Exporta respuestas sin QR, mesa ni datos operativos no contratados.', category: 'servicio', packages: ['premium'] },
  { id: 'premium_limits', label: 'Premium · Sin panel ni puerta', detail: 'Panel operativo y escáner permanecen denegados.', category: 'seguridad', packages: ['premium'] },
  { id: 'exclusive_live', label: 'Exclusive · Panel en vivo', detail: 'Confirmaciones, cupos, mesas e ingresos se actualizan y recuperan.', category: 'servicio', packages: ['exclusive'] },
  { id: 'exclusive_qr', label: 'Exclusive · QR con dos dispositivos', detail: 'Escaneos simultáneos no duplican ingresos.', category: 'seguridad', packages: ['exclusive'] },
  { id: 'exclusive_door', label: 'Exclusive · Acceso de puerta', detail: 'La cuenta está aislada, puede revocarse y no administra invitados.', category: 'seguridad', packages: ['exclusive'] },
];

export const qualityChecksFor = (pkg: InvitationPackage) => QUALITY_CHECKS.filter(check => check.packages.includes(pkg));
export const qualityControl = (data?: QualityControlConfig): QualityControlConfig => ({ version: 1, ...(data?.version === 1 ? data : {}) });
export function qualityProgress(control: QualityControlConfig | undefined, pkg: InvitationPackage) {
  const records = control?.runs?.[pkg]?.checks ?? {};
  const checks = qualityChecksFor(pkg);
  // Every definition has already been scoped to the contracted package, so “No
  // aplica” is useful as an operational note but must never open the release gate.
  const passed = checks.filter(check => records[check.id]?.result === 'passed').length;
  return { passed, total: checks.length, percent: checks.length ? Math.round(passed / checks.length * 100) : 0, failed: checks.filter(check => records[check.id]?.result === 'failed').length, notApplicable: checks.filter(check => records[check.id]?.result === 'not_applicable').length };
}
export function supportReady(control?: QualityControlConfig) {
  const support = control?.support;
  return !!support?.channel?.trim() && !!support.availability?.trim() && Number.isFinite(support.firstResponseHours) && Number(support.firstResponseHours) > 0 && !!support.escalationOwner?.trim() && support.instructionsDelivered === true;
}
export function privacyReady(control?: QualityControlConfig) {
  const privacy = control?.privacy;
  return privacy?.retentionConfirmed === true && !!privacy.backupAt && !!privacy.restoreTestedAt && !!privacy.deletionOwner?.trim() && !!privacy.incidentOwner?.trim();
}
export function releaseReady(control: QualityControlConfig | undefined, pkg: InvitationPackage) {
  const progress = qualityProgress(control, pkg);
  return progress.passed === progress.total && progress.failed === 0 && supportReady(control) && privacyReady(control) && !!control?.release?.previewUrl?.trim() && !!control.release.rollbackVersionId?.trim();
}
export function qualityReport(data: InvitationParsed, generatedAt = new Date().toISOString()) {
  const pkg = data.config.package ?? 'exclusive';
  const control = qualityControl(data.config.qualityControl);
  return {
    enkartaQualityReport: 1, generatedAt, invitation: { id: data.id, slug: data.slug, names: data.names, package: pkg },
    progress: qualityProgress(control, pkg), ready: releaseReady(control, pkg),
    run: control.runs?.[pkg] ?? null, support: control.support ?? null, privacy: control.privacy ?? null, release: control.release ?? null,
  };
}

export function updateQualityCheck(control: QualityControlConfig | undefined, pkg: InvitationPackage, id: string, record: QualityCheckRecord): QualityControlConfig {
  const current = qualityControl(control);
  const run = current.runs?.[pkg] ?? {};
  return { ...current, runs: { ...(current.runs ?? {}), [pkg]: { ...run, checks: { ...(run.checks ?? {}), [id]: record }, updatedAt: new Date().toISOString() } } };
}
