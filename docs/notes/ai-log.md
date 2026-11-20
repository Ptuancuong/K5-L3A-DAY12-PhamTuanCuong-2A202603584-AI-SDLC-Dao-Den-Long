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

## Phase 3

### Lời nhắc chính
- "Đã cập nhật nội dung phase 3 @docs/lab/phase-3-ticket03.md" → agent làm lõi v1.2 + test trước, rồi ADR/changelog (DoD), cuối cùng là giao diện.

### Lỗi của AI và cách phát hiện
| # | Lỗi | Phát hiện bằng | Sửa / chỉnh harness |
|---|---|---|---|
| 11 | Hai kỳ vọng sai: kiểm snapshot ở tick 5 (mặc định cứ 10 tick mới có một snapshot); nhầm 136 thay vì 135 (9 m / (4/60)) | Scenario đỏ, đọc lại phép tính | Sửa kỳ vọng sau khi tính lại tay, không chép output |
| 12 | Dòng `?cb=1` đặt trước khai báo `settings` → typecheck lỗi, `npm run build` không chạy, ảnh dùng bản build cũ ("bad shade state drain") | Lỗi trang trong script chụp ảnh | Đổi thứ tự; luôn xem output build trước khi chụp |
| 13 | Script ảnh Phase 2 dựa vào luật thắng sớm đã bị thay | Playwright timeout ở `#res-next` | Bộ ảnh Phase 2 chỉ chạy khi chụp cho `phase-2` (ảnh ở tag phase-2 vẫn đúng với code tại đó) |
| 14 | Màn kết quả hiện "Đảo Đảo Bến" | Mở ảnh p3-04 | Sửa chuỗi |
| 15 | Heredoc bash nhiều lần lỗi dấu nháy | Lỗi shell | Viết script Python ra thư mục tạm rồi chạy |

### Token / chi phí (ước tính)
- Phase 3: khoảng 2–3 triệu token input (phần lớn cache) và khoảng 45 nghìn token output. _Số thật: cập nhật từ `/cost`._
- Cách tiết kiệm: sửa code bằng script thay thế có kiểm tra số lần khớp (dừng ngay nếu lệch) thay vì đọc lại cả file lớn; chạy toàn bộ scenario bằng một lệnh và chỉ in phần lỗi.

## Phase 4

### Lời nhắc chính
- "/compact" rồi "làm phase 4". Trước khi compact, agent ghi mục bàn giao vào đầu `docs/notes/plan.md` và lưu ghi nhớ (memory), nên phiên sau đọc là làm tiếp được ngay.
- Agent đọc Ticket-04, làm lõi trước (cờ bench, soak, luật Bảng xếp hạng + test), sau đó tới server, giao diện, bench thật, ảnh, tài liệu, rồi chạy subagent `reviewer`.

### Lỗi của AI và cách phát hiện
| # | Lỗi | Phát hiện bằng | Sửa / chỉnh harness |
|---|---|---|---|
| 16 | RSS soak tăng 57 → 67–70 MB, quanh ngưỡng 1.2× | Chạy soak 4 lần liên tiếp; in `heapUsed` từng Đêm (đứng yên khoảng 4.6 MB, tức không rò) | Chạy Node đơn luồng (ADR 0002); thêm bước chạy lại 100 Đêm |
| 17 | `bench.json` có `peak_mem_mb: null`: Browser từ `chromium.launch()` không có `process()` | Đọc kết quả `bench.json` | Dùng `launchServer()` + `connect()` để lấy pid gốc |
| 18 | Ảnh phụ đề/gió không có phụ đề: WebGL phần mềm chậm làm mô phỏng chạy chậm hơn thời gian thực, nên đợi cố định 5.7 s là không đủ | Mở ảnh p4-07, p4-08 (đồng hồ còn 00:12) | Đợi theo điều kiện DOM (`waitForFunction`) thay vì đợi cố định |
| 19 | Hai Bóng Mực sinh cùng tick tạo hai dòng phụ đề giống nhau | Mở ảnh p4-07 | Gộp phụ đề trùng thành "(×2)" |
| 20 | Script Python trong heredoc bash làm `\n` của template literal thành xuống dòng thật, gây lỗi cú pháp `verify.mjs` | Chạy verify | Sửa bằng Edit; script dài viết bằng công cụ Write (đúng như ghi nhớ đã lưu) |
| 22 | Server `serve.mjs` sập khi gặp URL `%` sai (`decodeURIComponent` ném lỗi, không bắt) | Subagent `reviewer` (thử `curl /%E0%A4%A`) | Trả 400; kiểm lại bằng curl |
| 23 | Lấy mẫu RSS bằng powershell mỗi 5 s **trong lúc đo** làm giảm FPS | `reviewer` | Chỉ lấy mẫu trước và sau khung đo: avg 195 → 226 fps, 1 % low 131 → 148 |
| 24 | API Bảng xếp hạng nhận POST từ bất kỳ trang web nào (CSRF, DNS rebinding) | `reviewer` | Chỉ nhận Host cục bộ, Origin cùng nguồn, `Content-Type: application/json`; thêm unit test |
| 25 | `save/` phụ thuộc thư mục đang đứng khi chạy `serve.mjs` | `reviewer` | Lưu cạnh game (thư mục gốc gói) |
| 26 | `bench.mjs` thoát mã 1 khi trang có lỗi (ticket: thoát 0 sau khi đo) | `reviewer` | Thoát 0, ghi lỗi vào `notes` |
| 27 | Soak đạt trên Windows nhưng trượt trên macOS CI (37.3 → 51.8 MB, 1.39×), Linux sát ngưỡng (1.18×): bộ nhớ của JIT không được trả lại cho hệ điều hành | CI đỏ; vì log CI cần đăng nhập nên cho verify in số liệu ra annotation công khai rồi đọc qua API | Thêm `--jitless` vào `soak_cmd`; `soak.json` ghi heap JS đầu/cuối (4.3 → 4.4 MB) làm bằng chứng không rò (ADR 0002) |
| 21 | Lỗi cũ: âm báo gió phát mỗi khung hình trong tick cảnh báo (FPS cao), nhãn Cài đặt bị lặp | Đọc lại code/HTML khi thêm phụ đề | Báo một lần mỗi cơn gió; sửa nhãn |

### Token / chi phí (ước tính)
- Phase 4: khoảng 4–5 triệu token input (phần lớn cache) và khoảng 80 nghìn token output, cộng subagent `reviewer`. _Số thật: cập nhật từ `/cost`._
- Cách tiết kiệm: ghi mục bàn giao rồi `/compact` trước phase dài; vá file bằng script có kiểm tra số lần khớp; chỉ in phần lỗi/tóm tắt của test và verify.
