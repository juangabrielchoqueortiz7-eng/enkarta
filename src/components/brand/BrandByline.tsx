import { LEGAL_PROVIDER } from '@/lib/brand';

export default function BrandByline({
  className = '',
  tone = 'inherit',
}: {
  className?: string;
  tone?: 'inherit' | 'warm' | 'light' | 'dark';
}) {
  const color = tone === 'warm' ? 'rgba(90,78,52,.5)' : tone === 'light' ? 'rgba(255,255,255,.42)' : tone === 'dark' ? 'rgba(44,37,25,.42)' : 'currentColor';
  return (
    <span
      aria-label="Enkarta, una marca de Grupo JABA"
      className={`block font-outfit text-[8px] font-medium uppercase leading-none tracking-[0.24em] ${className}`}
      style={{ color, opacity: tone === 'inherit' ? 0.55 : 1 }}
    >
      by <strong className="font-semibold">{LEGAL_PROVIDER}</strong>
    </span>
  );
}
