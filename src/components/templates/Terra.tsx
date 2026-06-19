'use client';

import { useState } from 'react';
import Image from 'next/image';
import { InvitationParsed } from '@/lib/types';
import Countdown from '../Countdown';

export default function Terra({ invitation }: { invitation: InvitationParsed }) {
  const [entered, setEntered] = useState(false);
  const inv = invitation;
  const primary = inv.color_primary || '#8B6F47';
  const secondary = inv.color_secondary || '#faf5f0';
  const accent = inv.color_accent || '#7a8b6f';
  const dateObj = inv.event_date ? new Date(inv.event_date + 'T00:00:00') : null;
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const days = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const mapsLink = (a: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;

  return (
    <div className="min-h-screen font-lora" style={{ backgroundColor: secondary }}>
      {!entered && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ backgroundColor: secondary }}>
          <div className="w-32 h-32 rounded-full border-4 flex items-center justify-center mb-6 cursor-pointer hover:scale-105 transition-transform"
            style={{ borderColor: primary, backgroundColor: `${primary}15` }}
            onClick={() => setEntered(true)}>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest font-outfit" style={{ color: primary }}>Dale clic</p>
              <p className="text-[10px] uppercase tracking-widest font-outfit" style={{ color: primary }}>para ingresar</p>
            </div>
          </div>
          <p className="text-xs uppercase tracking-widest font-outfit" style={{ color: `${primary}80` }}>Atentamente:</p>
          {inv.names && <h1 className="font-great text-4xl mt-2" style={{ color: primary }}>{inv.names}</h1>}
        </div>
      )}

      {entered && (
        <div className="max-w-lg mx-auto">
          <div className="invitation-section text-center py-16 px-6">
            <p className="text-xs uppercase tracking-[0.3em] font-outfit mb-6" style={{ color: accent }}>¡Nos casamos!</p>
            {inv.names && (
              <h2 className="font-great text-5xl mb-6" style={{ color: primary }}>
                {inv.names.split(/[&y]/i).map((n, i, a) => (
                  <span key={i}>{n.trim()}{i < a.length - 1 && <> <span style={{ color: accent }}>y</span> </>}</span>
                ))}
              </h2>
            )}
            {inv.message && <p className="text-sm leading-relaxed max-w-sm mx-auto mb-8" style={{ color: `${primary}90` }}>{inv.message}</p>}
            <p className="text-xs uppercase tracking-widest font-outfit" style={{ color: accent }}>Queremos que nos acompañes en nuestro día</p>
            {dateObj && (
              <div className="mt-6">
                <p className="text-sm uppercase tracking-wider font-outfit" style={{ color: accent }}>{days[dateObj.getDay()]}</p>
                <p className="text-7xl font-bold my-2" style={{ color: primary }}>{dateObj.getDate()}</p>
                <p className="text-lg uppercase tracking-wider font-outfit" style={{ color: accent }}>{months[dateObj.getMonth()]} {dateObj.getFullYear()}</p>
                {inv.ceremony_time && <p className="text-sm font-outfit mt-1" style={{ color: primary }}>{inv.ceremony_time} hrs.</p>}
              </div>
            )}
          </div>

          {inv.event_date && (
            <div className="invitation-section py-8 px-6 text-center">
              <p className="text-xs uppercase tracking-[0.3em] font-outfit mb-4" style={{ color: accent }}>Faltan</p>
              <Countdown targetDate={inv.event_date} textColor={primary} bgColor="#fff" accentColor={accent} />
            </div>
          )}

          {inv.cover_image_url && (
            <div className="invitation-section mx-6 rounded-2xl overflow-hidden relative h-[50vh]">
              <Image src={inv.cover_image_url} alt="Foto" fill className="object-cover" sizes="(max-width: 640px) 100vw, 512px" />
            </div>
          )}

          {inv.guest_name && (
            <div className="invitation-section py-10 px-6 text-center">
              <h3 className="font-great text-4xl mb-2" style={{ color: primary }}>{inv.guest_name}</h3>
              <p className="text-xs uppercase tracking-widest font-outfit" style={{ color: accent }}>Para lo que hemos reservado:</p>
              <p className="text-4xl font-bold my-2" style={{ color: primary }}>{inv.guest_passes}</p>
              <p className="text-xs uppercase tracking-widest font-outfit" style={{ color: accent }}>Pase(s) en tu honor</p>
            </div>
          )}

          {(inv.parents_groom.length > 0 || inv.parents_bride.length > 0) && (
            <div className="invitation-section py-10 px-6 text-center">
              <h3 className="text-xs uppercase tracking-[0.3em] font-outfit mb-6" style={{ color: primary }}>Con la bendición de Dios y de nuestros padres</h3>
              <div className="grid grid-cols-2 gap-6">
                {inv.parents_groom.length > 0 && (
                  <div>
                    <h4 className="font-great text-xl mb-2" style={{ color: primary }}>Padres del Novio</h4>
                    {inv.parents_groom.map((p, i) => <p key={i} className="text-xs font-outfit" style={{ color: accent }}>{p}</p>)}
                  </div>
                )}
                {inv.parents_bride.length > 0 && (
                  <div>
                    <h4 className="font-great text-xl mb-2" style={{ color: primary }}>Padres de la Novia</h4>
                    {inv.parents_bride.map((p, i) => <p key={i} className="text-xs font-outfit" style={{ color: accent }}>{p}</p>)}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="invitation-section py-8 px-6 space-y-6">
            {inv.ceremony_place && (
              <div className="text-center p-6 rounded-2xl" style={{ backgroundColor: `${primary}10` }}>
                <h4 className="text-xs uppercase tracking-wider font-outfit mb-1" style={{ color: accent }}>Ceremonia Religiosa</h4>
                <p className="text-2xl font-bold" style={{ color: primary }}>{inv.ceremony_time}</p>
                <p className="font-medium" style={{ color: primary }}>{inv.ceremony_place}</p>
                {inv.ceremony_address && (
                  <a href={inv.ceremony_address.startsWith('http') ? inv.ceremony_address : mapsLink(inv.ceremony_address)} target="_blank"
                    className="inline-block mt-3 px-5 py-2 rounded-lg text-white text-xs font-outfit uppercase tracking-wider" style={{ backgroundColor: accent }}>Ver Ubicación</a>
                )}
              </div>
            )}
            {inv.reception_place && (
              <div className="text-center p-6 rounded-2xl" style={{ backgroundColor: `${accent}10` }}>
                <h4 className="text-xs uppercase tracking-wider font-outfit mb-1" style={{ color: primary }}>Recepción Social</h4>
                <p className="text-2xl font-bold" style={{ color: accent }}>{inv.reception_time}</p>
                <p className="font-medium" style={{ color: accent }}>{inv.reception_place}</p>
                {inv.reception_address && (
                  <a href={inv.reception_address.startsWith('http') ? inv.reception_address : mapsLink(inv.reception_address)} target="_blank"
                    className="inline-block mt-3 px-5 py-2 rounded-lg text-white text-xs font-outfit uppercase tracking-wider" style={{ backgroundColor: primary }}>Ver Ubicación</a>
                )}
              </div>
            )}
          </div>

          {inv.dress_code && (
            <div className="invitation-section py-8 px-6 text-center" style={{ backgroundColor: `${primary}12` }}>
              <h4 className="text-xs uppercase tracking-wider font-outfit mb-2" style={{ color: accent }}>Dress Code</h4>
              <p className="text-xl font-bold" style={{ color: primary }}>{inv.dress_code}</p>
            </div>
          )}

          {inv.itinerary.length > 0 && (
            <div className="invitation-section py-10 px-6 text-center">
              <h3 className="font-great text-3xl mb-6" style={{ color: primary }}>Itinerario</h3>
              <div className="space-y-3">
                {inv.itinerary.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 justify-center">
                    <span className="text-lg font-bold font-outfit w-14 text-right" style={{ color: primary }}>{item.time}</span>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }}></div>
                    <span className="text-sm font-outfit text-left" style={{ color: accent }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {inv.gallery_url && (
            <div className="invitation-section py-8 px-6 text-center">
              <p className="text-sm font-outfit mb-3" style={{ color: accent }}>Te invitamos a compartir los momentos más especiales de nuestro evento.</p>
              <a href={inv.gallery_url} target="_blank" className="inline-block px-6 py-2.5 rounded-lg text-white text-xs font-outfit uppercase tracking-wider" style={{ backgroundColor: accent }}>Compartir Fotos</a>
            </div>
          )}

          {inv.no_kids && (
            <div className="invitation-section py-6 px-6 text-center">
              <p className="text-sm font-outfit max-w-xs mx-auto" style={{ color: `${primary}80` }}>Aunque amamos a los más pequeños, deseamos que esta celebración sea solo para adultos.</p>
            </div>
          )}

          {(inv.gift_message || inv.bank_account) && (
            <div className="invitation-section py-10 px-6 text-center">
              <h3 className="font-great text-3xl mb-3" style={{ color: primary }}>Sugerencia de Regalos</h3>
              {inv.gift_message && <p className="text-sm font-outfit mb-3" style={{ color: accent }}>{inv.gift_message}</p>}
              {inv.bank_account && (
                <div className="p-3 rounded-lg inline-block" style={{ backgroundColor: `${primary}10` }}>
                  <p className="font-mono text-sm" style={{ color: primary }}>{inv.bank_account}</p>
                </div>
              )}
            </div>
          )}

          <div className="invitation-section py-16 px-6 text-center">
            <p className="text-xs uppercase tracking-widest font-outfit mb-3" style={{ color: accent }}>Con todo nuestro amor</p>
            {inv.names && <h3 className="font-great text-4xl" style={{ color: primary }}>{inv.names}</h3>}
          </div>
        </div>
      )}
    </div>
  );
}
