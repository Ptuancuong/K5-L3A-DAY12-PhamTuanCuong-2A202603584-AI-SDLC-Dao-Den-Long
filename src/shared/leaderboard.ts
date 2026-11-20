// Ticket-04 §3: local leaderboard rules (pure; shared by the browser, the dev/preview server and serve.mjs).
export interface LbEntry {
  name: string;
  score: number;
  nights_won: number;
  achieved_at: string; // ISO 8601 with a timezone offset
  seed: number;
}

export const LB_MAX = 10;
export const NAME_MIN = 3;
export const NAME_MAX = 12;

/** 3-12 characters of [A-Za-z0-9_]; Vietnamese letters with diacritics are also accepted (bonus).
 *  Returns the NFC-normalised, trimmed name, or null if invalid. Length counts code points after NFC. */
export function normalizeName(raw: string): string | null {
  const n = String(raw).normalize("NFC").trim();
  const len = [...n].length;
  if (len < NAME_MIN || len > NAME_MAX) return null;
  return /^[\p{Script=Latin}0-9_]+$/u.test(n) ? n : null;
}

const ISO_TZ =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
export const isIsoWithZone = (s: unknown): s is string =>
  typeof s === "string" && ISO_TZ.test(s) && Number.isFinite(Date.parse(s));

/** Local time with its UTC offset, e.g. 2026-11-20T18:05:09+07:00. */
export function isoWithOffset(d: Date): string {
  const pad = (v: number) => String(Math.floor(Math.abs(v))).padStart(2, "0");
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${pad(off / 60)}:${pad(off % 60)}`
  );
}

/** Checks and cleans one entry (from a POST body or the save file). */
export function validEntry(e: unknown): LbEntry | null {
  if (typeof e !== "object" || e === null) return null;
  const o = e as Record<string, unknown>;
  const name = typeof o.name === "string" ? normalizeName(o.name) : null;
  if (!name) return null;
  const int = (v: unknown, lo: number, hi: number) =>
    typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi;
  if (!int(o.score, 0, Number.MAX_SAFE_INTEGER) || !int(o.nights_won, 0, 3))
    return null;
  if (
    !int(o.seed, -(2 ** 53) + 1, 2 ** 53 - 1) ||
    !isIsoWithZone(o.achieved_at)
  )
    return null;
  return {
    name,
    score: o.score as number,
    nights_won: o.nights_won as number,
    achieved_at: o.achieved_at as string,
    seed: o.seed as number,
  };
}

/** Higher score first; equal score: earlier achieved_at first (instants compared, so offsets are fine).
 *  Array.prototype.sort is stable, so an exact tie keeps the older entry above. */
export function sortEntries(list: LbEntry[]): LbEntry[] {
  return [...list].sort(
    (a, b) =>
      b.score - a.score ||
      Date.parse(a.achieved_at) - Date.parse(b.achieved_at),
  );
}

/** Adds an entry and keeps the top 10. rank is 1-based, or 0 when it did not make the top 10. */
export function insertEntry(
  list: LbEntry[],
  e: LbEntry,
): { entries: LbEntry[]; rank: number } {
  const all = sortEntries([...list, e]);
  const idx = all.indexOf(e);
  return { entries: all.slice(0, LB_MAX), rank: idx < LB_MAX ? idx + 1 : 0 };
}
