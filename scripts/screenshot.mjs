// Opens the BUILT game (dist/) in headless Chromium and saves screenshots as evidence.
// Usage: npm run build && node scripts/screenshot.mjs [phase-N]
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { preview } from 'vite';
import { ROOT } from './scenario-lib.mjs';

const phase = process.argv[2] ?? 'phase-1';
const dir = join(ROOT, 'docs', 'proof', phase, 'screenshots');
mkdirSync(dir, { recursive: true });

const server = await preview({ root: ROOT, preview: { port: 4190, strictPort: false, open: false } });
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

const sc = (o) => `${url}?seed=1&scenario=${encodeURIComponent(JSON.stringify(o))}`;
const shots = [
  { name: '01-start.png', url: `${url}?seed=1`, wait: 1500, what: 'Đêm 1 start: Mây (nón lá + đèn nhỏ), đom đóm, 5 đèn tắt, HUD' },
  { name: '02-walk.png', url: `${url}?seed=1`, wait: 500, keys: [['KeyW', 1500]], what: 'W moves Mây forward; camera follows' },
  {
    name: '03-near-lantern.png',
    url: sc({ player: { pos: [0, 0, 23], carried: 4 }, random_shades: false }),
    wait: 1200,
    what: 'Prompt "Nhấn E để nạp" near L1',
  },
  {
    name: '04-three-lit.png',
    url: sc({ player: { pos: [0, 0, 20] }, lanterns: [{ id: 'L1', lit: true }, { id: 'L2', lit: true }, { id: 'L5', lit: true }] }),
    wait: 1500,
    what: 'Island brighter with 3 lit lanterns; safe-radius rings',
  },
  {
    name: '05-shade-pulse.png',
    url: sc({ random_shades: false, player: { carried: 4 }, shades: [{ id: 'S1', pos: [0, 1, 6] }, { id: 'S2', pos: [3, 1, 7] }] }),
    wait: 800,
    keys: [['KeyF', 150]],
    after: 250,
    what: 'Pulse ring; stunned shades turn pale',
  },
  {
    name: '06-won.png',
    url: sc({ random_shades: false, player: { pos: [0, 0, 24], carried: 5 }, lanterns: ['L2', 'L3', 'L4', 'L5'].map((id) => ({ id, lit: true })) }),
    wait: 800,
    keys: [['KeyE', 150]],
    after: 600,
    what: 'Win overlay with score and replay hint',
  },
  {
    name: '07-lost.png',
    url: sc({ random_shades: false, player: { flames: 1 }, shades: [{ pos: [0.5, 1, 0] }] }),
    wait: 1200,
    what: 'Lose overlay (no flames)',
  },
];

for (const s of shots) {
  await page.goto(s.url);
  await page.waitForTimeout(s.wait);
  for (const [key, ms] of s.keys ?? []) {
    await page.keyboard.down(key);
    await page.waitForTimeout(ms);
    await page.keyboard.up(key);
  }
  if (s.after) await page.waitForTimeout(s.after);
  await page.screenshot({ path: join(dir, s.name) });
  console.log(`saved ${s.name} — ${s.what}`);
}

// Replay check: press R on the lost screen -> a fresh game (overlay hidden).
await page.keyboard.press('KeyR');
await page.waitForTimeout(500);
const overlayHidden = await page.$eval('#overlay', (el) => getComputedStyle(el).display === 'none');
await page.screenshot({ path: join(dir, '08-replay.png') });
console.log(`saved 08-replay.png — after R on lose screen, overlay hidden: ${overlayHidden}`);

await browser.close();
await server.httpServer.close();
if (errors.length) {
  console.error('page errors:\n' + errors.join('\n'));
  process.exit(1);
}
if (!overlayHidden) process.exit(1);
