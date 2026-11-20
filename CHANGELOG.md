# Changelog

## phase-4 — v1.0.0, Contract v1.3 ("Bình minh: phát hành")

### Contract
- `contract_version` `1.2` → `1.3`. Thêm `bench_cmd` (`node scripts/bench.mjs`) và `soak_cmd` (`node --expose-gc --jitless --single-threaded --max-semi-space-size=1 build/soak.mjs`).
- `run_cmd` `npm start` → `node build/serve.mjs` (`npm start` vẫn chạy lệnh này), hỗ trợ `--export-leaderboard out.json`.
- Luật, số tuning và output headless của v1.0–v1.2 giữ nguyên: 59 scenario, tất định, mutation check 0/15 lọt.

### Thêm
- Benchmark: cảnh chuẩn (200 Bóng Mực, 100 đom đóm, seed 42, camera bay vòng), Chromium có cửa sổ 1280×720, tắt vsync, ra `bench.json`.
- Soak test 10 Đêm trong một tiến trình, ra `soak.json` (0 crash, RSS 55.1 → 56.6 MB).
- Bảng xếp hạng cục bộ: nhập tên sau khi thua hoặc sau Bình Minh (có dấu tiếng Việt), top 10, lưu `save/leaderboard.json`, màn xem từ menu, lệnh xuất.
- Dễ tiếp cận: đổi phím mọi hành động (báo trùng, khôi phục mặc định), phụ đề/chỉ báo (Bóng Mực + mũi tên mép màn hình, gió, 10 giây cuối, đèn < 30 dầu),
  giảm chuyển động (rung camera, chớp màn hình), chữ ≥ 18 px và tùy chọn chữ lớn ×1.25.
- `npm start` dùng server riêng (không cần Vite khi chạy bản release). Bản chạy sẵn ở GitHub Release v1.0.0.

### Sửa
- Âm báo gió phát nhiều lần trong cùng một tick khi FPS cao. Nhãn "Độ nhạy chuột" bị lặp ở dòng bảng màu trong Cài đặt.
- Seed giữ nguyên cho cả lượt chơi (trước đây mỗi Đêm một seed ngẫu nhiên), để mục Bảng xếp hạng ghi đúng seed.

## phase-3 — Contract v1.2 ("Đèn cạn dầu")

### ⚠ Breaking changes
- `contract_version` `1.1` → `1.2`. Tuning thêm `fuel_max, fuel_decay_per_s, fuel_per_mote, relight_cost, win_ratio, drain_per_s, low_fuel_threshold, capacity_max`.
- Thời lượng Đêm 1/2/3: 300/330/360 s → **240/270/300 s**.
- **Không còn thắng sớm.** `game_over.reason` `all_lit` bị bỏ. Thắng = `dawn_survived` (đủ ceil(0.6 × đèn) đèn sáng lúc bình minh).
- Đèn sáng có thể **tắt** (`lantern_out`) khi hết dầu. Đèn sáng nhận thêm đom đóm để châm dầu (`refuel`).
- Vùng an toàn chỉ còn khi fuel ≥ 30 (trước đây: mọi đèn sáng).
- Bóng Mực có trạng thái mới `drain`. Hết choáng thì về `wander` (trước đây có thể về `chase`).
- Điểm: +10 → **+5** mỗi đom đóm nạp; thêm +40 thắp lại; Tỏa Sáng trúng bóng đang hút +15; bỏ thưởng thời gian (`per_second_left: 0`); thưởng bình minh mỗi đèn 50 + floor(fuel).
- Sức chứa không cố định 10 nữa: `player.capacity` = min(20, 10 + 2 × lần thắp thành công).
- Snapshot: đèn thêm `fuel`, `ever_lit`, `relit_count`; player thêm `capacity`. Event `lantern_lit` thêm `relight`. Event mới: `refuel`, `lantern_out`, `fuel_drain`.
- Scenario: đèn nhận `fuel`, `ever_lit` (`lit: true` không có `fuel` thì fuel = 100); player nhận `successful_lights`; shade nhận `target_lantern_id` và `state: "drain"`.
- Test: `p1-win` nghỉ hưu; P1/P2 cập nhật điểm và thời lượng. Quyết định thiết kế: [docs/adr/0001](docs/adr/0001-lantern-fuel-and-dawn-win.md).

### Thêm
- Thanh dầu trên đèn sáng, nhấp nháy 1 Hz khi fuel < 30; HUD "đang mang / sức chứa", mục tiêu "giữ k/n đèn tới bình minh".
- Cài đặt "Bảng màu dễ phân biệt" (lưu lại): viền/mắt Bóng Mực #00B3FF, cảnh báo UI trắng kèm ⚠, đèn tắt xẹp 20% và có vết rách.

## phase-2 — Contract v1.1
- Contract v1.1: số liệu chuẩn, `--night 1|2|3`, snapshot/scenario/input/sự kiện mới, trạng thái Bóng Mực chuẩn.
- Đêm 2 – Đảo Cau, Đêm 3 – Đảo Chuông; Lướt, Gió Lạc, Bùa Gió, rơi khỏi đảo, tạm dừng, gió mạnh.
- Menu, giới thiệu Đêm, kết quả, Bình Minh, tạm dừng, cài đặt (lưu), âm thanh, HUD chuẩn, bảng màu chuẩn.
- 45 scenario, mutation check, tất định 3 Đêm.

## phase-1

- Đêm 1 – Đảo Bến: đi, nhảy, camera 3D góc nhìn thứ ba, đom đóm, nạp và thắp 5 đèn, Bóng Mực đuổi, tỏa sáng, thắng/thua, điểm, HUD, chơi lại.
- Chế độ headless theo Test Contract v1.0 (`node build/headless.mjs`), `game.contract.json`.
- 19 scenario headless, unit test, kiểm tra tính tất định, CI Ubuntu + macOS, ảnh bằng chứng bằng Playwright.
