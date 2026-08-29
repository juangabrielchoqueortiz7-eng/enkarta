import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'crypto';

// Helpers de identificadores, tokens, hashing de contraseña de evento y firma de
// la cookie de sesión del anfitrión. Todo con `crypto` nativo (sin dependencias).
// Solo se usa en el servidor (API routes / server components).

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin caracteres ambiguos (O/0, I/1)

function randomCode(len: number): string {
  const bytes = randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** Id corto para el link público del invitado (?g=) y para resolver el QR. */
export function genPublicId(): string {
  return randomCode(8);
}

/** Token largo único que viaja dentro del QR de acceso. */
export function genAccessToken(): string {
  return randomBytes(18).toString('base64url');
}

/** ID de acceso visible y legible en la tarjeta, ej. "ENK-7K2P". */
export function genAccessCode(): string {
  return `ENK-${randomCode(4)}`;
}

// ── Contraseña del evento (scrypt) ───────────────────────────────────────────

/** Devuelve "salt:hash" para guardar en invitations.host_password_hash. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored?: string | null): boolean {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// ── Cookie de sesión del anfitrión (HMAC, sin JWT) ───────────────────────────

// Secreto del servidor; el service role key siempre está presente en el server.
const SECRET = process.env.HOST_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'enkarta-dev-secret';

/** Firma `<invitationId>.<hmac>` para la cookie httpOnly del anfitrión. */
export function signHostSession(invitationId: string, credentialHash: string): string {
  const sig = createHmac('sha256', SECRET).update(`host:${invitationId}:${credentialHash}`).digest('base64url');
  return `${invitationId}.${sig}`;
}

/** Verifica la cookie y devuelve el invitationId, o null si es inválida. */
export function verifyHostSession(value: string | null | undefined, credentialHash: string): string | null {
  if (!value || !value.includes('.')) return null;
  const idx = value.lastIndexOf('.');
  const invitationId = value.slice(0, idx);
  const sig = value.slice(idx + 1);
  const expected = signHostSession(invitationId, credentialHash).slice(idx + 1);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return invitationId;
}

/** Dominio de firma distinto: una cookie de revisión nunca es una de operación. */
export function signReviewSession(invitationId: string, credentialHash: string): string {
  const sig = createHmac('sha256', SECRET).update(`review:${invitationId}:${credentialHash}`).digest('base64url');
  return `${invitationId}.${sig}`;
}
export function verifyReviewSession(value: string, credentialHash: string): boolean {
  const id = value.slice(0, value.lastIndexOf('.'));
  const expected = Buffer.from(signReviewSession(id, credentialHash));
  const actual = Buffer.from(value);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** El personal de puerta tiene una firma distinta de anfitrión y revisión. */
export const DOOR_SESSION_SECONDS = 60 * 60 * 12;
export function signDoorSession(invitationId: string, credentialHash: string, expiresAt = Math.floor(Date.now() / 1000) + DOOR_SESSION_SECONDS): string {
  const payload = `${invitationId}.${expiresAt}`;
  return `${payload}.${createHmac('sha256', SECRET).update(`door:${payload}:${credentialHash}`).digest('base64url')}`;
}
export function verifyDoorSession(value: string, credentialHash: string): boolean {
  const [id, expiry, signature, extra] = value.split('.');
  if (!id || !signature || extra !== undefined || !/^\d{10}$/.test(expiry || '') || Number(expiry) <= Math.floor(Date.now() / 1000)) return false;
  const actual = Buffer.from(value);
  const expected = Buffer.from(signDoorSession(id, credentialHash, Number(expiry)));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// ── Cookie de sesión del admin (equipo Enkarta), firmada para que no se falsifique ─

/** Valor firmado para la cookie httpOnly del admin. */
export function signAdminSession(): string {
  const payload = 'enkarta-admin';
  const sig = createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

/** true si la cookie de admin es válida (firma correcta). */
export function verifyAdminSession(value?: string | null): boolean {
  if (!value || !value.includes('.')) return false;
  const idx = value.lastIndexOf('.');
  const payload = value.slice(0, idx);
  const sig = value.slice(idx + 1);
  if (payload !== 'enkarta-admin') return false;
  const expected = createHmac('sha256', SECRET).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
