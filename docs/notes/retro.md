# Đánh giá từng phase và retro

## Phase 1 — đánh giá

- **Đạt:** cả 17 dòng trong [bảng truy vết](../proof/README.md). 34 test (10 unit + 19 scenario + tính tất định + lỗi CLI) xanh.
  Màn thắng trên giao diện ra 848 điểm, khớp scenario headless `p1-win`: hai lớp dùng chung một core.
- **Chưa chắc:** giả định A9 (`safe_radius` chỉ cho đèn đã thắp) có thể khác ý giảng viên. CI trên macOS/Linux chờ kết quả sau khi push.
- **Phase trước bị hỏng:** không áp dụng.
- **Harness cần chỉnh:** đã thêm bước build lại headless vào `npm test` (lỗi #2); skill `verify` yêu cầu mở từng ảnh (lỗi #5).
  Phase 2: cập nhật biến `PHASE` trong CI, chạy reviewer trước khi tag.

## Retro tổng (điền ở Phase 4)
