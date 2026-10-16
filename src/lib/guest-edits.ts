import type { Guest } from './types';

/** Keep text typed while an earlier request was in flight. Server revisions
 * always win; a new edit must compare against that acknowledged revision. */
export function mergeSavedGuest(latest: Guest, submitted: Guest, saved: Guest): Guest {
  const next = { ...latest, responseRevision: saved.responseRevision, status: saved.status,
    confirmedPasses: saved.confirmedPasses, respondedAt: saved.respondedAt,
    deliveryStatus: saved.deliveryStatus, sent: saved.sent, metadataStored: saved.metadataStored,
    whatsappOpenedAt: saved.whatsappOpenedAt, manuallyMarkedAt: saved.manuallyMarkedAt,
    lastReminderAt: saved.lastReminderAt, reminderCount: saved.reminderCount };
  for (const key of ['name', 'passes', 'tableNo', 'allowKids', 'phone', 'group', 'eventAccess'] as const) {
    if (latest[key] === submitted[key]) Object.assign(next, { [key]: saved[key] });
  }
  return next;
}
