# Đánh giá từng phase và retro

## Phase 1 — đánh giá

- **Đạt:** cả 17 dòng trong [bảng truy vết](../proof/README.md). 35 test (11 unit + 19 scenario + tính tất định + lỗi CLI) xanh.
  Màn thắng trên giao diện ra 848 điểm, khớp scenario headless `p1-win`: hai lớp dùng chung một core.
- **Đã chốt sau CP1:** giả định A9 được giảng viên xác nhận; CI xanh trên Ubuntu và macOS. Đối chiếu câu trả lời CP1 phát hiện 1 lỗi (Bóng Mực đang choáng kẹt trong vùng sáng của đèn vừa thắp), đã sửa.
- **Phase trước bị hỏng:** không áp dụng.
- **Harness cần chỉnh:** đã thêm bước build lại headless vào `npm test` (lỗi #2); skill `verify` yêu cầu mở từng ảnh (lỗi #5).
  Phase 2: cập nhật biến `PHASE` trong CI, chạy reviewer trước khi tag.

## Phase 2 — đánh giá
- **Đạt:** 18/18 dòng trong bảng truy vết đạt (FPS và âm thanh do người dùng kiểm tay sau khi tag). 45 scenario + 18 unit test xanh; tất định cả 3 Đêm; mutation check 0/9 lọt.
- **Bằng chứng còn yếu:** FPS (~160 trên RTX 3060 Laptop) và âm thanh chỉ có xác nhận của người dùng, chưa có log/ảnh; sẽ bổ sung bằng script đo FPS và video ở Phase 4.
- **Phase trước có hỏng không:** luật Phase 1 đổi theo số chuẩn. 18 scenario `p1-*` được tính lại bằng tay. `p1-island-edge` nghỉ hưu vì rơi khỏi đảo nay là luật; lý do ghi trong `tests/scenarios/_retired/README.md`.
- **Harness đã chỉnh:** thêm `mutation-check.mjs` (đã bắt lỗi #8); CI chuyển `PHASE=phase-2`; CLAUDE.md và skill `verify` cập nhật cho 3 Đêm.

## Retro tổng (điền ở Phase 4)
