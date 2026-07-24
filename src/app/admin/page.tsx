'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Invitation } from '@/lib/types';
import ConfirmationsDashboard from '@/components/admin/ConfirmationsDashboard';

const BUILDER_TEMPLATES = ['azure','primicia','passport','paradise','obsidiana','dolcevita','grazia','carmesi_v2','napoly','euforia','rosegold','allegria','provenza'];

// Color de acento por plantilla (punto identificador en la tabla)
const TEMPLATE_COLORS: Record<string, string> = {
  azure: '#3a7ab5', primicia: '#c89828', passport: '#6a8a45', paradise: '#5f6b47',
  obsidiana: '#100f0c', dolcevita: '#4f7a52', grazia: '#bca478', carmesi_v2: '#871a2f',
  napoly: '#b98a86', euforia: '#8a7257', rosegold: '#b97f86', allegria: '#8c9a86', provenza: '#68693f',
};

type StatusFilter = 'all' | 'ready' | 'draft';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [view, setView] = useState<'invitations' | 'confirmations'>('invitations');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoggingIn(true);
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
    setLoggingIn(false);
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

  // ── Métricas ──
  const stats = useMemo(() => {
    const ready = invitations.filter(i => i.status === 'ready').length;
    const now = Date.now();
    const upcoming = invitations.filter(i => {
      if (!i.event_date) return false;
      const d = new Date(i.event_date).getTime();
      return d >= now && d <= now + 30 * 24 * 3600 * 1000;
    }).length;
    return { total: invitations.length, ready, draft: invitations.length - ready, upcoming };
  }, [invitations]);

  // ── Filtro y búsqueda ──
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invitations.filter(inv => {
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
      if (!q) return true;
      return (
        inv.slug.toLowerCase().includes(q) ||
        (inv.names || '').toLowerCase().includes(q) ||
        inv.template.toLowerCase().includes(q)
      );
    });
  }, [invitations, search, statusFilter]);

  // ── Login ──
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, #2e2820 0%, #1d1812 55%, #120f0b 100%)' }}>
        {/* Glows decorativos */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-15%] left-[15%] w-[420px] h-[420px] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(184,151,90,0.14) 0%, transparent 70%)' }} />
          <div className="absolute bottom-[-10%] right-[10%] w-[380px] h-[380px] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(184,151,90,0.10) 0%, transparent 70%)' }} />
        </div>

        <motion.div
          className="w-full max-w-md relative z-10"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="rounded-3xl p-8 sm:p-10"
            style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(18px)', border: '1px solid rgba(184,151,90,0.22)', boxShadow: '0 30px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
            <div className="text-center mb-9">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full border flex items-center justify-center"
                style={{ borderColor: 'rgba(184,151,90,0.45)', background: 'rgba(184,151,90,0.08)' }}>
                <span className="font-great text-3xl" style={{ color: '#d8b876' }}>E</span>
              </div>
              <h1 className="font-cinzel text-2xl tracking-[0.12em]" style={{
                backgroundImage: 'linear-gradient(90deg, #8B7D5F, #e0c074, #8B7D5F)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>ENKARTA</h1>
              <p className="font-outfit text-xs tracking-[0.3em] uppercase mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>Panel de Administración</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-outfit tracking-wide mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl outline-none transition-all font-outfit text-white placeholder:text-white/25"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(184,151,90,0.25)' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(216,184,118,0.7)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(184,151,90,0.15)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(184,151,90,0.25)'; e.currentTarget.style.boxShadow = 'none'; }}
                  placeholder="Ingresa la contraseña"
                  autoFocus
                />
              </div>
              {error && (
                <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="text-red-400 text-sm font-outfit">{error}</motion.p>
              )}
              <button
                type="submit"
                disabled={loggingIn}
                className="w-full py-3.5 rounded-xl font-outfit font-semibold tracking-wide transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60"
                style={{ background: 'linear-gradient(90deg, #B8975A, #d8b876)', color: '#171209', boxShadow: '0 10px 30px rgba(184,151,90,0.3)' }}
              >
                {loggingIn ? 'Verificando…' : 'Ingresar'}
              </button>
            </form>
          </div>
          <p className="text-center mt-6 font-outfit text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>© 2026 Enkarta · Acceso restringido</p>
        </motion.div>
      </div>
    );
  }

  // ── Dashboard ──
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f7f6f3' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b" style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(12px)', borderColor: 'rgba(139,125,95,0.14)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full border flex items-center justify-center" style={{ borderColor: 'rgba(184,151,90,0.4)', background: 'rgba(184,151,90,0.07)' }}>
              <span className="font-great text-xl" style={{ color: '#B8975A' }}>E</span>
            </div>
            <div>
              <h1 className="font-cinzel text-base text-enkarta-dark leading-none tracking-wide">ENKARTA</h1>
              <span className="font-outfit text-[10px] tracking-[0.25em] uppercase" style={{ color: '#B8975A' }}>Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center rounded-xl p-1" style={{ background: 'rgba(139,125,95,0.08)' }}>
              <button
                onClick={() => setView('invitations')}
                className={`px-4 py-1.5 rounded-lg font-outfit text-sm transition-all ${view === 'invitations' ? 'bg-white shadow-sm text-enkarta-dark font-medium' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Invitaciones
              </button>
              <button
                onClick={() => setView('confirmations')}
                className={`px-4 py-1.5 rounded-lg font-outfit text-sm transition-all ${view === 'confirmations' ? 'bg-white shadow-sm text-enkarta-dark font-medium' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Confirmaciones
              </button>
            </div>
            <a
              href="/admin/icons"
              className="hidden md:flex px-3 py-2 text-gray-500 hover:text-enkarta-dark font-outfit text-sm transition-colors items-center gap-1.5"
              title="Librería de íconos"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
              Íconos
            </a>
            <a
              href="/admin/new"
              className="px-4 py-2 rounded-xl font-outfit text-sm font-semibold transition-all duration-300 hover:-translate-y-px flex items-center gap-2"
              style={{ background: 'linear-gradient(90deg, #B8975A, #cda964)', color: '#fff', boxShadow: '0 6px 18px rgba(184,151,90,0.32)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              <span className="hidden sm:inline">Nueva Invitación</span>
              <span className="sm:hidden">Nueva</span>
            </a>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-gray-700 transition-colors"
              title="Cerrar sesión"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {view === 'confirmations' ? (
          <>
            <h2 className="font-playfair text-2xl text-gray-900 mb-6">Confirmaciones</h2>
            <ConfirmationsDashboard invitations={invitations} />
          </>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
              {[
                { label: 'Total invitaciones', value: stats.total, accent: '#B8975A', icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.981l7.5-4.039a2.25 2.25 0 012.134 0l7.5 4.039a2.25 2.25 0 011.183 1.98V19.5z" /></svg>
                )},
                { label: 'Publicadas', value: stats.ready, accent: '#5f8a5f', icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                )},
                { label: 'Borradores', value: stats.draft, accent: '#c2913c', icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                )},
                { label: 'Eventos en 30 días', value: stats.upcoming, accent: '#7a6ab5', icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                )},
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                  className="bg-white rounded-2xl p-4 sm:p-5 border transition-shadow hover:shadow-md"
                  style={{ borderColor: 'rgba(139,125,95,0.12)' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-outfit text-xs text-gray-400">{s.label}</span>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: s.accent, backgroundColor: `${s.accent}14` }}>
                      {s.icon}
                    </div>
                  </div>
                  <p className="font-playfair text-3xl font-bold text-gray-900">{s.value}</p>
                </motion.div>
              ))}
            </div>

            {/* Toolbar: búsqueda + filtros */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
              <div className="relative flex-1 max-w-md">
                <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por cliente, slug o plantilla…"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white font-outfit text-sm outline-none transition-all border focus:ring-2 focus:ring-enkarta-gold/20 focus:border-enkarta-gold"
                  style={{ borderColor: 'rgba(139,125,95,0.18)' }}
                />
              </div>
              <div className="flex items-center rounded-xl p-1 self-start" style={{ background: 'rgba(139,125,95,0.08)' }}>
                {([['all', 'Todas'], ['ready', 'Publicadas'], ['draft', 'Borradores']] as [StatusFilter, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setStatusFilter(key)}
                    className={`px-3.5 py-1.5 rounded-lg font-outfit text-xs transition-all ${statusFilter === key ? 'bg-white shadow-sm text-enkarta-dark font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <span className="font-outfit text-xs text-gray-400 sm:ml-auto">{filtered.length} de {invitations.length}</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-enkarta-gold border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : invitations.length === 0 ? (
              <div className="bg-white rounded-2xl border p-14 text-center" style={{ borderColor: 'rgba(139,125,95,0.14)' }}>
                <div className="w-16 h-16 bg-enkarta-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-enkarta-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" /></svg>
                </div>
                <h3 className="font-playfair text-lg text-gray-900 mb-1">No hay invitaciones</h3>
                <p className="text-gray-500 text-sm font-outfit mb-5">Crea tu primera invitación digital</p>
                <a
                  href="/admin/new"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-outfit text-sm font-semibold transition-all hover:-translate-y-px"
                  style={{ background: 'linear-gradient(90deg, #B8975A, #cda964)', color: '#fff', boxShadow: '0 6px 18px rgba(184,151,90,0.3)' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Nueva Invitación
                </a>
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border p-14 text-center" style={{ borderColor: 'rgba(139,125,95,0.14)' }}>
                <p className="font-outfit text-sm text-gray-500">No hay resultados para tu búsqueda.</p>
                <button onClick={() => { setSearch(''); setStatusFilter('all'); }} className="mt-3 font-outfit text-sm text-enkarta-gold hover:underline">
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: 'rgba(139,125,95,0.14)' }}>
                <div className="overflow-x-auto">
                  <table className="w-full admin-table">
                    <thead className="border-b" style={{ backgroundColor: '#faf9f6', borderColor: 'rgba(139,125,95,0.12)' }}>
                      <tr>
                        <th>Cliente</th>
                        <th>Plantilla</th>
                        <th>Estado</th>
                        <th>Fecha evento</th>
                        <th className="text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtered.map((inv) => (
                        <tr key={inv.id} className="hover:bg-[#faf9f5] transition-colors group">
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-playfair font-bold text-sm text-white"
                                style={{ backgroundColor: TEMPLATE_COLORS[inv.template] || '#B8975A' }}>
                                {(inv.names || '?').charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-outfit font-medium text-gray-900 truncate">{inv.names || '—'}</p>
                                <p className="font-mono text-[11px] text-gray-400 truncate">/{inv.slug}</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-outfit font-medium capitalize"
                              style={{ backgroundColor: `${TEMPLATE_COLORS[inv.template] || '#B8975A'}12`, color: TEMPLATE_COLORS[inv.template] || '#B8975A' }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: TEMPLATE_COLORS[inv.template] || '#B8975A' }} />
                              {inv.template}
                            </span>
                          </td>
                          <td>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-outfit font-medium ${
                              inv.status === 'ready'
                                ? 'bg-green-50 text-green-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${inv.status === 'ready' ? 'bg-green-500' : 'bg-amber-400'}`} />
                              {inv.status === 'ready' ? 'Publicada' : 'Borrador'}
                            </span>
                          </td>
                          <td className="text-gray-600 font-outfit text-sm">
                            {inv.event_date ? new Date(inv.event_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                          </td>
                          <td>
                            <div className="flex items-center justify-end gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                              {BUILDER_TEMPLATES.includes(inv.template) && (
                                <a
                                  href={`/admin/builder/${inv.id}`}
                                  className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                                  title="Editor Visual"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
                                </a>
                              )}
                              <a
                                href={`/admin/edit/${inv.id}`}
                                className="p-2 text-gray-400 hover:text-enkarta-gold hover:bg-enkarta-gold/5 rounded-lg transition-all"
                                title="Editar formulario"
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
                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                title="Copiar link"
                              >
                                {copied === inv.slug ? (
                                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
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
          </>
        )}
      </main>
    </div>
  );
}
