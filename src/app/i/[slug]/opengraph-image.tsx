import { ImageResponse } from 'next/og';
import { supabaseAdmin } from '@/lib/supabase/server';

// Imagen de vista previa al compartir (WhatsApp / redes) generada al vuelo:
// la foto de portada con un velo oscuro + los nombres en script y la fecha, con
// la marca Enkarta. Reemplaza a la foto cruda para que el enlace se vea "de
// diseño". Convención de Next: este archivo alimenta og:image y twitter:image.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const alt = 'Invitación · Enkarta';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function dateLineOf(iso: string | null): string {
  if (!iso) return '';
  const [y, mo, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !mo || !d) return '';
  return `${MESES[mo - 1]} ${String(d).padStart(2, '0')} · ${y}`;
}

const TAGLINE: Record<string, string> = {
  boda: 'Nos casamos',
  xv: 'Mis XV Años',
  cumpleanos: 'Cumpleaños',
  baby_shower: 'Baby Shower',
  bautizo: 'Bautizo',
};

// Carga una fuente de Google como TTF para Satori (no soporta woff2). Sin
// User-Agent moderno, Google sirve truetype; si algo falla, devolvemos null y
// ImageResponse usa su fuente por defecto.
async function loadGoogleFont(family: string, text: string, weight?: number): Promise<ArrayBuffer | null> {
  const fam = family.replace(/ /g, '+') + (weight ? `:wght@${weight}` : '');
  const url = `https://fonts.googleapis.com/css2?family=${fam}&text=${encodeURIComponent(text)}`;
  try {
    const css = await (await fetch(url)).text();
    const src = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/);
    if (!src) return null;
    const res = await fetch(src[1]);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { data } = await supabaseAdmin
    .from('invitations')
    .select('names, type, cover_image_url, event_date, color_primary, color_secondary')
    .eq('slug', slug)
    .single();

  const names = data?.names || 'Nuestra Boda';
  const dateLine = dateLineOf(data?.event_date ?? null);
  const tagline = TAGLINE[data?.type ?? 'boda'] ?? 'Te invitamos';
  const cover = data?.cover_image_url || undefined;
  const primary = data?.color_primary || '#b3924f';
  const secondary = data?.color_secondary || '#2c2519';

  const scriptText = names;
  const serifText = `${tagline}${dateLine}·&ABCDEFGHIJKLMNÑOPQRSTUVWXYZáéíóúÁÉÍÓÚ`;
  const [scriptFont, serifFont] = await Promise.all([
    loadGoogleFont('Great Vibes', scriptText),
    loadGoogleFont('Cormorant Garamond', serifText, 600),
  ]);

  const fonts: { name: string; data: ArrayBuffer; weight?: 400 | 600; style?: 'normal' }[] = [];
  if (scriptFont) fonts.push({ name: 'Great Vibes', data: scriptFont, weight: 400, style: 'normal' });
  if (serifFont) fonts.push({ name: 'Cormorant', data: serifFont, weight: 600, style: 'normal' });

  const script = scriptFont ? 'Great Vibes' : 'serif';
  const serif = serifFont ? 'Cormorant' : 'serif';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: secondary,
          backgroundImage: `linear-gradient(135deg, ${primary}, ${secondary})`,
        }}
      >
        {/* Foto de portada a sangre */}
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
          <img src={cover} width={1200} height={630} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        {/* Velo para legibilidad del texto */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.20) 45%, rgba(0,0,0,0.62) 100%)',
          }}
        />
        {/* Marco fino interior */}
        <div style={{ position: 'absolute', top: 28, left: 28, right: 28, bottom: 28, border: '1px solid rgba(255,255,255,0.55)' }} />

        {/* Bloque de texto */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            color: '#f6efe3',
            padding: '0 80px',
          }}
        >
          <div style={{ fontFamily: serif, fontSize: 30, letterSpacing: 8, textTransform: 'uppercase', opacity: 0.9 }}>
            {tagline}
          </div>
          <div style={{ fontFamily: script, fontSize: 132, lineHeight: 1.05, marginTop: 6, textShadow: '0 2px 18px rgba(0,0,0,0.35)' }}>
            {names}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 26 }}>
            <div style={{ width: 60, height: 1, background: 'rgba(246,239,227,0.75)' }} />
            <div style={{ fontFamily: serif, fontSize: 34, letterSpacing: 4, textTransform: 'uppercase' }}>{dateLine}</div>
            <div style={{ width: 60, height: 1, background: 'rgba(246,239,227,0.75)' }} />
          </div>
        </div>

        {/* Firma Enkarta */}
        <div style={{ position: 'absolute', bottom: 44, display: 'flex', fontFamily: serif, fontSize: 22, letterSpacing: 6, textTransform: 'uppercase', color: 'rgba(246,239,227,0.85)' }}>
          Enkarta
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
