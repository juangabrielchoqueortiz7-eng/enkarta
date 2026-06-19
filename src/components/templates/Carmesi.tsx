'use client';

import { useState } from 'react';
import Image from 'next/image';
import { InvitationParsed } from '@/lib/types';
import Countdown from '../Countdown';

export default function Carmesi({ invitation }: { invitation: InvitationParsed }) {
  const [entered, setEntered] = useState(false);
  const inv = invitation;
  const primary = inv.color_primary || '#8B0000';
  const secondary = inv.color_secondary || '#1a0a0a';
  const accent = inv.color_accent || '#c9a96e';
  const dateObj = inv.event_date ? new Date(inv.event_date + 'T00:00:00') : null;
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mapsLink = (a: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;

  // Mini calendar for cover
  const renderCalendar = () => {
    if (!dateObj) return null;
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const dayLabels = ['LU','MA','MI','JU','VI','SA','DO'];
    const cells = [];
    for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return (
      <div className="w-64 mx-auto">
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {dayLabels.map(d => <span key={d} className="text-[10px] font-outfit" style={{ color: `${accent}60` }}>{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {cells.map((d, i) => (
            <span key={i} className={`text-xs py-1 rounded-full ${d === dateObj.getDate() ? 'font-bold' : ''}`}
              style={d === dateObj.getDate() ? { backgroundColor: primary, color: '#fff' } : { color: `${accent}80` }}>
              {d || ''}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen font-playfair" style={{ backgroundColor: secondary, color: '#f5e6d3' }}>
      {!entered && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ backgroundColor: secondary }}>
          {inv.names && (
            <h1 className="font-great text-5xl mb-8" style={{ color: accent }}>
              {inv.names.split(/[&y]/i).map((n, i, a) => (
                <span key={i}>{n.trim()}{i < a.length - 1 && <> <span className="text-3xl" style={{ color: primary }}>y</span> </>}</span>
              ))}
            </h1>
          )}
          <button onClick={() => setEntered(true)}
            className="px-8 py-3 border text-sm font-outfit uppercase tracking-widest transition-all hover:text-white"
            style={{ borderColor: primary, color: primary }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = primary; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = primary; }}>
            Ingresar
          </button>
        </div>
      )}

      {entered && (
        <div className="max-w-lg mx-auto">
          <div className="invitation-section text-center py-16 px-6">
            {inv.names && (
              <h2 className="font-great text-5xl mb-6" style={{ color: accent }}>
                {inv.names.split(/[&y]/i).map((n, i, a) => (
                  <span key={i}>{n.trim()}{i < a.length - 1 && <> <span className="text-3xl" style={{ color: primary }}>y</span> </>}</span>
                ))}
              </h2>
            )}
            <p className="text-2xl uppercase tracking-[0.3em] mb-8" style={{ color: primary }}>¡Nos casamos!</p>
            {dateObj && (
              <div className="mb-6">
                <p className="text-sm uppercase tracking-widest font-outfit" style={{ color: accent }}>{months[dateObj.getMonth()]}</p>
                <p className="text-sm font-outfit" style={{ color: `${accent}60` }}>{dateObj.getFullYear()}</p>
                <div className="mt-4">{renderCalendar()}</div>
              </div>
            )}
          </div>

          {inv.event_date && (
            <div className="invitation-section py-8 px-6 text-center">
              <p className="text-xs uppercase tracking-[0.3em] font-outfit mb-4" style={{ color: primary }}>Faltan...</p>
              <Countdown targetDate={inv.event_date} textColor="#f5e6d3" bgColor={`${primary}30`} accentColor={accent} />
            </div>
          )}

          {inv.message && (
            <div className="invitation-section py-8 px-6 text-center">
              <p className="text-sm leading-relaxed max-w-sm mx-auto" style={{ color: `#f5e6d390` }}>{inv.message}</p>
            </div>
          )}

          {inv.cover_image_url && (
            <div className="invitation-section mx-6 rounded-xl overflow-hidden relative h-[50vh]">
              <Image src={inv.cover_image_url} alt="" fill className="object-cover" sizes="(max-width: 640px) 100vw, 512px" />
            </div>
          )}

          {inv.guest_name && (
            <div className="invitation-section py-10 px-6 text-center" style={{ backgroundColor: `${primary}20` }}>
              <p className="text-xs uppercase tracking-[0.3em] font-outfit mb-2">Hemos reservado</p>
              <h3 className="font-great text-4xl mb-2" style={{ color: accent }}>{inv.guest_name}</h3>
              <p className="text-4xl font-bold" style={{ color: primary }}>{inv.guest_passes}</p>
              <p className="text-xs uppercase tracking-widest font-outfit">Pase(s) en su honor</p>
            </div>
          )}

          {(inv.parents_groom.length > 0 || inv.parents_bride.length > 0) && (
            <div className="invitation-section py-10 px-6 text-center">
              <h3 className="text-xs uppercase tracking-[0.3em] font-outfit mb-6" style={{ color: accent }}>Con la bendición de Dios y de nuestros padres</h3>
              <div className="grid grid-cols-2 gap-6">
                {inv.parents_bride.length > 0 && (
                  <div>
                    <h4 className="text-xs uppercase tracking-wider font-outfit mb-2" style={{ color: primary }}>Padres de la Novia</h4>
                    {inv.parents_bride.map((p, i) => <p key={i} className="text-sm font-outfit" style={{ color: '#f5e6d380' }}>{p}</p>)}
                  </div>
                )}
                {inv.parents_groom.length > 0 && (
                  <div>
                    <h4 className="text-xs uppercase tracking-wider font-outfit mb-2" style={{ color: primary }}>Padres del Novio</h4>
                    {inv.parents_groom.map((p, i) => <p key={i} className="text-sm font-outfit" style={{ color: '#f5e6d380' }}>{p}</p>)}
                  </div>
                )}
              </div>
              {inv.sponsors.length > 0 && (
                <div className="mt-6">{inv.sponsors.map((s, i) => (
                  <div key={i} className="mb-3">
                    <h4 className="text-xs uppercase tracking-wider font-outfit" style={{ color: primary }}>{s.role}</h4>
                    <p className="text-sm font-outfit" style={{ color: '#f5e6d380' }}>{s.names}</p>
                  </div>
                ))}</div>
              )}
            </div>
          )}

          <div className="invitation-section py-8 px-6 space-y-6">
            {inv.ceremony_place && (
              <div className="text-center p-6 border rounded-xl" style={{ borderColor: `${primary}40` }}>
                <p className="text-xs uppercase tracking-[0.3em] font-outfit mb-1" style={{ color: primary }}>Ceremonia Religiosa</p>
                <p className="text-2xl font-bold" style={{ color: accent }}>{inv.ceremony_time}</p>
                <p className="text-sm uppercase tracking-wider font-outfit">{inv.ceremony_place}</p>
                {inv.ceremony_address && (
                  <a href={inv.ceremony_address.startsWith('http') ? inv.ceremony_address : mapsLink(inv.ceremony_address)} target="_blank"
                    className="inline-block mt-3 px-5 py-2 text-xs uppercase tracking-wider rounded font-outfit"
                    style={{ backgroundColor: primary, color: '#fff' }}>Cómo Llegar</a>
                )}
              </div>
            )}
            {inv.reception_place && (
              <div className="text-center p-6 border rounded-xl" style={{ borderColor: `${primary}40` }}>
                <p className="text-xs uppercase tracking-[0.3em] font-outfit mb-1" style={{ color: primary }}>Recepción Social</p>
                <p className="text-2xl font-bold" style={{ color: accent }}>{inv.reception_time}</p>
                <p className="text-sm uppercase tracking-wider font-outfit">{inv.reception_place}</p>
                {inv.reception_address && (
                  <a href={inv.reception_address.startsWith('http') ? inv.reception_address : mapsLink(inv.reception_address)} target="_blank"
                    className="inline-block mt-3 px-5 py-2 text-xs uppercase tracking-wider rounded font-outfit"
                    style={{ backgroundColor: primary, color: '#fff' }}>Cómo Llegar</a>
                )}
              </div>
            )}
          </div>

          {inv.itinerary.length > 0 && (
            <div className="invitation-section py-10 px-6 text-center">
              <h3 className="text-xs uppercase tracking-[0.3em] font-outfit mb-6" style={{ color: accent }}>Itinerario</h3>
              <div className="space-y-3">
                {inv.itinerary.map((item, i) => (
                  <div key={i} className="flex items-center gap-4 justify-center">
                    <span className="text-lg font-bold font-outfit w-14 text-right" style={{ color: primary }}>{item.time}</span>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }}></div>
                    <span className="text-sm font-outfit uppercase tracking-wider text-left w-32">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {inv.dress_code && (
            <div className="invitation-section py-8 px-6 text-center" style={{ backgroundColor: `${primary}15` }}>
              <h4 className="text-xs uppercase tracking-[0.3em] font-outfit mb-2" style={{ color: accent }}>Dress Code</h4>
              <p className="text-xl uppercase tracking-wider font-bold" style={{ color: primary }}>{inv.dress_code}</p>
            </div>
          )}

          {(inv.gift_message || inv.bank_account) && (
            <div className="invitation-section py-10 px-6 text-center">
              <h3 className="text-xs uppercase tracking-[0.3em] font-outfit mb-3" style={{ color: accent }}>Sugerencia de Regalos</h3>
              {inv.gift_message && <p className="text-sm font-outfit mb-3" style={{ color: '#f5e6d370' }}>{inv.gift_message}</p>}
              {inv.bank_account && <p className="font-mono text-sm p-3 rounded inline-block" style={{ backgroundColor: `${primary}20`, color: accent }}>{inv.bank_account}</p>}
            </div>
          )}

          {inv.no_kids && (
            <div className="invitation-section py-6 px-6 text-center">
              <h4 className="text-xs uppercase tracking-wider font-outfit mb-2" style={{ color: accent }}>Con respeto</h4>
              <p className="text-sm font-outfit max-w-xs mx-auto" style={{ color: '#f5e6d360' }}>Aunque amamos a sus pequeños, este día especial es solo para adultos.</p>
            </div>
          )}

          {inv.gallery_url && (
            <div className="invitation-section py-8 px-6 text-center">
              <h3 className="text-xs uppercase tracking-[0.3em] font-outfit mb-3" style={{ color: accent }}>Comparte tus Fotos</h3>
              <a href={inv.gallery_url} target="_blank" className="inline-block px-6 py-2.5 text-xs uppercase tracking-wider rounded font-outfit" style={{ backgroundColor: primary, color: '#fff' }}>Compartir Fotos</a>
            </div>
          )}

          <div className="invitation-section py-16 px-6 text-center">
            <p className="text-xs uppercase tracking-[0.3em] font-outfit mb-2" style={{ color: primary }}>Con mucho cariño</p>
            {inv.names && <h3 className="font-great text-4xl" style={{ color: accent }}>{inv.names}</h3>}
          </div>
        </div>
      )}
    </div>
  );
}
