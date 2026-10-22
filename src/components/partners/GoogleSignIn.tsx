'use client';

import { useEffect, useRef, useState } from 'react';
import { authBrowserClient } from '@/lib/supabase/browser';
import { boundedBuilderTask } from '@/lib/builder-request';

const GoogleMark = () => (
  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" aria-hidden>
    <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 01-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.94-2.92l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.1A12 12 0 0012 24z" />
    <path fill="#FBBC05" d="M5.28 14.28a7.2 7.2 0 010-4.56v-3.1H1.27a12 12 0 000 10.76l4.01-3.1z" />
    <path fill="#EA4335" d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 001.27 6.62l4.01 3.1C6.22 6.88 8.87 4.77 12 4.77z" />
  </svg>
);

/**
 * Entrada del socio con su correo de Google. La sesión vuelve por
 * /auth/callback, que crea la ficha y manda a `next`.
 */
export default function GoogleSignIn({ next = '/socios/panel', label = 'Continuar con Google', className = '' }: {
  next?: string; label?: string; className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(false), pending = useRef<AbortController | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; pending.current?.abort(); }; }, []);

  const signIn = async () => {
    if (!mounted.current || pending.current) return;
    const controller = new AbortController(); pending.current = controller;
    setLoading(true);
    setError('');
    try {
      const redirect = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { data, error: oauthError } = await boundedBuilderTask<{ data: { url: string | null }; error: unknown }>(() => authBrowserClient().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirect, skipBrowserRedirect: true },
      }), { signal: controller.signal });
      if (oauthError) throw oauthError;
      if (!mounted.current || pending.current !== controller || controller.signal.aborted) return;
      const url = new URL(data.url || '');
      const authOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin;
      if (url.origin !== authOrigin || url.pathname !== '/auth/v1/authorize') throw new Error('Acceso inválido');
      window.location.assign(url.href);
    } catch {
      if (mounted.current && pending.current === controller) setError('No se pudo abrir el acceso de Google. Intenta de nuevo.');
    } finally {
      if (pending.current === controller) { pending.current = null; if (mounted.current) setLoading(false); }
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={signIn}
        disabled={loading}
        aria-busy={loading}
        className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-[#2C2519]/12 bg-white px-7 py-3.5 font-outfit text-[14px] font-medium text-[#2C2519] shadow-[0_10px_30px_-18px_rgba(44,37,25,0.55)] transition hover:border-[#B8975A]/50 hover:shadow-[0_16px_40px_-20px_rgba(44,37,25,0.5)] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
      >
        {loading ? <span className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-[#B8975A] border-t-transparent" /> : <GoogleMark />}
        {loading ? 'Abriendo Google…' : label}
      </button>
      {error && <p role="alert" className="mt-3 font-outfit text-[12px] text-red-600">{error}</p>}
    </div>
  );
}
