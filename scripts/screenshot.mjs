// Opens the BUILT game (dist/) in headless Chromium and saves screenshots as evidence.
// Usage: npm run build && node scripts/screenshot.mjs [phase-N]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { preview } from 'vite';
import { ROOT } from './scenario-lib.mjs';

const phase = process.argv[2] ?? 'phase-2';
const dir = join(ROOT, 'docs', 'proof', phase, 'screenshots');
mkdirSync(dir, { recursive: true });

const server = await preview({ root: ROOT, preview: { port: 4190, strictPort: false, open: false } });
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

const OFF = { random_drifters: false };
const game = (night, sc) => `${url}?seed=1&autoplay=1&night=${night}${sc ? `&scenario=${encodeURIComponent(JSON.stringify(sc))}` : ''}`;
const log = [];
async function shot(name, what) {
  await page.screenshot({ path: join(dir, name) });
  log.push(`| ${name} | ${what} |`);
  console.log('saved', name);
}
async function press(key, ms = 200) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

await page.goto(`${url}?seed=1`);
await page.waitForTimeout(1200);
await shot('01-menu.png', 'Menu chính');
await page.click('[data-act="start"]');
await page.waitForTimeout(500);
await shot('02-intro-night1.png', 'Giới thiệu Đêm 1 — Đảo Bến, lời Ông Đăng');

await page.goto(game(1));
await page.waitForTimeout(1500);
await shot('03-night1-hud.png', 'Đêm 1: HUD chuẩn (lửa trái, đồng hồ giữa, đèn/điểm phải, thanh đom đóm 10 ô, hồi chiêu Lướt/Tỏa sáng), mũi tên chỉ đèn');
await page.goto(game(1, { ...OFF, player: { pos: [0, 0, 23.5], carried: 7 }, lanterns: [{ id: 'L1', deposited: 4 }] }));
await page.waitForTimeout(1200);
await shot('04-prompt-near-lantern.png', 'Nhắc "E — Nạp ánh sáng (4/10)" khi đứng gần đèn; thanh đom đóm 7/10');
await page.goto(game(1, { ...OFF, player: { pos: [0, 0, 18] }, lanterns: [{ id: 'L1', lit: true }, { id: 'L2', lit: true }, { id: 'L5', lit: true }] }));
await page.waitForTimeout(1500);
await shot('05-night1-three-lit.png', 'Ánh sáng môi trường tăng theo tiến độ (3/5 đèn), vùng an toàn 6 m');
await page.goto(game(1, { ...OFF, random_shades: false, player: { carried: 6 }, shades: [{ id: 'S1', pos: [0, 1, 4] }, { id: 'S2', pos: [2, 1, 3] }] }));
await page.waitForTimeout(800);
await press('KeyF', 250);
await page.waitForTimeout(250);
await shot('06-pulse-stun.png', 'Tỏa Sáng: vòng sáng, Bóng Mực bị choáng đổi màu #3A3450');
await press('Escape', 100);
await page.waitForTimeout(500);
await shot('07-pause-menu.png', 'Tạm dừng: Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu');
await page.click('#scr-pause [data-act="settings"]');
await page.waitForTimeout(300);
await shot('08-settings.png', 'Cài đặt: âm lượng, độ nhạy chuột (lưu localStorage)');

await page.goto(game(2, { ...OFF, player: { pos: [24, 0, 4] } }));
await page.waitForTimeout(1800);
await shot('09-night2-bridge.png', 'Đêm 2 — Đảo Cau: hai đảo, cầu tre, bục nhảy, Bùa Gió');
await page.goto(game(2, { random_shades: false, player: { pos: [6, 0, 0], carried: 6 }, drifters: [{ id: 'D1', pos: [10, 1, 2] }] }));
await page.waitForTimeout(1000);
await shot('10-night2-drifter.png', 'Gió Lạc (dải lụa xám xanh #8FA3B8) vừa cướp 3 đom đóm (6 → 3) rồi bỏ chạy');

await page.goto(game(3, { ...OFF, player: { pos: [0, 0, -30] } }));
await page.waitForTimeout(1800);
await shot('11-night3-tiers.png', 'Đêm 3 — Đảo Chuông: 3 tầng, dốc, tháp chuông');
await page.goto(game(3, { ...OFF, random_shades: false, player: { pos: [26, 0, 22] } }));
await page.waitForTimeout(1800);
await shot('12-night3-ramp.png', 'Đêm 3: dốc lên tầng 1 và Bùa Gió');

await page.goto(game(1, { ...OFF, random_shades: false, player: { pos: [0, 0, 24], carried: 10 }, lanterns: ['L2', 'L3', 'L4', 'L5'].map((id) => ({ id, lit: true })) }));
await page.waitForTimeout(800);
await press('KeyE', 150);
await page.waitForTimeout(700);
await shot('13-result-won.png', 'Kết quả thắng Đêm 1 → Đêm kế tiếp');
await page.click('#res-next');
await page.waitForTimeout(500);
await shot('14-intro-night2.png', 'Chuỗi Đêm: giới thiệu Đêm 2 sau khi thắng Đêm 1');

await page.goto(game(3, { ...OFF, random_shades: false, player: { pos: [-35, 0, -8], carried: 10 }, lanterns: ['L1', 'L2', 'L3', 'L4', 'L6', 'L7'].map((id) => ({ id, lit: true })) }));
await page.waitForTimeout(800);
await press('KeyE', 150);
await page.waitForTimeout(700);
await shot('15-dawn.png', 'Thắng Đêm 3 → màn hình Bình Minh với tổng điểm');

await page.goto(game(1, { ...OFF, random_shades: false, time_left_s: 25 }));
await page.waitForTimeout(1200);
await shot('16-timer-danger.png', 'Đồng hồ đỏ #FF5A5F, nhấp nháy khi ≤ 30 s');

await browser.close();
await server.httpServer.close();
writeFileSync(join(dir, 'README.md'), `# Screenshots — ${phase}\n\nTaken by \`npm run shot -- ${phase}\` (Playwright, headless Chromium, 1280×720, software WebGL).\n\n| File | Shows |\n|---|---|\n${log.join('\n')}\n`);
if (errors.length) {
  console.error('page errors:\n' + errors.join('\n'));
  process.exit(1);
}
