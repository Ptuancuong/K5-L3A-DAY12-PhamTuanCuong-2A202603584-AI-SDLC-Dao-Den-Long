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

| Phím | Hành động |
|---|---|
| W A S D | Đi (theo hướng camera) |
| Kéo chuột / ← → | Xoay camera (độ nhạy chỉnh trong Cài đặt) |
| Space | Nhảy |
| Shift | Lướt (14 m/s trong 0.2 s, hồi chiêu 1.5 s) |
| E | Nạp ánh sáng vào Đèn Lồng Lớn gần nhất (trong 2 m) |
| F | Tỏa Sáng: tốn 3 đom đóm, làm choáng và đẩy lùi Bóng Mực trong 5 m |
| Esc / P | Tạm dừng (Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu) |
| Enter / R | Ở màn kết quả: Đêm kế tiếp / chơi lại Đêm |

## Ba Đêm

| Đêm | Đảo | Thời gian | Đèn | Điểm mới |
|---|---|---|---|---|
| 1 | Đảo Bến: đảo tròn 40 m | 300 s | 5 | |
| 2 | Đảo Cau: hai đảo nối bằng cầu tre | 330 s | 6 | Bục nhảy, Gió Lạc, Bùa Gió |
| 3 | Đảo Chuông: 3 tầng, dốc, tháp chuông | 360 s | 7 | Gió mạnh mỗi 30 s, Bóng Mực nhanh hơn |

## Luật Phase 3 — "Đèn cạn dầu" (thay một số luật bên dưới)

- Đèn sáng tiêu hao **1 dầu/giây** (tối đa 100). Hết dầu thì tắt; thắp lại chỉ tốn **5** đom đóm. Bấm E ở đèn sáng để **châm dầu** (mỗi đom đóm +10).
- Đèn còn dưới 30 dầu thì nhấp nháy và **mất vùng an toàn**; Bóng Mực tới hút dầu (5/giây).
- **Thắng khi tới bình minh còn đủ đèn sáng**: Đêm 1 ≥ 3/5, Đêm 2 ≥ 4/6, Đêm 3 ≥ 5/7. Thời lượng 240 / 270 / 300 s. Thắp hết đèn không còn kết thúc Đêm.
- Sức chứa = 10 + 2 × số lần thắp thành công (tối đa 20).
- Điểm: +5 mỗi đom đóm nạp, +100 thắp lần đầu, +40 thắp lại, +5 mỗi Bóng Mực trúng Tỏa Sáng (+15 nếu nó đang hút dầu); khi thắng: mỗi đèn sáng +50 + dầu còn lại, mỗi Ngọn Lửa +50.
- Cài đặt có **Bảng màu dễ phân biệt**. Quyết định thiết kế: [ADR 0001](docs/adr/0001-lantern-fuel-and-dawn-win.md).

## Luật chơi và cách tính điểm (số chuẩn Ticket-02)

- Đi qua đom đóm (≤ 1 m) là nhặt, mang tối đa **10**. Mỗi đèn cần **10** đom đóm, nạp nhiều lần được.
- Bóng Mực hiện ra (1 s), lang thang, thấy Mây trong 12 m thì đuổi (4 m/s, Đêm 3: 4.5), cách 18 m thì bỏ.
  Bị chạm: mất **1 Ngọn Lửa**, rơi **một nửa** đom đóm ra quanh Mây (nhặt lại được trong 8 s), bất tử 1.5 s.
- **Gió Lạc** (Đêm 2, 3) đuổi khi Mây mang ≥ 5 đom đóm, chạm thì cướp 3. Tỏa Sáng làm nó bỏ chạy hoặc đánh rơi đồ đã cướp.
- **Bùa Gió**: 10 s chạy nhanh 7.2 m/s và lướt không hồi chiêu.
- Rơi khỏi đảo: mất 1 Ngọn Lửa và toàn bộ đom đóm, hồi sinh ở điểm xuất phát.
- Bóng Mực không vào được vòng sáng 6 m quanh đèn đã thắp.

| Sự kiện | Điểm |
|---|---|
| Nạp 1 đom đóm | +10 |
| Thắp 1 đèn | +100 |
| Mỗi Bóng Mực trúng Tỏa Sáng | +5 |
| Khi thắng: mỗi giây còn lại (làm tròn xuống) | +2 |
| Khi thắng: mỗi Ngọn Lửa còn lại | +50 |

Tổng điểm game là tổng điểm các Đêm đã thắng. Mọi con số nằm trong [game.contract.json](game.contract.json) (contract v1.1). Code đọc trực tiếp file này.

## Giả định chính

Đầy đủ ở [docs/notes/assumptions.md](docs/notes/assumptions.md); tiêu chí nghiệm thu Phase 2 ở [docs/notes/spec-phase2.md](docs/notes/spec-phase2.md).
- Khi đã mang đủ 10 thì đi qua đom đóm **không nhặt**. Đom đóm rơi khi bị đánh nằm trên đất 480 tick.
- Bóng Mực wander bay chậm 1.5 m/s. Bóng Mực và Gió Lạc lơ lửng trên mặt đất bên dưới, bay qua vách được.
- Thưởng thời gian và lửa chỉ cộng khi thắng, ngay ở tick `game_over`.
- Thứ tự trong một tick theo đúng 12 bước của Ticket-02; event ghi trước snapshot cùng tick; `end` luôn là dòng cuối.

## Chế độ headless (Test Contract v1.2)

```bash
npm ci && npm run build                               # build_cmd
node build/headless.mjs --seed 1 --night 1 --ticks 600 --out out.jsonl \
  [--scenario s.json] [--inputs i.json] [--snapshot-every 10]
```

Mã thoát: `0` thành công · `2` file inputs/scenario sai định dạng · `1` lỗi tham số khác. Thông báo lỗi ghi ra stderr.

## Kiểm thử và bằng chứng

```bash
npm test                    # typecheck + unit test + 59 scenario headless + tính tất định + mã lỗi CLI
npm run verify -- phase-3   # chạy mọi scenario qua CLI thật, ghi docs/proof/phase-2/verify-report.md
node scripts/mutation-check.mjs phase-3   # đổi từng số tuning, chứng minh test có thể đỏ
npm run shot -- phase-2     # (cần: npx playwright install chromium) chụp ảnh game thật
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

- Lời thoại riêng của Ông Đăng ở màn giới thiệu từng Đêm và màn Bình Minh.
- Âm thanh tổng hợp hoàn toàn bằng WebAudio (không dùng file âm thanh ngoài).

Bằng chứng phần lõi vẫn đúng: toàn bộ scenario headless đạt (xem [verify-report](docs/proof/phase-2/verify-report.md)). Mọi phần thêm chỉ nằm ở `src/render/`, không đổi output headless.

## Cấu trúc

```
src/core/      luật chơi thuần, tất định (dùng chung cho game và headless)
src/render/    Three.js: chỉ vẽ và đọc phím
src/headless/  CLI theo Test Contract
tests/         unit test + tests/scenarios/<tên>/{scenario,inputs,expect}.json
scripts/       verify, screenshot, hook
docs/          đề bài, ghi chép, bằng chứng
```
