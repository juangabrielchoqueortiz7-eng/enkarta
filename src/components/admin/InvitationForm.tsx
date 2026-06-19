'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { InvitationTemplate, InvitationType, Sponsor, ItineraryItem, TEMPLATE_OPTIONS, TYPE_OPTIONS } from '@/lib/types';
import { LottieIconMeta } from '@/lib/lottie-utils';
import IconLibrary from '@/components/admin/IconLibrary';
import LottieIcon from '@/components/ui/LottieIcon';

interface CollapsibleProps {
  title: string;
  emoji: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Collapsible({ title, emoji, defaultOpen = false, children }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-3 font-outfit font-medium text-gray-900">
          <span className="text-xl">{emoji}</span>
          {title}
        </span>
        <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className={`collapsible-content ${open ? 'open' : ''}`}>
        <div className="px-6 pb-6 pt-2 space-y-4 border-t border-gray-100">
          {children}
        </div>
      </div>
    </div>
  );
}

function InputField({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-sm font-outfit text-gray-600 mb-1">{label}</label>
      <input
        {...props}
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-enkarta-gold focus:ring-2 focus:ring-enkarta-gold/20 outline-none transition-all font-outfit text-sm"
      />
    </div>
  );
}

function TextArea({ label, ...props }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      <label className="block text-sm font-outfit text-gray-600 mb-1">{label}</label>
      <textarea
        {...props}
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-enkarta-gold focus:ring-2 focus:ring-enkarta-gold/20 outline-none transition-all font-outfit text-sm resize-none"
        rows={3}
      />
    </div>
  );
}

// ─── Itinerary Editor con picker de íconos Lottie ────────────────────────────

function ItineraryEditor({
  itinerary,
  onChange,
}: {
  itinerary: ItineraryItem[];
  onChange: (items: ItineraryItem[]) => void;
}) {
  // índice del paso que tiene el picker abierto (-1 = ninguno)
  const [pickerOpen, setPickerOpen] = useState<number>(-1);

  const update = (i: number, patch: Partial<ItineraryItem>) => {
    const updated = [...itinerary];
    updated[i] = { ...updated[i], ...patch };
    onChange(updated);
  };

  const handleIconSelect = (i: number, icon: LottieIconMeta) => {
    update(i, { icon: icon.path });   // guardamos la ruta Lottie, ej: /lottie/boda/marriage.json
    setPickerOpen(-1);
  };

  return (
    <div>
      <label className="block text-sm font-outfit text-gray-600 mb-2">Itinerario</label>
      <div className="space-y-2">
        {itinerary.map((item, i) => (
          <div key={i} className="rounded-xl border border-gray-200 overflow-hidden">
            {/* Fila principal */}
            <div className="flex gap-2 p-2 items-center">

              {/* Botón selector de ícono */}
              <button
                type="button"
                onClick={() => setPickerOpen(pickerOpen === i ? -1 : i)}
                title="Elegir ícono Lottie"
                className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  pickerOpen === i
                    ? 'border-enkarta-gold bg-enkarta-gold/10'
                    : 'border-gray-200 hover:border-enkarta-gold/50 bg-gray-50'
                }`}
              >
                {item.icon && item.icon.startsWith('/lottie/') ? (
                  <LottieIcon icon={item.icon} size={36} loop autoplay lazy={false} />
                ) : (
                  <span className="text-gray-300 text-xl">🎭</span>
                )}
              </button>

              {/* Hora */}
              <input
                value={item.time}
                onChange={e => update(i, { time: e.target.value })}
                className="w-20 px-3 py-2 rounded-xl border border-gray-200 focus:border-enkarta-gold outline-none transition-all font-outfit text-sm"
                placeholder="16:00"
              />

              {/* Etiqueta */}
              <input
                value={item.label}
                onChange={e => update(i, { label: e.target.value })}
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 focus:border-enkarta-gold outline-none transition-all font-outfit text-sm"
                placeholder="Ceremonia Religiosa"
              />

              {/* Quitar paso */}
              {itinerary.length > 1 && (
                <button
                  type="button"
                  onClick={() => onChange(itinerary.filter((_, j) => j !== i))}
                  className="text-red-300 hover:text-red-500 px-2 flex-shrink-0"
                >✕</button>
              )}
            </div>

            {/* Picker Lottie (desplegable) */}
            {pickerOpen === i && (
              <div className="border-t border-gray-100 p-3 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-outfit text-gray-500">Selecciona un ícono para este paso:</p>
                  {item.icon && item.icon.startsWith('/lottie/') && (
                    <button
                      type="button"
                      onClick={() => update(i, { icon: '' })}
                      className="text-xs text-red-400 hover:text-red-600 font-outfit"
                    >
                      Quitar ícono
                    </button>
                  )}
                </div>
                <IconLibrary
                  onSelect={(icon) => handleIconSelect(i, icon)}
                  selectedId={item.icon?.split('/').pop()?.replace('.json', '')}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...itinerary, { time: '', label: '', icon: '' }])}
        className="mt-2 text-xs text-enkarta-gold hover:underline font-outfit"
      >
        + Agregar paso
      </button>
    </div>
  );
}

interface Props {
  initialData?: {
    id: string;
    slug: string;
    template: InvitationTemplate;
    type: InvitationType;
    names: string;
    event_date: string;
    ceremony_time: string;
    ceremony_place: string;
    ceremony_address: string;
    reception_time: string;
    reception_place: string;
    reception_address: string;
    guest_name: string;
    guest_passes: number;
    message: string;
    dress_code: string;
    no_kids: boolean;
    parents_groom: string[];
    parents_bride: string[];
    sponsors: Sponsor[];
    itinerary: ItineraryItem[];
    gift_message: string;
    bank_account: string;
    cover_image_url: string;
    gallery_url: string;
    color_primary: string;
    color_secondary: string;
    color_accent: string;
  };
}

export default function InvitationForm({ initialData }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const isEditing = !!initialData?.id;

  // Form state
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [template, setTemplate] = useState<InvitationTemplate>(initialData?.template || 'azure');
  const [type, setType] = useState<InvitationType>(initialData?.type || 'boda');
  const [names, setNames] = useState(initialData?.names || '');
  const [eventDate, setEventDate] = useState(initialData?.event_date || '');
  const [ceremonyTime, setCeremonyTime] = useState(initialData?.ceremony_time || '');
  const [ceremonyPlace, setCeremonyPlace] = useState(initialData?.ceremony_place || '');
  const [ceremonyAddress, setCeremonyAddress] = useState(initialData?.ceremony_address || '');
  const [receptionTime, setReceptionTime] = useState(initialData?.reception_time || '');
  const [receptionPlace, setReceptionPlace] = useState(initialData?.reception_place || '');
  const [receptionAddress, setReceptionAddress] = useState(initialData?.reception_address || '');
  const [guestName, setGuestName] = useState(initialData?.guest_name || '');
  const [guestPasses, setGuestPasses] = useState(initialData?.guest_passes || 1);
  const [message, setMessage] = useState(initialData?.message || '');
  const [dressCode, setDressCode] = useState(initialData?.dress_code || '');
  const [noKids, setNoKids] = useState(initialData?.no_kids || false);
  const [parentsGroom, setParentsGroom] = useState<string[]>(initialData?.parents_groom || ['']);
  const [parentsBride, setParentsBride] = useState<string[]>(initialData?.parents_bride || ['']);
  const [sponsors, setSponsors] = useState<Sponsor[]>(initialData?.sponsors || [{ role: '', names: '' }]);
  const [itinerary, setItinerary] = useState<ItineraryItem[]>(initialData?.itinerary || [{ time: '', label: '' }]);
  const [giftMessage, setGiftMessage] = useState(initialData?.gift_message || '');
  const [bankAccount, setBankAccount] = useState(initialData?.bank_account || '');
  const [coverImageUrl, setCoverImageUrl] = useState(initialData?.cover_image_url || '');
  const [galleryUrl, setGalleryUrl] = useState(initialData?.gallery_url || '');
  const [colorPrimary, setColorPrimary] = useState(initialData?.color_primary || '#B8975A');
  const [colorSecondary, setColorSecondary] = useState(initialData?.color_secondary || '#FAF7F2');
  const [colorAccent, setColorAccent] = useState(initialData?.color_accent || '#2C2519');

  // Auto-generate slug from names
  const suggestSlug = () => {
    if (names) {
      const base = names
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[&y]/g, '-')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-');
      const typeSlug = type === 'boda' ? 'boda' : type;
      setSlug(`${typeSlug}-${base}`);
    }
  };

  const handleSave = async (status: 'draft' | 'ready') => {
    if (!slug) {
      alert('El slug es obligatorio');
      return;
    }
    setSaving(true);

    const data = {
      ...(isEditing ? { id: initialData.id } : {}),
      slug,
      status,
      template,
      type,
      names: names || null,
      event_date: eventDate || null,
      ceremony_time: ceremonyTime || null,
      ceremony_place: ceremonyPlace || null,
      ceremony_address: ceremonyAddress || null,
      reception_time: receptionTime || null,
      reception_place: receptionPlace || null,
      reception_address: receptionAddress || null,
      guest_name: guestName || null,
      guest_passes: guestPasses,
      message: message || null,
      dress_code: dressCode || null,
      no_kids: noKids,
      parents_groom: parentsGroom.filter(p => p.trim()),
      parents_bride: parentsBride.filter(p => p.trim()),
      sponsors: sponsors.filter(s => s.role.trim() || s.names.trim()),
      itinerary: itinerary.filter(i => i.time.trim() || i.label.trim()),
      gift_message: giftMessage || null,
      bank_account: bankAccount || null,
      cover_image_url: coverImageUrl || null,
      gallery_url: galleryUrl || null,
      color_primary: colorPrimary,
      color_secondary: colorSecondary,
      color_accent: colorAccent,
    };

    try {
      const res = await fetch('/api/admin/invitations', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        router.push('/admin');
      } else {
        const err = await res.json();
        alert(err.error || 'Error al guardar');
      }
    } catch {
      alert('Error de conexión');
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <a href="/admin" className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </a>
            <h1 className="font-playfair text-xl text-enkarta-dark">
              {isEditing ? 'Editar Invitación' : 'Nueva Invitación'}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="space-y-4">
          {/* Section 1: General */}
          <Collapsible title="General" emoji="⚙️" defaultOpen={true}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-outfit text-gray-600 mb-1">Slug (URL)</label>
                <div className="flex gap-2">
                  <input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="boda-ana-carlos-junio25"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-enkarta-gold focus:ring-2 focus:ring-enkarta-gold/20 outline-none transition-all font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={suggestSlug}
                    className="px-3 py-2 text-xs bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors font-outfit"
                  >
                    Auto
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1 font-outfit">La invitación estará en: /i/{slug || 'tu-slug'}</p>
              </div>

              <div>
                <label className="block text-sm font-outfit text-gray-600 mb-1">Plantilla</label>
                <div className="grid grid-cols-3 gap-2">
                  {TEMPLATE_OPTIONS.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTemplate(t.value)}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        template === t.value
                          ? 'border-enkarta-gold bg-enkarta-gold/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="block text-sm font-outfit font-medium">
                        {t.label}
                        {t.premium && <span className="ml-1 align-middle text-[9px] uppercase tracking-wide text-enkarta-gold">★</span>}
                      </span>
                      <span className="block text-xs text-gray-400 mt-0.5">{t.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-outfit text-gray-600 mb-1">Tipo de evento</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as InvitationType)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-enkarta-gold focus:ring-2 focus:ring-enkarta-gold/20 outline-none transition-all font-outfit text-sm"
                >
                  {TYPE_OPTIONS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </Collapsible>

          {/* Section 2: Protagonists */}
          <Collapsible title="Protagonistas" emoji="💍">
            <InputField label="Nombres principales" value={names} onChange={(e) => setNames(e.target.value)} placeholder="Camila & Alejandro" />
            <TextArea label="Mensaje personalizado" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Casarse es de locos, pero es que nos queremos con locura..." />
          </Collapsible>

          {/* Section 3: Event */}
          <Collapsible title="Evento" emoji="📅">
            <InputField label="Fecha del evento" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
                <h4 className="text-sm font-outfit font-medium text-gray-700">⛪ Ceremonia</h4>
                <InputField label="Hora" type="time" value={ceremonyTime} onChange={(e) => setCeremonyTime(e.target.value)} />
                <InputField label="Lugar" value={ceremonyPlace} onChange={(e) => setCeremonyPlace(e.target.value)} placeholder="Iglesia San Sebastián" />
                <InputField label="Dirección / Google Maps link" value={ceremonyAddress} onChange={(e) => setCeremonyAddress(e.target.value)} placeholder="Av. Principal #123" />
              </div>
              <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
                <h4 className="text-sm font-outfit font-medium text-gray-700">🎉 Recepción</h4>
                <InputField label="Hora" type="time" value={receptionTime} onChange={(e) => setReceptionTime(e.target.value)} />
                <InputField label="Lugar" value={receptionPlace} onChange={(e) => setReceptionPlace(e.target.value)} placeholder="Salón de Eventos Castrillo" />
                <InputField label="Dirección / Google Maps link" value={receptionAddress} onChange={(e) => setReceptionAddress(e.target.value)} placeholder="Calle Los Jardines #456" />
              </div>
            </div>
          </Collapsible>

          {/* Section 4: Guest */}
          <Collapsible title="Invitado" emoji="👤">
            <InputField label="Nombre del invitado" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Daniel Maldonado" />
            <div>
              <label className="block text-sm font-outfit text-gray-600 mb-1">Número de pases</label>
              <input
                type="number"
                min="1"
                max="20"
                value={guestPasses}
                onChange={(e) => setGuestPasses(parseInt(e.target.value) || 1)}
                className="w-24 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-enkarta-gold focus:ring-2 focus:ring-enkarta-gold/20 outline-none transition-all font-outfit text-sm"
              />
            </div>
          </Collapsible>

          {/* Section 5: Optional Details */}
          <Collapsible title="Detalles Opcionales" emoji="✨">
            <InputField label="Dress Code" value={dressCode} onChange={(e) => setDressCode(e.target.value)} placeholder="Formal - Elegante" />

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={noKids}
                onChange={(e) => setNoKids(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-enkarta-gold focus:ring-enkarta-gold"
              />
              <span className="text-sm font-outfit text-gray-700">Sin niños</span>
            </label>

            {/* Parents groom */}
            <div>
              <label className="block text-sm font-outfit text-gray-600 mb-1">Padres del novio (uno por línea)</label>
              {parentsGroom.map((p, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input
                    value={p}
                    onChange={(e) => {
                      const updated = [...parentsGroom];
                      updated[i] = e.target.value;
                      setParentsGroom(updated);
                    }}
                    className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:border-enkarta-gold outline-none transition-all font-outfit text-sm"
                    placeholder="Nombre completo"
                  />
                  {parentsGroom.length > 1 && (
                    <button type="button" onClick={() => setParentsGroom(parentsGroom.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 px-2">✕</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setParentsGroom([...parentsGroom, ''])} className="text-xs text-enkarta-gold hover:underline font-outfit">+ Agregar</button>
            </div>

            {/* Parents bride */}
            <div>
              <label className="block text-sm font-outfit text-gray-600 mb-1">Padres de la novia (uno por línea)</label>
              {parentsBride.map((p, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input
                    value={p}
                    onChange={(e) => {
                      const updated = [...parentsBride];
                      updated[i] = e.target.value;
                      setParentsBride(updated);
                    }}
                    className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:border-enkarta-gold outline-none transition-all font-outfit text-sm"
                    placeholder="Nombre completo"
                  />
                  {parentsBride.length > 1 && (
                    <button type="button" onClick={() => setParentsBride(parentsBride.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 px-2">✕</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setParentsBride([...parentsBride, ''])} className="text-xs text-enkarta-gold hover:underline font-outfit">+ Agregar</button>
            </div>

            {/* Sponsors */}
            <div>
              <label className="block text-sm font-outfit text-gray-600 mb-1">Padrinos</label>
              {sponsors.map((s, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input
                    value={s.role}
                    onChange={(e) => {
                      const updated = [...sponsors];
                      updated[i] = { ...updated[i], role: e.target.value };
                      setSponsors(updated);
                    }}
                    className="w-1/3 px-3 py-2 rounded-xl border border-gray-200 focus:border-enkarta-gold outline-none transition-all font-outfit text-sm"
                    placeholder="Rol (ej: Civil)"
                  />
                  <input
                    value={s.names}
                    onChange={(e) => {
                      const updated = [...sponsors];
                      updated[i] = { ...updated[i], names: e.target.value };
                      setSponsors(updated);
                    }}
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-200 focus:border-enkarta-gold outline-none transition-all font-outfit text-sm"
                    placeholder="Nombres"
                  />
                  {sponsors.length > 1 && (
                    <button type="button" onClick={() => setSponsors(sponsors.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 px-2">✕</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setSponsors([...sponsors, { role: '', names: '' }])} className="text-xs text-enkarta-gold hover:underline font-outfit">+ Agregar padrinos</button>
            </div>

            {/* Itinerary */}
            <ItineraryEditor itinerary={itinerary} onChange={setItinerary} />

            <InputField label="Mensaje de regalos" value={giftMessage} onChange={(e) => setGiftMessage(e.target.value)} placeholder="Si deseas hacernos un obsequio..." />
            <InputField label="Cuenta bancaria" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="Banco BCP - 10000888888888" />
            <InputField label="URL de imagen de portada" value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} placeholder="https://..." />
            <InputField label="Link de galería (Google Photos u otro)" value={galleryUrl} onChange={(e) => setGalleryUrl(e.target.value)} placeholder="https://photos.app.goo.gl/..." />
          </Collapsible>

          {/* Section 6: Colors */}
          <Collapsible title="Colores" emoji="🎨">
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <label className="block text-sm font-outfit text-gray-600 mb-2">Primario</label>
                <input type="color" value={colorPrimary} onChange={(e) => setColorPrimary(e.target.value)} className="mx-auto" />
                <p className="text-xs text-gray-400 mt-1 font-mono">{colorPrimary}</p>
              </div>
              <div className="text-center">
                <label className="block text-sm font-outfit text-gray-600 mb-2">Secundario</label>
                <input type="color" value={colorSecondary} onChange={(e) => setColorSecondary(e.target.value)} className="mx-auto" />
                <p className="text-xs text-gray-400 mt-1 font-mono">{colorSecondary}</p>
              </div>
              <div className="text-center">
                <label className="block text-sm font-outfit text-gray-600 mb-2">Acento</label>
                <input type="color" value={colorAccent} onChange={(e) => setColorAccent(e.target.value)} className="mx-auto" />
                <p className="text-xs text-gray-400 mt-1 font-mono">{colorAccent}</p>
              </div>
            </div>
          </Collapsible>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 pb-8">
            <button
              type="button"
              onClick={() => handleSave('draft')}
              disabled={saving}
              className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-outfit font-medium hover:bg-gray-300 transition-all disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar borrador'}
            </button>
            <button
              type="button"
              onClick={() => handleSave('ready')}
              disabled={saving}
              className="flex-1 py-3 bg-enkarta-gold text-white rounded-xl font-outfit font-medium hover:bg-enkarta-gold/90 transition-all shadow-lg shadow-enkarta-gold/20 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar y publicar'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
