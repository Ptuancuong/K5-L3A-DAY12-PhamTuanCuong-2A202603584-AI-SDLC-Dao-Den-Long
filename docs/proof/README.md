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
