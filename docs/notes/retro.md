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

## Phase 3 — đánh giá
- **Đạt:** 16/16 dòng. 59 scenario + unit test xanh; mutation check 0/15 lọt (có 6 khóa mới của v1.2).
- **Phase trước bị ảnh hưởng:** có chủ đích. `p1-win` nghỉ hưu (thắng sớm bị thay). Các kỳ vọng P1/P2 đổi điểm hoặc thời lượng, lý do ghi trong `note`. Bộ ảnh Phase 2 chỉ chạy cho tag phase-2.
- **Harness đã chỉnh:** mutation check thêm 6 khóa mới; CI `PHASE=phase-3`; CLAUDE.md ghi mô hình đèn mới (`hasZone`, `fuel60`).

## Phase 4 — đánh giá
- **Đạt:** 12/13 dòng trong bảng truy vết đạt bằng bằng chứng tự động hoặc ảnh. Dòng 13 (Release + video) xem ở GitHub Release.
  93 test xanh; verify phase-4 ALL PASS (59 scenario, tất định, soak, bench.json); mutation check 0/15 lọt. Bench trên máy tôi: 226 fps / 1 % low 148 / load 1.2 s.
- **Phase trước bị ảnh hưởng:** không. Cờ `World.bench` mặc định tắt; 59 scenario P1–P3 và mutation check vẫn đạt nguyên.
- **Harness đã chỉnh:** verify thêm phần Ticket-04 (chạy đúng `soak_cmd`, kiểm `bench.json`); CI chạy `soak_cmd` và `run_cmd --export-leaderboard`;
  bộ ảnh phase-4 tự đo cỡ chữ; chạy subagent `reviewer` lần đầu trước khi tag: tìm ra 1 lỗi chặn (server sập vì URL sai) và 5 điểm nên sửa, đã sửa hết.

## Retro tổng

### Evaluation 4 phase
| Phase | Yêu cầu | Kết quả | Test | Ghi chú |
|---|---|---|---|---|
| 1 | Đêm 1 + headless v1.0 | 17/17 | 35 | Dời tag 1 lần sau khi đối chiếu câu trả lời CP1 |
| 2 | 3 Đêm, số chuẩn, v1.1 | 18/18 | 63 | FPS và âm thanh lúc đó chỉ có xác nhận tay |
| 3 | Dầu đèn, thắng lúc bình minh, v1.2 | 16/16 | 77 | 1 test nghỉ hưu có lý do, ADR 0001 |
| 4 | Bench, soak, Bảng xếp hạng, dễ tiếp cận, v1.3 | 12/13 + Release | 93 | ADR 0002, review bởi subagent |

### Điều hiệu quả khi làm với AI
- **Một nguồn số duy nhất** (`game.contract.json` được core import trực tiếp). Hai lần đổi luật lớn (v1.1, v1.2) không phải sửa số rải rác ở nhiều nơi.
- **Kỳ vọng tính tay, ghi phép tính trong `note`**. Khi scenario đỏ, đọc phép tính sẽ biết sai ở code hay ở kỳ vọng. Hai lần AI tính sai đã lộ ra theo cách này (lỗi #11).
- **Mutation check** là harness đáng giá nhất: bắt được bundle cũ làm test "đạt" giả (#2) và tốc độ Bóng Mực viết cứng (#8).
  Có nó, câu "test xanh" mới đáng tin.
- **Mở từng ảnh bằng mắt** bắt được 6 lỗi mà test không thấy: khoảng cách sai, chuỗi lặp chữ, phụ đề chưa kịp hiện, phụ đề trùng.
- **Stop hook chạy `npm test`**: agent không thể báo "xong" khi test đỏ.
- Mục bàn giao trong `plan.md` + ghi nhớ trước khi `/compact` giúp phiên mới vào việc ngay, không phải đọc lại toàn bộ đề.

### Điều không hiệu quả
- Heredoc bash trên Windows lỗi dấu nháy nhiều lần (#6, #15, #20). Lẽ ra phải chuyển sang viết script bằng công cụ Write ngay từ lần đầu.
- Hook formatter của tôi định dạng lại file sau mỗi lần sửa, nên các lần thay chuỗi chính xác hay lệch. Phải đọc lại đoạn cần sửa trước khi vá.
- Bằng chứng giao diện chụp bằng WebGL phần mềm chạy chậm. Đợi theo thời gian cố định thì không ổn định (#18); đợi theo trạng thái DOM mới đúng.
- FPS và âm thanh ở Phase 2 chỉ có xác nhận tay; tới Phase 4 mới có số đo lưu lại (`bench.json`).

### Những lần AI sai và cách phát hiện
27 lỗi được ghi trong [ai-log](ai-log.md). Theo cách phát hiện: test/scenario đỏ (5), mở ảnh (6), đối chiếu câu trả lời CP1 hoặc đọc kỹ đề (2),
kết quả đáng ngờ (mutation "đạt" giả, `peak_mem_mb: null`, RSS dao động) (4), lỗi shell/cú pháp (4), subagent `reviewer` (5), CI trên hệ điều hành khác (1).
Không có lỗi nào lọt qua tag mà về sau phải sửa luật, trừ #7 (sửa trước mốc của Phase 1, đã dời tag).

### Harness giúp nhiều nhất
1. `scripts/mutation-check.mjs`, 2. Stop hook `npm test`, 3. `CLAUDE.md` (quy tắc "không sửa expect.json để khớp output", "không viết cứng tuning"),
4. skill `verify` (thứ tự kiểm + mở ảnh), 5. CI so khớp `verify-report` đã commit. Subagent `reviewer` chỉ chạy ở Phase 4, nhưng một lần đó tìm ra 5 lỗi mà test không bắt được (bảo mật server, đo đạc bị nhiễu); lẽ ra nên chạy từ Phase 1.

### Token và chi phí
Ước tính cả 4 phase: khoảng 12–15 triệu token input (hơn 90 % đọc từ cache ngữ cảnh) và khoảng 250 nghìn token output (con số thật lấy từ `/cost`, xem ai-log).
Đã tiết kiệm bằng cách: đọc hết đề một lần rồi lập plan; vá file bằng script thay vì đọc lại file lớn; chỉ in phần lỗi của test và verify;
`/compact` sau khi ghi bàn giao; dùng subagent cho review để giữ ngữ cảnh chính gọn.

### Nếu làm lại
- Viết mục bàn giao và ghi nhớ môi trường (heredoc, formatter) ngay từ Phase 1.
- Đo FPS có log và có cảnh benchmark ngay từ Phase 2, thay vì chờ Phase 4.
- Chạy `reviewer` trước mỗi tag, không chỉ ở phase cuối.
- Gom Bóng Mực và đom đóm vào `InstancedMesh` từ đầu để có dư hiệu năng trên máy chấm yếu hơn.
- Hỏi giảng viên sớm hơn về các chỗ mơ hồ lớn (thứ tự trong tick, cách tính dầu lẻ) thay vì tự giả định rồi phải dời tag.
