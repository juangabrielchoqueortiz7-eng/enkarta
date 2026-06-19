'use client';

import { useState } from 'react';
import Image from 'next/image';
import { InvitationParsed } from '@/lib/types';
import Countdown from '../Countdown';

export default function Perla({ invitation }: { invitation: InvitationParsed }) {
  const [entered, setEntered] = useState(false);
  const inv = invitation;

  const primary = inv.color_primary || '#5a6e5a';
  const secondary = inv.color_secondary || '#FAF7F2';
  const accent = inv.color_accent || '#b8975a';

  const dateObj = inv.event_date ? new Date(inv.event_date + 'T00:00:00') : null;
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  // Helpers for Google Maps
  const mapsLink = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <div className="min-h-screen font-cormorant" style={{ backgroundColor: secondary }}>
      {/* Cover Screen */}
      {!entered && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ backgroundColor: secondary }}>
          {/* Decorative leaves - top left */}
          <div className="absolute top-0 left-0 w-48 h-48 opacity-40">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <path d="M10 10 Q 50 80 30 150" stroke={primary} fill="none" strokeWidth="1.5" opacity="0.5"/>
              <ellipse cx="25" cy="40" rx="15" ry="8" fill={primary} opacity="0.3" transform="rotate(-30 25 40)"/>
              <ellipse cx="35" cy="70" rx="12" ry="6" fill={primary} opacity="0.25" transform="rotate(-20 35 70)"/>
              <ellipse cx="20" cy="100" rx="14" ry="7" fill={primary} opacity="0.3" transform="rotate(-40 20 100)"/>
              <ellipse cx="30" cy="130" rx="11" ry="5" fill={primary} opacity="0.2" transform="rotate(-25 30 130)"/>
            </svg>
          </div>
          {/* Decorative leaves - bottom right */}
          <div className="absolute bottom-0 right-0 w-48 h-48 opacity-40 rotate-180">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <path d="M10 10 Q 50 80 30 150" stroke={primary} fill="none" strokeWidth="1.5" opacity="0.5"/>
              <ellipse cx="25" cy="40" rx="15" ry="8" fill={primary} opacity="0.3" transform="rotate(-30 25 40)"/>
              <ellipse cx="35" cy="70" rx="12" ry="6" fill={primary} opacity="0.25" transform="rotate(-20 35 70)"/>
              <ellipse cx="20" cy="100" rx="14" ry="7" fill={primary} opacity="0.3" transform="rotate(-40 20 100)"/>
            </svg>
          </div>
          {/* Gold circles */}
          <div className="relative">
            <div className="w-64 h-72 relative flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 260 290">
                <ellipse cx="130" cy="145" rx="110" ry="130" fill="none" stroke={accent} strokeWidth="1" opacity="0.5"/>
                <ellipse cx="130" cy="145" rx="105" ry="125" fill="none" stroke={accent} strokeWidth="0.5" opacity="0.3"/>
              </svg>
              <div className="text-center z-10">
                {inv.names && (
                  <h1 className="font-great text-5xl leading-tight" style={{ color: primary }}>
                    {inv.names.split(/[&y]/i).map((name, i, arr) => (
                      <span key={i}>
                        {name.trim()}
                        {i < arr.length - 1 && <><br /><span className="text-3xl" style={{ color: accent }}>y</span><br /></>}
                      </span>
                    ))}
                  </h1>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setEntered(true)}
            className="mt-6 px-8 py-3 rounded-lg text-white text-sm font-outfit font-medium tracking-widest uppercase transition-all hover:opacity-90 shadow-lg"
            style={{ backgroundColor: primary }}
          >
            Ingresar
          </button>
        </div>
      )}

      {/* Main Content */}
      {entered && (
        <div className="max-w-lg mx-auto">
          {/* Cover Image */}
          {inv.cover_image_url && (
            <div className="invitation-section relative h-[70vh]">
              <Image src={inv.cover_image_url} alt="Foto" fill className="object-cover" sizes="(max-width: 640px) 100vw, 512px" />
            </div>
          )}

          {/* Title Section */}
          <div className="invitation-section text-center py-12 px-6">
            <p className="text-sm uppercase tracking-[0.3em] font-outfit mb-4" style={{ color: primary }}>
              {inv.type === 'boda' ? 'Tenemos el honor de invitarte a Nuestra Boda' :
               inv.type === 'xv' ? 'Estás invitado(a) a mis XV Años' :
               inv.type === 'cumpleanos' ? 'Estás invitado(a) a mi Cumpleaños' :
               'Estás cordialmente invitado(a)'}
            </p>
            {inv.names && (
              <h2 className="font-great text-6xl mb-6" style={{ color: accent }}>
                {inv.names.split(/[&y]/i).map((name, i, arr) => (
                  <span key={i}>
                    {name.trim()}
                    {i < arr.length - 1 && <><br /><span className="text-4xl" style={{ color: primary }}>y</span><br /></>}
                  </span>
                ))}
              </h2>
            )}
            <p className="text-lg uppercase tracking-widest font-outfit" style={{ color: primary }}>¡Nos casamos!</p>

            {/* Date display */}
            {dateObj && (
              <div className="mt-8 flex items-center justify-center gap-4">
                <span className="text-6xl font-bold" style={{ color: accent }}>{dateObj.getDate()}</span>
                <div className="text-left">
                  <span className="block text-xl uppercase tracking-wider" style={{ color: primary }}>{months[dateObj.getMonth()]}</span>
                  <span className="block text-lg" style={{ color: primary }}>De {dateObj.getFullYear()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Countdown */}
          {inv.event_date && (
            <div className="invitation-section py-10 px-6 text-center">
              <p className="text-sm uppercase tracking-[0.3em] font-outfit mb-6" style={{ color: primary }}>Faltan</p>
              <Countdown targetDate={inv.event_date} textColor={primary} bgColor="#ffffff" accentColor={accent} />
            </div>
          )}

          {/* Message + Guest Info */}
          <div className="invitation-section py-12 px-6 text-center" style={{ backgroundColor: primary, color: secondary }}>
            {inv.message && (
              <p className="text-lg leading-relaxed mb-8 font-light max-w-sm mx-auto">{inv.message}</p>
            )}
            {inv.guest_name && (
              <>
                <h3 className="font-great text-4xl mb-2" style={{ color: accent }}>{inv.guest_name}</h3>
                <p className="uppercase tracking-widest text-sm font-outfit">Hemos reservado:</p>
                <p className="text-5xl font-bold my-2" style={{ color: accent }}>{inv.guest_passes}</p>
                <p className="uppercase tracking-widest text-sm font-outfit">Pase(s) en tu honor</p>
              </>
            )}
          </div>

          {/* Parents Section */}
          {(inv.parents_groom.length > 0 || inv.parents_bride.length > 0) && (
            <div className="invitation-section py-12 px-6 text-center">
              <p className="text-sm uppercase tracking-[0.3em] font-outfit mb-8" style={{ color: primary }}>
                Con la bendición de Dios y de nuestros padres
              </p>
              <div className="grid grid-cols-2 gap-8">
                {inv.parents_groom.length > 0 && (
                  <div>
                    <h4 className="font-great text-2xl mb-3" style={{ color: accent }}>Padres del Novio</h4>
                    {inv.parents_groom.map((p, i) => (
                      <p key={i} className="text-sm uppercase tracking-wider font-outfit" style={{ color: primary }}>{p}</p>
                    ))}
                  </div>
                )}
                {inv.parents_bride.length > 0 && (
                  <div>
                    <h4 className="font-great text-2xl mb-3" style={{ color: accent }}>Padres de la Novia</h4>
                    {inv.parents_bride.map((p, i) => (
                      <p key={i} className="text-sm uppercase tracking-wider font-outfit" style={{ color: primary }}>{p}</p>
                    ))}
                  </div>
                )}
              </div>
              {/* Sponsors */}
              {inv.sponsors.length > 0 && (
                <div className="mt-8">
                  {inv.sponsors.map((s, i) => (
                    <div key={i} className="mb-4">
                      <h4 className="font-great text-xl mb-1" style={{ color: accent }}>{s.role}</h4>
                      <p className="text-sm uppercase tracking-wider font-outfit" style={{ color: primary }}>{s.names}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Ceremony & Reception */}
          <div className="invitation-section py-12 px-6 space-y-8">
            {inv.ceremony_place && (
              <div className="text-center p-8 rounded-2xl border" style={{ borderColor: `${accent}40` }}>
                <p className="text-xs uppercase tracking-[0.3em] font-outfit mb-2" style={{ color: primary }}>Ceremonia Religiosa</p>
                <p className="text-4xl font-bold mb-2" style={{ color: accent }}>{inv.ceremony_time}</p>
                <p className="text-lg font-medium" style={{ color: primary }}>{inv.ceremony_place}</p>
                {inv.ceremony_address && (
                  <a
                    href={inv.ceremony_address.startsWith('http') ? inv.ceremony_address : mapsLink(inv.ceremony_address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-4 px-6 py-2 rounded-lg text-white text-sm font-outfit font-medium tracking-wider uppercase"
                    style={{ backgroundColor: primary }}
                  >
                    Ver Ubicación
                  </a>
                )}
              </div>
            )}
            {inv.reception_place && (
              <div className="text-center p-8 rounded-2xl border" style={{ borderColor: `${accent}40` }}>
                <p className="text-xs uppercase tracking-[0.3em] font-outfit mb-2" style={{ color: primary }}>Recepción Social</p>
                <p className="text-4xl font-bold mb-2" style={{ color: accent }}>{inv.reception_time}</p>
                <p className="text-lg font-medium" style={{ color: primary }}>{inv.reception_place}</p>
                {inv.reception_address && (
                  <a
                    href={inv.reception_address.startsWith('http') ? inv.reception_address : mapsLink(inv.reception_address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-4 px-6 py-2 rounded-lg text-white text-sm font-outfit font-medium tracking-wider uppercase"
                    style={{ backgroundColor: primary }}
                  >
                    Ver Ubicación
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Dress Code */}
          {inv.dress_code && (
            <div className="invitation-section py-12 px-6 text-center" style={{ backgroundColor: primary, color: secondary }}>
              <p className="text-xs uppercase tracking-[0.3em] font-outfit mb-3">Dress Code</p>
              <p className="text-2xl font-bold uppercase tracking-wider">{inv.dress_code}</p>
            </div>
          )}

          {/* Itinerary */}
          {inv.itinerary.length > 0 && (
            <div className="invitation-section py-12 px-6 text-center">
              <h3 className="font-great text-4xl mb-8" style={{ color: accent }}>Itinerario</h3>
              <div className="flex flex-wrap justify-center gap-6">
                {inv.itinerary.map((item, i) => (
                  <div key={i} className="text-center w-24">
                    <p className="text-2xl font-bold font-outfit" style={{ color: accent }}>{item.time}</p>
                    <p className="text-xs uppercase tracking-wider font-outfit mt-1" style={{ color: primary }}>{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gallery / Share Photos */}
          {inv.gallery_url && (
            <div className="invitation-section py-12 px-6 text-center">
              <h3 className="font-great text-3xl mb-3" style={{ color: accent }}>Nosotros</h3>
              <p className="text-sm font-outfit max-w-sm mx-auto mb-4" style={{ color: primary }}>
                Te invitamos a compartir los momentos más especiales de nuestro evento a través de tus fotografías.
              </p>
              <a
                href={inv.gallery_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 rounded-lg text-white text-sm font-outfit font-medium tracking-wider uppercase"
                style={{ backgroundColor: primary }}
              >
                Compartir Fotos
              </a>
            </div>
          )}

          {/* No Kids */}
          {inv.no_kids && (
            <div className="invitation-section py-10 px-6 text-center" style={{ backgroundColor: `${primary}10` }}>
              <p className="text-sm font-outfit max-w-sm mx-auto" style={{ color: primary }}>
                Aunque amamos a sus pequeños, este día especial es solo para adultos. Les pedimos que nos acompañen sin niños.
              </p>
            </div>
          )}

          {/* Gift Registry */}
          {(inv.gift_message || inv.bank_account) && (
            <div className="invitation-section py-12 px-6 text-center">
              <h3 className="font-great text-3xl mb-4" style={{ color: accent }}>Sugerencia de Regalos</h3>
              {inv.gift_message && (
                <p className="text-sm font-outfit max-w-sm mx-auto mb-4" style={{ color: primary }}>{inv.gift_message}</p>
              )}
              {inv.bank_account && (
                <div className="mt-4 p-4 rounded-xl inline-block" style={{ backgroundColor: `${primary}10` }}>
                  <p className="text-xs uppercase tracking-wider font-outfit mb-1" style={{ color: primary }}>Cuenta bancaria</p>
                  <p className="font-mono text-sm font-medium" style={{ color: accent }}>{inv.bank_account}</p>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="invitation-section py-16 px-6 text-center">
            <p className="text-sm uppercase tracking-[0.3em] font-outfit mb-4" style={{ color: primary }}>
              ¡Te esperamos!
            </p>
            {inv.names && (
              <h3 className="font-great text-4xl" style={{ color: accent }}>
                {inv.names}
              </h3>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
