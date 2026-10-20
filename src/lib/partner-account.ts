export interface PartnerProfile {
  email: string; name: string; avatar: string; brand: string;
  phone: string; city: string; status: 'active' | 'suspended'; memberSince: string;
}
export type ProfileFields = Pick<PartnerProfile, 'brand' | 'phone' | 'city'>;
export const PROFILE_FIELDS = ['brand', 'phone', 'city'] as const;
const PROFILE_KEYS = ['email', 'name', 'avatar', 'brand', 'phone', 'city', 'status', 'memberSince'] as const;

export function validPartnerProfile(value: unknown): value is PartnerProfile {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const profile = value as Record<string, unknown>;
  return ['email', 'name', 'avatar', 'brand', 'phone', 'city'].every(key => typeof profile[key] === 'string')
    && typeof profile.status === 'string' && ['active', 'suspended'].includes(profile.status)
    && typeof profile.memberSince === 'string' && Number.isFinite(Date.parse(profile.memberSince));
}
export const sameProfileIdentity = (left: PartnerProfile, right: PartnerProfile) => left.email === right.email && left.memberSince === right.memberSince;
export const samePartnerProfile = (left: PartnerProfile, right: PartnerProfile) => PROFILE_KEYS.every(key => left[key] === right[key]);
export const sameProfileFields = (left: ProfileFields, right: ProfileFields) => PROFILE_FIELDS.every(key => left[key] === right[key]);
export const profileFields = (profile: ProfileFields): ProfileFields => ({ brand: profile.brand, phone: profile.phone, city: profile.city });
/** Same order and limits as PUT /api/partner/account. */
export function normalizedProfileFields(fields: ProfileFields): ProfileFields {
  const clean = (value: string, max: number) => value.trim().replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, max);
  return { brand: clean(fields.brand, 80), phone: clean(fields.phone, 30), city: clean(fields.city, 60) };
}

interface ProfileSubmission { fields: ProfileFields; identity: PartnerProfile }
export interface ProfileSaveAttempt {
  kind: 'save' | 'check'; controller: AbortController; epoch: number; revision: number;
  baseline: PartnerProfile; submission: ProfileSubmission;
}

/** One dashboard's profile lane. No shared cache, persistence or automatic writes. */
export class PartnerProfileSave {
  private canonical: PartnerProfile;
  private epoch = 0;
  private revision = 0;
  private active: ProfileSaveAttempt | null = null;
  private pending: ProfileSubmission | null = null;
  private confirmed = false;
  private editorDraft: { fields: ProfileFields; dirty: (keyof ProfileFields)[] } | null = null;
  constructor(profile: PartnerProfile) { this.canonical = { ...profile }; }
  get needsCheck() { return this.pending !== null; }
  get busy() { return this.active !== null; }
  get profile() { return this.canonical; }
  get draft() { return this.editorDraft ? { fields: { ...this.editorDraft.fields }, dirty: [...this.editorDraft.dirty] } : null; }
  rememberDraft(fields: ProfileFields, dirty: Set<keyof ProfileFields>) { this.editorDraft = { fields: { ...fields }, dirty: [...dirty] }; }

  observe(profile: PartnerProfile) {
    if (!samePartnerProfile(this.canonical, profile)) this.revision += 1;
    if (!sameProfileIdentity(this.canonical, profile)) {
      this.epoch += 1;
      const previous = this.active; this.active = null;
      previous?.controller.abort(); this.pending = null; this.confirmed = false; this.editorDraft = null;
    }
    this.canonical = { ...profile };
    if (this.editorDraft) for (const key of PROFILE_FIELDS) {
      if (!this.editorDraft.dirty.includes(key)) this.editorDraft.fields[key] = profile[key];
    }
  }
  alreadySaved(fields: ProfileFields) { return this.confirmed && sameProfileFields(this.canonical, fields); }
  begin(kind: 'save' | 'check', fields: ProfileFields): ProfileSaveAttempt | null {
    if (this.active || (kind === 'save' && (this.pending || this.alreadySaved(fields))) || (kind === 'check' && !this.pending)) return null;
    if (kind === 'save') this.pending = { fields: { ...fields }, identity: { ...this.canonical } };
    const attempt: ProfileSaveAttempt = {
      kind, controller: new AbortController(), epoch: this.epoch, revision: this.revision,
      baseline: { ...this.canonical }, submission: this.pending!,
    };
    this.active = attempt;
    return attempt;
  }
  owns(attempt: ProfileSaveAttempt) { return this.active === attempt && this.epoch === attempt.epoch && !attempt.controller.signal.aborted; }
  canApply(attempt: ProfileSaveAttempt, profile: PartnerProfile) {
    return this.owns(attempt) && sameProfileIdentity(attempt.submission.identity, profile)
      && ((this.revision === attempt.revision && samePartnerProfile(this.canonical, attempt.baseline)) || samePartnerProfile(this.canonical, profile));
  }
  matches(attempt: ProfileSaveAttempt, profile: PartnerProfile) { return sameProfileFields(attempt.submission.fields, profile); }
  finish(attempt: ProfileSaveAttempt, outcome: 'confirmed' | 'rejected' | 'uncertain') {
    if (this.active !== attempt) return;
    this.active = null;
    if (outcome !== 'uncertain') this.pending = null;
    if (outcome === 'confirmed') this.confirmed = true;
    attempt.controller.abort();
  }
  cancel(attempt: ProfileSaveAttempt) { this.finish(attempt, 'uncertain'); }
  dispose() { if (this.active) this.cancel(this.active); }
}
