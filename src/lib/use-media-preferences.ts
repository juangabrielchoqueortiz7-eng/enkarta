'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

type Connection = EventTarget & { saveData?: boolean; effectiveType?: string };

/** Shared, reactive policy for decorative media; manual playback remains possible. */
export function useMediaPreferences() {
  const reducedMotion = useReducedMotion();
  const [saveData, setSaveData] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    const syncConnection = () => setSaveData(Boolean(connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType ?? '')));
    const syncVisibility = () => setPageVisible(document.visibilityState === 'visible');
    syncConnection();
    syncVisibility();
    setReady(true);
    connection?.addEventListener('change', syncConnection);
    document.addEventListener('visibilitychange', syncVisibility);
    return () => {
      connection?.removeEventListener('change', syncConnection);
      document.removeEventListener('visibilitychange', syncVisibility);
    };
  }, []);
  return { reducedMotion: Boolean(reducedMotion), saveData, pageVisible, ready };
}
