# Đánh giá từng phase và retro

## Phase 1 — đánh giá

- **Đạt:** cả 17 dòng trong [bảng truy vết](../proof/README.md). 35 test (11 unit + 19 scenario + tính tất định + lỗi CLI) xanh.
  Màn thắng trên giao diện ra 848 điểm, khớp scenario headless `p1-win`: hai lớp dùng chung một core.
- **Đã chốt sau CP1:** giả định A9 được giảng viên xác nhận; CI xanh trên Ubuntu và macOS. Đối chiếu câu trả lời CP1 phát hiện 1 lỗi (Bóng Mực đang choáng kẹt trong vùng sáng của đèn vừa thắp), đã sửa.
- **Phase trước bị hỏng:** không áp dụng.
- **Harness cần chỉnh:** đã thêm bước build lại headless vào `npm test` (lỗi #2); skill `verify` yêu cầu mở từng ảnh (lỗi #5).
  Phase 2: cập nhật biến `PHASE` trong CI, chạy reviewer trước khi tag.

## Retro tổng (điền ở Phase 4)
