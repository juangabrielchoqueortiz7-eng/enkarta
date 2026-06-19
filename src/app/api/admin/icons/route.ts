import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAdminSession } from '@/lib/host-session';

export const runtime = 'nodejs';

// Lee las carpetas de lottie y devuelve todos los archivos JSON encontrados
export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const lottieDir = path.join(process.cwd(), 'public', 'lottie');

  const categories = ['boda', 'xv', 'cumpleanos', 'baby_shower', 'bautizo', 'general'];

  const result = categories.map((cat) => {
    const catDir = path.join(lottieDir, cat);

    let files: string[] = [];
    try {
      files = fs.readdirSync(catDir)
        .filter(f => f.endsWith('.json') && !f.startsWith('_'));
    } catch {
      // carpeta vacía o no existe aún
    }

    const icons = files.map((file) => {
      const id = file.replace('.json', '');
      // Convertir nombre-de-archivo a etiqueta legible
      const label = id
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());

      return {
        id,
        label,
        path: `/lottie/${cat}/${file}`,
        tags: [id, cat],
      };
    });

    const emojiMap: Record<string, string> = {
      boda: '💍',
      xv: '👑',
      cumpleanos: '🎂',
      baby_shower: '🍼',
      bautizo: '✝️',
      general: '✨',
    };

    const labelMap: Record<string, string> = {
      boda: 'Boda',
      xv: 'XV Años',
      cumpleanos: 'Cumpleaños',
      baby_shower: 'Baby Shower',
      bautizo: 'Bautizo',
      general: 'General',
    };

    return {
      id: cat,
      label: labelMap[cat] ?? cat,
      emoji: emojiMap[cat] ?? '✨',
      icons,
    };
  });

  return NextResponse.json({ version: '1.0', categories: result });
}
