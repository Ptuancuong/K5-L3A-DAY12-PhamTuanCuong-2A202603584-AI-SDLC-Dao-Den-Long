// Leaderboard client. Primary store: save/leaderboard.json on local disk through /api/leaderboard
// (npm start, npm run dev, vite preview). Fallback when the page is served by another static server:
// the browser's localStorage (also on disk, per browser profile).
import {
  insertEntry,
  sortEntries,
  validEntry,
  type LbEntry,
} from "../shared/leaderboard";

const LS = "dao-den-long-leaderboard";
const API = "api/leaderboard";
export type Source = "disk" | "browser";

function lsRead(): LbEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LS) ?? "[]");
    return sortEntries(
      (Array.isArray(raw) ? raw : [])
        .map(validEntry)
        .filter((e): e is LbEntry => e !== null),
    );
  } catch {
    return [];
  }
}
function lsWrite(list: LbEntry[]) {
  try {
    localStorage.setItem(LS, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
}

export async function fetchBoard(): Promise<{
  entries: LbEntry[];
  source: Source;
}> {
  try {
    const r = await fetch(API, { cache: "no-store" });
    if (r.ok)
      return {
        entries: ((await r.json()) as { entries: LbEntry[] }).entries,
        source: "disk",
      };
  } catch {
    /* no API */
  }
  return { entries: lsRead(), source: "browser" };
}

export async function submitEntry(
  e: LbEntry,
): Promise<{ rank: number; source: Source }> {
  try {
    const r = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(e),
    });
    if (r.ok)
      return {
        rank: ((await r.json()) as { rank: number }).rank,
        source: "disk",
      };
    if (r.status === 400) throw new Error("invalid");
  } catch (err) {
    if ((err as Error).message === "invalid") throw err;
  }
  const res = insertEntry(lsRead(), e);
  lsWrite(res.entries);
  return { rank: res.rank, source: "browser" };
}
