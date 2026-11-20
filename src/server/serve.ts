// run_cmd: serves the built game (dist/) with the leaderboard API, and opens the browser.
//   node build/serve.mjs [--port 4173] [--no-open]
//   node build/serve.mjs --export-leaderboard out.json     (contract: writes {"entries": [...]} and exits)
import { spawn } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { boardPath, exportBoard, leaderboardApi } from "./api";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function args(argv: string[]) {
  const a: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith("--")) continue;
    const v = argv[i + 1];
    if (v !== undefined && !v.startsWith("--")) {
      a[k.slice(2)] = v;
      i++;
    } else a[k.slice(2)] = true;
  }
  return a;
}

const a = args(process.argv.slice(2));
const here = dirname(fileURLToPath(import.meta.url));
// The leaderboard lives next to the game (package root/save), whatever the working directory is.
process.env.DDL_SAVE_DIR ??= join(here, "..", "save");
// `npm start --export-leaderboard out.json` (without "--") reaches us as an npm config variable.
const npmExport = process.env.npm_config_export_leaderboard;
const exportTo =
  typeof a["export-leaderboard"] === "string"
    ? a["export-leaderboard"]
    : npmExport && npmExport !== "true"
      ? npmExport
      : npmExport === "true" &&
          process.argv[2] &&
          !process.argv[2].startsWith("--")
        ? process.argv[2]
        : undefined;

if (exportTo !== undefined || a["export-leaderboard"] === true) {
  if (!exportTo) {
    process.stderr.write("error: --export-leaderboard needs a file name\n");
    process.exit(1);
  }
  const n = exportBoard(exportTo);
  process.stdout.write(
    `exported ${n} entries from ${boardPath()} to ${exportTo}\n`,
  );
  process.exit(0);
}

const root = [join(here, "..", "dist"), join(process.cwd(), "dist")].find((d) =>
  existsSync(join(d, "index.html")),
);
if (!root) {
  process.stderr.write("error: dist/ not found — run `npm run build` first\n");
  process.exit(1);
}
const rootAbs = resolve(root);

const server = createServer((req, res) => {
  leaderboardApi(req, res, () => {
    let path: string;
    try {
      path = decodeURIComponent((req.url ?? "/").split("?")[0]);
    } catch {
      res.statusCode = 400; // malformed %-escape: refuse instead of crashing the server
      return res.end("bad request");
    }
    let file = normalize(join(rootAbs, path === "/" ? "index.html" : path));
    if (!file.startsWith(rootAbs + sep) && file !== rootAbs) {
      res.statusCode = 403;
      return res.end();
    }
    if (existsSync(file) && statSync(file).isDirectory())
      file = join(file, "index.html");
    if (!existsSync(file)) {
      res.statusCode = 404;
      return res.end("not found");
    }
    res.setHeader(
      "Content-Type",
      MIME[extname(file)] ?? "application/octet-stream",
    );
    res.end(readFileSync(file));
  });
});

let port = Number(typeof a.port === "string" ? a.port : 4173);
server.on("error", (e: NodeJS.ErrnoException) => {
  if (e.code === "EADDRINUSE" && port < 4200)
    server.listen(++port, "127.0.0.1");
  else throw e;
});
server.on("listening", () => {
  const url = `http://localhost:${port}/`;
  process.stdout.write(
    `Đảo Đèn Lồng: ${url}  (leaderboard: ${boardPath()})  — Ctrl+C to stop\n`,
  );
  if (a["no-open"] || process.env.CI) return;
  const cmd =
    process.platform === "win32"
      ? "cmd"
      : process.platform === "darwin"
        ? "open"
        : "xdg-open";
  const cargs = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  try {
    spawn(cmd, cargs, { stdio: "ignore", detached: true })
      .on("error", () => {})
      .unref();
  } catch {
    /* no browser launcher: open the URL by hand */
  }
});
server.listen(port, "127.0.0.1");
