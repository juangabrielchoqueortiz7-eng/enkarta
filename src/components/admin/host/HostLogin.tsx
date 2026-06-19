'use client';

// Pantalla de acceso del cliente (anfitrión). Es la cara del sistema para el
// cliente: marca Enkarta + correo y contraseña de SU evento. No revela que
// exista un panel de administración (el equipo entra por /admin directamente).

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HostLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/host/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) { router.refresh(); }
      else { const d = await res.json(); setError(d.error || 'No se pudo ingresar'); }
    } catch { setError('Error de conexión'); }
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'radial-gradient(ellipse at 50% 0%, #fdfbf7 0%, #f1e9db 100%)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <p className="font-great text-5xl" style={{ color: '#B8975A' }}>Enkarta</p>
          <p className="font-cormorant text-lg mt-1" style={{ color: 'rgba(44,37,25,0.6)' }}>Accede a tu evento</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-7 border border-enkarta-gold/20">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-outfit text-enkarta-dark/70 mb-1">Correo</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoFocus
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-enkarta-gold focus:ring-2 focus:ring-enkarta-gold/20 outline-none transition-all font-outfit"
                placeholder="tucorreo@ejemplo.com" />
            </div>
            <div>
              <label className="block text-sm font-outfit text-enkarta-dark/70 mb-1">Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-enkarta-gold focus:ring-2 focus:ring-enkarta-gold/20 outline-none transition-all font-outfit"
                placeholder="••••••••" />
            </div>
            {error && <p className="text-red-500 text-sm font-outfit">{error}</p>}
            <button type="submit" disabled={busy}
              className="w-full py-3 bg-enkarta-gold text-white rounded-xl font-outfit font-medium hover:bg-enkarta-gold/90 transition-all shadow-lg shadow-enkarta-gold/20 disabled:opacity-50">
              {busy ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs font-outfit mt-5" style={{ color: 'rgba(44,37,25,0.4)' }}>
          ¿Problemas para entrar? Contacta a quien creó tu invitación.
        </p>
      </div>
    </div>
  );
}
