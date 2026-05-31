import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Validate API key
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== process.env.ENKARTA_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Try to parse guest info from raw data
    let guestName = body.guest_name || null;
    let guestPasses = body.guest_passes || 1;

    // If raw phone data, try to extract guest info
    if (body.phone_raw) {
      const raw = typeof body.phone_raw === 'string' ? body.phone_raw : JSON.stringify(body.phone_raw);
      if (!guestName) {
        const nameMatch = raw.match(/nombre[:\s]+([^\n,]+)/i);
        if (nameMatch) guestName = nameMatch[1].trim();
      }
      if (!body.guest_passes) {
        const passMatch = raw.match(/pases?[:\s]+(\d+)/i);
        if (passMatch) guestPasses = parseInt(passMatch[1]);
      }
    }

    // Generate slug if not provided
    const slug = body.slug || `inv-${Date.now().toString(36)}`;

    const { data, error } = await supabaseAdmin
      .from('invitations')
      .insert({
        slug,
        status: 'draft',
        template: body.template || 'perla',
        type: body.type || 'boda',
        names: body.names || null,
        event_date: body.event_date || null,
        ceremony_time: body.ceremony_time || null,
        ceremony_place: body.ceremony_place || null,
        ceremony_address: body.ceremony_address || null,
        reception_time: body.reception_time || null,
        reception_place: body.reception_place || null,
        reception_address: body.reception_address || null,
        guest_name: guestName,
        guest_passes: guestPasses,
        message: body.message || null,
        dress_code: body.dress_code || null,
        no_kids: body.no_kids || false,
        parents_groom: body.parents_groom ? JSON.stringify(body.parents_groom) : null,
        parents_bride: body.parents_bride ? JSON.stringify(body.parents_bride) : null,
        sponsors: body.sponsors ? JSON.stringify(body.sponsors) : null,
        itinerary: body.itinerary ? JSON.stringify(body.itinerary) : null,
        gift_message: body.gift_message || null,
        bank_account: body.bank_account || null,
        cover_image_url: body.cover_image_url || null,
        gallery_url: body.gallery_url || null,
        color_primary: body.color_primary || '#B8975A',
        color_secondary: body.color_secondary || '#FAF7F2',
        color_accent: body.color_accent || '#2C2519',
        phone_raw: body.phone_raw ? JSON.stringify(body.phone_raw) : null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
