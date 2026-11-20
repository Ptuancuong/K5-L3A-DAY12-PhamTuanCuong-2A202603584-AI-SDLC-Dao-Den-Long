# Kế hoạch làm lab Day 12 — Đảo Đèn Lồng

> Kế hoạch đã thống nhất. Quyết định đã chốt ở mục 6, câu hỏi còn mở ở mục 7.
> Nội dung PRD-0 / Ticket chưa có trong repo (chỉ có trên lab board), nên phần "yêu cầu cụ thể" của từng phase sẽ điền khi phase phát hành.

---

## 0. Tóm tắt yêu cầu của lab (từ README, GUIDE, CHECKPOINTS, SUBMISSION, RULES, RUBRIC)

- Bài cá nhân, 4 giờ, 4 phase: Phase 1 (0h–1h), Phase 2 (1h–2h), Phase 3 (2h–2h30), Phase 4 (2h30–4h).
- Mỗi phase: tag `phase-N` **trước mốc**; Phase 4 thêm Release `v1.0.0` + video `.mp4` < 5 phút.
- Game 3D góc nhìn thứ ba; **chạy được trên macOS hoặc Linux**; có **chế độ headless theo Test Contract** (chấm tự động, chiếm 30 điểm, và test của phase trước được chạy lại ở các phase sau).
- Điểm cao nhờ: đúng yêu cầu + bằng chứng thật khớp tag + harness hữu ích + ghi chép token/retro. Đồ họa vượt yêu cầu không được cộng điểm.
- Cấm: test luôn đạt, sửa tay output, xóa file harness, force push sau khi tag, commit `.env`/key, dùng asset có bản quyền.

## 1. Quyết định kỹ thuật (đề xuất)

| Hạng mục    | Đề xuất                                                                                   | Lý do                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Ngôn ngữ    | TypeScript (hoặc JS thuần) trên Node 24 (máy đã có `node v24.15.0`)                       | Một ngôn ngữ cho cả logic, headless và hiển thị; chạy giống nhau trên Win/macOS/Linux       |
| Hiển thị 3D | Three.js + Vite (web)                                                                     | Nhẹ, không cần cài engine, Release là thư mục web tĩnh                                      |
| Headless    | `node` CLI gọi thẳng vào `src/core` (không dùng DOM/WebGL)                                | Đúng gợi ý "tách logic khỏi hiển thị"                                                       |
| Test        | Vitest (unit) + bộ scenario headless tự viết (`tests/scenarios/*.json` + output mong đợi) | Chạy bằng 1 lệnh `npm test`                                                                 |
| Tất định    | Fixed timestep, RNG có seed, **cấm** `Math.random()`/`Date.now()` trong `src/core`        | Cùng đầu vào → cùng output; có test chạy 2 lần và so sánh                                   |
| CI          | GitHub Actions trên `ubuntu-latest` (+ `macos-latest` nếu rẻ)                             | Bạn code trên Windows nhưng máy chấm là macOS/Linux → CI là bằng chứng chạy được trên Linux |
| Release     | `npm run build` → `dist/` (web tĩnh) nén zip đính kèm Release; README ≤ 3 lệnh            | Đúng yêu cầu "bản chạy được"                                                                |

Phương án dự phòng nếu bạn muốn: Python + Panda3D/Ursina (máy có Python 3.14, nhưng thư viện 3D có thể chưa hỗ trợ 3.14) hoặc Godot (headless được nhưng agent khó thao tác hơn). **Đã chốt: TypeScript + Three.js (xem mục 6).**

### Kiến trúc thư mục dự kiến

```text
src/core/        logic game thuần, tất định (state, update(dt, input), luật)
src/render/      Three.js: chỉ đọc state từ core để vẽ, nhận input bàn phím
src/headless/    CLI theo Test Contract (đọc input → chạy core → in output đúng định dạng)
tests/unit/      test logic
tests/scenarios/ scenario headless + expected output
scripts/         verify.mjs: chạy test + scenario + kiểm tra tất định, ghi kết quả vào docs/proof/
docs/notes/      assumptions.md, ai-log.md (token), retro.md
docs/proof/      phase-1/ … phase-4/ (output thật, ảnh chụp, số đo)
CLAUDE.md        harness: lệnh build/test, quy ước, điều cấm (ngắn, vài chục dòng)
.claude/skills/verify/SKILL.md   skill chạy kiểm chứng và lưu bằng chứng
.claude/agents/reviewer.md       subagent review (người/agent khác người viết)
.claude/settings.json            hooks
.github/workflows/ci.yml         CI
README.md  CREDITS.md  LICENSE  CHANGELOG.md
```

## 2. Harness AI (nhắm tiêu chí B "Agent tự kiểm chứng" và C)

1. **`CLAUDE.md`**: lệnh `npm install`, `npm test`, `npm run headless -- …`, `npm run dev`; quy ước (core không import Three.js, không random không seed); điều cấm (không sửa expected output cho khớp, không tắt test không ghi lý do). Cập nhật mỗi khi agent sai lần 2 → git history chứng minh.
2. **Skill `verify`**: các bước chạy `npm test`, chạy scenario, chạy tất định 2 lần, ghi output vào `docs/proof/phase-N/`.
3. **Hook**:
   - `Stop` hook: chạy `npm test`; nếu đỏ thì chặn agent kết thúc (đúng tiêu chí "ngăn kết thúc khi test đỏ").
   - (tùy chọn) `PostToolUse` sau Edit/Write: chạy typecheck/test nhanh.
4. **Subagent `reviewer`**: đọc diff + yêu cầu phase, chỉ review, không sửa code.
5. **CI**: chạy test + scenario + kiểm tra tất định mỗi lần push.
6. `.gitattributes` với `* text=auto eol=lf` để tránh lỗi CRLF khi chạy trên Linux/macOS.

## 3. Ghi chép bắt buộc

| File                        | Nội dung                                                                                                                            | Khi nào cập nhật              |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `docs/notes/assumptions.md` | Mỗi phase: yêu cầu bắt buộc, chỗ mơ hồ → giả định, tiêu chí nghiệm thu ("làm A thì thấy B"), thay đổi thiết kế và lý do             | Đầu mỗi phase                 |
| `docs/proof/README.md`      | Bảng truy vết: Yêu cầu, Cách kiểm chứng, Bằng chứng (đường dẫn), Kết quả (đạt / chưa đạt + lý do)                                   | Cuối mỗi phase                |
| `docs/notes/ai-log.md`      | Lời nhắc chính, lỗi của AI và cách phát hiện, chỉnh harness, **token/chi phí ước tính mỗi phase** (lấy từ `/cost` hoặc trang usage) | Cuối mỗi phase                |
| `docs/notes/retro.md`       | Đánh giá từng phase + retro tổng                                                                                                    | Cuối mỗi phase + cuối lab     |
| `README.md` (của game)      | Link video ở đầu, mô tả, cài đặt ≤ 3 lệnh, điều khiển, cách chạy test/headless, mục **"Sáng tạo của tôi"**                          | Phase 1 tạo, Phase 4 làm sạch |
| `CREDITS.md`, `LICENSE`     | Nguồn asset/âm thanh/công cụ AI; giấy phép (đề xuất MIT)                                                                            | Phase 1 tạo, Phase 4 rà lại   |

## 4. Lịch làm việc chi tiết

### CP0 — Chuẩn bị (trước lab hoặc 10 phút đầu)

- [ ] Đổi tên repo cho đúng quy ước (xem câu hỏi 1).
- [ ] Chuyển 6 file tài liệu của lab sang `docs/lab/` để `README.md` gốc dành cho game (xem câu hỏi 4).
- [ ] Khung dự án: `package.json`, Vite + Three.js, Vitest, cảnh "hello 3D" + lệnh headless "hello".
- [ ] `CLAUDE.md`, skill `verify`, Stop hook, reviewer, CI, `.gitattributes`, `.gitignore` (có `.env`, `node_modules`, `dist`).
- [ ] Tạo khung `docs/notes/`, `docs/proof/`.
- [ ] Cài `gh` CLI (để tạo Release) và công cụ quay màn hình (xem câu hỏi 3).
- [ ] Mở lab board, thử hỏi trợ giảng một câu.
- Tự kiểm: clone sang thư mục khác, `npm install && npm test` chạy được; CI xanh.

### CP1 — Phase 1 (0h–1h, PRD-0)

1. (10') Đọc PRD-0 hai lần. Chép nguyên văn Test Contract vào `docs/notes/assumptions.md`; liệt kê con số tự chọn phải khai báo.
2. (5') Viết tiêu chí nghiệm thu + scenario mong đợi **trước khi code**; duyệt kế hoạch với agent.
3. (25') Build theo bước nhỏ: core → headless CLI đúng định dạng → render 3D tối thiểu (Mây, đom đóm, Đèn Lồng Lớn, Bóng Mực, sương đen) → HUD. Mỗi bước một commit.
4. (12') Chạy skill `verify`, lưu bằng chứng + 1–2 ảnh chụp, chạy reviewer.
5. (5') Cập nhật ghi chép, `git tag phase-1 && git push origin main phase-1` **trước mốc 1h**.

### CP2 — Phase 2 (1h–2h, Ticket-02)

- So ticket với giả định Phase 1 → cập nhật. Kế hoạch kiểm chứng phần mới trước khi code.
- Build → chạy lại **toàn bộ** scenario Phase 1 (hồi quy).
- Rà harness: thêm dòng vào CLAUDE.md / sửa skill nếu agent sai lặp lại.
- Tag `phase-2` trước mốc 2h.

### CP3 — Phase 3 (2h–2h30, Ticket-03, chỉ 30 phút)

- Xác định luật cũ bị **thay thế** → liệt kê test/tài liệu bị ảnh hưởng.
- Ghi 1 đoạn "đổi thiết kế thế nào, vì sao".
- Test cũ sai theo luật mới: sửa hoặc chuyển sang `tests/scenarios/retired/` kèm lý do (không xóa âm thầm).
- Phạm vi tối thiểu, tag `phase-3` trước mốc 2h30.

### CP4 — Phase 4 (2h30–4h, Ticket-04)

- Yêu cầu có số đo: viết script đo (ví dụ `npm run bench`), chạy thật, lưu kết quả + cấu hình máy.
- Làm sạch README (≤ 3 lệnh), CREDITS, LICENSE, CHANGELOG.
- Build `dist/`, thử trên thư mục clone sạch.
- Tag `phase-4`, tạo Release `v1.0.0` kèm bản build (zip).
- Mục "Sáng tạo của tôi" (1–2 ý nhỏ, **không làm đổi output headless**) chỉ làm khi phần lõi đã xanh.

### CP5 — Video + nộp (15 phút cuối)

- Quay video < 5 phút: chơi thử → `npm test` xanh → chạy headless/đo hiệu năng → lướt qua harness + `git log` + tags.
- Đính kèm vào Release `v1.0.0`, link ở đầu README.
- Retro tổng; rà checklist SUBMISSION §7; kiểm tra bằng cửa sổ ẩn danh; nộp link lên LMS.

## 5. Nguyên tắc dùng token

- Mỗi phase mở phiên mới/`/clear`, chỉ nạp CLAUDE.md + ticket của phase đó.
- Giao việc nhỏ kèm tiêu chí kiểm chứng; dừng sớm khi agent đi lạc.
- Việc nhẹ (đọc, định dạng) dùng model rẻ; việc khó (thiết kế core, sửa luật) dùng model mạnh.
- Ghi số token/chi phí cuối mỗi phase vào `ai-log.md`.

---

## 6. Quyết định đã chốt (2026-11-20)

| #   | Vấn đề                                                   | Quyết định                                                                          |
| --- | -------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1   | Tên repo `…-Cao-Den-Long` sai quy ước (`…-Dao-Den-Long`) | Bạn tự đổi tên trên GitHub; sau đó cập nhật `git remote set-url`                    |
| 2   | Stack                                                    | **TypeScript + Three.js + Vite**, headless chạy trên Node                           |
| 3   | Công cụ thiếu                                            | Cài `winget install GitHub.cli` + `winget install Gyan.FFmpeg`, rồi `gh auth login` |
| 4   | README đề bài                                            | Chuyển 6 file đề bài sang `docs/lab/`; README gốc là README của game                |

## 7. Câu hỏi còn mở

5. **Lab đã bắt đầu chưa / PRD-0 đã phát hành chưa?** Mình không mở được lab board. Khi Phase 1 mở, bạn dán nguyên văn PRD-0 + Test Contract vào chat (hoặc lưu vào `docs/lab/phase-1-prd0.md`) để mình bám đúng yêu cầu.
6. **Có commit `plan.md` này vào repo không?** (Đề xuất: có, chuyển vào `docs/notes/plan.md` như một bằng chứng của bước Plan.)
