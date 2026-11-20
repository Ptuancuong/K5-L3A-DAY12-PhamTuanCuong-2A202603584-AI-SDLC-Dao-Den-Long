# Đảo Đèn Lồng

> 🎬 **Video demo:** _(sẽ thêm ở Phase 4 — Release `v1.0.0`)_
> Bài lab cá nhân Day 12 AI SDLC — Phạm Tuấn Cường · 2A202603584. Đề bài: [docs/lab/](docs/lab/).

Game 3D góc nhìn thứ ba. Mây, người giữ đèn nhỏ tuổi đội nón lá, chạy khắp **Đảo Bến** (Đêm 1) gom đom đóm,
nạp ánh sáng vào 5 Đèn Lồng Lớn và né Bóng Mực trong sương đen. Thắp hết đèn trước bình minh thì thắng.

## Cài đặt và chạy (macOS / Linux / Windows, cần Node.js ≥ 18)

```bash
git clone https://github.com/Ptuancuong/K5-L3A-DAY12-PhamTuanCuong-2A202603584-AI-SDLC-Dao-Den-Long.git && cd K5-L3A-DAY12-PhamTuanCuong-2A202603584-AI-SDLC-Dao-Den-Long
npm ci && npm run build
npm start          # mở http://localhost:4173 trong trình duyệt
```

## Điều khiển

| Phím            | Hành động                                                         |
| --------------- | ----------------------------------------------------------------- |
| W A S D         | Đi (theo hướng camera)                                            |
| Kéo chuột / ← → | Xoay camera                                                       |
| Space           | Nhảy                                                              |
| E               | Nạp đom đóm vào Đèn Lồng Lớn gần nhất (trong 3 m)                 |
| F               | Tỏa sáng: tốn 2 đom đóm, làm choáng và đẩy lùi Bóng Mực trong 8 m |
| R / Enter       | Chơi lại khi thắng hoặc thua (Shift+R: chơi lại ngay)             |

## Luật chơi và cách tính điểm

- Đi qua đom đóm (≤ 1.5 m) là nhặt, mang tối đa **10**. Mỗi đèn cần **5** đom đóm.
- Bóng Mực đuổi theo Mây (4 m/s, Mây chạy 6 m/s). Bị chạm (≤ 1 m): mất **1 ngọn lửa** và đánh rơi **một nửa** số đom đóm
  đang mang (làm tròn xuống), sau đó bất tử 1.5 s. Mây có **3 ngọn lửa**.
- Bóng Mực **không vào được vòng sáng 6 m** quanh một đèn **đã thắp**.
- Đêm dài **300 s**. Thắp đủ 5 đèn thì **thắng**. Hết lửa hoặc trời sáng mà chưa thắp đủ thì **thua**.

| Sự kiện                                      | Điểm |
| -------------------------------------------- | ---- |
| Nhặt 1 đom đóm                               | +10  |
| Thắp 1 đèn                                   | +100 |
| Mỗi Bóng Mực bị làm choáng bằng tỏa sáng     | +25  |
| Khi thắng: mỗi giây còn lại (làm tròn xuống) | +2   |
| Khi thắng: mỗi ngọn lửa còn lại              | +50  |

Mọi con số nằm trong [game.contract.json](game.contract.json). Code đọc trực tiếp từ file này nên con số khai báo luôn trùng với con số game dùng.
`fall_enabled = false`: đảo có mép chắn, Mây không thể rơi (không có sự kiện `player_hit` với `by: "fall"`). Không có trường tuning nào là `null`.

## Chế độ headless (Test Contract v1.0)

```bash
npm ci && npm run build                               # build_cmd
node build/headless.mjs --seed 1 --night 1 --ticks 600 --out out.jsonl \
  [--scenario s.json] [--inputs i.json] [--snapshot-every 10]
```

Mã thoát: `0` thành công · `2` file inputs/scenario sai định dạng · `1` lỗi tham số khác. Thông báo lỗi ghi ra stderr.

## Kiểm thử và bằng chứng

```bash
npm test                    # typecheck + unit test + 19 scenario headless + tính tất định + mã lỗi CLI
npm run verify -- phase-1   # chạy mọi scenario qua CLI thật, ghi docs/proof/phase-1/verify-report.md
npm run shot -- phase-1     # (cần: npx playwright install chromium) chụp ảnh game thật
```

- Bảng truy vết yêu cầu → bằng chứng: [docs/proof/README.md](docs/proof/README.md)
- Giả định: [docs/notes/assumptions.md](docs/notes/assumptions.md) · Nhật ký AI: [docs/notes/ai-log.md](docs/notes/ai-log.md) · Đánh giá/retro: [docs/notes/retro.md](docs/notes/retro.md)
- CI (GitHub Actions, Ubuntu + macOS) chạy build, test, verify và so sánh bằng chứng đã commit.

## Harness AI

[CLAUDE.md](CLAUDE.md) · skill [.claude/skills/verify](.claude/skills/verify/SKILL.md) · subagent [.claude/agents/reviewer.md](.claude/agents/reviewer.md) ·
hook [.claude/settings.json](.claude/settings.json): Stop hook không cho agent kết thúc khi `npm test` đỏ ([scripts/hooks/stop-tests.mjs](scripts/hooks/stop-tests.mjs)).

## Sáng tạo của tôi

Phase 1 ưu tiên phần lõi. Các chi tiết nhỏ chỉ có ở lớp hiển thị, không đổi output headless:

- Đèn nhỏ treo trên nón lá của Mây sáng mạnh dần theo số đom đóm đang mang.
- Vòng tiến độ quanh đèn chưa thắp cho thấy đã nạp bao nhiêu/5. Đèn đã thắp có vòng sáng vẽ đúng `safe_radius`.
- Sương tan dần và bầu trời sáng lên theo số đèn đã thắp.

Bằng chứng phần cũ vẫn đúng: toàn bộ scenario headless đạt (xem [verify-report](docs/proof/phase-1/verify-report.md)).

## Cấu trúc

```
src/core/      luật chơi thuần, tất định (dùng chung cho game và headless)
src/render/    Three.js: chỉ vẽ và đọc phím
src/headless/  CLI theo Test Contract
tests/         unit test + tests/scenarios/<tên>/{scenario,inputs,expect}.json
scripts/       verify, screenshot, hook
docs/          đề bài, ghi chép, bằng chứng
```
