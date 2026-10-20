// Exercise the quote domain with fictional data and memory storage; no network or bank.
const fs = require('node:fs');
const ts = require('typescript');
const test = require('node:test');
const assert = require('node:assert/strict');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }, fileName: file,
}).outputText, file);

const { MAX_SALES_QUOTE_BS, parseSalesExtras, validateSalesQuote, salesQuoteTotals, formatSalesQuote, salesReply, SALES_REPLY_LABELS, isSalesCommercialReference } = require('../src/lib/sales-playbook.ts');
const { readSalesDraft, saveSalesDraft, salesDraftKey, SALES_DRAFT_TTL } = require('../src/lib/sales-draft.ts');
const { salesQuoteContact, prepareSalesContactDraft } = require('../src/lib/sales-contact.ts');
const complete = {
  clientName: 'QA Familia Pérez', eventType: 'Boda', eventDate: '2028-02-29', design: 'Diseño personalizado QA',
  packageKey: 'premium', extrasBs: '270,50', extrasLabel: 'Servicio ficticio QA', paymentInstructions: 'INSTRUCCIONES FICTICIAS. SIN PAGO REAL.',
};

test('quote decimals accept comma or point and preserve exact cents', () => {
  for (const [value, cents] of [[undefined, 0], ['', 0], [0, 0], ['0', 0], ['0,00', 0], [0.1, 10], ['0.10', 10], [0.29, 29], ['270,50', 27050], ['270.50', 27050], [' 270,5 ', 27050]]) {
    assert.deepEqual(parseSalesExtras(value), { cents, amount: cents / 100 }, String(value));
  }
});

test('quote decimals reject coercion, exponents, grouping and unfinished inputs', () => {
  for (const value of [null, true, false, [], ['1'], {}, NaN, Infinity, -Infinity, -1, '-1', '1e3', '1E+3', '+1', '0x10', '12.', '12,', '.25', ',25', '1,000.50', '1.000,50', '1 000', ' ', '1\n', '1\t', '1\u007f', 'not a price']) {
    assert.equal(parseSalesExtras(value), null, String(value));
  }
});

test('quote rejects excess decimals instead of rounding or dropping the additional cost', () => {
  for (const value of [0.105, 0.009, '0.105', '0,105', '270.500', '270,500']) {
    assert.equal(parseSalesExtras(value), null);
    const result = validateSalesQuote({ ...complete, extrasBs: value });
    assert.ok(result.errors.extrasBs); assert.equal(result.totals, null); assert.equal(result.ready, false);
    assert.throws(() => salesQuoteTotals({ ...complete, extrasBs: value }), /importe/);
    assert.throws(() => formatSalesQuote({ ...complete, extrasBs: value }), /inválidos/);
  }
});

test('quote rejects overflow and unsafe arithmetic without exposing an infinite total', () => {
  for (const value of [1e308, 1e21, Number.MAX_SAFE_INTEGER, '99999999999999999999999', MAX_SALES_QUOTE_BS + 0.01]) {
    assert.equal(parseSalesExtras(value), null);
    assert.equal(validateSalesQuote({ ...complete, extrasBs: value }).totals, null);
    assert.throws(() => salesQuoteTotals({ ...complete, extrasBs: value }), /Revisa el paquete/);
  }
});

test('quote total limit includes the selected package and accepts the exact boundary', () => {
  assert.deepEqual(parseSalesExtras(MAX_SALES_QUOTE_BS), { cents: 100000000, amount: 1000000 });
  for (const [packageKey, base] of [['plus', 750], ['premium', 930], ['exclusive', 1100]]) {
    const input = { ...complete, packageKey, extrasBs: MAX_SALES_QUOTE_BS - base };
    assert.deepEqual(salesQuoteTotals(input), { base, extras: MAX_SALES_QUOTE_BS - base, total: MAX_SALES_QUOTE_BS, reservation: 200, balance: MAX_SALES_QUOTE_BS - 200 });
    assert.equal(validateSalesQuote(input).ready, true);
    const over = validateSalesQuote({ ...input, extrasBs: `${MAX_SALES_QUOTE_BS - base}.01` });
    assert.match(over.errors.extrasBs, /total/); assert.equal(over.totals, null);
  }
});

test('quote subtraction uses cents and preserves the existing 1200 Bs proposal', () => {
  assert.deepEqual(salesQuoteTotals({ ...complete, extrasBs: 270 }), { base: 930, extras: 270, total: 1200, reservation: 200, balance: 1000 });
  for (const extras of ['0.01', '0.10', '0.29', '270.50']) {
    const result = salesQuoteTotals({ ...complete, extrasBs: extras });
    const cents = parseSalesExtras(extras).cents;
    assert.equal(result.total, (93000 + cents) / 100);
    assert.equal(result.balance, (73000 + cents) / 100);
    assert.equal(result.reservation, 200);
  }
});

test('quote validates real leap days and never rolls an impossible date into another month', () => {
  for (const eventDate of ['2028-02-29', '2000-02-29', '2027-12-31', '2020-01-01']) {
    const result = validateSalesQuote({ ...complete, eventDate });
    assert.equal(result.ready, true); assert.equal(result.errors.eventDate, undefined);
  }
  for (const eventDate of ['0000-01-01', '2027-02-31', '2026-02-29', '1900-02-29', '2027-04-31', '2027-13-01', '2027-00-01', '2027-06-00', '2027-6-1', '2027-06-12T00:00:00Z']) {
    const result = validateSalesQuote({ ...complete, eventDate });
    assert.ok(result.errors.eventDate, eventDate); assert.equal(result.ready, false);
    assert.throws(() => formatSalesQuote({ ...complete, eventDate }), /inválidos/);
  }
});

test('quote missing information remains a valid draft rather than a validation error', () => {
  const result = validateSalesQuote({ packageKey: 'premium' });
  assert.deepEqual(result.errors, {});
  assert.deepEqual(result.missing, ['clientName', 'eventType', 'eventDate', 'design', 'paymentInstructions']);
  assert.deepEqual(result.totals, { base: 930, extras: 0, total: 930, reservation: 200, balance: 730 });
  assert.equal(result.ready, false);
  const whitespace = validateSalesQuote({ ...complete, clientName: '   ', eventType: '', eventDate: '', design: '', paymentInstructions: '  ', extrasBs: 0 });
  assert.deepEqual(whitespace.errors, {}); assert.equal(whitespace.missing.length, 5);
});

test('additional services require a description only when their cost is positive', () => {
  const missing = validateSalesQuote({ ...complete, extrasLabel: '  ' });
  assert.deepEqual(missing.errors, {}); assert.deepEqual(missing.missing, ['extrasLabel']); assert.equal(missing.ready, false);
  const zero = validateSalesQuote({ ...complete, extrasBs: '', extrasLabel: undefined });
  assert.equal(zero.ready, true); assert.deepEqual(zero.missing, []);
});

test('quote rejects invalid text types, controls and excessive lengths without truncating a final proposal', () => {
  for (const field of ['clientName', 'eventType', 'design', 'extrasLabel', 'paymentInstructions']) {
    const max = field === 'paymentInstructions' ? 900 : 140;
    assert.equal(validateSalesQuote({ ...complete, [field]: 'x'.repeat(max) }).ready, true);
    for (const value of [null, 123, [], {}, 'bad\u0000text', 'bad\ntext', 'x'.repeat(max + 1)]) {
      const result = validateSalesQuote({ ...complete, [field]: value });
      assert.ok(result.errors[field], `${field}: ${String(value)}`); assert.equal(result.ready, false);
      assert.throws(() => formatSalesQuote({ ...complete, [field]: value }), /inválidos/);
    }
  }
});

test('quote rejects unsupported and inherited package keys with a safe error', () => {
  for (const packageKey of [undefined, null, [], 'free', 'toString', '__proto__']) {
    const result = validateSalesQuote({ ...complete, packageKey });
    assert.ok(result.errors.packageKey); assert.equal(result.totals, null); assert.equal(result.ready, false);
    assert.throws(() => salesQuoteTotals({ ...complete, packageKey }), /Revisa el paquete/);
    assert.throws(() => formatSalesQuote({ ...complete, packageKey }), /inválidos/);
  }
  for (const input of [null, undefined, [], 'invalid']) {
    assert.ok(validateSalesQuote(input).errors.packageKey);
    assert.throws(() => salesQuoteTotals(input), /Revisa el paquete/);
  }
});

test('draft formatting visibly identifies unfinished proposals and names the missing information', () => {
  const text = formatSalesQuote({ packageKey: 'premium' });
  assert.equal(text.split('\n')[0], 'BORRADOR DE PROPUESTA · ENKARTA');
  assert.match(text, /Por confirmar: Cliente, Evento, Fecha, Diseño, Medio de pago\./);
  assert.match(text, /Fecha: Por confirmar/); assert.doesNotMatch(text, /RESUMEN DE PROPUESTA/);
  assert.match(formatSalesQuote({ ...complete, extrasLabel: undefined }), /Por confirmar: Detalle de adicionales\./);
  const noPayment = formatSalesQuote({ ...complete, paymentInstructions: '' });
  assert.match(noPayment, /^BORRADOR DE PROPUESTA/); assert.match(noPayment, /Medio de pago: completar antes de enviar al cliente/);
});

test('complete proposal preserves custom designs, exact amounts, date and configured payment text', () => {
  const text = formatSalesQuote(complete, 'https://enkarta.test');
  assert.equal(text.split('\n')[0], 'RESUMEN DE PROPUESTA · ENKARTA');
  assert.doesNotMatch(text, /BORRADOR|Por confirmar/);
  assert.match(text, /Diseño: Diseño personalizado QA/); assert.match(text, /Fecha: 29 de febrero de 2028/);
  assert.ok(text.includes(`Total: ${(1200.5).toLocaleString('es-BO')} Bs`));
  assert.ok(text.includes(`Saldo antes de publicar: ${(1000.5).toLocaleString('es-BO')} Bs`));
  assert.match(text, /INSTRUCCIONES FICTICIAS\. SIN PAGO REAL\./);
  assert.match(text, /https:\/\/enkarta\.test\/proceso/); assert.match(text, /https:\/\/enkarta\.test\/legal\/pagos/);
  assert.doesNotMatch(text, /BCP habilitado|pago confirmado/i);
});

test('financial replies use the same validated cents as the written proposal', () => {
  const totals = salesQuoteTotals(complete), reply = salesReply('reservation', complete);
  assert.ok(reply.includes(`${totals.reservation.toLocaleString('es-BO')} Bs`));
  assert.ok(reply.includes(`${totals.total.toLocaleString('es-BO')} Bs`));
  assert.match(salesReply('materials', complete), /reserva confirmada/i);
  for (const key of Object.keys(SALES_REPLY_LABELS)) {
    assert.throws(() => salesReply(key, { ...complete, extrasBs: '1e3' }), /importe/);
    assert.throws(() => salesReply(key, { ...complete, packageKey: 'invalid' }), /paquete/);
  }
});

test('validation is pure and keeps raw decimal input available for correction or recovery', () => {
  for (const extrasBs of ['12,', '270,50', '0.105']) {
    const input = Object.freeze({ ...complete, extrasBs });
    const before = JSON.stringify(input);
    validateSalesQuote(input);
    assert.equal(JSON.stringify(input), before);
    assert.equal(input.extrasBs, extrasBs);
  }
});

const reference = 'EK-A1B2C3D4';
const contactLead = (patch = {}) => ({
  id: '30000000-0000-4000-8000-000000000100', reference, status: 'contacted', package_key: 'premium', design: 'Lunaria', event_category: 'Boda',
  placement: 'qa', utm_source: '', utm_medium: '', utm_campaign: '', referrer_host: '', revenue_bs: null, notes: 'QA nota ficticia', revision: 0,
  created_at: '2001-01-01T12:00:00Z', updated_at: '2026-10-19T12:00:00Z', ...patch,
});
const memoryStorage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; };
const scope = 'a'.repeat(64), now = 1800000000000;
const invalidReferences = [null, true, 123, [], [reference], {}, new String(reference), 'ENK-A1B2C3D4', 'EK-a1b2c3d4', 'ek-A1B2C3D4', ' EK-A1B2C3D4', 'EK-A1B2C3D4 ', 'EK-A1B2C3D', 'EK-A1B2C3D45', 'EK-A1B2C3G4', `${reference}\n`, `${reference}\r`, `${reference}\u0000`, `${reference}\u007f`];

test('commercial quotation references are optional and never change the existing prices or readiness', () => {
  const baseline = formatSalesQuote(complete);
  for (const commercialReference of [undefined, '']) {
    const input = { ...complete, commercialReference };
    assert.equal(validateSalesQuote(input).ready, true); assert.deepEqual(salesQuoteTotals(input), salesQuoteTotals(complete));
    assert.equal(formatSalesQuote(input), baseline); assert.doesNotMatch(formatSalesQuote(input), /Referencia comercial:/);
  }
  assert.equal(validateSalesQuote({ packageKey: 'premium' }).missing.includes('commercialReference'), false);
});

test('canonical EK references appear once in complete proposals and incomplete drafts', () => {
  assert.equal(isSalesCommercialReference(reference), true);
  for (const source of [complete, { packageKey: 'premium' }]) {
    const input = { ...source, commercialReference: reference }, text = formatSalesQuote(input);
    assert.equal(validateSalesQuote(input).errors.commercialReference, undefined);
    assert.equal((text.match(/Referencia comercial: EK-A1B2C3D4/g) || []).length, 1);
    assert.deepEqual(salesQuoteTotals(input), salesQuoteTotals(source)); assert.doesNotMatch(text, /pago confirmado|BCP habilitado/i);
  }
});

test('commercial references reject payment codes, noncanonical text, controls and coercion', () => {
  for (const commercialReference of invalidReferences) {
    assert.equal(isSalesCommercialReference(commercialReference), false);
    const result = validateSalesQuote({ ...complete, commercialReference });
    assert.ok(result.errors.commercialReference, String(commercialReference)); assert.equal(result.ready, false);
    assert.throws(() => formatSalesQuote({ ...complete, commercialReference }), /inválidos/);
  }
});

test('a linked draft recovers its exact reference and excludes the commercial snapshot and bank data', () => {
  const storage = memoryStorage(), input = { ...complete, commercialReference: reference, id: 'QA_PRIVATE_ID', notes: 'QA_PRIVATE_NOTE', revenue_bs: 930, session_hash: 'QA_PRIVATE_SESSION', accessToken: 'QA_PRIVATE_TOKEN' };
  assert.equal(saveSalesDraft(storage, scope, input, now), true);
  const raw = storage.getItem(salesDraftKey(scope)); assert.equal(JSON.parse(raw).version, 2); assert.doesNotMatch(raw, /QA_PRIVATE|paymentInstructions|revenue_bs|session_hash|accessToken/);
  const { paymentInstructions, ...expected } = { ...complete, commercialReference: reference };
  assert.deepEqual(readSalesDraft(storage, scope, now + 1), { kind: 'ready', input: expected });
  assert.equal(paymentInstructions, complete.paymentInstructions); assert.match(formatSalesQuote({ ...readSalesDraft(storage, scope, now + 1).input, paymentInstructions }), /Referencia comercial: EK-A1B2C3D4/);
});

test('version one and two drafts remain readable with or without an optional reference and are never rewritten on read', () => {
  const storage = memoryStorage(), key = salesDraftKey(scope);
  for (const version of [1, 2]) for (const extra of [{}, { commercialReference: '' }, { commercialReference: reference }]) {
    const input = { packageKey: 'plus', eventType: '', design: '', extrasBs: 0, ...extra }, raw = JSON.stringify({ version, scope, savedAt: now, input });
    storage.setItem(key, raw); assert.deepEqual(readSalesDraft(storage, scope, now + 1), { kind: 'ready', input }); assert.equal(storage.getItem(key), raw);
  }
});

test('an invalid reference never replaces the recoverable draft or repairs malformed stored text', () => {
  const storage = memoryStorage(), key = salesDraftKey(scope), input = { packageKey: 'premium', commercialReference: reference };
  assert.equal(saveSalesDraft(storage, scope, input, now), true); const safe = storage.getItem(key);
  for (const commercialReference of invalidReferences) {
    assert.equal(saveSalesDraft(storage, scope, { ...input, commercialReference }, now), false); assert.equal(storage.getItem(key), safe);
  }
  for (const commercialReference of ['ENK-Q6MRGK', 'EK-a1b2c3d4', `${reference}\n`, null, 123, [], {}]) {
    const raw = JSON.stringify({ version: 2, scope, savedAt: now, input: { ...input, commercialReference } });
    storage.setItem(key, raw); assert.equal(readSalesDraft(storage, scope, now).kind, 'invalid'); assert.equal(storage.getItem(key), raw);
  }
});

test('linking a reference preserves the same strict session and expiry boundaries', () => {
  const storage = memoryStorage(), input = { packageKey: 'premium', commercialReference: reference };
  saveSalesDraft(storage, scope, input, now); const raw = storage.getItem(salesDraftKey(scope)), other = 'b'.repeat(64);
  assert.equal(readSalesDraft(storage, scope, now + SALES_DRAFT_TTL).kind, 'ready'); assert.equal(readSalesDraft(storage, scope, now + SALES_DRAFT_TTL + 1).kind, 'expired');
  assert.equal(readSalesDraft(storage, other, now).kind, 'empty'); storage.setItem(salesDraftKey(other), raw); assert.equal(readSalesDraft(storage, other, now).kind, 'invalid');
});

test('a validated historical contact yields only reference, event, design and package for quotation', () => {
  const source = contactLead({ password: 'QA_PRIVATE_PASSWORD', session_hash: 'QA_PRIVATE_SESSION', clientName: 'QA_PRIVATE_CLIENT', eventDate: '2028-05-01' });
  const context = salesQuoteContact(source);
  assert.deepEqual(context, { reference, eventType: 'Boda', design: 'Lunaria', packageKey: 'premium' });
  assert.doesNotMatch(JSON.stringify(context), /QA_PRIVATE|notes|revenue_bs|created_at|updated_at|id|status|eventDate/);
  assert.equal(source.password, 'QA_PRIVATE_PASSWORD'); assert.equal(source.created_at.slice(0, 4), '2001');
});

test('general contacts keep empty information and require an explicitly chosen quotation package', () => {
  const context = salesQuoteContact(contactLead({ package_key: 'general', design: '', event_category: '' }));
  assert.deepEqual(context, { reference, eventType: '', design: '', packageKey: null });
  for (const packageKey of [undefined, null, '', 'general', 'free', [], {}]) assert.equal(prepareSalesContactDraft(context, packageKey), null);
  const draft = prepareSalesContactDraft(context, 'plus');
  assert.deepEqual(draft, { commercialReference: reference, eventType: '', design: '', packageKey: 'plus', extrasBs: 0 });
  const validation = validateSalesQuote(draft); assert.deepEqual(validation.errors, {}); assert.equal(validation.ready, false);
  assert.ok(validation.missing.includes('eventType')); assert.ok(validation.missing.includes('design')); assert.doesNotMatch(JSON.stringify(draft), /Boda|premium/);
});

test('preparing another contact starts a clean draft without names, dates, extras or private values', () => {
  const context = { ...salesQuoteContact(contactLead()), clientName: 'QA_PREVIOUS_CLIENT', eventDate: '2028-02-29', extrasLabel: 'QA_PREVIOUS_EXTRA', extrasBs: 270.5, paymentInstructions: 'QA_PRIVATE_BANK', notes: 'QA_PRIVATE_NOTE' };
  const draft = prepareSalesContactDraft(context, 'premium');
  assert.deepEqual(draft, { commercialReference: reference, eventType: 'Boda', design: 'Lunaria', packageKey: 'premium', extrasBs: 0 });
  for (const field of ['clientName', 'eventDate', 'extrasLabel', 'paymentInstructions', 'notes']) assert.equal(Object.hasOwn(draft, field), false);
  assert.doesNotMatch(JSON.stringify(draft), /QA_PREVIOUS|QA_PRIVATE/); assert.equal(context.extrasBs, 270.5);
});

test('a known package remains suggested while an explicit different package is allowed', () => {
  for (const sourcePackage of ['plus', 'premium', 'exclusive']) {
    const context = salesQuoteContact(contactLead({ package_key: sourcePackage })); assert.equal(context.packageKey, sourcePackage);
    for (const chosen of ['plus', 'premium', 'exclusive']) {
      const draft = prepareSalesContactDraft(context, chosen); assert.equal(draft.packageKey, chosen); assert.equal(draft.commercialReference, reference); assert.equal(context.packageKey, sourcePackage);
    }
  }
});

test('quotation contact preparation rejects incomplete commercial snapshots and unsafe context', () => {
  for (const source of [null, [], {}, contactLead({ id: 'bad' }), contactLead({ revision: -1 }), contactLead({ notes: undefined }), contactLead({ package_key: 'free' }), contactLead({ reference: `${reference}\n` }), contactLead({ event_category: 'Boda\n' }), contactLead({ design: 'Lunaria\u0000' })]) assert.equal(salesQuoteContact(source), null);
  const context = salesQuoteContact(contactLead());
  for (const unsafe of [null, [], {}, { ...context, reference: 'ENK-Q6MRGK' }, { ...context, eventType: undefined }, { ...context, eventType: 'x'.repeat(51) }, { ...context, design: 'x'.repeat(101) }, { ...context, design: 'QA\n' }, { ...context, packageKey: 'general' }]) assert.equal(prepareSalesContactDraft(unsafe, 'premium'), null);
});

test('contact and draft preparation preserve immutable input and never infer missing customer data', () => {
  const source = Object.freeze(contactLead({ event_category: '', design: '', package_key: 'general' })), before = JSON.stringify(source), context = Object.freeze(salesQuoteContact(source));
  const draft = prepareSalesContactDraft(context, 'exclusive'); assert.equal(JSON.stringify(source), before);
  assert.deepEqual(context, { reference, eventType: '', design: '', packageKey: null });
  assert.equal(draft.clientName, undefined); assert.equal(draft.eventDate, undefined); assert.equal(draft.eventType, ''); assert.equal(draft.design, ''); assert.equal(draft.extrasBs, 0);
});
