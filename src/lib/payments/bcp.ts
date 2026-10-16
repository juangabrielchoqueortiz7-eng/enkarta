import 'server-only';

/** Internal port, NOT an invented BCP wire format. Map the official sandbox
 * contract here when supplied. Bank credentials must never use NEXT_PUBLIC_. */
export interface BankQrRequest {
  paymentId: string;
  reference: string;
  amountMinor: number;
  currency: 'BOB';
}
export interface VerifiedBankPayment {
  paymentId: string;
  transactionId: string;
  amountMinor: number;
  currency: 'BOB';
  status: 'pending' | 'paid' | 'expired';
}
export interface BcpQrGateway {
  createQr(request: BankQrRequest): Promise<{ providerReference: string; image: string; expiresAt: string }>;
  lookupPayment(providerReference: string): Promise<VerifiedBankPayment>;
}

export function paymentProviderState() {
  const provider = process.env.PAYMENT_PROVIDER === 'bcp' ? 'bcp' : 'manual';
  return {
    provider,
    ready: provider === 'manual',
    message: provider === 'bcp'
      ? 'Los pagos QR BCP están pendientes de habilitar y validar con el banco. Contacta al equipo.'
      : '',
  } as const;
}

/** An API key alone is insufficient: endpoints, auth header, QR expiry,
 * transaction lookup and callback authentication must come from BCP docs.
 * No endpoint accepts a browser-declared "paid" state. */
export function requireBcpGateway(): never {
  throw new Error('BCP_CONTRACT_REQUIRED');
}
