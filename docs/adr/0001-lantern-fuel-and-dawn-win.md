# ADR 0001 — Đèn có nhiên liệu, thắng khi giữ đảo sáng tới bình minh

- Trạng thái: Chấp nhận (Phase 3, Ticket-03, Contract v1.2)
- Thay thế: luật "đèn đã sáng không nhận thêm đom đóm", "Bóng Mực không vào vùng an toàn", "thắng ngay khi mọi đèn sáng", công thức điểm cũ.

## Bối cảnh

Ở Phase 1–2 đèn có hai trạng thái `tắt → sáng` và không quay lại. Đèn sáng thì có vùng an toàn vĩnh viễn, và game thắng ngay khi mọi đèn sáng. Playtest cho thấy người chơi giỏi thắng sau 2 phút, nửa cuối Đêm không còn căng thẳng.

## Quyết định

1. **Mô hình trạng thái đèn** đổi từ `lit: boolean` thành:
   `{ lit, deposited, fuel60, everLit, relitCount }`.
   - `fuel60` là nhiên liệu tính bằng số nguyên đơn vị 1/60. Hao 1 đơn vị/tick, Bóng Mực hút thêm 5/tick. Chỉ làm tròn 1 chữ số khi xuất snapshot/event, nên không có sai số số thực tích lũy.
   - Vòng đời: `chưa thắp (cost 10)` → `sáng (fuel 100)` → `hết dầu → tắt (deposited 0, everLit = true)` → `thắp lại (cost 5)` → `sáng`…
   - **Vùng an toàn** là thuộc tính suy ra, không lưu trữ: `hasZone = lit && fuel ≥ 30`. Vì thế mọi chỗ trước đây dùng `lit` (chặn ở mép, đẩy ra trong 30 tick) chỉ cần đổi sang `hasZone`. Khi châm dầu vượt ngưỡng 30, cơ chế "đẩy ra" của Phase 2 tự áp dụng mà không cần code riêng.
2. **Tương tác** có ba nhánh, chọn một đèn "nhận được" gần nhất (bằng nhau thì id nhỏ hơn): thắp mới, thắp lại, châm dầu (`refuel`). Đèn đầy dầu bị loại khỏi danh sách chọn.
3. **Bóng Mực** có thêm trạng thái `drain`. Khi wander, nó ưu tiên đi tới đèn sáng có fuel < 30 gần nhất; nếu không có thì về đèn tắt gần nhất; nếu không có nữa thì lang thang ngẫu nhiên như Phase 2. Thoát `drain` theo đúng các điều kiện của ticket. Hết choáng thì luôn về `wander` (trước đây về `chase` nếu ở gần).
4. **Thắng/thua** chỉ xét ở bước 11 của tick: hết Ngọn Lửa → thua `no_flames` (kể cả ở tick bình minh). Hết giờ: số đèn đang sáng ≥ ceil(0.6 × tổng đèn) → `dawn_survived`, ngược lại `dawn`. Bỏ thắng sớm và lý do `all_lit`.
5. **Thứ tự trong tick**: thêm bước 2b ngay sau bộ đếm. Trừ dầu (hao + hút), phát `fuel_drain` mỗi 60 tick hút, rồi tắt các đèn fuel ≤ 0 (`lantern_out`). Các bước khác giữ nguyên thứ tự 12 bước của Ticket-02.
6. **Sức chứa** = min(20, 10 + 2 × successful_lights). `successful_lights` là biến của World, đặt lại mỗi Đêm vì World tạo mới mỗi Đêm.
7. **Điểm**: +5 mỗi đom đóm nạp (thắp hoặc châm), +100 thắp lần đầu, +40 thắp lại, +5/+15 mỗi Bóng Mực trúng Tỏa Sáng (+15 nếu nó đang `drain`). Khi thắng: mỗi đèn sáng +50 + floor(fuel), mỗi Ngọn Lửa +50. Bỏ thưởng thời gian (`per_second_left = 0`).

## Hệ quả

- Test cũ: `p1-win` nghỉ hưu (luật bị thay thế), được thay bằng `p3-all-lit-continues`, `p3-win-dawn`, `p3-lose-dawn`. Các scenario P1/P2 có điểm hoặc thời lượng Đêm đổi thì được tính lại, lý do ghi trong `note`. Không test nào bị bỏ qua âm thầm.
- `hasZone` là điểm duy nhất quyết định vùng an toàn. Nếu thiết kế đổi ngưỡng thì chỉ cần sửa `low_fuel_threshold` trong contract; mutation check sẽ bắt nếu test không phản ánh.
- Rủi ro: luật "đi về đèn tắt gần nhất như trước" không mô tả chi tiết. Bóng Mực của tôi bay tới đèn tắt gần nhất rồi đứng đó cho tới khi phát hiện Mây (giả định C3).
