# Credits

- Nhân vật, bối cảnh, tên gọi (Mây, Đảo Đèn Lồng, Bóng Mực): bản gốc của lab Day 12 AI SDLC.
- Mọi hình khối 3D được dựng bằng code (khối hình học của Three.js). Không dùng mô hình, ảnh hay âm thanh bên ngoài.
- Thư viện: [three.js](https://threejs.org) (MIT), [Vite](https://vitejs.dev) (MIT), [esbuild](https://esbuild.github.io) (MIT),
  [Vitest](https://vitest.dev) (MIT), [Playwright](https://playwright.dev) (Apache-2.0, chỉ để chụp ảnh bằng chứng), TypeScript (Apache-2.0).
- Mã nguồn viết cùng trợ lý AI Claude Code (Anthropic), có người điều phối và review.

## Phase 4

- Không có asset ngoài: không mô hình, ảnh, font (dùng `system-ui`) hay file âm thanh. Âm thanh và nhạc tổng hợp bằng WebAudio trong `src/render/audio.ts`.
- Playwright dùng thêm cho `bench_cmd` (mở Chromium có cửa sổ để đo FPS).
- Công cụ AI tạo nội dung: **Claude Code** (Anthropic, model Claude Opus 5.5) viết phần lớn mã nguồn, test, script và tài liệu theo
  yêu cầu và review của tôi. Subagent `reviewer` (cũng là Claude) review Phase 4. Không dùng AI tạo ảnh, âm thanh hay mô hình 3D.
