# Nhật ký dùng AI

Công cụ: Claude Code (VS Code extension), model Claude Opus 5.5, một phiên chính cho mỗi phase.
Harness: `CLAUDE.md`, skill `verify`, subagent `reviewer`, Stop hook chạy `npm test`, CI GitHub Actions.

## Phase 1

### Lời nhắc chính

1. "Đọc kĩ các file hướng dẫn và yêu cầu của bài lab để lên kế hoạch, tạo plan.md, hỏi tôi nếu cần xác nhận" → `docs/notes/plan.md`,
   4 câu hỏi được chốt (tên repo, stack TypeScript + Three.js, chuyển đề bài vào `docs/lab/`, cài `gh` + `ffmpeg`).
2. "Đã đổi tên repo, được commit plan.md, đã cập nhật PRD-0. Tiến hành làm bài" → agent tự làm CP0 + Phase 1 theo plan.

### Cách làm

- Đọc Test Contract trước, thiết kế `src/core` thuần và tất định, rồi mới viết hiển thị.
- `game.contract.json` là nguồn tuning duy nhất (core import trực tiếp), nên không thể khai báo lệch với số game dùng.
- Viết kỳ vọng scenario bằng tay từ luật (phép tính ghi trong `note`), sau đó mới chạy.
- Làm mutation check: đổi tuning để chắc test có thể đỏ.

### Lỗi của AI và cách phát hiện

| #   | Lỗi                                                                                | Phát hiện bằng                                            | Sửa / chỉnh harness                                                  |
| --- | ---------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------- |
| 1   | Thời gian choáng lệch 1 tick (so với tick input k thay vì tick kết quả k+1)        | Tự rà mô hình tick trước khi viết test                    | Dùng một hàm `isStunned(w, s)` cho cả di chuyển và snapshot          |
| 2   | Mutation check lần đầu vẫn "đạt": bundle headless cũ chưa build lại                | Kết quả đáng ngờ (đổi tuning mà 34/34 vẫn xanh)           | `npm test` luôn build lại headless trước khi test; ghi vào CLAUDE.md |
| 3   | Gán phím xoay camera Q/**E** trùng với phím nạp đèn E                              | Tự review diff                                            | Đổi sang ←/→ + kéo chuột                                             |
| 4   | Nhấn phím ngắn (F) bị mất khi FPS thấp, nên tỏa sáng không xảy ra                  | Ảnh bằng chứng `05-shade-pulse` lần đầu không có hiệu ứng | Giữ lần nhấn tới tick logic kế tiếp (`tapped`)                       |
| 5   | Scenario chụp ảnh đặt Mây cách đèn 4 m (> `interact_radius` 3 m), không hiện gợi ý | Mở ảnh `03-near-lantern` kiểm tra                         | Sửa thành 2 m; skill `verify` yêu cầu mở từng ảnh để xem             |
| 6   | Sinh file scenario bằng bash heredoc bị lỗi dấu nháy                               | Lỗi shell                                                 | Chuyển sang script Node                                              |

### Token / chi phí (ước tính)

- Phase 1 (gồm chuẩn bị + plan): khoảng 2–3 triệu token input (phần lớn đọc lại từ cache ngữ cảnh) và khoảng 50 nghìn token output.
  _Số thật: cập nhật từ `/cost` hoặc trang usage khi kết thúc phiên._
- Cách tiết kiệm: đọc toàn bộ đề bài một lần rồi lập kế hoạch; viết core + test trong ít lượt lớn; dùng script
  (`verify.mjs`, `screenshot.mjs`) thay vì để agent chạy tay từng lệnh; không dùng subagent cho việc đọc/tìm.
