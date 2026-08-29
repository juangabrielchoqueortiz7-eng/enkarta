'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { AdditionalServicesConfig, InvitationLocale, TemplateTheme } from '@/lib/types';
import type { SaveDateInterest, SaveDateResponse } from '@/lib/save-date';
import { invitationCopy } from '@/lib/invitation-i18n';
import { resolveBlockTheme } from './blocks/theme';

export default function SaveDateExperience({ slug, names, dateLabel, config, theme, locale, invitationReady, demo = false }: { slug: string; names: string; dateLabel?: string; config: NonNullable<AdditionalServicesConfig['saveDate']>; theme?: TemplateTheme; locale: InvitationLocale; invitationReady: boolean; demo?: boolean }) {
  const t = resolveBlockTheme(theme);
  const copy = invitationCopy(locale);
  const [response, setResponse] = useState<SaveDateResponse | null>(null);
  const [name, setName] = useState('');
  const [interest, setInterest] = useState<SaveDateInterest>('interested');
  const [guests, setGuests] = useState(1);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!demo && config.preconfirmationEnabled === true);
  const [error, setError] = useState('');
  const keyRef = useRef('');
  const pending = useRef<{ requestId: string; body: Record<string, unknown> } | null>(null);
  const field = { borderColor: t.line, color: t.text, background: t.surface };

  const apply = (value: SaveDateResponse) => {
    setResponse(value); setName(value.name); setInterest(value.interest); setGuests(value.guests || 1); setMessage(value.message); setEditing(false);
  };

  useEffect(() => {
    if (demo || !config.preconfirmationEnabled) { setLoading(false); return; }
    const storageKey = `ek-save-date:${slug}`;
    let key = localStorage.getItem(storageKey) ?? '';
    if (!/^[0-9a-f-]{36}$/i.test(key)) { key = crypto.randomUUID(); localStorage.setItem(storageKey, key); }
    keyRef.current = key;
    let active = true;
    fetch(`/api/save-the-date?slug=${encodeURIComponent(slug)}&responseKey=${encodeURIComponent(key)}`, { cache: 'no-store' })
      .then(async result => { const body = await result.json(); if (!result.ok) throw new Error(body.error || copy.queryFailed); if (active && body.response) apply(body.response); })
      .catch(cause => { if (active) setError(cause instanceof TypeError ? copy.offline : cause instanceof Error ? cause.message : copy.queryFailed); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug, demo, config.preconfirmationEnabled, copy]);

  const submit = async () => {
    if (busy || !name.trim()) { if (!name.trim()) setError(copy.nameRequired); return; }
    if (demo) {
      apply({ id: 'demo', name: name.trim(), interest, guests: interest === 'unavailable' ? 0 : guests, message, revision: (response?.revision ?? 0) + 1, updatedAt: new Date().toISOString() });
      return;
    }
    setBusy(true); setError('');
    if (!pending.current) pending.current = { requestId: crypto.randomUUID(), body: { slug, responseKey: keyRef.current, name: name.trim(), interest, guests, message, expectedRevision: response?.revision ?? 0 } };
    try {
      const result = await fetch('/api/save-the-date', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...pending.current.body, requestId: pending.current.requestId }) });
      const body = await result.json();
      if (!result.ok) { if (result.status < 500) pending.current = null; throw new Error(body.error || copy.saveFailed); }
      pending.current = null; apply(body.response);
    } catch (cause) { setError(cause instanceof TypeError ? copy.uncertain : cause instanceof Error ? cause.message : copy.saveFailed); }
    finally { setBusy(false); }
  };

  return <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-5 py-12 font-outfit" style={{ background: t.bg, color: t.text }}>
    {config.heroImage && <div className="absolute inset-0 bg-cover bg-center" role="img" aria-label={names} style={{ backgroundImage: `url(${JSON.stringify(config.heroImage).slice(1, -1)})` }} />}
    <div className="absolute inset-0" style={{ background: config.heroImage ? `linear-gradient(180deg, ${t.primaryDeep}b8 0%, ${t.primaryDeep}70 42%, ${t.primaryDeep}d9 100%)` : `radial-gradient(circle at 50% 20%, ${t.surface}, ${t.bg} 66%)` }} />
    <section className="relative z-10 w-full max-w-[460px] rounded-[30px] border p-6 text-center shadow-[0_30px_90px_rgba(20,15,10,.22)] backdrop-blur-xl sm:p-8" style={{ borderColor: config.heroImage ? 'rgba(255,255,255,.26)' : t.line, background: config.heroImage ? 'rgba(255,255,255,.88)' : `${t.surface}f2` }}>
      <p className="text-[10px] font-semibold uppercase tracking-[.28em]" style={{ color: t.primary }}>{config.eyebrow || copy.preconfirmTitle}</p>
      <h1 className="mt-4 font-playfair text-4xl leading-tight sm:text-5xl" style={{ color: t.text }}>{config.title || names}</h1>
      {dateLabel && <p className="mt-3 text-xs font-semibold uppercase tracking-[.16em]" style={{ color: t.primary }}>{dateLabel}</p>}
      <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed" style={{ color: t.muted }}>{config.message}</p>

      {config.preconfirmationEnabled && <div className="mt-6 border-t pt-6 text-left" style={{ borderColor: t.line }}>
        {loading ? <p className="text-center text-sm" style={{ color: t.muted }}>{copy.loading}</p> : response && !editing ? <div className="space-y-3 text-center"><div className="rounded-2xl px-4 py-5" style={{ background: `${t.primary}12` }}><p className="font-semibold" style={{ color: t.primary }}>{copy.preconfirmSaved}</p><p className="mt-1 text-xs" style={{ color: t.muted }}>{response.name}</p></div><button type="button" onClick={() => setEditing(true)} className="min-h-10 text-sm underline underline-offset-4" style={{ color: t.primary }}>{copy.editAnswer}</button></div> : <form className="space-y-3" onSubmit={event => { event.preventDefault(); void submit(); }}>
          <label className="block text-xs"><span className="mb-1 block">{copy.preconfirmName}</span><input autoComplete="name" maxLength={120} required value={name} onChange={event => setName(event.target.value)} className="min-h-11 w-full rounded-xl border px-3 outline-none" style={field} /></label>
          <label className="block text-xs"><span className="mb-1 block">{copy.preconfirmInterest}</span><select value={interest} onChange={event => setInterest(event.target.value as SaveDateInterest)} className="min-h-11 w-full rounded-xl border px-3 outline-none" style={field}><option value="interested">{copy.interested}</option><option value="maybe">{copy.maybe}</option><option value="unavailable">{copy.unavailableOption}</option></select></label>
          {interest !== 'unavailable' && <label className="flex items-center justify-between gap-3 text-xs"><span>{copy.preconfirmGuests}</span><input type="number" min={1} max={20} value={guests} onChange={event => setGuests(Number(event.target.value))} className="min-h-11 w-24 rounded-xl border px-3 outline-none" style={field} /></label>}
          <textarea maxLength={400} rows={3} value={message} onChange={event => setMessage(event.target.value)} placeholder={copy.preconfirmMessage} aria-label={copy.preconfirmMessage} className="w-full rounded-xl border px-3 py-2 text-xs outline-none" style={field} />
          <button type="submit" disabled={busy} className="min-h-12 w-full rounded-xl px-4 text-xs font-semibold uppercase tracking-[.12em] disabled:opacity-50" style={{ background: t.primary, color: t.onPrimary }}>{busy ? copy.saving : config.buttonLabel || copy.preconfirmButton}</button>
        </form>}
        {error && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">{error}</p>}
      </div>}

      {invitationReady && <Link href={`/i/${slug}`} className="mt-5 flex min-h-11 items-center justify-center rounded-xl border px-4 text-xs font-semibold uppercase tracking-[.12em]" style={{ borderColor: t.primary, color: t.primary }}>{copy.invitationButton}</Link>}
      {demo && <p className="mt-3 text-center text-[10px]" style={{ color: t.muted }}>{copy.demo}</p>}
    </section>
  </main>;
}
