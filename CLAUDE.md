# Đảo Đèn Lồng — agent guide

3D third-person game (TypeScript + Three.js + Vite) with a headless mode graded by Test Contract **v1.3** (3 nights, lantern fuel, dawn win, bench, soak, leaderboard export). Design decisions: `docs/adr/`.
Requirements: `docs/lab/phase-N-*.md` (PRD-0, tickets). Assumptions: `docs/notes/assumptions.md`.

## Commands

- `npm ci && npm run build` — build headless (`build/headless.mjs`) + web (`dist/`)
- `npm test` — rebuild headless, typecheck, unit + scenario tests (must be green before finishing)
- `node scripts/gen-scenarios.mjs` — regenerate `tests/scenarios/*` (single source; expectations computed by hand)
- `node scripts/mutation-check.mjs phase-N` — mutate each tuning value; every mutation must make a scenario fail
- `npm run verify -- phase-N` — run all scenarios via the CLI, write evidence to `docs/proof/phase-N/`
- `npm run shot -- phase-N` — screenshots of the real game (Playwright) into `docs/proof/phase-N/screenshots/`
- `npm run dev` — play in the browser; `npm start` (= `node build/serve.mjs`, run_cmd) serves `dist/` + leaderboard API
- `node scripts/bench.mjs --seed 42 --duration 30 --out bench.json` — bench_cmd (needs `npm run build`; opens a real Chromium window)
- `npm run soak -- --seed 7 --nights 10 --out soak.json` — soak_cmd; `node build/serve.mjs --export-leaderboard out.json`
- Headless: `node build/headless.mjs --seed 1 --night 1 --ticks 600 --out out.jsonl [--scenario f] [--inputs f]`

## Layout

- `src/core/sim.ts` follows the mandatory 12-step tick order of Ticket-02 (numbered comments). `src/core/maps.ts` = standard maps + ground/wall functions.
- Lantern safe zone is derived: `hasZone(w, l)` = lit && fuel >= low_fuel_threshold. Fuel is integer 1/60 units (`fuel60`).
- `src/core/` pure deterministic rules (also `bench.ts`, `soak.ts`). `src/render/` Three.js view only. `src/headless/` CLI + soak. `src/shared/` leaderboard rules + bench formulas. `src/server/` static server + leaderboard API.
- `World.bench` (default false) is only set by `createBenchWorld`; it must never change normal headless output.
- `game.contract.json` is the ONLY source of tuning numbers; core imports it. Never hardcode a tuning value (a hardcoded shade speed slipped in once; mutation-check caught it).
- Non-contract constants live in `STD` in `src/core/config.ts` (ticket standard numbers + my marked choices) and must be listed in assumptions.md.
- `tests/scenarios/<name>/{scenario,inputs,expect}.json` — expectations are computed by hand from the rules.

## Rules

- No `Math.random`, `Date`, `performance` or DOM in `src/core` (determinism).
- Event/tick order is fixed (see `step()` comments). Changing it is a design change: note it in assumptions.md.
- Never edit an `expect.json` just to match new output. If a rule changed, update it with the reason in the note
  and in assumptions.md (retired tests go to `tests/scenarios/_retired/` with a reason).
- Creative extras must not change headless output (gate them behind the render layer or a default-off flag).
- Small commits, one change each. Do not commit `.env`, keys, `build/`, `dist/`.
