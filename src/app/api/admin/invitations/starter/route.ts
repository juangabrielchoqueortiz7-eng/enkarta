import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/host-session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { invitationStarter, STARTER_TEMPLATE_KEYS, StarterTemplateKey } from '@/lib/template-starters';
import { isPackage, newServiceContract } from '@/lib/packages';
import { storedServiceConfig } from '@/lib/package-services-server';

export const runtime = 'nodejs';

const unauthenticated = () => NextResponse.json({ error: 'No autorizado' }, { status: 401 });

function slugFor(template: string) {
  return `invitacion-${template.replace('_v2', '')}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function POST(request: NextRequest) {
  if (!(await getAdminSession())) return unauthenticated();

  try {
    const body = await request.json();
    if (!isPackage(body.package)) return NextResponse.json({ error: 'Selecciona el paquete contratado.' }, { status: 400 });
    const template = body.template as StarterTemplateKey;
    if (!STARTER_TEMPLATE_KEYS.includes(template)) {
      return NextResponse.json({ error: 'La plantilla seleccionada no está disponible' }, { status: 400 });
    }

    const starter = invitationStarter(template);
    const insertData = {
      ...starter,
      builder_config: newServiceContract(storedServiceConfig(starter.builder_config), body.package),
      slug: slugFor(template),
      parents_groom: JSON.stringify(starter.parents_groom),
      parents_bride: JSON.stringify(starter.parents_bride),
      sponsors: JSON.stringify(starter.sponsors),
      itinerary: JSON.stringify(starter.itinerary),
    };

    const { data, error } = await supabaseAdmin
      .from('invitations')
      .insert(insertData)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
