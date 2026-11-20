# Changelog

## phase-2
- Contract v1.1: số liệu chuẩn, `--night 1|2|3`, snapshot/scenario/input/sự kiện mới, trạng thái Bóng Mực chuẩn.
- Đêm 2 – Đảo Cau, Đêm 3 – Đảo Chuông; Lướt, Gió Lạc, Bùa Gió, rơi khỏi đảo, tạm dừng, gió mạnh.
- Menu, giới thiệu Đêm, kết quả, Bình Minh, tạm dừng, cài đặt (lưu), âm thanh, HUD chuẩn, bảng màu chuẩn.
- 45 scenario, mutation check, tất định 3 Đêm.

## phase-1

- Đêm 1 – Đảo Bến: đi, nhảy, camera 3D góc nhìn thứ ba, đom đóm, nạp và thắp 5 đèn, Bóng Mực đuổi, tỏa sáng, thắng/thua, điểm, HUD, chơi lại.
- Chế độ headless theo Test Contract v1.0 (`node build/headless.mjs`), `game.contract.json`.
- 19 scenario headless, unit test, kiểm tra tính tất định, CI Ubuntu + macOS, ảnh bằng chứng bằng Playwright.
