'use client';
import { useEffect, useState } from 'react';
import type { GuestImportRow } from '@/lib/guest-import';

/** Candidate-specific, abortable verification. No roster-wide contact download. */
export function useImportDuplicates(invitationId: string, candidates: GuestImportRow[] | null, readVersion = '') {
  const key = candidates ? JSON.stringify(candidates.map(({name,phone}) => ({ name, phone: phone || '' }))) : '';
  const scope = JSON.stringify([invitationId, readVersion, key]);
  const [result, setResult] = useState<{ key: string; matches: {name: string; phone: string}[]; error: string } | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!key) return;
    const controller = new AbortController(); let active = true;
    const timeout = setTimeout(() => controller.abort(), 12000);
    void (async () => {
      try {
        const response = await fetch(`/api/host/roster?id=${encodeURIComponent(invitationId)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ candidates: JSON.parse(key) }), cache: 'no-store', signal: controller.signal });
        const value = await response.json();
        const entries: {name: string; phone: string}[] = JSON.parse(key);
        if (!response.ok) throw new Error(value.error || 'No se pudieron comprobar los duplicados.');
        if (!Array.isArray(value.duplicates) || value.duplicates.some((index: unknown) => !Number.isInteger(index) || Number(index) < 0 || Number(index) >= entries.length)) throw new Error('La comprobación de duplicados está incompleta.');
        if (active) setResult({ key: scope, matches: value.duplicates.map((index: number) => entries[index]), error: '' });
      } catch(error) { if (active) setResult({ key: scope, matches: [], error: error instanceof Error && error.name !== 'AbortError' ? error.message : 'No se pudieron comprobar los duplicados. Reintenta antes de importar.' }); }
      finally { clearTimeout(timeout); }
    })();
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [invitationId, key, scope, retry]);
  return { matches: result?.key === scope ? result.matches : [], ready: !key || (result?.key === scope && !result.error), error: result?.key === scope ? result.error : '', retry: () => { setResult(null); setRetry(value => value + 1); } };
}
