// bench_cmd (Ticket-04 §1): node scripts/bench.mjs --seed 42 --duration 30 --out bench.json [--headless]
// Opens the BUILT game (dist/) in a real 1280x720 Chromium window with vsync and the frame-rate cap off,
// runs the standard bench scene (?bench=1) and writes bench.json. Needs `npm run build` first.
// Browser: Playwright's Chromium if installed (`npx playwright install chromium`), else installed Chrome or Edge.
import { execFile } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { chromium } from 'playwright';
import { preview } from 'vite';
import { ROOT } from './scenario-lib.mjs';

const t0 = Date.now() - process.uptime() * 1000; // process start (epoch ms)
const argv = process.argv.slice(2);
const opt = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const seed = Number(opt('seed', '42'));
const duration = Number(opt('duration', '30'));
const out = opt('out', 'bench.json');
const headless = argv.includes('--headless'); // CI smoke only: software GL, numbers meaningless
if (!Number.isInteger(seed) || !(duration > 0)) {
  console.error('usage: node scripts/bench.mjs --seed 42 --duration 30 --out bench.json');
  process.exit(1);
}
if (!existsSync(join(ROOT, 'dist', 'index.html'))) {
  console.error('error: dist/ not found — run `npm run build` first');
  process.exit(1);
}

const run = promisify(execFile);
/** RSS (MB) of a process and all its descendants (the browser, GPU and renderer processes). */
async function treeRssMb(rootPid) {
  let rows;
  if (process.platform === 'win32') {
    const { stdout } = await run('powershell', ['-NoProfile', '-Command',
      'Get-CimInstance Win32_Process | ForEach-Object { "$($_.ProcessId) $($_.ParentProcessId) $($_.WorkingSetSize)" }'], { windowsHide: true });
    rows = stdout.trim().split(/\r?\n/).map((l) => l.trim().split(/\s+/).map(Number));
  } else {
    const { stdout } = await run('ps', ['-A', '-o', 'pid=,ppid=,rss=']);
    rows = stdout.trim().split('\n').map((l) => l.trim().split(/\s+/).map(Number)).map(([p, pp, kb]) => [p, pp, kb * 1024]);
  }
  const kids = new Map();
  for (const [p, pp] of rows) (kids.get(pp) ?? kids.set(pp, []).get(pp)).push(p);
  const bytes = new Map(rows.map(([p, , b]) => [p, b]));
  let sum = 0;
  const stack = [rootPid];
  const seen = new Set();
  while (stack.length) {
    const p = stack.pop();
    if (seen.has(p)) continue;
    seen.add(p);
    sum += bytes.get(p) ?? 0;
    stack.push(...(kids.get(p) ?? []));
  }
  return sum / 1048576;
}

const ARGS = headless
  ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit']
  : ['--disable-gpu-vsync', '--disable-frame-rate-limit', '--ignore-gpu-blocklist', '--window-size=1296,800', '--window-position=40,40'];
async function launch() {
  const errs = [];
  for (const channel of [undefined, 'chrome', 'msedge']) {
    try {
      return await chromium.launchServer({ headless, channel, args: ARGS });
    } catch (e) {
      errs.push(`${channel ?? 'playwright-chromium'}: ${String(e.message).split('\n')[0]}`);
    }
  }
  throw new Error(`no browser could be launched. Run \`npx playwright install chromium\`.\n${errs.join('\n')}`);
}

const server = await preview({ root: ROOT, logLevel: 'silent', preview: { port: 4191, strictPort: false, open: false } });
const url = server.resolvedUrls.local[0];
const browserServer = await launch(); // launchServer exposes the browser process (for RSS)
const pid = browserServer.process().pid;
const browser = await chromium.connect(browserServer.wsEndpoint());
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

let peak = null;
let memNote = null;
let measuring = false;
const sampler = setInterval(async () => {
  if (!measuring || !pid) return;
  try {
    const v = await treeRssMb(pid);
    peak = Math.max(peak ?? 0, v);
  } catch (e) {
    memNote = `RSS sampling failed: ${e.message}`;
  }
}, 5000);

await page.goto(`${url}?bench=1&seed=${seed}&duration=${duration}`);
await page.waitForFunction(() => window.__benchMeasuring === true, null, { timeout: 60_000 });
measuring = true;
await page.waitForFunction(() => window.__bench !== undefined, null, { timeout: (duration + 60) * 1000, polling: 500 });
measuring = false;
clearInterval(sampler);
if (pid) {
  try {
    peak = Math.max(peak ?? 0, await treeRssMb(pid));
  } catch (e) {
    memNote = `RSS sampling failed: ${e.message}`;
  }
}
const b = await page.evaluate(() => window.__bench);
await browser.close();
await browserServer.close();
await new Promise((r) => server.httpServer.close(r));

const cpu = os.cpus()[0]?.model?.trim() ?? 'unknown CPU';
const report = {
  contract_version: '1.3',
  avg_fps: b.stats.avg_fps,
  p1_low_fps: b.stats.p1_low_fps,
  frame_ms_p95: b.stats.frame_ms_p95,
  frames: b.stats.frames,
  load_ms: Math.round(b.firstFrameEpochMs - t0),
  peak_mem_mb: peak === null ? null : Math.round(peak),
  vsync_off: true,
  renderer: `three.js r${b.three} WebGL2 · ${b.browser} · ${b.gpu}${headless ? ' (headless smoke, software GL)' : ''}`,
  os: `${os.type()} ${os.release()} ${os.arch()} · ${cpu} · ${Math.round(os.totalmem() / 2 ** 30)} GB RAM`,
  seed,
  duration_s: duration,
  measured_ms: Math.round(b.measuredMs),
  window: '1280x720 viewport, windowed',
  notes: [
    'vsync off: Chromium --disable-gpu-vsync --disable-frame-rate-limit (requestAnimationFrame uncapped).',
    'peak_mem_mb: sum of RSS (Windows: working set) of the browser process tree, sampled every 5 s while measuring.',
    'load_ms: from bench process start (includes starting the static server and the browser) to the first bench frame.',
    ...(memNote ? [memNote] : []),
    ...(errors.length ? [`page errors: ${errors.join(' | ')}`] : []),
  ],
};
writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log(`bench: avg ${report.avg_fps} fps, p1 low ${report.p1_low_fps}, p95 ${report.frame_ms_p95} ms, ${report.frames} frames, load ${report.load_ms} ms, peak ${report.peak_mem_mb} MB -> ${out}`);
process.exit(errors.length ? 1 : 0);
