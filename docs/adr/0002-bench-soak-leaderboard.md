# ADR 0002 — Bench trong trình duyệt thật, soak đơn luồng, Bảng xếp hạng lưu qua server cục bộ

- Trạng thái: Chấp nhận (Phase 4, Contract v1.3)
- Bối cảnh: Ticket-04 yêu cầu `bench_cmd`, `soak_cmd`, Bảng xếp hạng trên đĩa cục bộ và `<run_cmd> --export-leaderboard`. Game là web (Three.js + Vite), lõi luật chạy được trong Node.

## 1. Benchmark: Playwright mở Chromium có cửa sổ

**Quyết định.** `node scripts/bench.mjs` mở bản build `dist/` (vite preview) trong cửa sổ Chromium thật (viewport 1280×720, không headless),
tắt vsync và giới hạn khung hình bằng `--disable-gpu-vsync --disable-frame-rate-limit`. Trang chạy cảnh bench (`?bench=1`) với
renderer, ánh sáng và HUD y như lúc chơi, tự đo `dt` từng khung bằng `requestAnimationFrame` và tính `bench.json` bằng
`src/shared/benchStats.ts` (có unit test cho công thức). RSS lấy từ cả cây tiến trình trình duyệt (dùng `launchServer` để biết pid gốc).

**Lý do.** Game chạy trong trình duyệt nên số đo phải lấy ở đó. Chromium tắt được vsync, còn Firefox/Safari thì không.
Lõi tạo cảnh (`createBenchWorld`) là code thuần nên test được bằng Vitest: đúng 200 Bóng Mực, 100 đom đóm, 33 s không có sự kiện nào ngoài `night_start`.

**Hệ quả.** Máy chấm cần Chromium của Playwright, hoặc Chrome/Edge có sẵn (script tự thử lần lượt). Cờ `World.bench` mặc định tắt,
nên output headless của Phase 1–3 không đổi (59 scenario và mutation check vẫn đạt).

## 2. Soak: một tiến trình Node, các cờ GC đơn luồng

**Quyết định.** `soak_cmd = node --expose-gc --jitless --single-threaded --max-semi-space-size=1 build/soak.mjs`.

**Lý do (có số đo).** Chạy không cờ, RSS tăng 57 → 67–70 MB, quanh ngưỡng 1.2×, và mỗi lần chạy ra một kết quả khác.
Trong khi đó `heapUsed` đứng yên ở khoảng 4.6 MB suốt 40 Đêm, nên đây **không phải rò bộ nhớ**. Phần tăng là bộ nhớ của các luồng
biên dịch/GC chạy song song của V8. Lõi mô phỏng vốn chạy một luồng; tắt các luồng phụ thì RSS ổn định 57.0 → 60.2 MB
qua 5 lần chạy, và 100 Đêm vẫn chỉ tới 63 MB. `--expose-gc` cho phép dọn rác trước mỗi lần đọc RSS, để số đo phản ánh dữ liệu còn sống.

**Cập nhật sau CI (thêm `--jitless`).** Trên CI, các cờ trên vẫn chưa đủ: macOS arm64 tăng 37.3 → 51.8 MB (1.39×), Linux 41.9 → 49.5 MB (1.18×).
Phần tăng là bộ nhớ mà trình biên dịch tối ưu (TurboFan/Maglev) cấp bằng malloc trong lần chạy đầu. macOS không trả vùng nhớ này lại cho hệ điều hành ngay,
nên RSS giữ ở mức cao dù đã giải phóng. `--jitless` tắt JIT: cùng một mã luật, chỉ chạy bằng trình thông dịch. Trên Windows, RSS tăng chỉ còn 55.0 → 56.4 MB,
10 Đêm vẫn chạy trong 0.5 s. `soak.json` ghi thêm `heap_used_start_mb` / `heap_used_end_mb` (heap JS còn sống sau gc), làm bằng chứng trực tiếp rằng không có rò dữ liệu game.

**Hệ quả.** Chạy `node build/soak.mjs` không có cờ vẫn được (chỉ đọc RSS mà không gọi `gc()`). CI chạy đúng `soak_cmd` trên Ubuntu và macOS.

## 3. Bảng xếp hạng: file JSON trên đĩa qua server cục bộ

**Quyết định.** `run_cmd = node build/serve.mjs` (cũng là `npm start`): server tĩnh cho `dist/` và API `/api/leaderboard`, ghi
`save/leaderboard.json` (ghi ra file tạm rồi đổi tên). `vite dev` và `vite preview` dùng cùng middleware.
`--export-leaderboard out.json` đọc file đó và ghi `{"entries": [...]}`. Nếu trang được mở bằng một server tĩnh khác, game lưu vào `localStorage`.

**Lý do.** Trang web không tự ghi ra đĩa được, còn lệnh xuất của contract chạy ngoài trình duyệt, nên cần một file mà cả hai cùng đọc.
`run_cmd` không còn là `npm start` vì `npm start --export-leaderboard x` (thiếu `--`) để npm nuốt mất cờ. `serve.mjs` vẫn đọc
`npm_config_export_leaderboard` làm phương án dự phòng.

**Hệ quả.** Luật Bảng xếp hạng (tên, sắp xếp, top 10) là hàm thuần trong `src/shared/leaderboard.ts`, dùng chung cho trình duyệt và server, có unit test.
