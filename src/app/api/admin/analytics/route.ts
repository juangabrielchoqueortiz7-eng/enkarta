import { NextRequest, NextResponse } from 'next/server';
import { canManageInvitation } from '@/lib/host-session';
import { readGuests } from '@/lib/guests';
import { readRsvps } from '@/lib/rsvps';
import { supabaseAdmin } from '@/lib/supabase/server';
import { parseConfig } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AnalyticsEventRow = {
  event_type: string;
  session_id: string;
  metadata: Record<string, unknown> | null;
  occurred_at: string;
};

export async function GET(request: NextRequest) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
  if (!(await canManageInvitation(id))) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { data: invitation } = await supabaseAdmin.from('invitations').select('views_count,event_date,builder_config').eq('id', id).maybeSingle();
  const config = parseConfig(invitation?.builder_config);
  const retentionDays = [30, 90, 180, 365].includes(Number(config.analytics?.retentionDays)) ? Number(config.analytics?.retentionDays) : 180;
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000).toISOString();
  const [guests, rsvps, eventsResult] = await Promise.all([
    readGuests(id),
    readRsvps(id),
    supabaseAdmin.from('invitation_analytics_events').select('event_type,session_id,metadata,occurred_at').eq('invitation_id', id).gte('occurred_at', cutoff).order('occurred_at', { ascending: false }).limit(10000),
  ]);
  const analyticsEvents = (eventsResult.data || []) as AnalyticsEventRow[];
  const confirmed = guests.filter(guest => guest.status === 'confirmed');
  const declined = guests.filter(guest => guest.status === 'declined');
  const sent = guests.filter(guest => guest.sent);
  const confirmedPasses = confirmed.reduce((sum, guest) => sum + (guest.confirmedPasses ?? guest.passes), 0)
    + rsvps.filter(entry => entry.attending === 'yes').reduce((sum, entry) => sum + (entry.passes ?? 1), 0);
  const totalPasses = guests.reduce((sum, guest) => sum + guest.passes, 0);
  const responses = confirmed.length + declined.length;
  const respondedAt = [
    ...guests.filter(guest => guest.respondedAt).map(guest => guest.respondedAt as string),
    ...rsvps.map(entry => entry.at),
  ];
  const trend = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - (6 - index));
    const key = day.toISOString().slice(0, 10);
    return { date: key, label: day.toLocaleDateString('es-BO', { weekday: 'short' }).replace('.', ''), responses: respondedAt.filter(at => at?.slice(0, 10) === key).length };
  });
  const eventCount = (type: string) => analyticsEvents.filter(event => event.event_type === type).length;
  const eventSessions = (...types: string[]) => new Set(analyticsEvents.filter(event => types.includes(event.event_type)).map(event => event.session_id));
  const viewEvents = analyticsEvents.filter(event => event.event_type === 'view');
  const uniqueVisitors = new Set(viewEvents.map(event => event.session_id)).size;
  const sourceCounts = new Map<string, number>();
  viewEvents.forEach(event => {
    const source = typeof event.metadata?.source === 'string' ? event.metadata.source.slice(0, 80) : 'directo';
    sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
  });
  const sources = Array.from(sourceCounts.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  const activityTrend = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - (6 - index));
    const key = day.toISOString().slice(0, 10);
    return { date: key, label: day.toLocaleDateString('es-BO', { weekday: 'short' }).replace('.', ''), events: analyticsEvents.filter(event => event.occurred_at?.slice(0, 10) === key).length };
  });
  const views = viewEvents.length || invitation?.views_count || 0;
  const conversionBase = uniqueVisitors || views;
  const detailSessions = eventSessions('scroll_50', 'scroll_75', 'scroll_100');
  const rsvpStartSessions = eventSessions('rsvp_start');
  const rsvpSubmitSessions = eventSessions('rsvp_submit');
  const funnelBase = Math.max(1, uniqueVisitors);
  const funnelValues = [
    ['Abrió', uniqueVisitors], ['Vio detalles', detailSessions.size], ['Inició RSVP', rsvpStartSessions.size], ['Confirmó', Math.max(rsvpSubmitSessions.size, Math.min(uniqueVisitors, responses + rsvps.length))],
  ] as const;

  if (!eventsResult.error) await supabaseAdmin.from('invitation_analytics_events').delete().eq('invitation_id', id).lt('occurred_at', cutoff);

  return NextResponse.json({
    views,
    uniqueVisitors,
    guests: guests.length,
    sent: sent.length,
    confirmed: confirmed.length,
    declined: declined.length,
    pending: guests.length - confirmed.length - declined.length,
    openRsvps: rsvps.length,
    confirmedPasses,
    totalPasses,
    responseRate: sent.length ? Math.min(100, Math.round((responses / sent.length) * 100)) : 0,
    conversionRate: conversionBase ? Math.min(100, Math.round(((responses + rsvps.length) / conversionBase) * 100)) : 0,
    engagement: {
      entryOpens: eventCount('entry_open'),
      rsvpStarts: eventCount('rsvp_start'),
      rsvpSubmits: eventCount('rsvp_submit'),
      mapOpens: eventCount('map_open'),
      calendarAdds: eventCount('calendar_add'),
      galleryOpens: eventCount('gallery_open'),
      shares: eventCount('share'),
      externalLinks: eventCount('link_open'),
      ctaClicks: eventCount('cta_click'),
      musicToggles: eventCount('music_toggle'),
    },
    scroll: {
      reach25: eventSessions('scroll_25').size,
      reach50: eventSessions('scroll_50').size,
      reach75: eventSessions('scroll_75').size,
      reach100: eventSessions('scroll_100').size,
    },
    funnel: funnelValues.map(([stage, value]) => ({ stage, value, rate: uniqueVisitors ? Math.min(100, Math.round((value / funnelBase) * 100)) : 0 })),
    retentionDays,
    analyticsEnabled: config.analytics?.enabled !== false,
    analyticsReady: !eventsResult.error,
    sources,
    trend,
    activityTrend,
  });
}
