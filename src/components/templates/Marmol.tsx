'use client';

import { useState } from 'react';
import Image from 'next/image';
import { InvitationParsed } from '@/lib/types';
import Countdown from '../Countdown';

export default function Marmol({ invitation }: { invitation: InvitationParsed }) {
  const [entered, setEntered] = useState(false);
  const inv = invitation;
  const primary = inv.color_primary || '#c9a96e';
  const secondary = inv.color_secondary || '#f5f2ef';
  const accent = inv.color_accent || '#2d2d2d';
  const dateObj = inv.event_date ? new Date(inv.event_date + 'T00:00:00') : null;
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mapsLink = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <div className="min-h-screen font-cormorant" style={{ backgroundColor: secondary }}>
      {/* Cover */}
      {!entered && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{
          backgroundColor: secondary,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23${accent.slice(1)}' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}>
          <p className="text-xs uppercase tracking-[0.4em] font-outfit mb-4" style={{ color: `${accent}80` }}>Nuestra Boda</p>
          {inv.names && (
            <h1 className="font-great text-5xl text-center leading-tight mb-8" style={{ color: primary }}>
              {inv.names.split(/[&y]/i).map((name, i, arr) => (
                <span key={i}>
                  {name.trim()}
                  {i < arr.length - 1 && <><br /><span className="text-3xl" style={{ color: accent }}>{'&'}</span><br /></>}
                </span>
              ))}
            </h1>
          )}
          <button
            onClick={() => setEntered(true)}
            className="px-8 py-3 border-2 text-sm font-outfit font-medium tracking-widest uppercase transition-all hover:text-white"
            style={{ borderColor: primary, color: primary }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = primary; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = primary; }}
          >
            Ingresar
          </button>
        </div>
      )}

      {entered && (
        <div className="max-w-lg mx-auto">
          {inv.cover_image_url && (
            <div className="invitation-section relative h-[60vh]">
              <Image src={inv.cover_image_url} alt="Foto" fill className="object-cover" sizes="(max-width: 640px) 100vw, 512px" />
            </div>
          )}

          <div className="invitation-section text-center py-12 px-6">
            {inv.names && (
              <h2 className="font-great text-5xl mb-4" style={{ color: primary }}>
                {inv.names.split(/[&y]/i).map((name, i, arr) => (
                  <span key={i}>{name.trim()}{i < arr.length - 1 && <> <span style={{ color: accent }}>{'&'}</span> </>}</span>
                ))}
              </h2>
            )}
            {inv.message && <p className="text-base italic max-w-sm mx-auto mb-6" style={{ color: `${accent}90` }}>&ldquo;{inv.message}&rdquo;</p>}
            {dateObj && (
              <div className="flex items-center justify-center gap-3 text-sm uppercase tracking-widest font-outfit" style={{ color: accent }}>
                <span>{['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][dateObj.getDay()]}</span>
                <span className="text-3xl font-bold" style={{ color: primary }}>{dateObj.getDate()}</span>
                <span>{months[dateObj.getMonth()]} {dateObj.getFullYear()}</span>
              </div>
            )}
            {inv.ceremony_time && <p className="mt-2 text-sm font-outfit" style={{ color: accent }}>{inv.ceremony_time} hrs.</p>}
          </div>

          {inv.event_date && (
            <div className="invitation-section py-8 px-6 text-center">
              <p className="text-xs uppercase tracking-[0.3em] font-outfit mb-4" style={{ color: `${accent}60` }}>Faltan</p>
              <Countdown targetDate={inv.event_date} textColor={accent} bgColor="#ffffff" accentColor={primary} />
            </div>
          )}

          {inv.guest_name && (
            <div className="invitation-section py-10 px-6 text-center" style={{ backgroundColor: `${primary}15` }}>
              <p className="text-xs uppercase tracking-[0.3em] font-outfit mb-2" style={{ color: accent }}>Querido(a)</p>
              <h3 className="font-great text-4xl mb-3" style={{ color: primary }}>{inv.guest_name}</h3>
              <p className="uppercase tracking-widest text-xs font-outfit" style={{ color: accent }}>Hemos Reservado</p>
              <p className="text-4xl font-bold my-1" style={{ color: primary }}>{inv.guest_passes}</p>
              <p className="uppercase tracking-widest text-xs font-outfit" style={{ color: accent }}>Pase(s) en tu honor</p>
            </div>
          )}

          {(inv.parents_groom.length > 0 || inv.parents_bride.length > 0) && (
            <div className="invitation-section py-12 px-6 text-center">
              <h3 className="text-sm uppercase tracking-[0.3em] font-outfit mb-8" style={{ color: primary }}>Agradecidos a nuestros padres</h3>
              <div className="grid grid-cols-2 gap-8">
                {inv.parents_bride.length > 0 && (
                  <div>
                    <h4 className="text-xs uppercase tracking-wider font-outfit font-bold mb-2" style={{ color: accent }}>Padres de la Novia</h4>
                    {inv.parents_bride.map((p, i) => <p key={i} className="text-sm font-outfit" style={{ color: `${accent}80` }}>{p}</p>)}
                  </div>
                )}
                {inv.parents_groom.length > 0 && (
                  <div>
                    <h4 className="text-xs uppercase tracking-wider font-outfit font-bold mb-2" style={{ color: accent }}>Padres del Novio</h4>
                    {inv.parents_groom.map((p, i) => <p key={i} className="text-sm font-outfit" style={{ color: `${accent}80` }}>{p}</p>)}
                  </div>
                )}
              </div>
              {inv.sponsors.length > 0 && (
                <div className="mt-8 space-y-3">
                  {inv.sponsors.map((s, i) => (
                    <div key={i}>
                      <h4 className="text-xs uppercase tracking-wider font-outfit font-bold" style={{ color: accent }}>{s.role}</h4>
                      <p className="text-sm font-outfit" style={{ color: `${accent}80` }}>{s.names}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="invitation-section py-10 px-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {inv.ceremony_place && (
              <div className="text-center p-6 border rounded-xl" style={{ borderColor: `${primary}30` }}>
                <p className="text-xs uppercase tracking-wider font-outfit mb-1" style={{ color: `${accent}60` }}>Ceremonia Religiosa</p>
                <p className="text-lg font-medium" style={{ color: accent }}>{inv.ceremony_place}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: primary }}>{inv.ceremony_time}</p>
                {inv.ceremony_address && (
                  <a href={inv.ceremony_address.startsWith('http') ? inv.ceremony_address : mapsLink(inv.ceremony_address)} target="_blank" rel="noopener noreferrer"
                    className="inline-block mt-3 px-4 py-1.5 border rounded text-xs font-outfit uppercase tracking-wider transition-all hover:text-white"
                    style={{ borderColor: primary, color: primary }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = primary; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = primary; }}
                  >Ver Ubicación</a>
                )}
              </div>
            )}
            {inv.reception_place && (
              <div className="text-center p-6 border rounded-xl" style={{ borderColor: `${primary}30` }}>
                <p className="text-xs uppercase tracking-wider font-outfit mb-1" style={{ color: `${accent}60` }}>Recepción Social</p>
                <p className="text-lg font-medium" style={{ color: accent }}>{inv.reception_place}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: primary }}>{inv.reception_time}</p>
                {inv.reception_address && (
                  <a href={inv.reception_address.startsWith('http') ? inv.reception_address : mapsLink(inv.reception_address)} target="_blank" rel="noopener noreferrer"
                    className="inline-block mt-3 px-4 py-1.5 border rounded text-xs font-outfit uppercase tracking-wider transition-all hover:text-white"
                    style={{ borderColor: primary, color: primary }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = primary; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = primary; }}
                  >Ver Ubicación</a>
                )}
              </div>
            )}
          </div>

          {inv.itinerary.length > 0 && (
            <div className="invitation-section py-12 px-6 text-center">
              <h3 className="text-sm uppercase tracking-[0.3em] font-outfit mb-8" style={{ color: primary }}>Cronograma</h3>
              <div className="space-y-4">
                {inv.itinerary.map((item, i) => (
                  <div key={i} className="flex items-center gap-4 justify-center">
                    <span className="text-xl font-bold font-outfit w-16 text-right" style={{ color: primary }}>{item.time}</span>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primary }}></div>
                    <span className="text-sm font-outfit w-32 text-left" style={{ color: accent }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {inv.dress_code && (
            <div className="invitation-section py-10 px-6 text-center" style={{ backgroundColor: `${primary}10` }}>
              <h3 className="text-sm uppercase tracking-[0.3em] font-outfit mb-2" style={{ color: accent }}>Código de Vestimenta</h3>
              <p className="text-xl font-bold" style={{ color: primary }}>{inv.dress_code}</p>
            </div>
          )}

          {inv.gallery_url && (
            <div className="invitation-section py-10 px-6 text-center">
              <h3 className="text-sm uppercase tracking-[0.3em] font-outfit mb-3" style={{ color: accent }}>Comparte tus Fotos</h3>
              <p className="text-sm font-outfit mb-4" style={{ color: `${accent}70` }}>Te invitamos a compartir los momentos más especiales de nuestro evento.</p>
              <a href={inv.gallery_url} target="_blank" rel="noopener noreferrer"
                className="inline-block px-6 py-2.5 text-white text-xs font-outfit uppercase tracking-wider rounded"
                style={{ backgroundColor: primary }}>Compartir Fotos</a>
            </div>
          )}

          {(inv.gift_message || inv.bank_account) && (
            <div className="invitation-section py-10 px-6 text-center">
              <h3 className="text-sm uppercase tracking-[0.3em] font-outfit mb-3" style={{ color: accent }}>Sugerencia de Regalos</h3>
              {inv.gift_message && <p className="text-sm font-outfit mb-3" style={{ color: `${accent}70` }}>{inv.gift_message}</p>}
              {inv.bank_account && (
                <div className="p-3 rounded-lg inline-block" style={{ backgroundColor: `${primary}10` }}>
                  <p className="font-mono text-sm" style={{ color: accent }}>{inv.bank_account}</p>
                </div>
              )}
            </div>
          )}

          {inv.no_kids && (
            <div className="invitation-section py-8 px-6 text-center" style={{ backgroundColor: `${accent}08` }}>
              <p className="text-sm font-outfit max-w-sm mx-auto" style={{ color: `${accent}70` }}>
                Aunque amamos a sus pequeños, este día especial es solo para adultos, les pedimos que nos acompañen sin niños.
              </p>
            </div>
          )}

          <div className="invitation-section py-16 px-6 text-center">
            <p className="text-xs uppercase tracking-[0.3em] font-outfit mb-4" style={{ color: `${accent}60` }}>¡Te esperamos!</p>
            {inv.names && <h3 className="font-great text-4xl" style={{ color: primary }}>{inv.names}</h3>}
          </div>
        </div>
      )}
    </div>
  );
}
