function equalJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const left = Object.keys(a), right = Object.keys(b);
  return left.length === right.length && left.every(key => Object.prototype.hasOwnProperty.call(b, key)
    && equalJson((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
}

/** SQL advances a content revision only when the stored content changes. */
export function acknowledgesBuilderSave(stored: unknown, payload: Record<string, unknown>, expected: number): boolean {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return false;
  const row = stored as Record<string, unknown>;
  if (!Number.isSafeInteger(row.draft_revision) || ('id' in row && row.id !== payload.id)) return false;
  if (row.draft_revision === expected + 1) return true;
  if (row.draft_revision !== expected || row.id !== payload.id) return false;
  // An unchanged revision needs the complete echoed content, not just a number.
  const jsonFields = new Set(['parents_groom', 'parents_bride', 'sponsors', 'itinerary']);
  return Object.entries(payload).every(([key, value]) => {
    if (key === 'status' || value === undefined) return true; // Publication is controlled separately.
    let actual = row[key];
    if (jsonFields.has(key) && typeof actual === 'string') {
      try { actual = JSON.parse(actual); } catch { return false; }
    }
    // Compare the JSON representation actually sent, including omitted nested fields.
    return equalJson(actual, JSON.parse(JSON.stringify(value)));
  });
}
