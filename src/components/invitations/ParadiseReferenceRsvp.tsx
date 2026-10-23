'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import styles from './ParadiseReferenceSections.module.css';

const Rsvp = createContext<ReactNode>(null);

/** Only the server's already authorized form crosses this visual boundary. */
export function ParadiseReferenceRsvpProvider({ form, children }: { form: ReactNode; children: ReactNode }) {
  return <Rsvp.Provider value={form}>{children}</Rsvp.Provider>;
}

export default function ParadiseReferenceRsvp({ demo = false }: { demo?: boolean }) {
  const form = useContext(Rsvp);
  const [explain, setExplain] = useState(false);
  if (form) return <details className={styles.rsvpDetails}>
    <summary className={styles.button}>Confirmar Asistencia</summary>
    <div className={styles.rsvpForm}>{form}</div>
  </details>;
  if (demo) return <>
    <button className={styles.button} type="button" onClick={() => setExplain(true)}>Confirmar Asistencia</button>
    {explain && <p className={styles.notice} role="status">Esta es una vista de muestra. No se envió ninguna confirmación.</p>}
  </>;
  return <p className={styles.notice}>Solicita a los anfitriones el enlace de confirmación de tu invitación.</p>;
}
