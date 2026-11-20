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
| A9  | `safe_radius` áp cho đèn nào                                                   | Chỉ đèn **đã thắp**. Bóng Mực bị đặt lại ngay ngoài vòng (r + 0.001 m)                                                                                                                                | "Bóng Mực sợ những chiếc đèn" — đèn tắt không có ánh sáng. **Đã hỏi lại trợ giảng?** (xem mục mở) |
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

- A9 (`safe_radius` chỉ cho đèn đã thắp) là giả định quan trọng nhất cho test ẩn. Nếu trợ giảng nói áp cho mọi đèn thì chỉ cần bỏ điều kiện `!l.lit` trong `keepOutOfLight` (`src/core/sim.ts`) và sửa `p1-safe-radius`.
