'use client';

import { useState } from 'react';
import { InvitationParsed } from '@/lib/types';
import Countdown from '../Countdown';

export default function Sobre({ invitation }: { invitation: InvitationParsed }) {
  const [entered, setEntered] = useState(false);
  const inv = invitation;
  const primary = inv.color_primary || '#c9a96e';
  const secondary = inv.color_secondary || '#f8f4ef';
  const accent = inv.color_accent || '#1a2332';
  const dateObj = inv.event_date ? new Date(inv.event_date + 'T00:00:00') : null;
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mapsLink = (a: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;

  return (
    <div className="min-h-screen font-dmserif" style={{ backgroundColor: accent }}>
      {!entered && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center cursor-pointer" style={{ backgroundColor: accent }} onClick={() => setEntered(true)}>
          <div className="relative">
            {/* Envelope shape */}
            <div className="w-72 h-48 relative" style={{ backgroundColor: `${primary}20` }}>
              <div className="absolute inset-0 border-2" style={{ borderColor: primary }}></div>
              <div className="absolute top-0 left-0 right-0 h-0 border-l-[144px] border-r-[144px] border-t-[100px]"
                style={{ borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: accent }}></div>
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <p className="text-xs uppercase tracking-[0.4em]" style={{ color: primary }}>Dale click</p>
                <p className="text-xs uppercase tracking-[0.4em]" style={{ color: primary }}>para ingresar</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {entered && (
        <div className="max-w-lg mx-auto" style={{ color: secondary }}>
          <div className="invitation-section text-center py-16 px-6">
            <p className="text-xs uppercase tracking-[0.4em] mb-6" style={{ color: primary }}>Guarda la fecha</p>
            {dateObj && (
              <div className="flex items-center justify-center gap-3 mb-8">
                <span className="text-6xl font-bold" style={{ color: primary }}>{dateObj.getDate()}</span>
                <div>
                  <span className="block text-xl uppercase tracking-wider">{months[dateObj.getMonth()]}</span>
                  <span className="block text-lg">{dateObj.getFullYear()}</span>
                </div>
              </div>
            )}
            <p className="text-xs uppercase tracking-[0.4em] mb-4" style={{ color: primary }}>Celebremos juntos</p>
            <p className="text-2xl uppercase tracking-widest mb-6">¡Nos casamos!</p>
            {inv.names && (
              <h2 className="font-great text-5xl" style={{ color: primary }}>
                {inv.names.split(/[&y]/i).map((n, i, a) => (
                  <span key={i}>{n.trim()}{i < a.length - 1 && <> <span className="text-3xl">y</span> </>}</span>
                ))}
              </h2>
            )}
          </div>

          {inv.event_date && (
            <div className="invitation-section py-8 px-6 text-center">
              <p className="text-xs uppercase tracking-[0.3em] mb-4" style={{ color: primary }}>Faltan</p>
              <Countdown targetDate={inv.event_date} textColor={secondary} bgColor={`${primary}20`} accentColor={primary} />
            </div>
          )}

          {inv.guest_name && (
            <div className="invitation-section py-10 px-6 text-center" style={{ backgroundColor: `${primary}15` }}>
              <p className="text-xs uppercase tracking-[0.3em] mb-2">Hemos reservado un lugar para ti</p>
              <h3 className="font-great text-4xl my-3" style={{ color: primary }}>{inv.guest_name}</h3>
              <p className="text-4xl font-bold" style={{ color: primary }}>{inv.guest_passes}</p>
              <p className="text-xs uppercase tracking-widest">Pase(s)</p>
            </div>
          )}

          {inv.cover_image_url && (
            <div className="invitation-section mx-6 rounded-xl overflow-hidden">
              <img src={inv.cover_image_url} alt="" className="w-full h-[50vh] object-cover" />
            </div>
          )}

          <div className="invitation-section py-10 px-6 space-y-6">
            {inv.ceremony_place && (
              <div className="text-center p-6 border rounded-xl" style={{ borderColor: `${primary}40` }}>
                <p className="text-xs uppercase tracking-[0.3em] mb-2" style={{ color: primary }}>Ceremonia</p>
                <p className="text-xl font-medium">{inv.ceremony_place}</p>
                {inv.ceremony_time && <p className="text-sm mt-1" style={{ color: `${secondary}80` }}>{inv.ceremony_time}</p>}
                {inv.ceremony_address && (
                  <a href={inv.ceremony_address.startsWith('http') ? inv.ceremony_address : mapsLink(inv.ceremony_address)} target="_blank"
                    className="inline-block mt-3 px-5 py-2 text-xs uppercase tracking-wider rounded" style={{ backgroundColor: primary, color: accent }}>Ver Ubicación</a>
                )}
              </div>
            )}
            {inv.reception_place && (
              <div className="text-center p-6 border rounded-xl" style={{ borderColor: `${primary}40` }}>
                <p className="text-xs uppercase tracking-[0.3em] mb-2" style={{ color: primary }}>Recepción</p>
                <p className="text-xl font-medium">{inv.reception_place}</p>
                {inv.reception_time && <p className="text-sm mt-1" style={{ color: `${secondary}80` }}>{inv.reception_time}</p>}
                {inv.reception_address && (
                  <a href={inv.reception_address.startsWith('http') ? inv.reception_address : mapsLink(inv.reception_address)} target="_blank"
                    className="inline-block mt-3 px-5 py-2 text-xs uppercase tracking-wider rounded" style={{ backgroundColor: primary, color: accent }}>Ver Ubicación</a>
                )}
              </div>
            )}
          </div>

          {(inv.parents_groom.length > 0 || inv.parents_bride.length > 0) && (
            <div className="invitation-section py-10 px-6 text-center">
              <h3 className="text-xs uppercase tracking-[0.3em] mb-6" style={{ color: primary }}>Nuestros Padres</h3>
              <div className="grid grid-cols-2 gap-6">
                {inv.parents_bride.length > 0 && (
                  <div>
                    <h4 className="text-xs uppercase tracking-wider font-outfit mb-2" style={{ color: primary }}>Padres de la Novia</h4>
                    {inv.parents_bride.map((p, i) => <p key={i} className="text-sm" style={{ color: `${secondary}80` }}>{p}</p>)}
                  </div>
                )}
                {inv.parents_groom.length > 0 && (
                  <div>
                    <h4 className="text-xs uppercase tracking-wider font-outfit mb-2" style={{ color: primary }}>Padres del Novio</h4>
                    {inv.parents_groom.map((p, i) => <p key={i} className="text-sm" style={{ color: `${secondary}80` }}>{p}</p>)}
                  </div>
                )}
              </div>
              {inv.sponsors.length > 0 && (
                <div className="mt-6">
                  {inv.sponsors.map((s, i) => (
                    <div key={i} className="mb-3">
                      <h4 className="text-xs uppercase tracking-wider" style={{ color: primary }}>{s.role}</h4>
                      <p className="text-sm" style={{ color: `${secondary}80` }}>{s.names}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {inv.itinerary.length > 0 && (
            <div className="invitation-section py-10 px-6 text-center">
              <h3 className="text-xs uppercase tracking-[0.3em] mb-6" style={{ color: primary }}>Itinerario</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {inv.itinerary.map((item, i) => (
                  <div key={i} className="p-3 border rounded-lg" style={{ borderColor: `${primary}30` }}>
                    <p className="text-xs uppercase tracking-wider" style={{ color: `${secondary}60` }}>{item.label}</p>
                    <p className="text-xl font-bold mt-1" style={{ color: primary }}>{item.time}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {inv.dress_code && (
            <div className="invitation-section py-8 px-6 text-center" style={{ backgroundColor: `${primary}15` }}>
              <h4 className="text-xs uppercase tracking-[0.3em] mb-2" style={{ color: primary }}>Dress Code</h4>
              <p className="text-xl uppercase tracking-wider">{inv.dress_code}</p>
            </div>
          )}

          {(inv.gift_message || inv.bank_account) && (
            <div className="invitation-section py-10 px-6 text-center">
              <h3 className="text-xs uppercase tracking-[0.3em] mb-3" style={{ color: primary }}>Sugerencia de Regalos</h3>
              {inv.gift_message && <p className="text-sm mb-3" style={{ color: `${secondary}70` }}>{inv.gift_message}</p>}
              {inv.bank_account && <p className="font-mono text-sm p-3 rounded inline-block" style={{ backgroundColor: `${primary}15`, color: primary }}>{inv.bank_account}</p>}
            </div>
          )}

          {inv.no_kids && (
            <div className="invitation-section py-6 px-6 text-center">
              <p className="text-sm max-w-xs mx-auto" style={{ color: `${secondary}60` }}>Aunque amamos a sus pequeños, este día especial es solo para adultos.</p>
            </div>
          )}

          {inv.gallery_url && (
            <div className="invitation-section py-8 px-6 text-center">
              <h3 className="text-xs uppercase tracking-[0.3em] mb-3" style={{ color: primary }}>Comparte tus Fotos</h3>
              <a href={inv.gallery_url} target="_blank" className="inline-block px-6 py-2.5 text-xs uppercase tracking-wider rounded" style={{ backgroundColor: primary, color: accent }}>Compartir Fotos</a>
            </div>
          )}

          <div className="invitation-section py-16 px-6 text-center">
            <p className="text-xs uppercase tracking-[0.3em] mb-3" style={{ color: primary }}>Confirma tu asistencia</p>
            <p className="text-sm mb-6" style={{ color: `${secondary}70` }}>Será de mucha alegría para nosotros contar con su compañía.</p>
            {inv.names && <h3 className="font-great text-4xl" style={{ color: primary }}>{inv.names}</h3>}
          </div>
        </div>
      )}
    </div>
  );
}
