// Opens the BUILT game (dist/) in headless Chromium and saves screenshots as evidence.
// Usage: npm run build && node scripts/screenshot.mjs [phase-N]
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { preview } from 'vite';
import { ROOT } from './scenario-lib.mjs';

const phase = process.argv[2] ?? 'phase-2';
const dir = join(ROOT, 'docs', 'proof', phase, 'screenshots');
mkdirSync(dir, { recursive: true });

// Leaderboard saves of this run go to a scratch folder (the dev/preview API writes to $DDL_SAVE_DIR).
const saveDir = join(ROOT, 'tmp', 'shot-save');
rmSync(saveDir, { recursive: true, force: true });
process.env.DDL_SAVE_DIR = saveDir;

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

// ---- Phase 2 set (Ticket-02). Shots 13-15 rely on the early win removed by Ticket-03, so this set only
// runs for phase-2; its PNGs stay valid for the code at tag phase-2.
if (phase === 'phase-2') {
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

}

// ---- Phase 3 (Ticket-03) ----
if (phase === 'phase-3') {
  const P3 = { ...OFF, random_shades: false, player: { pos: [0, 0, 16] }, lanterns: [{ id: 'L1', lit: true, fuel: 80 }, { id: 'L2', lit: true, fuel: 25 }, { id: 'L5', lit: false, ever_lit: true }] };
  await page.goto(game(1, P3));
  await page.waitForTimeout(1500);
  await shot('p3-01-fuel-bars.png', 'Thanh dầu trên đèn sáng (L1 80, L2 25 nhấp nháy 1 Hz, mất vòng an toàn); HUD "giữ ≥ 3 tới bình minh", "Mang 0/10"');
  await page.goto(game(1, { ...OFF, random_shades: false, player: { pos: [0, 0, 14] }, lanterns: [{ id: 'L1', lit: true, fuel: 22 }], shades: [{ id: 'S1', pos: [0.8, 1, 23.5], state: 'drain', target_lantern_id: 'L1' }] }));
  await page.waitForTimeout(1500);
  await shot('p3-02-drain.png', 'Bóng Mực trạng thái drain đứng hút dầu ở đèn yếu (fuel < 30)');
  await page.goto(game(1, { ...P3, time_left_s: 25, shades: [{ id: 'S1', pos: [3, 1, 22] }] }) + '&cb=1');
  await page.waitForTimeout(1500);
  await shot('p3-03-colorblind.png', 'Bảng màu dễ phân biệt: viền/mắt Bóng Mực #00B3FF, đồng hồ cảnh báo trắng kèm ⚠, đèn tắt xẹp 20% + vết rách');
  await page.goto(game(1, { ...OFF, random_shades: false, player: { pos: [0, 0, -20] }, time_left_s: 1, lanterns: ['L1', 'L2', 'L3'].map((id) => ({ id, lit: true })) }));
  await page.waitForTimeout(2500);
  await shot('p3-04-dawn-survived.png', 'Hết giờ với 3/5 đèn sáng → thắng dawn_survived (không còn thắng sớm)');
}

// ---- Phase 4 (Ticket-04) ----
const extra = [];
if (phase === 'phase-4') {
  // Every visible text must be >= 18 px at 1280x720.
  const audit = [];
  async function fontAudit(where) {
    const r = await page.evaluate(() => {
      const bad = [];
      let min = Infinity;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent.trim()) continue;
        const el = n.parentElement;
        const st = getComputedStyle(el);
        if (!el.getClientRects().length || st.visibility === 'hidden' || Number(st.opacity) === 0) continue;
        const fs = parseFloat(st.fontSize);
        min = Math.min(min, fs);
        if (fs < 18) bad.push(`${el.tagName.toLowerCase()}#${el.id}: ${fs}px "${n.textContent.trim().slice(0, 30)}"`);
      }
      return { min, bad };
    });
    audit.push(`| ${where} | ${r.min} px | ${r.bad.length ? r.bad.join('<br>') : 'không có'} |`);
  }

  await page.goto(`${url}?bench=1&seed=42&duration=5`);
  await page.waitForTimeout(2500);
  await shot('p4-01-bench.png', 'Cảnh benchmark chuẩn (seed 42): 200 Bóng Mực wander, 100 đom đóm, L1–L3 sáng, camera bay vòng r 30 m, Y 15 m');

  await page.goto(`${url}?seed=1`);
  await page.waitForTimeout(1000);
  await shot('p4-02-menu.png', 'Menu chính có nút "Bảng xếp hạng"');
  await fontAudit('Menu');
  await page.click('#scr-menu [data-act="settings"]');
  await page.waitForTimeout(300);
  await page.click('#keymap button[data-action="jump"]');
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(200);
  await shot('p4-03-key-conflict.png', 'Đổi phím: gán "Nhảy" sang E bị từ chối, báo trùng với "Tương tác"; có "Khôi phục mặc định"; các tùy chọn phụ đề, giảm chuyển động, chữ lớn');
  await fontAudit('Cài đặt');
  await page.keyboard.press('KeyJ');
  await page.waitForTimeout(200);
  await shot('p4-04-key-rebound.png', '"Nhảy" đã đổi sang J (lưu localStorage)');
  await page.goto(game(1, { ...OFF, random_shades: false }));
  await page.waitForTimeout(1000);
  await shot('p4-05-hud-rebound.png', 'HUD và gợi ý phím cập nhật theo phím mới (J nhảy)');
  await page.goto(`${url}?seed=1`);
  await page.waitForTimeout(500);
  await page.click('#scr-menu [data-act="settings"]');
  await page.click('#key-reset');
  await page.waitForTimeout(200);
  await shot('p4-06-key-reset.png', 'Khôi phục mặc định');

  // Subtitles: shade spawn (sim tick 300 = 5 s) + edge arrow, last 10 s, lantern fuel < 30.
  await page.goto(game(1, { random_drifters: false, time_left_s: 14.6, lanterns: [{ id: 'L1', lit: true, fuel: 34.7 }] }));
  // software WebGL is slow, so the sim runs slower than real time: wait for the cues, not for a fixed time
  await page.waitForFunction(() => document.querySelectorAll('#subs div').length >= 3, null, { timeout: 60000 });
  await page.waitForTimeout(150);
  await shot('p4-07-subtitles.png', 'Phụ đề: "Bóng Mực xuất hiện" (+ mũi tên tím ở mép màn hình chỉ hướng bóng mới khi nó ngoài khung nhìn), "Còn 10 giây", "Đèn L1 sắp cạn dầu"');
  await fontAudit('Đang chơi (HUD + phụ đề)');
  await page.goto(game(3, { ...OFF, wind_enabled: true, random_shades: false }));
  await page.waitForFunction(() => document.getElementById('subs').textContent.includes('Gió'), null, { timeout: 180000, polling: 100 });
  await shot('p4-08-wind-warning.png', 'Phụ đề "Gió sắp thổi!" 2 s trước cơn gió (Đêm 3)');

  await page.goto(game(1, { ...OFF, random_shades: false, time_left_s: 40 }) + '&big=1');
  await page.waitForTimeout(1000);
  await shot('p4-09-large-text.png', 'Tùy chọn "Chữ lớn" (×1.25): cỡ chữ gốc 18 px → 22.5 px');

  // Lose -> name entry -> leaderboard.
  await page.goto(game(1, { ...OFF, random_shades: false, player: { flames: 1 }, shades: [{ id: 'S1', pos: [0, 1, 0.3] }] }));
  await page.waitForTimeout(900);
  await page.fill('#lb-name', 'ab');
  await page.click('#lb-save');
  await page.waitForTimeout(200);
  await shot('p4-10-name-invalid.png', 'Thua Đêm 1 → ô nhập tên; tên "ab" bị từ chối (cần 3–12 ký tự)');
  await fontAudit('Kết quả (thua) + ô nhập tên');
  await page.fill('#lb-name', 'Mây_Đèn');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  await shot('p4-11-name-saved.png', 'Lưu tên có dấu "Mây_Đèn" (điểm cộng tiếng Việt), báo hạng');
  await page.goto(game(3, { ...OFF, random_shades: false, player: { pos: [-35, 0, -8] }, time_left_s: 1, lanterns: ['L1', 'L2', 'L3', 'L4', 'L5'].map((id) => ({ id, lit: true })) }));
  await page.waitForTimeout(2500);
  await page.fill('#lb-name', 'Cuong_2026');
  await page.click('#lb-save');
  await page.waitForTimeout(500);
  await shot('p4-12-dawn-saved.png', 'Thắng Đêm 3 → Bình Minh → lưu tên (nights_won tính theo các Đêm đã thắng trong lượt)');
  await page.goto(`${url}?seed=1`);
  await page.waitForTimeout(500);
  await page.click('#scr-menu [data-act="board"]');
  await page.waitForTimeout(500);
  await shot('p4-13-leaderboard.png', 'Màn Bảng xếp hạng từ menu chính (top 10, điểm giảm dần), lưu trên đĩa');
  await fontAudit('Bảng xếp hạng');

  const proof = join(ROOT, 'docs', 'proof', phase);
  writeFileSync(join(proof, 'font-audit.md'), `# Cỡ chữ UI ở 1280×720 (Ticket-04 §4)\n\nĐo bằng \`getComputedStyle\` trên mọi nút chữ đang hiển thị (\`npm run shot -- phase-4\`). Yêu cầu: ≥ 18 px.\n\n| Màn hình | Nhỏ nhất | Chữ < 18 px |\n|---|---|---|\n${audit.join('\n')}\n`);
  extra.push(() => execFileSync(process.execPath, [join(ROOT, 'build', 'serve.mjs'), '--export-leaderboard', join(proof, 'leaderboard-export.json')], { env: process.env, stdio: 'inherit' }));
}

await browser.close();
await server.httpServer.close();
for (const f of extra) f();
writeFileSync(join(dir, 'README.md'), `# Screenshots — ${phase}\n\nTaken by \`npm run shot -- ${phase}\` (Playwright, headless Chromium, 1280×720, software WebGL).\n\n| File | Shows |\n|---|---|\n${log.join('\n')}\n`);
if (errors.length) {
  console.error('page errors:\n' + errors.join('\n'));
  process.exit(1);
}
