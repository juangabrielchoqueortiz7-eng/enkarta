import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

// GET — List all invitations
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('invitations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// POST — Create invitation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const insertData = {
      slug: body.slug,
      status: body.status || 'draft',
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
      guest_name: body.guest_name || null,
      guest_passes: body.guest_passes || 1,
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
    };

    const { data, error } = await supabaseAdmin
      .from('invitations')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// PUT — Update invitation
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    // Stringify JSON fields if they're arrays/objects
    if (Array.isArray(updateData.parents_groom)) {
      updateData.parents_groom = JSON.stringify(updateData.parents_groom);
    }
    if (Array.isArray(updateData.parents_bride)) {
      updateData.parents_bride = JSON.stringify(updateData.parents_bride);
    }
    if (Array.isArray(updateData.sponsors)) {
      updateData.sponsors = JSON.stringify(updateData.sponsors);
    }
    if (Array.isArray(updateData.itinerary)) {
      updateData.itinerary = JSON.stringify(updateData.itinerary);
    }

    const { data, error } = await supabaseAdmin
      .from('invitations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// DELETE — Delete invitation
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('invitations')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
