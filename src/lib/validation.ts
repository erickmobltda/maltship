// Mirrors the Firestore rules, so the UI can explain a problem before the write is rejected.
export const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
export const MAX_TAGS = 6;
export const MAX_NOTES = 1000;
export const MAX_NAME = 40;
export const MAX_BIO = 160;

export const isValidHandle = (h: string) => HANDLE_RE.test(h);

/** Lower-case a typed handle and drop characters a handle can't have. */
export const cleanHandle = (h: string) => h.toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_]/g, '').slice(0, 20);

export function ratingProblems(r: { stars: number; tags: string[]; notes: string; experiencedOn: string }): string[] {
  const out: string[] = [];
  if (!(r.stars >= 0.5 && r.stars <= 5 && Number.isInteger(r.stars * 2))) out.push('stars');
  if (r.tags.length > MAX_TAGS) out.push('tags');
  if (r.notes.length > MAX_NOTES) out.push('notes');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.experiencedOn)) out.push('experiencedOn');
  return out;
}
