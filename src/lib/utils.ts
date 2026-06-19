import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Une clases condicionales (clsx) y resuelve conflictos de Tailwind (tailwind-merge).
 * Úsalo en cualquier componente para combinar clases base + props sin choques:
 *
 *   cn('px-4 py-2 rounded', isActive && 'bg-black text-white', className)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
