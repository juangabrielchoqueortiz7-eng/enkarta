'use client';

import { useState } from 'react';
import Image from 'next/image';
import { InvitationParsed } from '@/lib/types';
import Countdown from '../Countdown';

export default function Gerbera({ invitation }: { invitation: InvitationParsed }) {
  const [entered, setEntered] = useState(false);
  const inv = invitation;
  const primary = inv.color_primary || '#d4758c';
  const secondary = inv.color_secondary || '#fff8f0';
  const accent = inv.color_accent || '#d16b5a';
  const dateObj = inv.event_date ? new Date(inv.event_date + 'T00:00:00') : null;
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const days = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const mapsLink = (a: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;

  return (
    <div className="min-h-screen font-nunito" style={{ backgroundColor: secondary }}>
      {!entered && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{
          background: `linear-gradient(135deg, ${secondary} 0%, #fce4ec 50%, #ffe0b2 100%)`
        }}>
          <p className="text-xs uppercase tracking-[0.4em] font-medium mb-4" style={{ color: accent }}>Nuestra boda</p>
          {inv.cover_image_url && (
            <div className="relative w-48 h-48 rounded-full overflow-hidden mb-6 border-4 shadow-xl" style={{ borderColor: primary }}>
              <Image src={inv.cover_image_url} alt="" fill className="object-cover" sizes="192px" />
            </div>
          )}
          <button onClick={() => setEntered(true)}
            className="px-8 py-3 rounded-full text-white text-sm font-medium tracking-widest uppercase transition-all hover:opacity-90 shadow-lg"
            style={{ backgroundColor: primary }}>
            Ingresar
          </button>
        </div>
      )}

      {entered && (
        <div className="max-w-lg mx-auto">
          <div className="invitation-section text-center py-16 px-6" style={{
            background: `linear-gradient(180deg, ${secondary} 0%, #fce4ec30 100%)`
          }}>
            <p className="text-xs uppercase tracking-[0.3em] mb-6 font-medium" style={{ color: accent }}>¡Nos Casamos!</p>
            {dateObj && (
              <div className="mb-6">
                <p className="text-sm font-medium" style={{ color: primary }}>{days[dateObj.getDay()]}</p>
                <p className="text-7xl font-bold my-2" style={{ color: accent }}>{dateObj.getDate()}</p>
                <p className="text-lg" style={{ color: primary }}>{months[dateObj.getMonth()]}</p>
              </div>
            )}
            {inv.message && <p className="text-sm leading-relaxed max-w-sm mx-auto italic" style={{ color: `${accent}90` }}>{inv.message}</p>}
          </div>

          {inv.event_date && (
            <div className="invitation-section py-8 px-6 text-center">
              <p className="text-xs uppercase tracking-[0.3em] mb-4 font-medium" style={{ color: primary }}>Faltan</p>
              <Countdown targetDate={inv.event_date} textColor={accent} bgColor="#fff" accentColor={primary} />
            </div>
          )}

          {inv.cover_image_url && (
            <div className="invitation-section mx-6 rounded-3xl overflow-hidden shadow-xl relative h-[50vh]">
              <Image src={inv.cover_image_url} alt="" fill className="object-cover" sizes="(max-width: 640px) 100vw, 512px" />
            </div>
          )}

          {inv.guest_name && (
            <div className="invitation-section py-10 px-6 text-center">
              <p className="text-xs uppercase tracking-widest mb-2 font-medium" style={{ color: primary }}>Querido(a)</p>
              <h3 className="font-great text-4xl mb-2" style={{ color: accent }}>{inv.guest_name}</h3>
              <p className="text-xs uppercase tracking-widest font-medium" style={{ color: primary }}>Hemos Reservado</p>
              <p className="text-4xl font-bold my-1" style={{ color: accent }}>{inv.guest_passes}</p>
              <p className="text-xs uppercase tracking-widest font-medium" style={{ color: primary }}>Pase(s) en tu honor</p>
            </div>
          )}

          <div className="invitation-section py-8 px-6 space-y-6">
            {inv.ceremony_place && (
              <div className="text-center p-6 rounded-3xl" style={{ backgroundColor: `${primary}12` }}>
                <p className="text-xs uppercase tracking-wider font-medium mb-1" style={{ color: accent }}>Ceremonia Religiosa</p>
                <p className="text-lg font-bold" style={{ color: accent }}>{inv.ceremony_place}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: primary }}>{inv.ceremony_time}</p>
                {inv.ceremony_address && (
                  <a href={inv.ceremony_address.startsWith('http') ? inv.ceremony_address : mapsLink(inv.ceremony_address)} target="_blank"
                    className="inline-block mt-3 px-5 py-2 rounded-full text-white text-xs font-medium uppercase tracking-wider"
                    style={{ backgroundColor: primary }}>Ver Ubicación</a>
                )}
              </div>
            )}
            {inv.reception_place && (
              <div className="text-center p-6 rounded-3xl" style={{ backgroundColor: `${accent}10` }}>
                <p className="text-xs uppercase tracking-wider font-medium mb-1" style={{ color: primary }}>Recepción Social</p>
                <p className="text-lg font-bold" style={{ color: primary }}>{inv.reception_place}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: accent }}>{inv.reception_time}</p>
                {inv.reception_address && (
                  <a href={inv.reception_address.startsWith('http') ? inv.reception_address : mapsLink(inv.reception_address)} target="_blank"
                    className="inline-block mt-3 px-5 py-2 rounded-full text-white text-xs font-medium uppercase tracking-wider"
                    style={{ backgroundColor: accent }}>Ver Ubicación</a>
                )}
              </div>
            )}
          </div>

          {inv.itinerary.length > 0 && (
            <div className="invitation-section py-10 px-6 text-center">
              <h3 className="text-xs uppercase tracking-[0.3em] font-medium mb-6" style={{ color: accent }}>Time Line</h3>
              <div className="space-y-3">
                {inv.itinerary.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 justify-center">
                    <span className="text-sm font-bold w-14 text-right" style={{ color: accent }}>{item.time}</span>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primary }}></div>
                    <span className="text-sm text-left" style={{ color: `${accent}80` }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {inv.dress_code && (
            <div className="invitation-section py-8 px-6 text-center rounded-3xl mx-6" style={{ backgroundColor: `${primary}15` }}>
              <h4 className="text-xs uppercase tracking-wider font-medium mb-2" style={{ color: accent }}>Código de Vestimenta</h4>
              <p className="text-xl font-bold" style={{ color: primary }}>{inv.dress_code}</p>
            </div>
          )}

          {inv.no_kids && (
            <div className="invitation-section py-6 px-6 text-center">
              <h4 className="text-xs uppercase tracking-wider font-medium mb-2" style={{ color: accent }}>Con Respeto</h4>
              <p className="text-sm max-w-sm mx-auto" style={{ color: `${accent}60` }}>Amamos a los más pequeños, pero en esta ocasión especial el evento es solo para adultos.</p>
            </div>
          )}

          {(inv.gift_message || inv.bank_account) && (
            <div className="invitation-section py-10 px-6 text-center">
              <h3 className="text-xs uppercase tracking-[0.3em] font-medium mb-3" style={{ color: accent }}>Sugerencia de Regalos</h3>
              {inv.gift_message && <p className="text-sm mb-3" style={{ color: `${accent}70` }}>{inv.gift_message}</p>}
              {inv.bank_account && <p className="font-mono text-sm p-3 rounded-xl inline-block" style={{ backgroundColor: `${primary}10`, color: accent }}>{inv.bank_account}</p>}
            </div>
          )}

          {inv.gallery_url && (
            <div className="invitation-section py-8 px-6 text-center">
              <a href={inv.gallery_url} target="_blank" className="inline-block px-6 py-2.5 rounded-full text-white text-xs font-medium uppercase tracking-wider"
                style={{ backgroundColor: primary }}>Compartir Fotos</a>
            </div>
          )}

          <div className="invitation-section py-16 px-6 text-center" style={{
            background: `linear-gradient(180deg, transparent 0%, #fce4ec30 100%)`
          }}>
            <p className="text-sm mb-4" style={{ color: `${accent}70` }}>Gracias de todo corazón por ser parte de este capítulo de nuestra historia.</p>
            {inv.names && <h3 className="font-great text-4xl" style={{ color: primary }}>{inv.names}</h3>}
          </div>
        </div>
      )}
    </div>
  );
}
