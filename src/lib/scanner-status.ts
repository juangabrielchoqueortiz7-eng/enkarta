import type { Attendee } from './types';

export function scannerStatus(attendees: Attendee[]) {
  const inside = attendees.filter(person => person.state === 'in').length;
  const remaining = attendees.length - inside;
  const exhausted = attendees.length > 0 && remaining === 0;
  return { inside, remaining, total: attendees.length, exhausted,
    title: exhausted ? 'Todos los pases están dentro' : `${remaining} ${remaining === 1 ? 'persona puede ingresar' : 'personas pueden ingresar'}`,
    detail: exhausted ? 'No registres otro ingreso. Para reingresar, primero registra la salida de esa persona.'
      : `${inside} de ${attendees.length} dentro. Registra solo a quienes llegan ahora; el resto conserva su pase.` };
}
