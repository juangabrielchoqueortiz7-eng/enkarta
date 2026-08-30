import { createElement } from 'react';
import { ImageResponse } from 'next/og';
import { getAdminSession } from '@/lib/host-session';
import { MARKETING_CAMPAIGNS, MARKETING_FORMATS, type MarketingCampaignKey, type MarketingFormatKey } from '@/lib/marketing-kit';
import { SITE_URL } from '@/lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!(await getAdminSession())) return new Response('No autorizado', { status: 401 });
  const query = new URL(request.url).searchParams;
  const campaignKey = (query.get('campaign') || 'bodas') as MarketingCampaignKey;
  const formatKey = (query.get('format') || 'story') as MarketingFormatKey;
  const download = query.get('download') === '1';
  const campaign = MARKETING_CAMPAIGNS[campaignKey]; const format = MARKETING_FORMATS[formatKey];
  if (!campaign || !format) return new Response('Formato inválido', { status: 400 });
  const h = createElement;
  const card = h('div', { style: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: formatKey === 'story' ? '100px 76px' : '70px', color: 'white', backgroundImage: `linear-gradient(180deg, rgba(18,14,10,.12) 0%, rgba(18,14,10,.28) 42%, rgba(18,14,10,.92) 100%), url(${SITE_URL}${campaign.image})`, backgroundSize: 'cover', backgroundPosition: 'center', fontFamily: 'serif' } },
    h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
      h('div', { style: { fontSize: 28, letterSpacing: 6 } }, 'ENKARTA'),
      h('div', { style: { display: 'flex', fontSize: 14, letterSpacing: 4, opacity: .78 } }, 'BY GRUPO JABA'),
    ),
    h('div', { style: { display: 'flex', flexDirection: 'column' } },
      h('div', { style: { display: 'flex', color: campaign.accent, fontSize: 20, fontFamily: 'sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 5 } }, campaign.eyebrow),
      h('div', { style: { display: 'flex', marginTop: 28, maxWidth: 900, fontSize: formatKey === 'story' ? 86 : 68, lineHeight: 1.02 } }, campaign.headline),
      h('div', { style: { display: 'flex', marginTop: 30, maxWidth: 820, fontSize: formatKey === 'story' ? 29 : 25, lineHeight: 1.4, fontFamily: 'sans-serif', opacity: .88 } }, campaign.subline),
      h('div', { style: { display: 'flex', alignSelf: 'flex-start', marginTop: 42, borderRadius: 999, padding: '20px 34px', background: campaign.accent, color: campaign.ink, fontSize: 22, fontWeight: 700, fontFamily: 'sans-serif' } }, campaign.cta),
    ),
  );
  return new ImageResponse(card, { width: format.width, height: format.height, headers: { 'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="enkarta-${campaignKey}-${formatKey}.png"`, 'Cache-Control': 'no-store' } });
}
