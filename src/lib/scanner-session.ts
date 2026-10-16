import { createHash } from 'node:crypto';
import type { ScannerRole } from './scan-recovery';

/** Opaque binding, not a credential. It cannot authenticate without the signed cookie. */
export function scannerSessionFingerprint(role: ScannerRole, signedCookie: string) {
  return createHash('sha256').update(`enkarta:scanner-session:v1\0${role}\0${signedCookie}`).digest('hex');
}
