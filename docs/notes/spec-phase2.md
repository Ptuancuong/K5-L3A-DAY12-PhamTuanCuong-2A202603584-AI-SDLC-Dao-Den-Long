# Spec Phase 2 — Ticket-02 "Ba hòn đảo" (Contract v1.1)

Mỗi mục ở Phần 3 của ticket có tiêu chí nghiệm thu (làm A thì thấy B) và cách kiểm chứng.
`S:` = scenario headless trong `tests/scenarios/`, `U:` = unit test, `Ả:` = ảnh trong `docs/proof/phase-2/screenshots/`.

## Phần 1 — Số liệu chuẩn

| Tiêu chí                                                                                                    | Kiểm chứng                                                                           |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `game.contract.json` là v1.1, mọi số khớp ticket (kể cả `dash_*`, `night2/3_duration_s`)                    | U: `contract file v1.1`                                                              |
| Code đọc đúng số trong contract (đổi một số thì có test đỏ)                                                 | `docs/proof/phase-2/mutation-check.md`: 0/9 đột biến lọt                             |
| Thứ tự 12 bước trong một tick đúng như ticket                                                               | Comment đánh số 1..12 trong `step()`; S: `p2-pause`, `p2-safe-evict`, `p2-drifter-*` |
| Nhặt: XZ ≤ 1.0 và chênh cao ≤ 1.5                                                                           | S: `p1-pickup`, `p2-pickup-height`                                                   |
| Nạp: 2 m, đèn gần nhất, bằng nhau chọn id nhỏ; +10 mỗi đom đóm nạp                                          | S: `p1-deposit-light`, `p1-partial-deposit`, `p2-lantern-tie`                        |
| Lướt 14 m/s × 12 tick, hồi chiêu 90 tick từ lúc bắt đầu, trên không giữ độ cao                              | S: `p2-dash`, `p2-dash-air`                                                          |
| Tỏa Sáng 3 / 5 m (3D từ chân + 0.8) / 180 tick; choáng 120; đẩy 4 m trong 15 tick; +5 mỗi con               | S: `p1-pulse-*`                                                                      |
| Bóng Mực: spawning 60 tick → wander; phát hiện 12 m / bỏ đuổi 18 m; recoil 2 m / 60 tick                    | S: `p2-shade-spawn`, `p2-shade-detect-lose`, `p2-shade-recoil`                       |
| Bị đánh: rơi floor(n/2) ra vành 1.5–2.5 m, tồn tại 480 tick; bất tử 90 tick                                 | S: `p1-hit-invuln`, `p2-drop-ttl`                                                    |
| Vùng an toàn: chặn ở mép 6 m; bóng trong vùng lúc vừa thắp bị đẩy ra ≤ 30 tick, vô hại                      | S: `p1-safe-radius`, `p2-safe-evict`; U: stunned shade                               |
| Rơi (Y < −10): −1 lửa, mất hết đom đóm, chờ 60 tick, hồi sinh, bất tử 90; hết lửa thì thua ngay             | S: `p2-fall-respawn`, `p2-fall-last-flame`                                           |
| Lịch sinh đom đóm (20, +1 mỗi 240 tick, trần 30, điểm trống) và Bóng Mực (2 con ở tick 300, rồi mỗi khoảng) | S: `p2-mote-schedule`, `p2-shade-spawn`                                              |
| Thắng/thua xét sau mỗi tick: hết lửa → thua; đủ đèn → thắng (kể cả tick hết giờ); hết giờ → dawn            | S: `p1-win`, `p1-dawn`, `p1-hit-invuln`                                              |

## Phần 2 — Bản đồ chuẩn

| Tiêu chí                                                                                        | Kiểm chứng                                                                                   |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Đêm 1: đảo r 40, 5 đèn ở toạ độ chuẩn, 24 điểm đom đóm, 12 điểm Bóng Mực r 37                   | S: `p1-no-scenario-default`, `p2-shade-spawn`; U: maps                                       |
| Đêm 2: hai đảo r 28 + cầu tre; bục nhảy bắn sang đảo kia và đáp an toàn; 6 đèn; Bùa ở (35,0,0)  | S: `p2-night2-start`, `p2-night2-pad`, `p2-charm`; Ả 09                                      |
| Đêm 3: 3 tầng có vách đứng, 2 dốc, bục nhảy lên tầng 2, tháp chuông; 7 đèn; xuất phát (0,0,−15) | S: `p2-night3-start`, `p2-night3-wall`, `p2-night3-ramp`, `p2-night3-pad`; U: maps; Ả 11, 12 |
| Đêm 3: gió mỗi 30 s, dài 5 s, 2 m/s, báo trước 2 s                                              | S: `p2-night3-wind`; HUD "Gió sắp nổi…" + lá bay + âm thanh                                  |

## Phần 3 — Tính năng mới

| Tính năng          | Tiêu chí nghiệm thu                                                                                                                                                                                                                              | Kiểm chứng                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Gió Lạc            | Sinh ở tick 1200, 2400… (tối đa 2, id D1, D2) trạng thái idle. Mang ≥ 5 và cách ≤ 15 m thì chase 7 m/s. Chạm ≤ 1.2 m thì cướp min(3, đang mang), flee 240 tick rồi removed.                                                                      | S: `p2-drifter-spawn`, `p2-drifter-steal`; Ả 10                           |
| Gió Lạc + Tỏa Sáng | Trúng khi chase → flee, không cướp. Trúng khi flee có đồ → thả lại thành đom đóm rơi, `drifter_drop`, biến mất sau 120 tick                                                                                                                      | S: `p2-drifter-pulse-chase`, `p2-drifter-pulse-drop`                      |
| Bùa Gió            | Nhặt như đom đóm → `charm_picked`, 600 tick: chạy 7.2 m/s, lướt không hồi chiêu (nhấn khi đang lướt bị bỏ qua); xuất hiện lại sau 2700 tick                                                                                                      | S: `p2-charm`; Ả 09, 12                                                   |
| Chuỗi 3 Đêm        | Menu → giới thiệu (tên đảo + lời Ông Đăng) → chơi → kết quả → Đêm kế; thắng Đêm 3 → Bình Minh với tổng điểm; thua thì chơi lại Đêm đó                                                                                                            | Ả 01, 02, 13, 14, 15                                                      |
| Tạm dừng           | Esc/P: logic dừng hoàn toàn (tick tăng, sim_tick/thời gian/hồi chiêu/spawn/TTL đứng yên, state `paused`); menu Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu                                                                                       | S: `p2-pause`; Ả 07                                                       |
| Cài đặt            | Âm lượng và độ nhạy chuột, lưu `localStorage` giữa các lần mở                                                                                                                                                                                    | Ả 08; mở lại trang giữ giá trị (kiểm tay)                                 |
| Âm thanh           | Nhạc nền đêm + hiệu ứng: nhặt, thắp, tỏa sáng, bị đánh, nhảy, lướt, thắng, thua, Bóng Mực xuất hiện, đếm ngược 10 s cuối                                                                                                                         | `src/render/audio.ts` + `onEvents()`; kiểm bằng tai trong video (Phase 4) |
| HUD                | Lửa trên trái; đồng hồ mm:ss trên giữa, đỏ và nhấp nháy khi ≤ 30 s; đèn k/n và điểm trên phải; thanh đom đóm 10 ô dưới giữa; hồi chiêu Lướt/Tỏa Sáng dưới phải; "E — Nạp ánh sáng (x/10)"; mũi tên tới đèn chưa sáng gần nhất khi ngoài màn hình | Ả 03, 04, 16                                                              |
| Bảng màu           | Màu chuẩn trong bảng ticket (hằng `C` trong `src/render/main.ts`); ánh sáng môi trường = 0.15 + 0.55 × tiến độ                                                                                                                                   | Code + Ả 03 vs 05                                                         |

## Thay đổi so với Phase 1 (và vì sao)

| Phase 1                                      | Phase 2                                                    | Lý do                                               |
| -------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------- |
| Số tuning tự chọn                            | Số chuẩn của ticket                                        | Ticket-02 Phần 1 bắt buộc                           |
| +10 điểm khi **nhặt**                        | +10 khi **nạp**                                            | Điểm chuẩn hóa                                      |
| `fall_enabled: false`, mép đảo chặn          | Rơi khỏi đảo là luật                                       | Ticket-02; `p1-island-edge` chuyển sang `_retired/` |
| Bóng Mực luôn đuổi, trạng thái chase/stunned | spawning/wander/chase/recoil/stunned, phát hiện 12 / bỏ 18 | Contract v1.1                                       |
| Thứ tự trong tick tự đặt                     | Thứ tự 12 bước của ticket                                  | Bắt buộc                                            |
| Hẹn giờ theo tick tuyệt đối                  | Bộ đếm giảm ở bước 2                                       | Để pause đóng băng đúng mọi bộ đếm                  |
