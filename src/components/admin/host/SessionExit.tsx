'use client';
import { useRouter } from 'next/navigation';
export default function SessionExit({ scope = 'host' }: { scope?: 'host' | 'review' | 'door' }) {
  const router = useRouter();
  return <button type="button" className="min-h-11 rounded-xl border bg-white px-4 font-outfit text-sm text-gray-600" onClick={async () => { await fetch(`/api/${scope}/auth`, { method: 'DELETE' }); router.refresh(); }}>Cerrar sesión</button>;
}
