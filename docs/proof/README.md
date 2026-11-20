# Bằng chứng — truy vết yêu cầu

Mọi bằng chứng tái lập được ở tag tương ứng: `npm ci && npm run build && npm run verify -- phase-N`
(ảnh: `npm run shot -- phase-N`). CI so sánh `verify-report.md` và `runs/` đã commit với lần chạy lại.

## Phase 1 (tag `phase-1`)

| #   | Yêu cầu (PRD-0 / Contract v1.0)                            | Cách kiểm chứng                                  | Bằng chứng                                                                                                                            | Kết quả                 |
| --- | ---------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| 1   | Màn Đêm 1 – Đảo Bến tròn, 5 Đèn Lồng Lớn                   | Scenario mặc định + ảnh                          | `p1-no-scenario-default`, [01-start](phase-1/screenshots/01-start.png)                                                                | Đạt                     |
| 2   | Nhân vật đi, nhảy, camera 3D                               | Scenario di chuyển/xoay/nhảy + ảnh               | `p1-camera-yaw`, `p1-move-normalize`, `p1-jump`, `p1-island-edge`, [02-walk](phase-1/screenshots/02-walk.png)                         | Đạt                     |
| 3   | Đom đóm rải rác, nhặt được                                 | Scenario                                         | `p1-pickup`, `p1-carry-capacity`                                                                                                      | Đạt                     |
| 4   | Nạp ánh sáng vào đèn để thắp                               | Scenario + ảnh                                   | `p1-deposit-light`, `p1-partial-deposit`, `p1-held-interact`, [03-near-lantern](phase-1/screenshots/03-near-lantern.png)              | Đạt                     |
| 5   | Bóng Mực xuất hiện và đuổi, chạm thì mất máu               | Scenario + unit test sinh Bóng Mực               | `p1-hit-invuln`, `core.test.ts › random spawning`                                                                                     | Đạt                     |
| 6   | Tỏa sáng xua Bóng Mực, tốn ánh sáng                        | Scenario + ảnh                                   | `p1-pulse-stun`, `p1-pulse-no-light`, `p1-pulse-cooldown`, [05-shade-pulse](phase-1/screenshots/05-shade-pulse.png)                   | Đạt                     |
| 7   | Bóng Mực sợ đèn (`safe_radius`)                            | Scenario + unit test 1200 tick                   | `p1-safe-radius`, `core.test.ts › safe radius` (2 test, gồm Bóng Mực đang choáng)                                                                                        | Đạt (A9 đã xác nhận)    |
| 8   | Thắng / thua / điểm                                        | Scenario + ảnh                                   | `p1-win` (848 điểm), `p1-dawn`, `p1-hit-invuln`, [06-won](phase-1/screenshots/06-won.png), [07-lost](phase-1/screenshots/07-lost.png) | Đạt                     |
| 9   | HUD hiển thị thông tin cần thiết                           | Ảnh                                              | Mọi ảnh: lửa, đom đóm, đèn, điểm, thời gian, trạng thái tỏa sáng                                                                      | Đạt                     |
| 10  | Chơi lại sau thắng/thua                                    | Playwright bấm R ở màn thua, kiểm tra overlay ẩn | [08-replay](phase-1/screenshots/08-replay.png), log `overlay hidden: true`                                                            | Đạt                     |
| 11  | Đảo sáng dần khi thắp đèn; vàng cam tốt, tím đen nguy hiểm | Ảnh                                              | [04-three-lit](phase-1/screenshots/04-three-lit.png) so với [01-start](phase-1/screenshots/01-start.png)                              | Đạt (đánh giá bằng mắt) |
| 12  | `game.contract.json` đúng mẫu, tuning khớp game            | Unit test: đủ key, code dùng chính object này    | `core.test.ts › contract file`                                                                                                        | Đạt                     |
| 13  | Headless: tham số, mô hình tick, JSONL, `end` cuối         | Scenario + unit test                             | [verify-report](phase-1/verify-report.md), `core.test.ts › tick model`                                                                | Đạt                     |
| 14  | Sai định dạng → mã 2; lỗi khác → khác 0                    | Scenario + test CLI                              | `p1-bad-inputs-order`, `p1-bad-scenario-lantern`, `scenarios.test.ts › CLI errors`                                                    | Đạt                     |
| 15  | Tất định (kể cả id tự sinh)                                | Chạy 2 lần 3600 tick, 3 seed, so sha256          | [verify-report](phase-1/verify-report.md) mục Determinism                                                                             | Đạt                     |
| 16  | Chạy trên macOS/Linux                                      | CI ubuntu-latest + macos-latest                  | [CI run cho phase-1](https://github.com/Ptuancuong/K5-L3A-DAY12-PhamTuanCuong-2A202603584-AI-SDLC-Dao-Den-Long/actions/runs/44712463919): ubuntu + macos xanh | Đạt |
| 17  | Test không "luôn đạt"                                      | Cố tình đổi `pickup_radius` và `invuln_s`        | [mutation-check.txt](phase-1/mutation-check.txt): 2 scenario đỏ đúng chỗ                                                              | Đạt                     |

Máy chạy bằng chứng: xem [phase-1/env.txt](phase-1/env.txt).

## Phase 2 (tag `phase-2`) — Ticket-02, Contract v1.1

Chi tiết tiêu chí nghiệm thu từng mục: [docs/notes/spec-phase2.md](../notes/spec-phase2.md).
Báo cáo chạy: [phase-2/verify-report.md](phase-2/verify-report.md) (45 scenario + tất định 3 Đêm) · [phase-2/mutation-check.md](phase-2/mutation-check.md) · [ảnh](phase-2/screenshots/README.md).

| # | Yêu cầu | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|---|
| 1 | Số liệu chuẩn trong contract v1.1, code dùng đúng số đó | Unit test + mutation check | `core.test.ts › contract file v1.1`, mutation-check 0/9 lọt | Đạt |
| 2 | Hồi quy Phase 1 với số chuẩn | 18 scenario `p1-*` tính lại bằng tay; 1 scenario nghỉ hưu có lý do | verify-report, [tests/scenarios/_retired](../../tests/scenarios/_retired/README.md) | Đạt |
| 3 | Thứ tự 12 bước trong tick, pause đóng băng | Scenario | `p2-pause`, `p2-safe-evict`, `p2-drifter-pulse-*` | Đạt |
| 4 | Lướt | Scenario | `p2-dash`, `p2-dash-air` | Đạt |
| 5 | Bóng Mực: trạng thái, lịch sinh, recoil, vùng an toàn | Scenario + unit | `p2-shade-*`, `p1-safe-radius`, `p2-safe-evict` | Đạt |
| 6 | Bị đánh rơi đom đóm ra vành, TTL 480 | Scenario | `p2-drop-ttl` | Đạt |
| 7 | Rơi khỏi đảo, hồi sinh, thua khi hết lửa | Scenario | `p2-fall-respawn`, `p2-fall-last-flame` | Đạt |
| 8 | Đêm 2: hai đảo, cầu, bục nhảy | Scenario + ảnh | `p2-night2-*`, ảnh 09 | Đạt |
| 9 | Đêm 3: tầng, vách, dốc, bục, tháp, gió | Scenario + unit + ảnh | `p2-night3-*`, `core.test.ts › standard maps`, ảnh 11, 12 | Đạt |
| 10 | Gió Lạc | Scenario + ảnh | `p2-drifter-*`, ảnh 10 | Đạt |
| 11 | Bùa Gió | Scenario + ảnh | `p2-charm`, ảnh 09, 12 | Đạt |
| 12 | Chuỗi 3 Đêm, giới thiệu, kết quả, Bình Minh | Playwright | ảnh 01, 02, 13, 14, 15 | Đạt |
| 13 | Tạm dừng + menu, Cài đặt lưu giữa các lần mở | Playwright + scenario | `p2-pause`, ảnh 07, 08 | Đạt (lưu `localStorage`: kiểm tay) |
| 14 | Âm thanh (nhạc nền + 10 loại hiệu ứng) | Code review + người chơi nghe thử | `src/render/audio.ts`; người dùng xác nhận "âm thanh ok" (2026-11-20) | Đạt (kiểm bằng tai; bản ghi sẽ có trong video Phase 4) |
| 15 | HUD đầy đủ, bảng màu chuẩn, ánh sáng môi trường theo công thức | Ảnh + code | ảnh 03, 04, 05, 16; hằng `C`, `ambient.intensity` trong `src/render/main.ts` | Đạt |
| 16 | Headless một Đêm đầy đủ (21 600 tick) ≤ 30 s | Unit test đo thời gian cả 3 Đêm | `core.test.ts › performance` | Đạt |
| 17 | ≥ 30 FPS trung bình ở 1280×720 | Bộ đếm FPS trong game (`?fps=1`), chơi Đêm 3 trên máy thật | ~160 FPS trung bình; NVIDIA GeForce RTX 3060 Laptop GPU, Intel Core i5-12500H, Windows 11, `npm run dev`; người dùng đo tay | Đạt (đo tay, chưa có ảnh/log) |
| 18 | Mỗi tính năng mới có ≥ 1 scenario headless | Danh sách scenario `p2-*` | 27 scenario `p2-*` | Đạt |

## Phase 3 (tag `phase-3`) — Ticket-03 "Đèn cạn dầu", Contract v1.2

Quyết định thiết kế: [ADR 0001](../adr/0001-lantern-fuel-and-dawn-win.md) · Breaking changes: [CHANGELOG](../../CHANGELOG.md) ·
[verify-report](phase-3/verify-report.md) (59 scenario + tất định 3 Đêm) · [mutation-check](phase-3/mutation-check.md) (0/15 lọt) · [ảnh](phase-3/screenshots/README.md).

| # | Yêu cầu | Bằng chứng | Kết quả |
|---|---|---|---|
| 1 | Nhiên liệu: thắp → 100, hao 1/s, hết dầu → tắt, `deposited` 0, `ever_lit` | `p3-fuel-decay`, `p3-lantern-out` | Đạt |
| 2 | Châm dầu: used = min(mang, ceil((100−fuel)/10)), đèn đầy không chọn được | `p3-refuel` | Đạt |
| 3 | Thắp lại tốn 5, +40, `relight: true`, `relit_count` | `p3-relight` | Đạt |
| 4 | Vùng an toàn chỉ khi fuel ≥ 30 | `p3-low-fuel-no-zone`, `p1-safe-radius` | Đạt |
| 5 | Bóng Mực wander → đèn yếu → drain (5/s, `fuel_drain` mỗi 60 tick) | `p3-drain` | Đạt |
| 6 | Thoát drain: chase ≤ 6 m / stunned / wander khi đèn tắt hoặc châm ≥ 30 | `p3-drain-chase`, `p3-pulse-drain`, `p3-refuel-evict`, `p3-drain` | Đạt |
| 7 | Châm lên ≥ 30 thì đẩy bóng ra mép trong 30 tick, vô hại | `p3-refuel-evict` | Đạt |
| 8 | Thắng lúc bình minh với ≥ ceil(0.6 × đèn); không thắng sớm; no_flames xét trước | `p3-win-dawn` (597), `p3-lose-dawn`, `p3-all-lit-continues`, `p3-no-flames-at-dawn` | Đạt |
| 9 | Sức chứa 10 + 2 × lần thắp, tối đa 20 | `p3-capacity`, `p3-relight` | Đạt |
| 10 | Điểm mới (+5/đom đóm, +100/+40, +5/+15 Tỏa Sáng, thưởng bình minh) | `p1-deposit-light` (150), `p3-relight` (65), `p3-pulse-drain` (15), `p3-win-dawn` (597) | Đạt |
| 11 | Thời lượng 240/270/300 s | `p1-no-scenario-default`, `p2-night2-start`, `p2-night3-start` | Đạt |
| 12 | Contract v1.2: snapshot/scenario/event mới | các scenario `p3-*`, `p3-bad-target`; unit `contract file v1.2` | Đạt |
| 13 | Thanh dầu, nhấp nháy 1 Hz khi < 30 | ảnh p3-01, p3-02 | Đạt (ảnh tĩnh; nhấp nháy kiểm bằng mắt) |
| 14 | Chế độ mù màu (lưu lại): #00B3FF, cảnh báo trắng + ⚠, đèn tắt xẹp 20% + vết rách | ảnh p3-03 | Đạt |
| 15 | Test cũ bị luật mới làm sai: sửa hoặc nghỉ hưu có lý do | `p1-win` → `_retired/` (README có lý do); P1/P2 cập nhật trong `note` | Đạt |
| 16 | Hồi quy Phase 1–2 không bị thay thế | 45 scenario P1/P2 vẫn chạy trong verify-report | Đạt |

## Phase 4 (tag `phase-4`, Release `v1.0.0`) — Ticket-04 "Bình minh: phát hành", Contract v1.3

Quyết định: [ADR 0002](../adr/0002-bench-soak-leaderboard.md) · [verify-report](phase-4/verify-report.md) (59 scenario + tất định + soak + kiểm bench.json) ·
[mutation-check](phase-4/mutation-check.md) (0/15 lọt) · [ảnh](phase-4/screenshots/README.md) · [cỡ chữ](phase-4/font-audit.md).

| # | Yêu cầu | Bằng chứng | Kết quả |
|---|---|---|---|
| 1 | Bench: cảnh chuẩn 200 Bóng Mực wander + 100 đom đóm (seed 42), L1–L3 sáng 100, Mây ở gốc; tắt sinh/sát thương/nhặt/hao dầu/kết thúc | unit `bench scene` (5 test), ảnh p4-01 | Đạt |
| 2 | Bench: 1280×720 có cửa sổ, tắt vsync, camera bay vòng (r 30, Y 15, từ (30,15,0), ngược chiều kim đồng hồ, 15 s/vòng), 3 s khởi động, đo đúng `--duration` | `scripts/bench.mjs`, unit `camera orbit`, [bench.json](../../bench.json) (`measured_ms` 30001) | Đạt |
| 3 | `bench.json` đủ trường, đúng công thức; avg ≥ 60, 1 % low ≥ 30, load ≤ 10 s | unit `bench.json formulas`, verify-report; máy tôi: 226 fps / 148 / 1198 ms | Đạt (máy tôi) |
| 4 | Soak 10 Đêm một tiến trình, seed 7 + i, input ngẫu nhiên, crashes 0, mem_end ≤ 1.2 × mem_start | unit `soak`, [soak.json](../../soak.json), verify-report (chạy lại), CI chạy `soak_cmd` | Đạt (55.1 → 56.6 MB) |
| 5 | Bảng xếp hạng: nhập tên sau Bình Minh hoặc khi thua, tên 3–12 `[A-Za-z0-9_]` (+ tiếng Việt), top 10, sắp xếp, ISO 8601 có múi giờ, lưu đĩa | unit `leaderboard` (5 test), ảnh p4-10 → p4-13 | Đạt |
| 6 | Màn Bảng xếp hạng từ menu; `--export-leaderboard out.json` → `{"entries": [...]}` đúng thứ tự | ảnh p4-02, p4-13; [leaderboard-export.json](phase-4/leaderboard-export.json); unit chạy đúng `run_cmd`; CI | Đạt |
| 7 | Đổi phím mọi hành động, báo trùng, khôi phục mặc định, lưu lại | unit `accessibility key map`, ảnh p4-03 → p4-06 | Đạt |
| 8 | Phụ đề / chỉ báo: Bóng Mực + mũi tên mép màn hình, gió sắp thổi, 10 s cuối, đèn < 30 | ảnh p4-07, p4-08 | Đạt |
| 9 | Giảm chuyển động: tắt rung camera và chớp màn hình | `settings.reducedMotion` trong `src/render/main.ts` (rung, chớp, nhấp nháy) | Đạt (kiểm bằng mắt) |
| 10 | Chữ UI ≥ 18 px ở 1280×720; tùy chọn ×1.25 | [font-audit](phase-4/font-audit.md) (5 màn, không có chữ < 18 px), ảnh p4-09 | Đạt |
| 11 | Clone sạch → ≤ 3 lệnh → chơi được; README đủ mục; CHANGELOG 4 phase; CREDITS; LICENSE | [README](../../README.md), [CHANGELOG](../../CHANGELOG.md), [CREDITS](../../CREDITS.md), CI chạy `npm ci && npm run build` trên máy sạch | Đạt |
| 12 | Contract v1.3: `bench_cmd`, `soak_cmd`; v1.0–v1.2 giữ nguyên | unit `contract v1.3`; 59 scenario + mutation check | Đạt |
| 14 | Review độc lập trước khi tag | subagent `reviewer`: 1 lỗi chặn + 5 nên sửa, đã sửa hết (ai-log #22–#26), test bảo mật API | Đạt |
| 13 | GitHub Release v1.0.0 có bản chạy được; video demo < 5 phút | Release v1.0.0 (zip `dist/` + `build/`), [docs/demo/demo.mp4](../demo/demo.mp4) | Xem Release |
