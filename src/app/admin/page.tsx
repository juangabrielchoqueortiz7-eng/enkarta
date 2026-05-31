'use client';

import { useState, useEffect } from 'react';
import { Invitation } from '@/lib/types';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setIsAuthenticated(true);
        loadInvitations();
      } else {
        setError('Contraseña incorrecta');
      }
    } catch {
      setError('Error de conexión');
    }
  };

  const loadInvitations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/invitations');
      if (res.ok) {
        const data = await res.json();
        setInvitations(data);
      }
    } catch {
      console.error('Error loading invitations');
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta invitación?')) return;
    try {
      const res = await fetch(`/api/admin/invitations?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setInvitations(invitations.filter(i => i.id !== id));
      }
    } catch {
      console.error('Error deleting');
    }
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/i/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(slug);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    setIsAuthenticated(false);
    setPassword('');
  };

  useEffect(() => {
    // Check if already authenticated
    fetch('/api/admin/invitations')
      .then(res => {
        if (res.ok) {
          setIsAuthenticated(true);
          return res.json();
        }
        return [];
      })
      .then(data => {
        if (data.length !== undefined) setInvitations(data);
      })
      .catch(() => {});
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-enkarta-cream flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-enkarta-gold/20">
            <div className="text-center mb-8">
              <h1 className="font-playfair text-3xl text-enkarta-dark mb-2">Enkarta</h1>
              <p className="text-enkarta-dark/50 font-outfit text-sm">Panel de Administración</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-outfit text-enkarta-dark/70 mb-1">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-enkarta-gold focus:ring-2 focus:ring-enkarta-gold/20 outline-none transition-all font-outfit"
                  placeholder="Ingresa la contraseña"
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-red-500 text-sm font-outfit">{error}</p>
              )}
              <button
                type="submit"
                className="w-full py-3 bg-enkarta-gold text-white rounded-xl font-outfit font-medium hover:bg-enkarta-gold/90 transition-all duration-200 shadow-lg shadow-enkarta-gold/20"
              >
                Ingresar
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <h1 className="font-playfair text-xl text-enkarta-dark">Enkarta</h1>
            <span className="text-xs bg-enkarta-gold/10 text-enkarta-gold px-2 py-0.5 rounded-full font-outfit font-medium">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/admin/new"
              className="px-4 py-2 bg-enkarta-gold text-white rounded-lg font-outfit text-sm font-medium hover:bg-enkarta-gold/90 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nueva Invitación
            </a>
            <button
              onClick={handleLogout}
              className="px-3 py-2 text-gray-500 hover:text-gray-700 font-outfit text-sm transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-playfair text-2xl text-gray-900">Invitaciones</h2>
          <span className="text-sm text-gray-500 font-outfit">{invitations.length} total</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-enkarta-gold border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : invitations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-enkarta-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-enkarta-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" /></svg>
            </div>
            <h3 className="font-playfair text-lg text-gray-900 mb-1">No hay invitaciones</h3>
            <p className="text-gray-500 text-sm font-outfit mb-4">Crea tu primera invitación digital</p>
            <a
              href="/admin/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-enkarta-gold text-white rounded-lg font-outfit text-sm font-medium hover:bg-enkarta-gold/90 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nueva Invitación
            </a>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full admin-table">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th>Slug</th>
                    <th>Cliente</th>
                    <th>Plantilla</th>
                    <th>Estado</th>
                    <th>Fecha evento</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invitations.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="font-mono text-xs text-gray-600">{inv.slug}</td>
                      <td className="font-outfit font-medium text-gray-900">{inv.names || '—'}</td>
                      <td>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-enkarta-gold/10 text-enkarta-gold capitalize">
                          {inv.template}
                        </span>
                      </td>
                      <td>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          inv.status === 'ready'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {inv.status === 'ready' ? '● Lista' : '○ Borrador'}
                        </span>
                      </td>
                      <td className="text-gray-600 font-outfit">
                        {inv.event_date ? new Date(inv.event_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <a
                            href={`/admin/edit/${inv.id}`}
                            className="p-2 text-gray-400 hover:text-enkarta-gold hover:bg-enkarta-gold/5 rounded-lg transition-all"
                            title="Editar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </a>
                          <a
                            href={`/i/${inv.slug}`}
                            target="_blank"
                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                            title="Preview"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </a>
                          <button
                            onClick={() => copyLink(inv.slug)}
                            className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-all"
                            title="Copiar link"
                          >
                            {copied === inv.slug ? (
                              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(inv.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Eliminar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
