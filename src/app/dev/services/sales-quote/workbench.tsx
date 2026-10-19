'use client';

import { useMemo, useRef, useState } from 'react';
import SalesToolkit from '@/components/admin/SalesToolkit';
import { clearSalesDraft, salesDraftKey, saveSalesDraft, type SalesDraftInput, type SalesDraftStorage } from '@/lib/sales-draft';

type StorageMode = 'ok' | 'read' | 'write' | 'remove';
type ConfigMode = 'ok' | 'unconfigured' | 'offline' | 'incomplete';
const control = 'min-h-11 rounded-xl border border-gray-300 bg-white px-3 text-base text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-enkarta-sage';
const fictionalQuote: SalesDraftInput = { clientName: 'QA Familia Pérez', eventType: 'Boda', eventDate: '2027-06-12', design: 'Lunaria', packageKey: 'premium', extrasBs: 270, extrasLabel: 'Entrega express ficticia' };

export default function SalesQuoteWorkbench() {
  const [storageMode, setStorageMode] = useState<StorageMode>('ok'), [configMode, setConfigMode] = useState<ConfigMode>('ok');
  const [session, setSession] = useState('a'), [denyCopy, setDenyCopy] = useState(false), [copied, setCopied] = useState('');
  const [mount, setMount] = useState(0), [notice, setNotice] = useState('');
  const mode = useRef(storageMode), clipboardDenied = useRef(denyCopy);
  mode.current = storageMode; clipboardDenied.current = denyCopy;
  const storage = useMemo<SalesDraftStorage>(() => ({
    getItem(key) { if (mode.current === 'read') throw Error('QA storage denied'); return window.sessionStorage.getItem(key); },
    setItem(key, value) { if (mode.current === 'write') throw Error('QA quota'); window.sessionStorage.setItem(key, value); },
    removeItem(key) { if (mode.current === 'remove') throw Error('QA remove denied'); window.sessionStorage.removeItem(key); },
  }), []);
  const transport = useMemo<typeof fetch>(() => async url => {
    if (url !== '/api/admin/sales-config') throw Error('Unexpected QA route');
    if (configMode === 'offline') throw new TypeError('QA sin conexión');
    if (configMode === 'incomplete') return Response.json({});
    return Response.json({ paymentInstructions: configMode === 'ok' ? 'INSTRUCCIONES FICTICIAS. SIN PAGO REAL.' : '', paymentConfigured: configMode === 'ok', salesHours: 'Horario ficticio', draftScope: session.repeat(64) });
  }, [configMode, session]);
  const writeText = useMemo(() => async (value: string) => { if (clipboardDenied.current) throw Error('QA clipboard denied'); setCopied(value); }, []);
  const clean = () => {
    const cleanA = clearSalesDraft(storage, 'a'.repeat(64)), cleanB = clearSalesDraft(storage, 'b'.repeat(64));
    setNotice(cleanA && cleanB ? 'Datos ficticios retirados de ambas sesiones.' : 'No se pudo limpiar la sesión QA.');
    setCopied(''); setMount(value => value + 1);
  };
  const corrupt = () => { window.sessionStorage.setItem(salesDraftKey(session.repeat(64)), '{QA corrupto'); setMount(value => value + 1); };
  const seed = (patch: Partial<SalesDraftInput> = {}, legacy = false) => {
    const scope = session.repeat(64), input = { ...fictionalQuote, ...patch };
    let saved = false;
    if (legacy) {
      try { storage.setItem(salesDraftKey(scope), JSON.stringify({ version: 1, scope, savedAt: Date.now(), input })); saved = true; } catch { saved = false; }
    } else saved = saveSalesDraft(storage, scope, input);
    setNotice(saved ? 'Borrador ficticio preparado. Revisa el importe y la fecha antes de copiar.' : 'No se pudo preparar el borrador QA. Habilita el almacenamiento para reintentar.');
    setCopied(''); setMount(value => value + 1);
  };
  return <main className="mx-auto max-w-6xl space-y-6 bg-[#faf7f2] p-4 text-gray-900">
    <h1 className="text-2xl font-semibold">Cotizador QA</h1><p>Solo datos ficticios. La copia se simula, no se envían mensajes ni se contacta al banco.</p>
    <div className="flex flex-wrap items-end gap-4">
      <label>Almacenamiento<select aria-label="Modo de almacenamiento QA" className={control} value={storageMode} onChange={event => setStorageMode(event.target.value as StorageMode)}><option value="ok">Normal</option><option value="read">Lectura bloqueada</option><option value="write">Escritura bloqueada</option><option value="remove">Borrado bloqueado</option></select></label>
      <label>Configuración<select aria-label="Configuración QA" className={control} value={configMode} onChange={event => setConfigMode(event.target.value as ConfigMode)}><option value="ok">Configurada</option><option value="unconfigured">Sin medio de pago</option><option value="offline">Sin conexión</option><option value="incomplete">Respuesta incompleta</option></select></label>
      <label>Sesión<select aria-label="Sesión QA" className={control} value={session} onChange={event => setSession(event.target.value)}><option value="a">Sesión A</option><option value="b">Sesión B</option></select></label>
      <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={denyCopy} onChange={event => setDenyCopy(event.target.checked)} />Denegar portapapeles</label>
      <button className={control} type="button" onClick={() => setMount(value => value + 1)}>Remontar cotizador</button>
      <button className={control} type="button" onClick={corrupt}>Simular borrador corrupto</button>
      <button className={control} type="button" onClick={() => seed()}>Preparar borrador QA completo</button>
      <button className={control} type="button" onClick={() => seed({ extrasBs: '270,50' })}>Preparar importe con coma</button>
      <button className={control} type="button" onClick={() => seed({ extrasBs: '12,' })}>Preparar decimal incompleto</button>
      <button className={control} type="button" onClick={() => seed({ extrasBs: '1e3' })}>Preparar importe inválido</button>
      <button className={control} type="button" onClick={() => seed({ eventDate: '2027-02-30' })}>Preparar fecha inválida</button>
      <button className={control} type="button" onClick={() => seed({ extrasBs: 0.105 }, true)}>Preparar borrador anterior con 0.105</button>
      <button className={control} type="button" onClick={clean}>Limpiar datos QA</button>
    </div>
    <p role="status">{notice}</p>
    <SalesToolkit key={`${session}-${mount}`} transport={transport} storage={storage} writeText={writeText} />
    <label className="block">Texto copiado en QA<textarea aria-label="Texto copiado en QA" className="mt-2 min-h-40 w-full rounded-xl border border-gray-300 p-3 text-sm" readOnly value={copied} /></label>
  </main>;
}
