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
| 7   | Bóng Mực **đang choáng** bỏ qua cả bước đẩy ra khỏi vùng sáng → kẹt trong `safe_radius` khi đèn vừa thắp | Đối chiếu từng câu trả lời CP1 của giảng viên với code (mục 7) | Viết unit test tái hiện (đỏ: 3.99 m < 6 m) rồi mới sửa: mọi Bóng Mực đều qua `keepOutOfLight` mỗi bước |

### Token / chi phí (ước tính)

- Phase 1 (gồm chuẩn bị + plan): khoảng 2–3 triệu token input (phần lớn đọc lại từ cache ngữ cảnh) và khoảng 50 nghìn token output.
  _Số thật: cập nhật từ `/cost` hoặc trang usage khi kết thúc phiên._
- Cách tiết kiệm: đọc toàn bộ đề bài một lần rồi lập kế hoạch; viết core + test trong ít lượt lớn; dùng script

## Phase 2

### Lời nhắc chính
- "Đã cập nhật nội dung phase 2 @docs/lab/phase-2-ticket02.md" → agent ưu tiên theo điểm: lõi contract v1.1 + test trước, giao diện sau.

### Cách làm
- Viết lại `sim.ts` theo đúng thứ tự 12 bước của ticket (comment đánh số), bản đồ tách ra `maps.ts` (dữ liệu + hàm mặt đất).
- `scripts/gen-scenarios.mjs` là nguồn duy nhất của scenario; kỳ vọng tính tay, phép tính ghi trong `note`.
- Harness mới: `scripts/mutation-check.mjs` đổi từng số tuning, build lại và ghi scenario nào đỏ.

### Lỗi của AI và cách phát hiện
| # | Lỗi | Phát hiện bằng | Sửa / chỉnh harness |
|---|---|---|---|
| 8 | Tốc độ Bóng Mực viết cứng trong `maps.ts` thay vì đọc `shade_speed` từ contract (đổi tuning không có tác dụng) | **Mutation check**: đổi `shade_speed` mà 0 scenario đỏ | Đêm 1/2 dùng `tuning.shade_speed`, chỉ Đêm 3 ghi đè 4.5; mutation check thành bước của skill `verify` |
| 9 | Scenario chụp ảnh Bình Minh nhầm id đèn (L4/L5) nên không thắng | Mở ảnh `15-dawn` kiểm tra | Sửa scenario; nhắc lại trong skill: mở từng ảnh |
| 10 | Chú thích ảnh 10 nói "đuổi" nhưng ảnh cho thấy đã cướp xong | Đối chiếu ảnh với chú thích | Sửa chú thích cho đúng ảnh |

### Token / chi phí (ước tính)
- Phase 2: khoảng 3–4 triệu token input (phần lớn từ cache) và khoảng 70 nghìn token output. _Số thật: cập nhật từ `/cost`._
- Cách tiết kiệm: viết lõi + bộ sinh scenario thành vài file lớn trong ít lượt; chạy toàn bộ scenario bằng một lệnh và chỉ in phần lỗi; chụp ảnh bằng một script rồi chỉ mở các ảnh cần kiểm.
  (`verify.mjs`, `screenshot.mjs`) thay vì để agent chạy tay từng lệnh; không dùng subagent cho việc đọc/tìm.
