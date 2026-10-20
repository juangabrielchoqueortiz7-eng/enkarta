'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BILLING_CYCLES, cyclePrice, formatBs, PARTNER_PLANS, PARTNER_PLAN_ORDER, PAYMENT_METHOD_LABELS,
  draftCap, type PartnerPaymentMethod, type PartnerPlanKey, type SubscriptionState,
} from '@/lib/partner-plans';
import { checkoutPaymentLabel, checkoutQuoteMatches, paymentUnderReview, PartnerRequestError, partnerRequest, validCheckoutPayment } from '@/lib/partner-checkout';
import { isUuid } from '@/lib/rsvp-contract';
import { PartnerProfileSave, PROFILE_FIELDS, normalizedProfileFields, profileFields, sameProfileIdentity, validPartnerProfile, type ProfileFields, type ProfileSaveAttempt } from '@/lib/partner-account';

// Panel del socio: estado de la mensualidad, su cartera de invitaciones y el
// registro del pago con comprobante. Todo pasa por /api/partner/*; este
// componente nunca decide permisos, solo refleja lo que responde el servidor.

export interface PartnerAccount {
  profile: {
    email: string; name: string; avatar: string; brand: string;
    phone: string; city: string; status: 'active' | 'suspended'; memberSince: string;
  };
  subscription: SubscriptionState;
  quota: { limit: number; used: number; remaining: number | null; unlimited: boolean; reached: boolean };
  totalInvitations: number;
  payments: PartnerPayment[];
  billing: { instructions: string; qrUrl: string; whatsapp: string; configured: boolean; provider?: 'manual' | 'bcp'; ready?: boolean; message?: string };
}

export interface PartnerPayment {
  id: string; reference: string; plan_key: PartnerPlanKey; months: number;
  amount_bs: number; method: PartnerPaymentMethod; receipt_url: string; receiptUrl?: string;
  status: 'pending' | 'approved' | 'rejected' | 'canceled'; review_note: string;
  created_at: string; period_end: string | null;
  quote_locked_at?: string | null;
}

export interface PartnerInvitation {
  id: string; slug: string; status: string; template: string; type: string;
  names: string | null; event_date: string | null; cover_image_url: string | null; created_at: string;
}

type Tab = 'invitaciones' | 'suscripcion' | 'cuenta';

const TABS: { id: Tab; label: string }[] = [
  { id: 'invitaciones', label: 'Mis invitaciones' },
  { id: 'suscripcion', label: 'Suscripción y pagos' },
  { id: 'cuenta', label: 'Mi cuenta' },
];

const TONE: Record<SubscriptionState['tone'], string> = {
  active: 'border-emerald-300/60 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-300/70 bg-amber-50 text-amber-900',
  pending: 'border-sky-300/60 bg-sky-50 text-sky-900',
  inactive: 'border-[#2C2519]/12 bg-white text-[#2C2519]/70',
};

const PAYMENT_TONE: Record<PartnerPayment['status'], string> = {
  canceled: 'bg-gray-100 text-gray-600',
  pending: 'bg-sky-50 text-sky-800',
  approved: 'bg-emerald-50 text-emerald-800',
  rejected: 'bg-red-50 text-red-700',
};
const dateLabel = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

function validProfile(value: unknown): value is PartnerAccount['profile'] {
  return validPartnerProfile(value);
}

// Only a complete account response can resolve an uncertain payment operation.
// A successful HTTP response with missing or malformed payment data is insufficient.
function checkedAccount(value: PartnerAccount): PartnerAccount {
  const fail = () => { throw new Error('No pudimos verificar tu cuenta. Pulsa «Actualizar estado» antes de continuar.'); };
  const record = (item: unknown): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item);
  const count = (item: unknown) => Number.isSafeInteger(item) && Number(item) >= 0;
  const date = (item: unknown) => typeof item === 'string' && Number.isFinite(Date.parse(item));
  if (!record(value)) return fail();
  const { profile, subscription, quota, billing, payments } = value;
  if (!validProfile(profile)) return fail();
  if (!record(subscription) || !PARTNER_PLAN_ORDER.includes(subscription.plan) || !['none', 'pending', 'active', 'canceled'].includes(subscription.status)
    || !['active', 'inGrace', 'renewalDue'].every(key => typeof subscription[key] === 'boolean')
    || !Number.isFinite(subscription.daysLeft) || typeof subscription.label !== 'string'
    || !['active', 'warning', 'pending', 'inactive'].includes(subscription.tone)
    || (subscription.periodEnd !== null && !date(subscription.periodEnd))) return fail();
  if (!record(quota) || !count(quota.limit) || !count(quota.used) || !count(value.totalInvitations)
    || typeof quota.unlimited !== 'boolean' || typeof quota.reached !== 'boolean'
    || (quota.unlimited ? quota.remaining !== null : !count(quota.remaining))) return fail();
  if (!record(billing) || ![billing.instructions, billing.qrUrl, billing.whatsapp].every(item => typeof item === 'string') || typeof billing.configured !== 'boolean'
    || (billing.provider !== undefined && !['manual', 'bcp'].includes(billing.provider))
    || (billing.ready !== undefined && typeof billing.ready !== 'boolean') || (billing.message !== undefined && typeof billing.message !== 'string')) return fail();
  if (!Array.isArray(payments) || payments.length > 24 || !payments.every(payment => validCheckoutPayment(payment)
    && typeof payment.review_note === 'string' && date(payment.created_at) && (payment.period_end === null || date(payment.period_end))
    && (payment.receiptUrl === undefined || typeof payment.receiptUrl === 'string'))
    || new Set(payments.map(payment => payment.id)).size !== payments.length || payments.filter(payment => payment.status === 'pending').length > 1) return fail();
  return value;
}

function validInvitation(value: unknown): value is PartnerInvitation {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return isUuid(item.id) && typeof item.slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)
    && ['draft', 'ready', 'disabled', 'expired'].includes(String(item.status))
    && typeof item.template === 'string' && !!item.template && typeof item.type === 'string' && !!item.type
    && ['names', 'event_date', 'cover_image_url'].every(key => item[key] === null || typeof item[key] === 'string')
    && (item.event_date === null || Number.isFinite(Date.parse(String(item.event_date))))
    && typeof item.created_at === 'string' && Number.isFinite(Date.parse(item.created_at));
}
function checkedInvitations(value: unknown): PartnerInvitation[] {
  if (!Array.isArray(value) || value.length > 200 || !value.every(validInvitation)
    || new Set(value.map(item => item.id)).size !== value.length) throw new Error('No pudimos verificar la lista. Pulsa «Actualizar invitaciones» antes de continuar.');
  return value;
}
const sameInvitation = (left: PartnerInvitation, right: PartnerInvitation) =>
  (['id', 'slug', 'status', 'template', 'type', 'names', 'event_date', 'cover_image_url', 'created_at'] as const).every(key => left[key] === right[key]);
function checkInvitationCounts(entries: PartnerInvitation[], fresh: PartnerAccount) {
  if (fresh.totalInvitations !== entries.length || fresh.quota.used !== entries.filter(entry => entry.status === 'ready').length) {
    throw new Error('La lista y el cupo cambiaron durante la consulta. Pulsa «Actualizar invitaciones» para comprobarlos juntos.');
  }
}
type InvitationOperation = { id: string; controller: AbortController };
function invitationFailure(failure: unknown, fallback: string, verificationRequired = false) {
  const message = (failure instanceof Error ? failure.message : fallback).replaceAll('Actualizar estado', 'Actualizar invitaciones');
  return verificationRequired && !message.includes('Actualizar invitaciones') ? `${message} Pulsa «Actualizar invitaciones» antes de repetir.` : message;
}

export default function PartnerDashboard({ initialAccount, initialTab = 'invitaciones', selectedPlan }: { initialAccount: PartnerAccount; initialTab?: Tab; selectedPlan?: PartnerPlanKey }) {
  const router = useRouter();
  const [account, setAccount] = useState(initialAccount);
  const [invitations, setInvitations] = useState<PartnerInvitation[] | null>(null);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [invitationError, setInvitationError] = useState('');
  const [invitationRefreshing, setInvitationRefreshing] = useState(false);
  const [invitationNeedsRefresh, setInvitationNeedsRefresh] = useState(false);
  const invitationSnapshot = useRef<PartnerInvitation[] | null>(null);
  const invitationSequence = useRef(0);
  const invitationRead = useRef<AbortController | null>(null);
  const invitationOperation = useRef<InvitationOperation | null>(null);
  const invitationUncertain = useRef(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [paymentNeedsRefresh, setPaymentNeedsRefresh] = useState(false);
  const mounted = useRef(true);
  const accountSequence = useRef(0);
  const accountRead = useRef<AbortController | null>(null);
  const paymentOperation = useRef(false);
  const profileSave = useRef<PartnerProfileSave | null>(null);
  if (!profileSave.current) profileSave.current = new PartnerProfileSave(initialAccount.profile);
  const acceptAccount = useCallback((value: PartnerAccount) => {
    profileSave.current!.observe(value.profile);
    setAccount(value);
  }, []);

  const invalidateAccountRead = useCallback(() => {
    accountSequence.current += 1;
    accountRead.current?.abort(); accountRead.current = null;
  }, []);
  const invalidateInvitationRead = useCallback(() => {
    invitationSequence.current += 1;
    invitationRead.current?.abort(); invitationRead.current = null;
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false; invalidateAccountRead(); invalidateInvitationRead();
      invitationOperation.current?.controller.abort(); invitationOperation.current = null;
      profileSave.current?.dispose();
    };
  }, [invalidateAccountRead, invalidateInvitationRead]);

  const say = useCallback((tone: 'ok' | 'error', text: string) => {
    if (!mounted.current) return;
    setNotice({ tone, text });
    window.setTimeout(() => { if (mounted.current) setNotice(current => (current?.text === text ? null : current)); }, 6000);
  }, []);

  const loadAccount = useCallback(async (signal?: AbortSignal, validate?: (value: PartnerAccount) => void): Promise<PartnerAccount> => {
    invalidateAccountRead();
    const serial = accountSequence.current, controller = new AbortController();
    accountRead.current = controller;
    const cancel = () => controller.abort();
    if (signal?.aborted || !mounted.current) controller.abort();
    signal?.addEventListener('abort', cancel, { once: true });
    try {
      const value = checkedAccount(await partnerRequest<PartnerAccount>('/api/partner/account', { signal: controller.signal }));
      if (!mounted.current || controller.signal.aborted || serial !== accountSequence.current) throw new Error('Esta consulta fue reemplazada. Vuelve a consultar el estado.');
      validate?.(value);
      acceptAccount(value);
      return value;
    } finally {
      signal?.removeEventListener('abort', cancel);
      if (accountRead.current === controller) accountRead.current = null;
    }
  }, [invalidateAccountRead, acceptAccount]);

  const setPaymentOperation = useCallback((active: boolean) => {
    paymentOperation.current = active;
    if (active) invalidateAccountRead();
  }, [invalidateAccountRead]);
  const setPaymentVerification = useCallback((required: boolean) => {
    if (mounted.current) setPaymentNeedsRefresh(required);
  }, []);
  const acceptPayment = useCallback((payment: PartnerPayment) => {
    if (!mounted.current) return;
    invalidateAccountRead();
    setAccount(current => ({ ...current, payments: [payment, ...current.payments.filter(item => item.id !== payment.id)] }));
  }, [invalidateAccountRead]);
  const acceptProfile = useCallback((updated: PartnerAccount, attempt?: ProfileSaveAttempt) => {
    const session = profileSave.current!;
    if (!mounted.current || !validProfile(updated?.profile) || !sameProfileIdentity(session.profile, updated.profile)
      || (attempt && !session.canApply(attempt, updated.profile))) return false;
    invalidateAccountRead();
    session.observe(updated.profile);
    setAccount(current => ({ ...current, profile: updated.profile }));
    return true;
  }, [invalidateAccountRead]);

  const loadInvitations = useCallback(async (explicit = false) => {
    if (!mounted.current || invitationOperation.current || paymentOperation.current) return;
    invalidateInvitationRead();
    const serial = invitationSequence.current, controller = new AbortController();
    invitationRead.current = controller; setInvitationRefreshing(true);
    if (explicit) invalidateAccountRead();
    const accountSerial = accountSequence.current;
    const current = () => mounted.current && !controller.signal.aborted && invitationSequence.current === serial && (!explicit || accountSequence.current === accountSerial);
    try {
      const [value, fresh] = await Promise.all([
        partnerRequest<{ invitations: PartnerInvitation[] }>('/api/partner/invitations', { signal: controller.signal }),
        explicit ? partnerRequest<PartnerAccount>('/api/partner/account', { signal: controller.signal }).then(checkedAccount) : Promise.resolve(null),
      ]);
      const entries = checkedInvitations(value.invitations);
      if (fresh) checkInvitationCounts(entries, fresh);
      if (!current()) return;
      invitationSnapshot.current = entries; setInvitations(entries); setInvitationError('');
      if (fresh) { acceptAccount(fresh); invitationUncertain.current = false; setInvitationNeedsRefresh(false); say('ok', 'Invitaciones y cupo consultados. Revisa su estado antes de compartir.'); }
    } catch (failure) {
      if (current()) setInvitationError(invitationFailure(failure, 'No se pudo consultar la lista.', true));
    } finally {
      if (mounted.current && invitationSequence.current === serial) {
        invitationRead.current = null; setInvitationRefreshing(false);
      }
      controller.abort();
    }
  }, [invalidateInvitationRead, invalidateAccountRead, acceptAccount, say]);

  useEffect(() => { void loadInvitations(); }, [loadInvitations]);
  useEffect(() => {
    if (!account.payments.some(payment => payment.status === 'pending')) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || paymentOperation.current || invitationOperation.current || invitationRead.current || accountRead.current || !mounted.current) return;
      const serial = accountSequence.current + 1;
      void loadAccount().catch(() => {
        if (mounted.current && accountSequence.current === serial) say('error', 'No pudimos actualizar el pago. Conservamos el último estado consultado. Pulsa «Actualizar estado».');
      });
    }, 15000);
    return () => window.clearInterval(timer);
  }, [account.payments, loadAccount, say]);

  const pending = useMemo(() => account.payments.find(payment => payment.status === 'pending') ?? null, [account.payments]);

  // ── Acciones sobre invitaciones ────────────────────────────────────────────
  const invitationView = invitationSequence.current;
  const canActOnInvitation = (invitation: PartnerInvitation) => mounted.current && invitationView === invitationSequence.current
    && !invitationOperation.current && !invitationRead.current && !paymentOperation.current && !invitationUncertain.current
    && validInvitation(invitation) && invitationSnapshot.current?.some(item => sameInvitation(item, invitation));
  const startInvitationOperation = (invitation: PartnerInvitation) => {
    if (!canActOnInvitation(invitation)) return null;
    invalidateInvitationRead(); invalidateAccountRead();
    const operation = { id: invitation.id, controller: new AbortController() };
    invitationOperation.current = operation; invitationUncertain.current = true;
    setInvitationNeedsRefresh(true); setInvitationError(''); setInvitationRefreshing(false); setBusy(invitation.id); setCopied(null);
    return operation;
  };
  const currentInvitationOperation = (operation: InvitationOperation) => mounted.current && invitationOperation.current === operation && !operation.controller.signal.aborted;
  const finishInvitationOperation = (operation: InvitationOperation) => {
    if (!currentInvitationOperation(operation)) return;
    invitationOperation.current = null; setBusy(null);
  };
  const acknowledgeInvitation = async (operation: InvitationOperation, entries: PartnerInvitation[], success: string) => {
    invalidateInvitationRead(); invalidateAccountRead();
    invitationSnapshot.current = entries; setInvitations(entries);
    try {
      await loadAccount(operation.controller.signal, fresh => checkInvitationCounts(entries, fresh));
      if (!currentInvitationOperation(operation)) return;
      invitationUncertain.current = false; setInvitationNeedsRefresh(false); say('ok', success === 'Invitación publicada.' ? `${success} Ya puedes compartir el enlace.` : success);
    } catch {
      if (currentInvitationOperation(operation)) { setInvitationError(`${success} No pudimos comprobar el cupo. Pulsa «Actualizar invitaciones» antes de otra acción.`); say('error', `${success} Falta comprobar el cupo.`); }
    }
  };
  const togglePublish = async (invitation: PartnerInvitation) => {
    const next = invitation.status === 'ready' ? 'draft' : 'ready';
    const operation = startInvitationOperation(invitation); if (!operation) return;
    try {
      const result = await partnerRequest<{ invitation: PartnerInvitation }>('/api/partner/invitations', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: invitation.id, status: next }), signal: operation.controller.signal,
      });
      if (!currentInvitationOperation(operation)) return;
      if (!validInvitation(result.invitation) || result.invitation.id !== invitation.id || result.invitation.slug !== invitation.slug
        || result.invitation.status !== (next === 'ready' ? 'ready' : 'disabled')) throw new Error('No pudimos verificar el cambio de publicación. Pulsa «Actualizar invitaciones» antes de repetir.');
      const entries = (invitationSnapshot.current ?? []).map(item => item.id === invitation.id ? result.invitation : item);
      await acknowledgeInvitation(operation, entries, next === 'ready' ? 'Invitación publicada.' : 'Invitación despublicada.');
    } catch (failure) {
      if (!currentInvitationOperation(operation)) return;
      if (failure instanceof PartnerRequestError && (failure.needsSubscription || ['SUBSCRIPTION_REQUIRED', 'QUOTA_REACHED'].includes(failure.code ?? ''))) setTab('suscripcion');
      const message = invitationFailure(failure, 'No pudimos comprobar el estado.', invitationUncertain.current);
      setInvitationError(message); say('error', message);
    }
    finally { finishInvitationOperation(operation); }
  };

  const removeInvitation = async (invitation: PartnerInvitation) => {
    if (!canActOnInvitation(invitation) || !window.confirm(`¿Eliminar "${invitation.names || invitation.slug}"? No se puede deshacer.`)) return;
    const operation = startInvitationOperation(invitation); if (!operation) return;
    try {
      const result = await partnerRequest<{ success: boolean }>(`/api/partner/invitations?id=${invitation.id}`, { method: 'DELETE', signal: operation.controller.signal });
      if (!currentInvitationOperation(operation)) return;
      if (result.success !== true) throw new Error('No pudimos verificar la eliminación. Pulsa «Actualizar invitaciones» antes de repetir.');
      await acknowledgeInvitation(operation, (invitationSnapshot.current ?? []).filter(item => item.id !== invitation.id), 'Invitación eliminada.');
    } catch (failure) {
      if (!currentInvitationOperation(operation)) return;
      const message = invitationFailure(failure, 'No pudimos comprobar la eliminación.', invitationUncertain.current);
      setInvitationError(message); say('error', message);
    }
    finally { finishInvitationOperation(operation); }
  };

  const copyLink = async (slug: string) => {
    if (!mounted.current || invitationView !== invitationSequence.current || invitationOperation.current || invitationRead.current || invitationUncertain.current
      || !invitationSnapshot.current?.some(item => item.slug === slug && item.status === 'ready')) return;
    const serial = invitationSequence.current;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/i/${slug}`);
      if (!mounted.current || serial !== invitationSequence.current || invitationUncertain.current) return;
      setCopied(slug); window.setTimeout(() => { if (mounted.current && serial === invitationSequence.current) setCopied(null); }, 2000);
    }
    catch { say('error', 'No se pudo copiar el enlace. Abre la invitación y copia su dirección.'); }
  };

  const signOut = async () => {
    await fetch('/api/auth/signout', { method: 'POST' });
    router.replace('/socios');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#2C2519]">
      <header className="sticky top-0 z-30 border-b border-[#2C2519]/8 bg-[#FAF7F2]/92 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <div>
            <p className="font-cinzel text-[13px] tracking-[0.18em]">ENKARTA</p>
            <p className="font-outfit text-[9px] uppercase tracking-[0.28em] text-[#B8975A]">Panel de socio</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="font-outfit text-[12.5px] leading-tight">{account.profile.brand || account.profile.name || 'Mi marca'}</p>
              <p className="font-outfit text-[11px] text-[#2C2519]/50">{account.profile.email}</p>
            </div>
            {account.profile.avatar
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={account.profile.avatar} alt="" className="h-9 w-9 rounded-full border border-[#2C2519]/10 object-cover" />
              : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#B8975A]/12 font-outfit text-[13px] text-[#8a7040]">{(account.profile.name || account.profile.email || '?').charAt(0).toUpperCase()}</span>}
            <button onClick={signOut} className="font-outfit text-[12px] text-[#2C2519]/55 underline-offset-4 hover:underline">Salir</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20 pt-8 sm:px-8">
        {notice && (
          <p role="status" className={`mb-5 rounded-2xl border px-4 py-3 font-outfit text-[13px] ${notice.tone === 'ok' ? 'border-emerald-300/60 bg-emerald-50 text-emerald-800' : 'border-red-300/60 bg-red-50 text-red-700'}`}>
            {notice.text}
          </p>
        )}

        <StatusCard account={account} onGoToPlans={() => setTab('suscripcion')} />

        <nav className="mt-8 flex gap-1 overflow-x-auto border-b border-[#2C2519]/8">
          {TABS.map(item => (
            <button
              key={item.id}
              onClick={() => { setTab(item.id); const url = new URL(window.location.href); url.searchParams.set('tab', item.id); window.history.replaceState(null, '', url); }}
              aria-current={tab === item.id ? 'page' : undefined}
              className={`-mb-px whitespace-nowrap border-b-2 px-4 py-3 font-outfit text-[13px] transition ${tab === item.id ? 'border-[#B8975A] text-[#2C2519]' : 'border-transparent text-[#2C2519]/50 hover:text-[#2C2519]/80'}`}
            >
              {item.label}
              {item.id === 'suscripcion' && pending && <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] text-sky-800">1</span>}
            </button>
          ))}
        </nav>

        <div className="pt-8">
          {tab === 'invitaciones' && (
            <>
            {invitationError && <div role="alert" className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">{invitationError}</div>}
            <InvitationsTab
              invitations={invitations}
              failed={!!invitationError}
              busy={busy}
              copied={copied}
              refreshing={invitationRefreshing}
              needsRefresh={invitationNeedsRefresh}
              quota={account.quota}
              onCreate={() => router.push('/socios/panel/nueva')}
              onCopy={copyLink}
              onToggle={togglePublish}
              onRemove={removeInvitation}
              onRefresh={() => void loadInvitations(true)}
            />
            </>
          )}
          {tab === 'suscripcion' && (
            <SubscriptionTab
              account={account}
              pending={pending}
              onRefresh={loadAccount}
              onNotice={say}
              selectedPlan={selectedPlan}
              onPayment={acceptPayment}
              onOperationChange={setPaymentOperation}
              verificationRequired={paymentNeedsRefresh}
              onVerificationChange={setPaymentVerification}
            />
          )}
          {tab === 'cuenta' && <AccountTab account={account} onSaved={acceptProfile} onNotice={say} profileSave={profileSave.current} onSaveStart={invalidateAccountRead} />}
        </div>
      </main>
    </div>
  );
}

// ── Estado de la suscripción ─────────────────────────────────────────────────

function StatusCard({ account, onGoToPlans }: { account: PartnerAccount; onGoToPlans: () => void }) {
  const { subscription: state, quota } = account;
  const plan = PARTNER_PLANS[state.plan];

  return (
    <section className={`rounded-3xl border p-6 sm:p-8 ${TONE[state.tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="font-outfit text-[10px] uppercase tracking-[0.28em] opacity-70">Estado</p>
          <p className="mt-2 font-playfair text-[26px] leading-tight">{state.label}</p>
          <p className="mt-1.5 font-outfit text-[13px] opacity-80">
            {state.active || state.inGrace
              ? `Plan ${plan.label} · vigente hasta el ${dateLabel(state.periodEnd)}`
              : `Puedes crear borradores sin pagar, hasta ${draftCap(state.plan)} invitaciones creadas en este plan. Para publicar necesitas una suscripción activa.`}
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          <div className="text-left sm:text-right">
            <p className="font-outfit text-[10px] uppercase tracking-[0.22em] opacity-70">Publicadas</p>
            <p className="font-playfair text-[22px] leading-tight">
              {quota.used}
              <span className="font-outfit text-[13px] opacity-60"> / {quota.unlimited ? 'sin límite' : quota.limit}</span>
            </p>
          </div>
          {!state.active && (
            <button onClick={onGoToPlans} className="rounded-full bg-[#2C2519] px-6 py-2.5 font-outfit text-[13px] text-[#FAF7F2] transition hover:bg-[#3d342a]">
              {state.status === 'pending' ? 'Ver mi pago' : 'Activar mi suscripción'}
            </button>
          )}
          {state.active && state.renewalDue && (
            <button onClick={onGoToPlans} className="rounded-full bg-[#2C2519] px-6 py-2.5 font-outfit text-[13px] text-[#FAF7F2] transition hover:bg-[#3d342a]">
              Renovar ahora
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Cartera de invitaciones ──────────────────────────────────────────────────

function InvitationsTab({ invitations, failed, busy, copied, refreshing, needsRefresh, quota, onCreate, onCopy, onToggle, onRemove, onRefresh }: {
  invitations: PartnerInvitation[] | null;
  failed: boolean;
  busy: string | null;
  copied: string | null;
  refreshing: boolean;
  needsRefresh: boolean;
  quota: PartnerAccount['quota'];
  onCreate: () => void;
  onCopy: (slug: string) => void;
  onToggle: (invitation: PartnerInvitation) => void;
  onRemove: (invitation: PartnerInvitation) => void;
  onRefresh: () => void;
}) {
  const blocked = !!busy || refreshing || needsRefresh;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="font-outfit text-[13px] text-[#2C2519]/60">
          {invitations === null ? 'Tus invitaciones' : `${invitations.length} ${invitations.length === 1 ? 'invitación creada' : 'invitaciones creadas'}`} ·{' '}
          {quota.used} publicada{quota.used === 1 ? '' : 's'}
          {!quota.unlimited && ` de ${quota.limit}`}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={onRefresh} disabled={!!busy || refreshing} aria-busy={refreshing || undefined} className="min-h-11 font-outfit text-sm text-[#514735] underline underline-offset-4 disabled:opacity-50">Actualizar invitaciones</button>
          <button onClick={onCreate} className="rounded-full bg-[#2C2519] px-6 py-2.5 font-outfit text-[13px] text-[#FAF7F2] transition hover:bg-[#3d342a]">Nueva invitación</button>
        </div>
      </div>

      {refreshing && <p role="status" className="mb-4 font-outfit text-sm text-[#2C2519]/60">Consultando invitaciones…</p>}
      {needsRefresh && !busy && <p role="alert" className="mb-4 rounded-xl bg-amber-50 p-4 font-outfit text-sm text-amber-950">Hay una operación por comprobar. Pulsa «Actualizar invitaciones» antes de publicar, eliminar o compartir. Cambiar de pestaña no cancela una operación recibida por el servidor.</p>}

      {invitations === null ? (failed ? null : <p role="status" className="font-outfit text-[13px] text-[#2C2519]/50">Cargando tus invitaciones…</p>) : !invitations.length ? (
        <div className="rounded-3xl border border-dashed border-[#2C2519]/15 bg-white/50 p-12 text-center">
          <p className="font-playfair text-[20px]">Todavía no creaste ninguna</p>
          <p className="mx-auto mt-2 max-w-md font-outfit text-[13px] leading-relaxed text-[#2C2519]/60">
            Elige un diseño del catálogo, personalízalo con los datos de tu cliente y muéstraselo.
            Diseñar es gratis; solo necesitas suscripción para publicar.
          </p>
          <button onClick={onCreate} className="mt-6 rounded-full bg-[#2C2519] px-7 py-2.5 font-outfit text-[13px] text-[#FAF7F2]">
            Elegir un diseño
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {invitations.map(invitation => {
            const published = invitation.status === 'ready';
            return (
              <article key={invitation.id} className="flex flex-col overflow-hidden rounded-2xl border border-[#2C2519]/8 bg-white">
                <div className="relative aspect-[16/10] bg-[#F3EFE8]">
                  {invitation.cover_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={invitation.cover_image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  )}
                  <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 font-outfit text-[10px] uppercase tracking-[0.14em] ${published ? 'bg-emerald-600 text-white' : 'bg-white/90 text-[#2C2519]/70'}`}>
                    {published ? 'Publicada' : 'Borrador'}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <p className="font-playfair text-[17px] leading-tight">{invitation.names || 'Sin nombres'}</p>
                  <p className="mt-1 font-outfit text-[11.5px] text-[#2C2519]/50">
                    {invitation.event_date ? dateLabel(invitation.event_date) : 'Sin fecha'} · {invitation.template.replace('_v2', '')}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2 pt-2">
                    <a href={`/socios/constructor/${invitation.id}`} className="rounded-full bg-[#2C2519] px-4 py-2 font-outfit text-[12px] text-[#FAF7F2]">Editar</a>
                    <button
                      onClick={() => onToggle(invitation)}
                      disabled={blocked}
                      className="rounded-full border border-[#2C2519]/15 px-4 py-2 font-outfit text-[12px] transition hover:border-[#B8975A]/50 disabled:opacity-50"
                    >
                      {busy === invitation.id ? '…' : published ? 'Despublicar' : 'Publicar'}
                    </button>
                    {published && (
                      <button onClick={() => onCopy(invitation.slug)} disabled={blocked} className="rounded-full border border-[#2C2519]/15 px-4 py-2 font-outfit text-[12px] transition hover:border-[#B8975A]/50 disabled:opacity-50">
                        {copied === invitation.slug ? 'Copiado' : 'Copiar enlace'}
                      </button>
                    )}
                    <a href={`/i/${invitation.slug}${published ? '' : '?preview=1'}`} target="_blank" rel="noreferrer" className="rounded-full border border-[#2C2519]/15 px-4 py-2 font-outfit text-[12px] transition hover:border-[#B8975A]/50">Ver</a>
                    <button
                      onClick={() => onRemove(invitation)}
                      disabled={blocked}
                      className="ml-auto font-outfit text-[12px] text-red-600/80 underline-offset-4 hover:underline disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Suscripción y pagos ──────────────────────────────────────────────────────

export function SubscriptionTab({ account, pending, onRefresh, onNotice, selectedPlan, onPayment, onOperationChange, verificationRequired = false, onVerificationChange }: {
  account: PartnerAccount;
  pending: PartnerPayment | null;
  onRefresh: (signal?: AbortSignal) => Promise<PartnerAccount>;
  onNotice: (tone: 'ok' | 'error', text: string) => void;
  selectedPlan?: PartnerPlanKey;
  onPayment: (payment: PartnerPayment) => void;
  onOperationChange?: (active: boolean) => void;
  verificationRequired?: boolean;
  onVerificationChange?: (required: boolean) => void;
}) {
  const [plan, setPlan] = useState<PartnerPlanKey>(pending?.plan_key ?? selectedPlan ?? account.subscription.plan);
  const [months, setMonths] = useState<number>(pending?.months ?? 1);
  const [method, setMethod] = useState<PartnerPaymentMethod>(pending?.method ?? 'qr');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(verificationRequired);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const operation = useRef(false);
  const mounted = useRef(true);
  const sequence = useRef(0);
  const active = useRef<AbortController | null>(null);
  const mustRefresh = useRef(verificationRequired);
  if (verificationRequired) mustRefresh.current = true;
  const fileInput = useRef<HTMLInputElement>(null);

  const total = cyclePrice(plan, months);
  const receiptSent = !!pending && paymentUnderReview(pending);
  const quoteMatches = checkoutQuoteMatches(pending, plan, months, method, total);
  const busy = saving || uploading || canceling || refreshing;
  const blockedProvider = account.billing.provider === 'bcp' && !account.billing.ready;
  const view = { plan, months, method, pending, blockedProvider };
  const currentView = useRef(view);
  currentView.current = view;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false; sequence.current += 1;
      active.current?.abort(); active.current = null; operation.current = false;
      onOperationChange?.(false);
    };
  }, [onOperationChange]);
  const available = () => mounted.current && currentView.current === view && !operation.current;
  const requireRefresh = (required: boolean) => { mustRefresh.current = required; setNeedsRefresh(required); onVerificationChange?.(required); };
  const announce = (tone: 'ok' | 'error', text: string) => { if (mounted.current) { setMessage({ tone, text }); onNotice(tone, text); } };
  const begin = () => {
    if (!available()) return null;
    operation.current = true;
    const attempt = { serial: ++sequence.current, controller: new AbortController() };
    active.current = attempt.controller; onOperationChange?.(true);
    return attempt;
  };
  const current = (attempt: { serial: number; controller: AbortController }) => mounted.current && sequence.current === attempt.serial && !attempt.controller.signal.aborted;
  const finish = (attempt: { serial: number; controller: AbortController }) => {
    if (!current(attempt)) return;
    active.current = null; operation.current = false;
    setSaving(false); setUploading(false); setCanceling(false); setRefreshing(false);
    onOperationChange?.(false);
  };
  const refreshAfterSave = async (success: string, attempt: { serial: number; controller: AbortController }) => {
    try { checkedAccount(await onRefresh(attempt.controller.signal)); if (current(attempt)) { requireRefresh(false); announce('ok', success); } }
    catch { if (current(attempt)) { requireRefresh(true); announce('error', `${success} No pudimos actualizar tu cuenta; pulsa «Actualizar estado» antes de repetir.`); } }
  };
  const refresh = async () => {
    const attempt = begin(); if (!attempt) return;
    setRefreshing(true);
    try {
      checkedAccount(await onRefresh(attempt.controller.signal));
      if (current(attempt)) { requireRefresh(false); announce('ok', 'Estado consultado. Revisa la referencia y tu suscripción.'); }
    } catch (failure) { if (current(attempt)) announce('error', failure instanceof Error ? failure.message : 'No se pudo consultar el estado.'); }
    finally { finish(attempt); }
  };

  const createIntent = async () => {
    if (!available() || receiptSent || blockedProvider || mustRefresh.current) return;
    const attempt = begin(); if (!attempt) return;
    requireRefresh(true);
    setSaving(true);
    try {
      const result = await partnerRequest<{ payment: PartnerPayment }>('/api/partner/payments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, months, method }), signal: attempt.controller.signal,
      });
      if (!current(attempt)) return;
      if (!validCheckoutPayment(result.payment, pending?.id) || !checkoutQuoteMatches(result.payment, plan, months, method, total)) throw new Error('No pudimos verificar la referencia. Actualiza el estado antes de continuar.');
      onPayment(result.payment);
      setFile(null); setNote(''); if (fileInput.current) fileInput.current.value = '';
      await refreshAfterSave(`Referencia ${result.payment.reference} preparada. Esto no confirma un pago ni activa la suscripción. Revisa los datos de cobro antes de pagar.`, attempt);
    } catch (failure) { if (current(attempt)) { requireRefresh(true); announce('error', failure instanceof Error ? failure.message : 'No se pudo preparar la referencia.'); } }
    finally { finish(attempt); }
  };

  const sendReceipt = async () => {
    if (!available() || !pending || !quoteMatches || blockedProvider || mustRefresh.current) return;
    if (!file && !note.trim()) { announce('error', 'Adjunta la captura o escribe el número de transacción.'); return; }
    if (file && (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'].includes(file.type) || !file.size || file.size > 6 * 1024 * 1024)) { announce('error', 'Usa JPG, PNG, WebP, HEIC o PDF con contenido y hasta 6 MB.'); return; }
    const attempt = begin(); if (!attempt) return;
    requireRefresh(true);
    setUploading(true);
    try {
      const form = new FormData();
      if (!pending) return;
      form.append('paymentId', pending.id);
      if (file) form.append('file', file);
      if (note.trim()) form.append('note', note.trim());
      const result = await partnerRequest<{ payment: PartnerPayment }>('/api/partner/payments/receipt', { method: 'POST', body: form, signal: attempt.controller.signal });
      if (!current(attempt)) return;
      if (!validCheckoutPayment(result.payment, pending.id) || result.payment.status !== 'pending' || !paymentUnderReview(result.payment)) throw new Error('No pudimos verificar la recepción del comprobante. Actualiza el estado antes de repetir.');
      onPayment(result.payment);
      setFile(null);
      setNote('');
      if (fileInput.current) fileInput.current.value = '';
      await refreshAfterSave('Comprobante recibido para revisión manual. La suscripción se activará únicamente cuando el equipo apruebe el pago.', attempt);
    } catch (failure) { if (current(attempt)) { requireRefresh(true); announce('error', failure instanceof Error ? failure.message : 'No se pudo comprobar el comprobante.'); } }
    finally { finish(attempt); }
  };

  const cancelIntent = async () => {
    if (!available() || !pending || blockedProvider || mustRefresh.current || !window.confirm(`¿Retirar la solicitud ${pending.reference}? Esto no devuelve dinero ni cancela una transferencia bancaria. Si ya pagaste, coordina con el equipo antes de retirarla.`)) return;
    const attempt = begin(); if (!attempt) return;
    requireRefresh(true);
    setCanceling(true);
    try {
      const result = await partnerRequest<{ success: boolean }>(`/api/partner/payments?id=${pending.id}`, { method: 'DELETE', signal: attempt.controller.signal });
      if (!current(attempt)) return;
      if (result.success !== true) throw new Error('No pudimos comprobar la cancelación. Actualiza el estado.');
      onPayment({ ...pending, status: 'canceled' }); setNote(''); setFile(null);
      await refreshAfterSave('Solicitud retirada. No se realizó un reembolso ni una operación bancaria.', attempt);
    } catch (failure) { if (current(attempt)) { requireRefresh(true); announce('error', failure instanceof Error ? failure.message : 'No se pudo retirar la solicitud.'); } }
    finally { finish(attempt); }
  };

  // Keep the history's minimum table width inside its own scroll region,
  // including on the first payment when the table is added to the page.
  return (
    <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="min-w-0">
        <h2 className="font-playfair text-[22px]">
          {account.subscription.active ? 'Renovar o cambiar de plan' : 'Activa tu suscripción'}
        </h2>
        <p className="mt-2 max-w-lg font-outfit text-[13px] leading-relaxed text-[#2C2519]/60">
          Elige plan y periodo, prepara una referencia y envía la evidencia del pago. La activación es manual después de la aprobación del equipo; preparar la referencia no realiza un cobro.
        </p>
        <button type="button" disabled={busy} onClick={() => void refresh()} className="mt-3 min-h-11 font-outfit text-sm text-[#514735] underline underline-offset-4 disabled:opacity-50">{refreshing ? 'Consultando…' : 'Actualizar estado'}</button>
        {message && <p role={message.tone === 'error' ? 'alert' : 'status'} className={`mt-3 rounded-xl p-3 font-outfit text-sm ${message.tone === 'error' ? 'bg-amber-50 text-amber-950' : 'bg-emerald-50 text-emerald-900'}`}>{message.text}</p>}
        {needsRefresh && !busy && !message && <p role="alert" className="mt-3 rounded-xl bg-amber-50 p-3 font-outfit text-sm text-amber-950">Hay una operación por comprobar. Pulsa «Actualizar estado» antes de repetir. Cambiar de pestaña no cancela una operación recibida por el servidor.</p>}
        {receiptSent && <p role="status" className="mt-4 rounded-xl bg-sky-50 p-3 font-outfit text-sm text-sky-900">Comprobante en revisión. Se conservan plan, periodo, importe y referencia. Puedes actualizar la evidencia o consultar al equipo; no prepares otra transferencia.</p>}

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          {PARTNER_PLAN_ORDER.map(key => {
            const item = PARTNER_PLANS[key];
            const selected = plan === key;
            return (
              <button
                key={key}
                type="button" disabled={busy || receiptSent} aria-pressed={selected}
                onClick={() => setPlan(key)}
                className={`rounded-2xl border p-4 text-left transition ${selected ? 'border-[#B8975A] bg-white shadow-[0_18px_40px_-32px_rgba(44,37,25,0.6)]' : 'border-[#2C2519]/10 bg-white/60 hover:border-[#2C2519]/25'}`}
              >
                <p className="font-playfair text-[17px]">{item.label}</p>
                <p className="mt-1 font-outfit text-[12px] text-[#2C2519]/55">
                  {item.activeInvitations === 0 ? 'Publicadas sin límite' : `${item.activeInvitations} publicadas`}
                </p>
                <p className="mt-3 font-outfit text-[14px]">{formatBs(item.bs)}<span className="text-[11px] text-[#2C2519]/50"> /mes</span></p>
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="font-outfit text-[11px] uppercase tracking-[0.18em] text-[#2C2519]/50">Periodo</span>
            <select
              value={months}
              name="billing-period" disabled={busy || receiptSent}
              onChange={event => setMonths(Number(event.target.value))}
              className="mt-2 w-full rounded-xl border border-[#2C2519]/12 bg-white px-4 py-2.5 font-outfit text-[13px]"
            >
              {BILLING_CYCLES.map(cycle => (
                <option key={cycle.months} value={cycle.months}>
                  {cycle.label}{cycle.discount ? ` · −${Math.round(cycle.discount * 100)}%` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-outfit text-[11px] uppercase tracking-[0.18em] text-[#2C2519]/50">Forma de pago</span>
            <select
              value={method}
              name="billing-method" disabled={busy || receiptSent}
              onChange={event => setMethod(event.target.value as PartnerPaymentMethod)}
              className="mt-2 w-full rounded-xl border border-[#2C2519]/12 bg-white px-4 py-2.5 font-outfit text-[13px]"
            >
              {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-[#2C2519]/10 bg-white p-5">
          <div>
            <p className="font-outfit text-[11px] uppercase tracking-[0.18em] text-[#2C2519]/50">Total a pagar</p>
            <p className="mt-1 font-playfair text-[28px] leading-none">{formatBs(total)}</p>
            <p className="mt-1 font-outfit text-[12px] text-[#2C2519]/50">
              {PARTNER_PLANS[plan].label} · {months} {months === 1 ? 'mes' : 'meses'}
            </p>
          </div>
          <button
            onClick={createIntent}
            disabled={busy || receiptSent || blockedProvider || quoteMatches || needsRefresh}
            className="ml-auto rounded-full bg-[#2C2519] px-6 py-2.5 font-outfit text-[13px] text-[#FAF7F2] transition hover:bg-[#3d342a] disabled:opacity-50"
          >
            {saving ? 'Preparando…' : receiptSent ? 'Comprobante en revisión' : quoteMatches ? 'Referencia preparada' : pending ? 'Actualizar referencia' : 'Preparar referencia'}
          </button>
        </div>

        {pending && (
          <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50/70 p-5">
            <p role="status" className="mb-3 font-outfit text-sm font-semibold text-sky-900">{checkoutPaymentLabel(pending)}</p>
            <p className="font-outfit text-[11px] uppercase tracking-[0.18em] text-sky-800/70">Tu referencia</p>
            <p className="mt-1 break-words font-playfair text-[26px] tracking-[0.06em] text-sky-900">{pending.reference}</p>
            <p className="mt-2 font-outfit text-[12.5px] leading-relaxed text-sky-900/80">
              {PARTNER_PLANS[pending.plan_key].label} · {pending.months} {pending.months === 1 ? 'mes' : 'meses'} · {PAYMENT_METHOD_LABELS[pending.method]} · {formatBs(Number(pending.amount_bs))}. Usa esta referencia para identificar tu pago. Prepararla no confirma que se haya pagado.
            </p>
            {!quoteMatches && <div role="alert" className="mt-3 font-outfit text-sm text-amber-950"><p>La selección de arriba difiere de esta referencia. Actualiza la referencia antes de adjuntar un comprobante, o vuelve a seleccionar sus datos. Si ya pagaste, conserva el importe y consulta al equipo.</p><button type="button" disabled={busy} onClick={() => { setPlan(pending.plan_key); setMonths(pending.months); setMethod(pending.method); }} className="mt-2 min-h-11 underline">Usar los datos de esta referencia</button></div>}

            <div className="mt-5 grid min-w-0 grid-cols-1 gap-3">
              <label className="block min-w-0">
                <span className="font-outfit text-[11px] uppercase tracking-[0.18em] text-sky-800/70">Comprobante</span>
                <input
                  ref={fileInput} name="payment-receipt" disabled={busy || !quoteMatches || blockedProvider}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                  onChange={event => setFile(event.target.files?.[0] ?? null)}
                  className="mt-2 block w-full min-w-0 max-w-full font-outfit text-[12.5px] file:mr-3 file:rounded-full file:border-0 file:bg-sky-600 file:px-4 file:py-2 file:font-outfit file:text-[12px] file:text-white"
                />
                <span className="mt-2 block font-outfit text-xs text-sky-900">JPG, PNG, WebP, HEIC o PDF; hasta 6 MB. También puedes indicar el número de transacción sin archivo.</span>
              </label>
              <label className="block">
                <span className="font-outfit text-[11px] uppercase tracking-[0.18em] text-sky-800/70">Número de transacción (opcional)</span>
                <input
                  name="payment-transaction" autoComplete="off" disabled={busy || !quoteMatches || blockedProvider}
                  value={note}
                  onChange={event => setNote(event.target.value)}
                  maxLength={500}
                  placeholder="Ej. 1234567890 · Banco Unión"
                  className="mt-2 w-full rounded-xl border border-sky-200 bg-white px-4 py-2.5 font-outfit text-[13px]"
                />
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={sendReceipt}
                  disabled={busy || !quoteMatches || blockedProvider || needsRefresh}
                  className="rounded-full bg-sky-700 px-6 py-2.5 font-outfit text-[13px] text-white transition hover:bg-sky-800 disabled:opacity-50"
                >
                  {uploading ? 'Enviando…' : receiptSent ? 'Reemplazar comprobante' : 'Enviar comprobante'}
                </button>
                <button type="button" disabled={busy || needsRefresh || blockedProvider} onClick={() => void cancelIntent()} className="min-h-11 font-outfit text-[12px] text-sky-900 underline-offset-4 hover:underline disabled:opacity-50">
                  {canceling ? 'Retirando…' : 'Retirar solicitud'}
                </button>
              </div>
            </div>
          </div>
        )}

        <PaymentHistory payments={account.payments} />
      </div>

      <aside className="h-fit min-w-0 break-words rounded-3xl border border-[#2C2519]/10 bg-white p-6">
        {account.billing.message && <p role="status" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{account.billing.message}</p>}
        <p className="font-outfit text-[11px] uppercase tracking-[0.22em] text-[#B8975A]">Dónde pagar</p>
        {account.billing.configured ? (
          <>
            {account.billing.qrUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={account.billing.qrUrl} alt="QR de pago de Enkarta" className="mt-4 w-full max-w-[240px] rounded-2xl border border-[#2C2519]/8" />
            )}
            {account.billing.instructions && (
              <p className="mt-4 whitespace-pre-line font-outfit text-[13px] leading-relaxed text-[#2C2519]/75">
                {account.billing.instructions}
              </p>
            )}
          </>
        ) : (
          <p className="mt-4 font-outfit text-[13px] leading-relaxed text-[#2C2519]/65">
            Los datos de pago todavía no están publicados. Escríbenos por WhatsApp y te los pasamos
            junto con tu referencia.
          </p>
        )}
        <a
          href={`https://wa.me/${account.billing.whatsapp}?text=${encodeURIComponent(`Hola Enkarta, soy socio${pending ? ` y mi referencia es ${pending.reference}` : ''}. Quiero coordinar el pago de mi mensualidad.`)}`}
          target="_blank"
          rel="noreferrer"
          className="mt-6 block rounded-full border border-[#2C2519]/15 px-5 py-2.5 text-center font-outfit text-[13px] transition hover:border-[#B8975A]/50"
        >
          Escribirnos por WhatsApp
        </a>
      </aside>
    </div>
  );
}

function PaymentHistory({ payments }: { payments: PartnerPayment[] }) {
  if (!payments.length) return null;
  return (
    <div className="mt-10 min-w-0">
      <h3 id="partner-payment-history" className="font-playfair text-[18px]">Historial de pagos</h3>
      <div
        role="region" aria-labelledby="partner-payment-history" tabIndex={0}
        className="mt-4 w-full max-w-full overflow-x-auto rounded-2xl border border-[#2C2519]/10 bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#514735]"
      >
        <table className="w-full min-w-[540px] text-left">
          <thead>
            <tr className="border-b border-[#2C2519]/8 font-outfit text-[10.5px] uppercase tracking-[0.14em] text-[#2C2519]/45">
              <th className="px-4 py-3">Referencia</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Monto</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Fecha</th>
            </tr>
          </thead>
          <tbody className="font-outfit text-[12.5px]">
            {payments.map(payment => (
              <tr key={payment.id} className="border-b border-[#2C2519]/5 last:border-0">
                <td className="px-4 py-3 tracking-[0.05em]">
                  {payment.reference}
                  {payment.receiptUrl && (
                    <a href={payment.receiptUrl} target="_blank" rel="noreferrer" className="ml-2 text-[11px] text-[#B8975A] underline-offset-2 hover:underline">ver</a>
                  )}
                </td>
                <td className="px-4 py-3">{PARTNER_PLANS[payment.plan_key]?.label ?? payment.plan_key} · {payment.months}m</td>
                <td className="px-4 py-3">{formatBs(Number(payment.amount_bs))}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] ${PAYMENT_TONE[payment.status]}`}>{checkoutPaymentLabel(payment)}</span>
                  {payment.review_note && <span className="ml-2 text-[11px] text-[#2C2519]/50">{payment.review_note}</span>}
                </td>
                <td className="px-4 py-3 text-[#2C2519]/60">{dateLabel(payment.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Datos del socio ──────────────────────────────────────────────────────────

function AccountTab({ account, onSaved, onNotice, profileSave, onSaveStart }: {
  account: PartnerAccount;
  onSaved: (account: PartnerAccount, attempt?: ProfileSaveAttempt) => boolean;
  onNotice: (tone: 'ok' | 'error', text: string) => void;
  profileSave?: PartnerProfileSave;
  onSaveStart?: () => void;
}) {
  const localSession = useRef<PartnerProfileSave | null>(null);
  if (!localSession.current) localSession.current = new PartnerProfileSave(account.profile);
  const session = profileSave ?? localSession.current;
  const retained = session.draft;
  const [fields, setFields] = useState(() => retained?.fields ?? profileFields(account.profile));
  const [mode, setMode] = useState<'idle' | 'save' | 'check'>('idle');
  const draft = useRef(fields);
  const edits = useRef({ brand: 0, phone: 0, city: 0 });
  const dirty = useRef(new Set<keyof ProfileFields>(retained?.dirty));
  const verified = useRef(account.profile);
  const mounted = useRef(true);
  const active = useRef<{ session: PartnerProfileSave; attempt: ProfileSaveAttempt } | null>(null);
  const identity = JSON.stringify([account.profile.email, account.profile.memberSince]);
  const context = useRef({ session, identity, epoch: 0 });
  if (!profileSave && verified.current !== account.profile) session.observe(account.profile);
  if (context.current.session !== session || context.current.identity !== identity) {
    if (active.current) active.current.session.cancel(active.current.attempt);
    active.current = null;
    context.current = { session, identity, epoch: context.current.epoch + 1 };
    const restored = session.draft;
    dirty.current = new Set(restored?.dirty); draft.current = restored?.fields ?? profileFields(account.profile);
    verified.current = account.profile; setFields(draft.current); setMode('idle');
  }
  if (verified.current !== account.profile) {
    const next = { ...draft.current };
    for (const key of PROFILE_FIELDS) if (!dirty.current.has(key)) next[key] = account.profile[key];
    verified.current = account.profile;
    if (PROFILE_FIELDS.some(key => next[key] !== draft.current[key])) { draft.current = next; setFields(next); session.rememberDraft(next, dirty.current); }
  }
  const epoch = context.current.epoch;
  const live = () => mounted.current && context.current.epoch === epoch && context.current.session === session
    && sameProfileIdentity(account.profile, session.profile);
  useEffect(() => {
    mounted.current = true;
    if (!active.current) setMode('idle');
    return () => {
      mounted.current = false;
      if (active.current) active.current.session.cancel(active.current.attempt);
      active.current = null;
    };
  }, []);

  const edit = (key: keyof ProfileFields, value: string) => {
    if (!live()) return;
    edits.current[key] += 1; dirty.current.add(key);
    draft.current = { ...draft.current, [key]: value }; setFields(draft.current); session.rememberDraft(draft.current, dirty.current);
  };
  const run = async (kind: 'save' | 'check') => {
    if (!live() || active.current) return;
    const attempt = session.begin(kind, normalizedProfileFields(draft.current));
    if (!attempt) return;
    const revisions = { ...edits.current };
    active.current = { session, attempt }; setMode(kind);
    const current = () => live() && active.current?.attempt === attempt && session.owns(attempt);
    let outcome: 'confirmed' | 'rejected' | 'uncertain' = 'uncertain';
    try {
      onSaveStart?.();
      const result = await partnerRequest<PartnerAccount>('/api/partner/account', kind === 'save' ? {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attempt.submission.fields), signal: attempt.controller.signal,
      } : { signal: attempt.controller.signal });
      if (!current()) return;
      if (kind === 'check') checkedAccount(result);
      if (!validProfile(result.profile)) throw new Error('La respuesta del perfil llegó incompleta. Conservamos los últimos datos verificados.');
      if (!session.canApply(attempt, result.profile)) throw new Error('El perfil cambió durante la consulta. Conservamos tus cambios y los últimos datos verificados.');
      const matches = session.matches(attempt, result.profile);
      if (kind === 'save' && !matches) throw new Error('La respuesta no coincide con los datos enviados. El guardado aún no está confirmado.');
      if (!onSaved(result, attempt)) throw new Error('No pudimos aplicar la respuesta del perfil. Conservamos tus cambios y los últimos datos verificados.');
      session.observe(result.profile);
      if (!matches) {
        onNotice('error', 'Los datos consultados todavía no coinciden con lo enviado. Conservamos tu borrador; vuelve a comprobar el guardado.');
        return;
      }
      outcome = 'confirmed';
      const next = { ...draft.current };
      for (const key of PROFILE_FIELDS) {
        if (edits.current[key] === revisions[key] && (kind === 'save' || !dirty.current.has(key)
          || normalizedProfileFields(draft.current)[key] === attempt.submission.fields[key])) {
          next[key] = result.profile[key]; dirty.current.delete(key);
        }
      }
      draft.current = next; setFields(next); session.rememberDraft(next, dirty.current);
      onNotice('ok', kind === 'save'
        ? (dirty.current.size ? 'Datos enviados guardados. Conservamos los cambios que hiciste después.' : 'Datos guardados.')
        : 'Los datos actuales coinciden con lo enviado. Conservamos tus cambios posteriores.');
    } catch (failure) {
      if (!current()) return;
      const definitive = kind === 'save' && failure instanceof PartnerRequestError && [400, 401, 403].includes(failure.status);
      if (definitive) outcome = 'rejected';
      const message = failure instanceof Error ? failure.message.replaceAll('Actualizar estado', 'Comprobar guardado') : 'No pudimos comprobar el guardado.';
      onNotice('error', definitive ? message : `${message} Pulsa «Comprobar guardado» antes de volver a guardar.`);
    } finally {
      session.finish(attempt, outcome);
      if (live() && active.current?.attempt === attempt) { active.current = null; setMode('idle'); }
    }
  };
  const save = () => run('save');
  const check = () => run('check');

  const field = 'mt-2 w-full rounded-xl border border-[#2C2519]/12 bg-white px-4 py-2.5 font-outfit text-[13px]';
  const label = 'font-outfit text-[11px] uppercase tracking-[0.18em] text-[#2C2519]/50';

  return (
    <div className="max-w-xl">
      <h2 className="font-playfair text-[22px]">Mi cuenta</h2>
      <p className="mt-2 font-outfit text-[13px] leading-relaxed text-[#2C2519]/60">
        Tu correo viene de Google y no se puede cambiar aquí. Socio desde el {dateLabel(account.profile.memberSince)}.
      </p>

      <div className="mt-7 space-y-5">
        <label className="block">
          <span className={label}>Nombre de tu marca</span>
          <input value={fields.brand} onChange={event => edit('brand', event.target.value)} maxLength={80} placeholder="Ej. Estudio Aurora" className={field} />
        </label>
        <label className="block">
          <span className={label}>WhatsApp</span>
          <input value={fields.phone} onChange={event => edit('phone', event.target.value)} maxLength={30} placeholder="591 7XXXXXXX" className={field} />
        </label>
        <label className="block">
          <span className={label}>Ciudad</span>
          <input value={fields.city} onChange={event => edit('city', event.target.value)} maxLength={60} placeholder="La Paz" className={field} />
        </label>
        <label className="block">
          <span className={label}>Correo</span>
          <input value={account.profile.email} readOnly className={`${field} bg-[#F3EFE8] text-[#2C2519]/60`} />
        </label>
      </div>

      <button
        onClick={save}
        disabled={mode !== 'idle' || session.busy || session.needsCheck || session.alreadySaved(normalizedProfileFields(fields))}
        className="mt-7 rounded-full bg-[#2C2519] px-7 py-2.5 font-outfit text-[13px] text-[#FAF7F2] transition hover:bg-[#3d342a] disabled:opacity-50"
      >
        {mode === 'save' ? 'Guardando…' : 'Guardar cambios'}
      </button>
      {session.needsCheck && (
        <div className="mt-4 font-outfit text-[13px] leading-relaxed text-[#2C2519]/70">
          <p role="status" aria-live="polite">El guardado aún no está confirmado. Tus cambios siguen en el formulario.</p>
          <button type="button" onClick={check} disabled={mode !== 'idle' || session.busy} className="mt-3 rounded-full border border-[#2C2519]/20 px-5 py-2.5 disabled:opacity-50">
            {mode === 'check' ? 'Comprobando…' : 'Comprobar guardado'}
          </button>
        </div>
      )}
    </div>
  );
}
