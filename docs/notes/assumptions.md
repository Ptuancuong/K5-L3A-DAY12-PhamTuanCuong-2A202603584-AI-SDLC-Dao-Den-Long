# Giả định và tiêu chí nghiệm thu

## Phase 1 — PRD-0 + Test Contract v1.0

### Bắt buộc chính xác (từ Test Contract)

- `game.contract.json` ở gốc repo; `headless_cmd` nhận `--seed --night 1 [--scenario] [--inputs] --ticks --out [--snapshot-every=10]`.
- 60 tick/s cố định. Bước k đọc input tick k và tạo trạng thái k+1; sự kiện trong bước đó ghi `tick = k+1`. Snapshot tick 0 là trạng thái trước mọi input.
- Dừng khi đủ `--ticks` hoặc game kết thúc; dòng cuối là `end`. Mã thoát 0; inputs/scenario sai → 2; lỗi khác → khác 0.
- Khoảng cách đo trên mặt phẳng XZ, "trong bán kính r" là ≤ r. Tọa độ làm tròn 3 chữ số.
- Input: frame chỉ đổi trường có mặt; nút kích hoạt khi chuyển false→true; move xoay theo `cam_yaw_deg` và chuẩn hóa khi dài hơn 1.
- Dựng scenario không phát sự kiện, không cộng điểm. Tất định theo seed, kể cả id tự sinh.

### Giả định cho chỗ mơ hồ

| #   | Chỗ mơ hồ                                                                      | Giả định của tôi                                                                                                                                                                                      | Lý do                                                                                             |
| --- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| A1  | "Ánh sáng" để tỏa sáng là gì                                                   | Chính là đom đóm đang mang; `pulse_cost = 2` đom đóm                                                                                                                                                  | PRD: tỏa sáng "tốn ánh sáng"; một tài nguyên duy nhất dễ hiểu                                     |
| A2  | Không đủ ánh sáng hoặc đang hồi chiêu mà bấm tỏa sáng                          | Không có gì xảy ra, không có sự kiện `pulse`                                                                                                                                                          | Tránh sự kiện "rỗng" gây nhiễu                                                                    |
| A3  | Tỏa sáng khi không có Bóng Mực trong tầm                                       | Vẫn tốn ánh sáng, vẫn phát `pulse` với `stunned_ids: []`                                                                                                                                              | Hành động đã xảy ra                                                                               |
| A4  | Bóng Mực đang choáng bị tỏa sáng lần nữa                                       | Choáng lại từ đầu, bị đẩy, được +25 lần nữa                                                                                                                                                           | Đơn giản; hồi chiêu 2 s chặn lạm dụng                                                             |
| A5  | Đẩy lùi                                                                        | Dịch tức thì `pulse_push_m` theo hướng từ Mây ra xa (trùng vị trí → +X)                                                                                                                               | Tất định, dễ kiểm                                                                                 |
| A6  | Thứ tự trong một bước                                                          | Mây di chuyển/nhảy → nhặt đom đóm → nạp đèn (→ kiểm tra thắng) → Bóng Mực di chuyển → tỏa sáng → bị chạm → sinh thêm đom đóm/Bóng Mực → kiểm tra bình minh                                            | Ghi rõ để test thống nhất                                                                         |
| A7  | Nhặt đom đóm                                                                   | Tự động khi trong `pickup_radius`, theo thứ tự danh sách; đầy `carry_capacity` thì không nhặt                                                                                                         | PRD không nói cần nút                                                                             |
| A8  | Nạp đèn                                                                        | Bấm interact trong `interact_radius` của đèn **chưa thắp** gần nhất; nạp `min(đang mang, còn thiếu)`                                                                                                  | Không phí đom đóm                                                                                 |
| A9  | `safe_radius` áp cho đèn nào                                                   | Chỉ đèn **đã thắp**. Bóng Mực bị đặt lại ngay ngoài vòng (r + 0.001 m)                                                                                                                                | Giảng viên xác nhận (CP1 #7): "thường chỉ đèn đã thắp". Bóng Mực kể cả đang choáng bị đẩy ra ngay ở tick đèn vừa thắp |
| A10 | Bị chạm                                                                        | Mất 1 lửa, rơi `floor(carried × 0.5)` đom đóm (biến mất), bất tử 1.5 s; nhiều Bóng Mực cùng tick chỉ tính 1 lần                                                                                       |                                                                                                   |
| A11 | Bóng Mực choáng có gây sát thương?                                             | Không                                                                                                                                                                                                 |                                                                                                   |
| A12 | Thời gian choáng / bất tử / hồi chiêu                                          | Đổi sang tick bằng `round(s × 60)`. Choáng ở tick p..p+179 nếu tỏa sáng ở tick p (3 s), tick p+180 đuổi lại                                                                                           |                                                                                                   |
| A13 | Điểm khi thắng                                                                 | `floor(time_left_s) × per_second_left + flames × per_flame_left`, chỉ cộng khi thắng                                                                                                                  | Thua không thưởng                                                                                 |
| A14 | Thua vì bình minh                                                              | Khi `time_left_s ≤ 0` mà chưa thắng → `lost`, `dawn`                                                                                                                                                  |                                                                                                   |
| A15 | Rơi khỏi đảo                                                                   | `fall_enabled = false`: Mây bị chặn ở mép đảo bán kính 40 m                                                                                                                                           | Phase 1 tối giản                                                                                  |
| A16 | Màn mặc định                                                                   | Đảo tròn bán kính 40 m; L1 tại (0,0,25), L2..L5 cách đều trên vòng 25 m; 30 đom đóm ngẫu nhiên (bán kính 4–38 m), thiếu thì sinh thêm 1/giây; 2 Bóng Mực ban đầu ở xa, thêm 1 con mỗi 30 s (tối đa 6) | Các số này ở `WORLD` trong `src/core/config.ts`                                                   |
| A17 | Bóng Mực di chuyển                                                             | Luôn bay thẳng về phía Mây với `shade_speed`, cao 1 m; không bị chặn ở mép đảo                                                                                                                        | Đơn giản, tất định                                                                                |
| A18 | Scenario có `random_*` vắng mặt                                                | Mặc định `true` (tự sinh). Có `motes`/`shades` thì thay danh sách ban đầu, nhưng vẫn sinh thêm theo thời gian nếu `random_*` là true                                                                  | Theo "trường nào không có thì dùng mặc định của game"                                             |
| A19 | Nhảy                                                                           | Vận tốc 6 m/s, trọng lực 20 m/s²; không ảnh hưởng va chạm (khoảng cách đo theo XZ)                                                                                                                    |                                                                                                   |
| A20 | Input sai miền (`move` ngoài [-1,1], tick không tăng, kiểu sai) hoặc id đèn lạ | Mã thoát 2                                                                                                                                                                                            | Coi là sai định dạng                                                                              |
| A21 | Snapshot cuối khi game kết thúc giữa chừng                                     | Không thêm snapshot ngoài lịch; dòng `end` mang trạng thái cuối                                                                                                                                       | Đúng nghĩa "mỗi --snapshot-every tick"                                                            |

### Tiêu chí nghiệm thu (làm A thì thấy B) — đều có scenario trong `tests/scenarios/`

1. Đi +Z 35 tick tới đom đóm ở z=5 → `mote_picked` ở tick 35, +10 điểm (`p1-pickup`).
2. Đầy 10 đom đóm → không nhặt thêm (`p1-carry-capacity`).
3. Mang 5, đứng cạnh L1, bấm E → `deposit` + `lantern_lit` cùng tick, +100 (`p1-deposit-light`, `p1-partial-deposit`, `p1-held-interact`).
4. Thắp đèn cuối → `game_over won all_lit`, điểm thưởng đúng công thức (`p1-win`).
5. Bóng Mực chạm → mất lửa, rơi một nửa, bất tử 90 tick; hết lửa → `lost no_flames` (`p1-hit-invuln`).
6. Hết giờ → `lost dawn` (`p1-dawn`).
7. Tỏa sáng: choáng + đẩy + tốn 2 + 25 điểm; thiếu sáng thì không; hồi chiêu 120 tick (`p1-pulse-*`).
8. Bóng Mực không vào vòng 6 m của đèn đã thắp (`p1-safe-radius` + unit test).
9. Xoay camera / chuẩn hóa / mép đảo / nhảy (`p1-camera-yaw`, `p1-move-normalize`, `p1-island-edge`, `p1-jump`).
10. Input/scenario sai → mã 2 (`p1-bad-*`, test CLI). Cùng seed + inputs → output giống hệt (determinism).
11. Game có giao diện: chơi được từ đầu tới thắng/thua, HUD, chơi lại (ảnh `docs/proof/phase-1/screenshots/`).

### Câu hỏi còn mở

- (Đã đóng) A9 được giảng viên xác nhận ở CP1. Lỗi phát hiện khi đối chiếu: Bóng Mực đang choáng không bị đẩy ra khi đèn vừa thắp. Đã sửa, có unit test.

### Câu trả lời của giảng viên (CP1) — đối chiếu
| Mục | Trả lời | Bài của tôi |
|---|---|---|
| 1 Nhặt | Tự chọn; carried ≤ capacity; mỗi lần nhặt 1 event với carried sau khi nhặt | Khớp (A7). Đầy thì không nhặt, đã ghi README |
| 2 Nạp | deposited ≤ lantern_cost; amount = số thực chuyển | Khớp (A8) |
| 3 Pulse | Trừ carried; không đủ thì không có event | Khớp (A1, A2) |
| 4 Bị chạm | dropped ≤ carried, nhất quán làm tròn | Khớp (A10, floor; đom đóm rơi biến mất nên motes_active không đổi) |
| 5 Thứ tự | Event trước snapshot cùng tick; snapshot theo lịch kể cả tick game_over; end cuối cùng | Khớp (`src/core/run.ts`) |
| 6 Điểm thắng | Cộng tại tick game_over, end gồm thưởng | Khớp (A13) |
| 7 Vùng an toàn | Thường chỉ đèn đã thắp; sau khi thắp không để bóng trong vùng | Khớp A9 sau khi **sửa lỗi Bóng Mực đang choáng** (ai-log #7) |

## Thông tin giảng viên đã nói trước cho phase sau (Phase 2: đã làm theo Ticket-02)
- Bóng Mực có trạng thái `spawning` 1.0 s (60 tick): không gây sát thương, mờ dần hiện ra, rồi sang `wander`. Bóng Mực do scenario dựng sẵn bỏ qua spawning, bắt đầu ở `wander`.
- Điểm xuất phát: Đêm 2 tại (0, 0, 0) (tâm đảo A), Đêm 3 tại (0, 0, −15), đều quay mặt về +Z.
- Snapshot có `invuln` (boolean). Scenario có `invuln_ticks` để dựng tình huống.
- Event `night_start` ghi ở tick 1 (test có dung sai ±2 tick).

## Phase 2 — Ticket-02 + Contract v1.1

Số chuẩn và bản đồ chuẩn thay toàn bộ giả định số liệu của Phase 1. Spec và tiêu chí nghiệm thu: [spec-phase2.md](spec-phase2.md).

### Giả định cho chỗ ticket chưa nói
| # | Chỗ mơ hồ | Giả định |
|---|---|---|
| B1 | "Tăng tốc/dừng trong ≤ 0.1 s" | Đạt tốc độ ngay trong 1 tick (0 s ≤ 0.1 s). |
| B2 | Bóng Mực ở trạng thái wander | Bay chậm 1.5 m/s tới một điểm ngẫu nhiên (seed) cách 2–6 m. |
| B3 | Độ cao Bóng Mực / Gió Lạc | Lơ lửng cố định trên mặt đất bên dưới (Bóng Mực giữ khoảng cao lúc tạo, mặc định 1 m); bay được qua vách và biển mây. "Chênh cao" khi chạm = y tâm bóng − y chân Mây. |
| B4 | Bóng Mực ở trạng thái nào thì gây hit | Chỉ wander/chase và không đang bị đẩy khỏi vùng sáng. |
| B5 | Sau choáng / recoil | Về chase nếu cách ≤ 12 m, ngược lại wander. |
| B6 | Mục tiêu của Tỏa Sáng | Mọi Bóng Mực trong 5 m (3D), kể cả đang spawning/recoil. Gió Lạc idle không bị ảnh hưởng. |
| B7 | Rơi khỏi đảo: trường `dropped` / `lost` | `dropped: 0` (không rơi ra đất), `lost` = số đom đóm mất. Khi chờ hồi sinh, Mây đứng yên tại chỗ rơi, không nhặt, không bị chạm. |
| B8 | Bục nhảy kích hoạt khi nào | Mây đứng trên mặt đất, XZ ≤ 1 m tâm bục, cùng độ cao bục. |
| B9 | Vách / dốc | Mặt cao hơn chân Mây > 0.35 m là vách (trượt theo trục còn lại). Dốc tuyến tính; bước xuống mép tầng thì rơi tự do xuống tầng dưới (không phải "rơi khỏi đảo"). |
| B10 | Gió | Cơn đầu ở sim tick 1800, rồi mỗi 1800; hướng ngẫu nhiên theo seed (độ nguyên); `dir_deg` là `null` khi không có gió. Chỉ Đêm 3. |
| B11 | Gió Lạc "tối đa 2 con" | Tối đa 2 con chưa `removed` cùng lúc. Điểm sinh = điểm sinh Bóng Mực ("điểm sương"). Không có event khi Gió Lạc xuất hiện (contract không có). |
| B12 | Đom đóm "điểm trống" | Điểm chưa có đom đóm random đứng trên đó. "Dưới 30" tính mọi đom đóm (cả loại rơi). |
| B13 | Bóng Mực sinh khi chưa có điểm cách người chơi ≥ 15 m | Bỏ lượt. |
| B14 | Scenario v1.1 | `motes` nhận `[x,y,z]` hoặc `{pos, kind, ttl_s}`. `charms[]` nhận `{id, pos?, available?, respawn_ticks?\|respawn_s?}`. `drifters[]` nhận `{id?, pos, state?, stolen?}`. Trạng thái lạ → mã 2. |
| B15 | Pause trong snapshot / end | `state: "paused"`; dòng `end` cũng có thể là `paused`. |
| B16 | Tổng điểm game | Giao diện cộng điểm các Đêm đã thắng. Headless chạy một Đêm nên `score` là điểm của Đêm đó. |

## Phase 3 — Ticket-03 + Contract v1.2

Quyết định chính: [ADR 0001](../adr/0001-lantern-fuel-and-dawn-win.md).

| # | Chỗ mơ hồ | Giả định |
|---|---|---|
| C1 | Dầu lẻ | Lưu nguyên đơn vị 1/60. Snapshot/event làm tròn 1 chữ số. Thưởng bình minh dùng floor(fuel). |
| C2 | `fuel_drain` | Mỗi Bóng Mực đang hút đếm riêng; event ở tick hút thứ 60, 120… `fuel` là dầu sau khi trừ tick đó. |
| C3 | "Đi về đèn tắt gần nhất như trước" | Wander không có đèn yếu → bay 1.5 m/s tới đèn tắt gần nhất rồi đứng đó. Không còn đèn tắt → lang thang ngẫu nhiên như Phase 2. |
| C4 | Wander và phát hiện | Vẫn đổi sang chase khi Mây ≤ 12 m (luật Phase 2), trước khi chọn đèn yếu. |
| C5 | Hết choáng | Luôn về `wander` (ticket). Recoil vẫn về chase/wander theo khoảng cách như Phase 2. |
| C6 | Scenario đèn `lit: false` có `fuel` | Bỏ qua, fuel = 0. `ever_lit` mặc định = `lit`. |
| C7 | Shade `state: "drain"` không có `target_lantern_id` | Chọn đèn gần nhất. |
| C8 | `per_second_left` | Đặt 0 (thưởng thời gian bị bỏ). Thưởng thắp lại (40), Tỏa Sáng lúc drain (15), mỗi đèn lúc bình minh (50) để trong `STD` vì contract không có khóa cho chúng. |

## Phase 4 — Ticket-04 + Contract v1.3

Quyết định chính: [ADR 0002](../adr/0002-bench-soak-leaderboard.md).

| # | Chỗ mơ hồ | Giả định |
|---|---|---|
| D1 | "200 Bóng Mực ở trạng thái wander … di chuyển theo luật wander bình thường" | Bóng Mực giữ trạng thái wander suốt bench (tắt chuyển sang chase vì sát thương cũng tắt). Luật wander v1.2 giữ nguyên: bay 1.5 m/s về đèn tắt gần nhất (L4/L5), bị đẩy khỏi vùng an toàn như thường. |
| D2 | "Rải đều trên đảo" | Đều theo diện tích trong đĩa bán kính 38 m (đảo 40 m, chừa 2 m), Bóng Mực cao 1 m. Vị trí lấy từ `Rng(42)`. Bóng nằm trong vùng sáng bị đẩy ra trong 3 s khởi động. |
| D3 | Chiều quay camera | Góc θ = 2π·t/15 tính từ khung bench đầu tiên, vị trí (30 cos θ, 15, −30 sin θ): từ +X sang −Z là ngược chiều kim đồng hồ khi nhìn từ trên xuống (trục three.js). |
| D4 | `dt_i`, khung đo | `dt` = hiệu hai mốc `requestAnimationFrame` liên tiếp. Đo từ khung đầu tiên sau 3 s, dừng khi đã đủ `--duration` giây. p95 theo phương pháp nearest-rank. |
| D5 | Cửa sổ 1280×720, tắt vsync | Vùng vẽ (viewport) 1280×720, khung cửa sổ lớn hơn một chút. Tắt vsync bằng cờ Chromium; FPS đo được (≈ 226) vượt tần số màn hình, cho thấy đã tắt thật. |
| D6 | `peak_mem_mb` của bản web | Tổng RSS (Windows: working set) của tiến trình trình duyệt và các tiến trình con (GPU, renderer), lấy mẫu ở cuối 3 s khởi động và ngay sau khung đo (không lấy trong lúc đo để khỏi làm nhiễu FPS). |
| D7 | `load_ms` | Từ lúc tiến trình `bench.mjs` khởi động (gồm mở server và trình duyệt) tới khung bench đầu tiên. |
| D8 | "Đêm thứ i dùng seed 7 + i" | i bắt đầu từ 1: seed 8..17. Input dùng luồng ngẫu nhiên riêng (seed XOR 0x5eed5eed): mỗi 30 tick chọn góc mới (cần đẩy hết cỡ), mỗi tick bấm nút độc lập 5/3/2/10 %. `cam_yaw` = 0. |
| D9 | Một Đêm soak kết thúc khi | Có `game_over` (phần lớn là `no_flames` vì input ngẫu nhiên đi rơi khỏi đảo), giới hạn an toàn = thời lượng + 10 s. |
| D10 | `mem_start_mb` / `mem_end_mb` | Gọi `gc()` rồi đọc RSS: ngay sau khi tạo World Đêm 1, và sau khi Đêm cuối trả kết quả (World đã ra khỏi phạm vi). |
| D11 | Điểm Bảng xếp hạng | Một lượt chơi bắt đầu từ "Bắt đầu" ở menu (chơi lại một Đêm vẫn trong lượt đó). `score` = tổng điểm các Đêm đã thắng trong lượt, `nights_won` = số Đêm đã thắng, `seed` = seed của lượt (giờ dùng một seed cho cả lượt). Mỗi màn kết quả lưu được 1 lần. |
| D12 | Tên | Chuẩn hóa NFC, bỏ khoảng trắng hai đầu, 3–12 ký tự (đếm code point), chỉ chữ Latin (gồm mọi chữ tiếng Việt có dấu), số và `_`. |
| D13 | Nơi lưu | `save/leaderboard.json` trong thư mục làm việc (`DDL_SAVE_DIR` để đổi). Nếu trang không có API: `localStorage`. |
| D14 | Bằng điểm | So thời điểm thật (đã tính múi giờ); nếu trùng cả thời điểm thì mục cũ đứng trên. |
| D15 | Đổi phím | Mỗi hành động một phím; Enter/Tab dành cho menu. P vẫn là phím tạm dừng phụ khi chưa gán cho việc khác; Shift phải là phím lướt phụ khi còn trống. Gán trùng thì báo và không nhận. |
| D16 | Chỉ báo | Gió: 2 s trước cơn gió (như Phase 2). Mũi tên Bóng Mực: 4 s sau khi sinh, chỉ khi nó ở ngoài khung nhìn. Phụ đề có thể tắt trong Cài đặt. |
| D17 | Giảm chuyển động | Tắt rung camera và chớp màn hình khi bị chạm, nhấp nháy đồng hồ, nháy 12 Hz của Mây khi bất tử, nháy đom đóm sắp biến mất. Giữ nhấp nháy 1 Hz của đèn yếu vì đó là chỉ báo bắt buộc (Ticket-03). |
