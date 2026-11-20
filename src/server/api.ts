// Leaderboard storage on local disk + the /api/leaderboard HTTP handler.
// Used by build/serve.mjs (npm start) and by the Vite dev/preview servers (vite.config.ts), so the
// game saves to the same file however it is run.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { dirname, join, resolve } from "node:path";
import {
  insertEntry,
  sortEntries,
  validEntry,
  LB_MAX,
  type LbEntry,
} from "../shared/leaderboard";

/** save/leaderboard.json under the working directory, or under $DDL_SAVE_DIR. */
export function boardPath(): string {
  return join(
    resolve(process.env.DDL_SAVE_DIR ?? join(process.cwd(), "save")),
    "leaderboard.json",
  );
}

export function readBoard(path = boardPath()): LbEntry[] {
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as { entries?: unknown };
    const list = Array.isArray(raw.entries) ? raw.entries : [];
    return sortEntries(
      list.map(validEntry).filter((e): e is LbEntry => e !== null),
    ).slice(0, LB_MAX);
  } catch {
    return []; // no file yet (or unreadable): empty board
  }
}

export function writeBoard(entries: LbEntry[], path = boardPath()): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify({ entries }, null, 2) + "\n");
  renameSync(tmp, path); // atomic replace: a crash never leaves a half-written board
}

export function addToBoard(
  e: LbEntry,
  path = boardPath(),
): { entries: LbEntry[]; rank: number } {
  const r = insertEntry(readBoard(path), e);
  writeBoard(r.entries, path);
  return r;
}

/** Contract export format: {"entries": [...]} in leaderboard order. */
export function exportBoard(out: string, path = boardPath()): number {
  const entries = readBoard(path);
  writeFileSync(out, JSON.stringify({ entries }, null, 2) + "\n");
  return entries.length;
}

function send(res: ServerResponse, code: number, body: unknown) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

/** Connect-style middleware: handles /api/leaderboard, passes everything else on. */
export function leaderboardApi(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
): void {
  const url = (req.url ?? "").split("?")[0];
  if (!url.endsWith("/api/leaderboard")) return next();
  if (req.method === "GET") return send(res, 200, { entries: readBoard() });
  if (req.method !== "POST") return send(res, 405, { error: "GET or POST" });
  // Only the game page itself may write: local Host, same-origin (or no) Origin, JSON body.
  // Blocks other web pages open in the browser (CSRF) and DNS-rebinding hosts.
  const host = req.headers.host ?? "";
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host))
    return send(res, 403, { error: "local host only" });
  const origin = req.headers.origin;
  if (origin !== undefined) {
    let ok = false;
    try {
      ok = new URL(origin).host === host;
    } catch {
      ok = false;
    }
    if (!ok) return send(res, 403, { error: "cross-origin write refused" });
  }
  if (!String(req.headers["content-type"] ?? "").includes("application/json"))
    return send(res, 415, { error: "Content-Type must be application/json" });
  let body = "";
  req.setEncoding("utf8");
  req.on("data", (c: string) => {
    body += c;
    if (body.length > 10_000) req.destroy();
  });
  req.on("end", () => {
    let e: LbEntry | null = null;
    try {
      e = validEntry(JSON.parse(body));
    } catch {
      /* bad JSON */
    }
    if (!e)
      return send(res, 400, {
        error: "invalid entry (name: 3-12 letters, digits or _)",
      });
    send(res, 200, addToBoard(e));
  });
}
