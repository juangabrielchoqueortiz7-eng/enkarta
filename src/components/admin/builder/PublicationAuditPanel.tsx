'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { InvitationParsed } from '@/lib/types';
import type { BuilderIssue, BuilderValidation } from '@/lib/builder-validation';
import { collectPublicationResources, publicationMetrics, resourceBudgetBytes } from '@/lib/publication-audit';
import { requestPublicationAudit, type RemoteAudit } from '@/lib/publication-audit-client';

interface Props {
  data: InvitationParsed;
  validation: BuilderValidation;
  onOpenBlock?: (blockId: string) => void;
}

type AuditCategory = 'todos' | 'contenido' | 'diseño' | 'accesibilidad' | 'publicación' | 'rendimiento';
type AuditContext = { key: string };
type AuditAttempt = { context: AuditContext; controller: AbortController };

const CATEGORY_LABEL: Record<AuditCategory, string> = {
  todos: 'Todos', contenido: 'Contenido', diseño: 'Diseño', accesibilidad: 'Accesibilidad', publicación: 'Publicación', rendimiento: 'Rendimiento',
};

const formatBytes = (bytes: number) => bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export default function PublicationAuditPanel({ data, validation, onOpenBlock }: Props) {
  const [category, setCategory] = useState<AuditCategory>('todos');
  const [remoteResult, setRemoteResult] = useState<{ context: AuditContext; audit: RemoteAudit } | null>(null);
  const [showCaptures, setShowCaptures] = useState(false);
  const requestRef = useRef<AuditAttempt | null>(null), mounted = useRef(true);
  const [requestState, setRequestState] = useState<{ context: AuditContext; phase: 'idle' | 'running' | 'done' | 'error'; message?: string } | null>(null);
  const resources = useMemo(() => collectPublicationResources(data), [data]);
  const metrics = useMemo(() => publicationMetrics(data), [data]);
  const signature = JSON.stringify([data.id, resources]);
  const contextRef = useRef<AuditContext>({ key: signature });
  if (contextRef.current.key !== signature) contextRef.current = { key: signature };
  const context = contextRef.current;
  const resourceState = requestState?.context === context ? requestState.phase : 'idle';
  const remote = remoteResult?.context === context ? remoteResult.audit : null;

  useEffect(() => {
    mounted.current = true;
    setRequestState({ context, phase: 'idle' });
    return () => {
      mounted.current = false;
      if (requestRef.current?.context === context) {
        requestRef.current.controller.abort(); requestRef.current = null;
      }
    };
  }, [context]);

  const remoteIssues = useMemo<BuilderIssue[]>(() => {
    if (!remote) return [];
    const issues: BuilderIssue[] = [];
    remote.results.forEach(result => {
      if (!result.ok) issues.push({ severity: result.kind === 'link' ? 'error' : 'warning', category: result.kind === 'link' ? 'publicación' : 'rendimiento', blockId: result.blockId, title: `${result.label} no responde`, detail: result.error || `El servidor devolvió estado ${result.status || 'desconocido'}.` });
      else if ((result.bytes || 0) > resourceBudgetBytes(result.kind, result.url)) issues.push({ severity: 'warning', category: 'rendimiento', blockId: result.blockId, title: `${result.label} es pesado`, detail: `El archivo original pesa ${formatBytes(result.bytes || 0)}. Las fotografías adaptativas se optimizan al servirlas; revisa especialmente GIF, video y audio.` });
      else if ((result.durationMs || 0) > 1800) issues.push({ severity: 'warning', category: 'rendimiento', blockId: result.blockId, title: `${result.label} responde lento`, detail: `La comprobación tardó ${result.durationMs} ms.` });
    });
    return issues;
  }, [remote]);

  const issues = useMemo(() => [...validation.errors, ...validation.warnings, ...remoteIssues], [validation, remoteIssues]);
  const visibleIssues = category === 'todos' ? issues : issues.filter(issue => (issue.category ?? 'contenido') === category);
  const errorCount = issues.filter(issue => issue.severity === 'error').length;
  const warningCount = issues.filter(issue => issue.severity === 'warning').length;
  const score = Math.max(0, 100 - errorCount * 18 - warningCount * 4);
  const incompleteResourceCheck = resources.length > 0 && (!remote || remote.summary.checked < resources.length);
  const reviewTitle = errorCount ? 'Necesita una última revisión' : incompleteResourceCheck ? 'Falta comprobar recursos' : warningCount ? 'Revisa los avisos pendientes' : 'Sin problemas detectados';

  const runResources = async () => {
    if (!mounted.current || contextRef.current !== context || !resources.length || requestRef.current?.context === context) return;
    requestRef.current?.controller.abort();
    const attempt: AuditAttempt = { context, controller: new AbortController() };
    requestRef.current = attempt;
    const current = () => mounted.current && contextRef.current === context && requestRef.current === attempt && !attempt.controller.signal.aborted;
    setRemoteResult(null);
    setRequestState({ context, phase: 'running' });
    try {
      const audit = await requestPublicationAudit(data.id, resources, attempt.controller.signal);
      if (!current()) return;
      setRemoteResult({ context, audit });
      setRequestState({ context, phase: 'done' });
    } catch (failure) {
      if (current()) setRequestState({ context, phase: 'error', message: failure instanceof Error ? failure.message : 'No pudimos verificar los recursos. Repite el análisis.' });
    } finally {
      if (requestRef.current === attempt) requestRef.current = null;
      attempt.controller.abort();
    }
  };

  const expiryText = data.expires_at ? new Date(`${data.expires_at.slice(0, 10)}T12:00:00`).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' }) : data.validity_mode === 'automatic' ? 'Vigencia pendiente de fecha' : 'Sin expiración acordada';

  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-[22px] border border-[#e7e0ec] bg-white shadow-sm">
        <div className="bg-[linear-gradient(135deg,#252438_0%,#51445f_65%,#79607d_100%)] p-4 text-white">
          <div className="flex items-center gap-4">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/10 ring-4 ring-white/10"><span className="font-playfair text-2xl font-bold">{score}</span><span className="absolute bottom-2 text-[7px] uppercase tracking-wider text-white/50 font-outfit">QA</span></div>
            <div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50 font-outfit">Revisión de publicación</p><h3 className="mt-1 font-playfair text-xl">{reviewTitle}</h3><p className="mt-1 text-[11px] leading-relaxed text-white/60 font-outfit">Indicador orientativo de contenido y recursos. Completa la revisión visual en celular antes de publicar.</p></div>
          </div>
          <div className="mt-4 grid grid-cols-5 gap-2 text-center">
            <div className="rounded-xl bg-white/10 p-2"><p className="text-sm font-semibold font-outfit">{metrics.sections}</p><p className="text-[8px] uppercase text-white/45 font-outfit">Secciones</p></div>
            <div className="rounded-xl bg-white/10 p-2"><p className="text-sm font-semibold font-outfit">{metrics.images}</p><p className="text-[8px] uppercase text-white/45 font-outfit">Imágenes</p></div>
            <div className="rounded-xl bg-white/10 p-2"><p className="text-sm font-semibold font-outfit">{metrics.videos}</p><p className="text-[8px] uppercase text-white/45 font-outfit">Videos</p></div>
            <div className="rounded-xl bg-white/10 p-2"><p className="text-sm font-semibold font-outfit">{metrics.animatedBlocks}</p><p className="text-[8px] uppercase text-white/45 font-outfit">Animados</p></div>
            <div className="rounded-xl bg-white/10 p-2"><p className="text-sm font-semibold font-outfit">{metrics.approximateDocumentKb} KB</p><p className="text-[8px] uppercase text-white/45 font-outfit">Documento</p></div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-px bg-gray-100 text-center font-outfit"><div className="bg-white p-2.5"><p className="text-sm font-semibold text-red-600">{errorCount}</p><p className="text-[8px] uppercase text-gray-400">Bloqueos</p></div><div className="bg-white p-2.5"><p className="text-sm font-semibold text-amber-600">{warningCount}</p><p className="text-[8px] uppercase text-gray-400">Avisos</p></div><div className="bg-white p-2.5"><p className="text-sm font-semibold text-emerald-600">{remote?.summary.checked ?? 0}</p><p className="text-[8px] uppercase text-gray-400">Recursos revisados</p></div></div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {(Object.keys(CATEGORY_LABEL) as AuditCategory[]).map(item => {
          const count = item === 'todos' ? issues.length : issues.filter(issue => (issue.category ?? 'contenido') === item).length;
          return <button key={item} type="button" onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-full px-2.5 py-1.5 text-[9px] font-semibold font-outfit ${category === item ? 'bg-gray-900 text-white' : count ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{CATEGORY_LABEL[item]} {count}</button>;
        })}
      </div>

      <div className="space-y-2">
        {!visibleIssues.length && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-center"><span className="text-xl">✓</span><p className="mt-1 text-sm font-semibold text-emerald-800 font-outfit">Sin avisos detectados en esta categoría</p>{incompleteResourceCheck && <p className="mt-1 text-[10px] text-emerald-700 font-outfit">La comprobación de recursos todavía está pendiente o incompleta.</p>}</div>}
        {visibleIssues.map((issue, index) => <article key={`${issue.title}-${issue.blockId || index}`} className={`rounded-2xl border p-3 ${issue.severity === 'error' ? 'border-red-100 bg-red-50/70' : 'border-amber-100 bg-amber-50/60'}`}><div className="flex items-start gap-2.5"><span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${issue.severity === 'error' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>{issue.severity === 'error' ? '!' : '△'}</span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className={`text-xs font-semibold font-outfit ${issue.severity === 'error' ? 'text-red-800' : 'text-amber-800'}`}>{issue.title}</p><span className="ml-auto rounded-full bg-white/70 px-2 py-0.5 text-[8px] uppercase text-gray-400 font-outfit">{issue.category ?? 'contenido'}</span></div><p className={`mt-1 text-[11px] leading-relaxed font-outfit ${issue.severity === 'error' ? 'text-red-600' : 'text-amber-700'}`}>{issue.detail}</p>{issue.blockId && <button type="button" onClick={() => onOpenBlock?.(issue.blockId!)} className="mt-2 rounded-lg bg-white px-2 py-1 text-[9px] font-semibold text-violet-600 shadow-sm font-outfit">Abrir bloque →</button>}</div></div></article>)}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-[#faf9f7] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0 flex-1 basis-48"><p className="text-sm font-semibold text-gray-800 font-outfit">Recursos y enlaces reales</p><p className="mt-1 text-sm leading-relaxed text-gray-600 font-outfit">Comprueba respuesta, peso y velocidad de hasta 24 recursos.</p></div><button type="button" onClick={() => void runResources()} disabled={resourceState === 'running' || !resources.length} aria-busy={resourceState === 'running' || undefined} className="min-h-11 shrink-0 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:opacity-40 font-outfit">{resourceState === 'running' ? 'Analizando…' : resourceState === 'error' ? 'Reintentar análisis' : remote ? 'Repetir prueba' : `Analizar ${Math.min(resources.length, 24)}`}</button></div>
        {resourceState === 'running' && <p role="status" className="mt-3 text-sm leading-relaxed text-gray-700 font-outfit">Comprobando los recursos de esta invitación. Puede tardar hasta 25 segundos.</p>}
        {resourceState === 'error' && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-relaxed text-red-800 font-outfit">{requestState?.message}</p>}
        {!remote && resourceState !== 'running' && <p className="mt-3 text-sm leading-relaxed text-amber-900 font-outfit">{resources.length ? 'Los recursos actuales aún no están verificados. Repite la prueba después de cambiar fotos o enlaces.' : 'Añade una foto, música o un enlace para analizar sus recursos.'}</p>}
        {remote && <p role="status" className="mt-3 text-sm leading-relaxed text-gray-700 font-outfit">Verificados {remote.summary.checked} de {remote.summary.available}. {remote.summary.available > 24 && 'Esta prueba comprueba únicamente los primeros 24 recursos. '}{remote.summary.unknownSize} sin peso conocido. El peso corresponde a archivos originales, no al tiempo de carga de la página.</p>}
        {remote && <dl className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-2 font-outfit"><div className="rounded-lg bg-white p-3"><dt className="text-xs text-gray-600">Revisados</dt><dd className="mt-1 text-base font-semibold tabular-nums text-gray-800">{remote.summary.checked}</dd></div><div className="rounded-lg bg-white p-3"><dt className="text-xs text-gray-600">Fallidos</dt><dd className={`mt-1 text-base font-semibold tabular-nums ${remote.summary.failed ? 'text-red-700' : 'text-emerald-800'}`}>{remote.summary.failed}</dd></div><div className="rounded-lg bg-white p-3"><dt className="text-xs text-gray-600">Peso conocido</dt><dd className="mt-1 text-base font-semibold tabular-nums text-gray-800">{formatBytes(remote.summary.totalBytes)}</dd></div><div className="rounded-lg bg-white p-3"><dt className="text-xs text-gray-600">Respuesta</dt><dd className="mt-1 text-base font-semibold tabular-nums text-gray-800">{remote.summary.averageResponseMs} ms</dd></div></dl>}
      </div>

      <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-3">
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold text-cyan-900 font-outfit">Prueba exacta de producción</p><p className="mt-0.5 text-[10px] text-cyan-700 font-outfit">Borrador privado con el mismo renderer del enlace final.</p></div><a href={`/i/${data.slug}?preview=1`} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-white px-3 py-2 text-[10px] font-semibold text-cyan-800 shadow-sm font-outfit">Abrir completa ↗</a></div>
        <button type="button" onClick={() => setShowCaptures(value => !value)} className="mt-3 text-[10px] font-semibold text-cyan-800 font-outfit">{showCaptures ? 'Cerrar vistas de control' : 'Cargar vistas de control (3 pantallas)'}</button>
        {showCaptures && <div className="mt-3 grid grid-cols-3 gap-2">
          {([['cover', 'Portada'], ['middle', 'Sección media'], ['end', 'Cierre']] as const).map(([position, label]) => <a key={position} href={`/i/${data.slug}?preview=1&capture=${position}`} target="_blank" rel="noopener noreferrer" className="overflow-hidden rounded-xl border border-cyan-100 bg-white"><div className="relative h-24 overflow-hidden bg-[#ece7df]"><iframe title={`Captura ${label}`} src={`/i/${data.slug}?preview=1&capture=${position}`} loading="lazy" tabIndex={-1} className="pointer-events-none absolute left-0 top-0 h-[680px] w-[390px] origin-top-left scale-[.25] border-0" /></div><p className="p-1.5 text-center text-[8px] font-semibold text-cyan-800 font-outfit">{label}</p></a>)}
        </div>}
        <div className="mt-3 grid grid-cols-2 gap-2"><a href={`/i/${data.slug}?preview=1&sample=1`} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-cyan-100 bg-white p-2 text-center text-[9px] font-semibold text-cyan-800 font-outfit">Probar como invitado ejemplo</a><div className="rounded-xl border border-cyan-100 bg-white p-2 text-center"><p className="text-[8px] uppercase text-cyan-500 font-outfit">URL y expiración</p><p className="mt-0.5 truncate text-[9px] font-semibold text-cyan-900 font-outfit">/{data.slug} · {expiryText}</p></div></div>
      </div>
    </section>
  );
}
