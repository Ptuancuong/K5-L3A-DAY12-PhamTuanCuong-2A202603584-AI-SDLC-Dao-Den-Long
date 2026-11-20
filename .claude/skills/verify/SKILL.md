---
name: verify
description: Run the full verification for the current phase and save evidence (tests, headless scenarios, determinism, screenshots). Use before tagging a phase or after changing game rules.
---

# Verify a phase

1. `npm test` — must be green. If red, fix the code, not the expectations.
2. `npm run verify -- phase-N` — runs every `tests/scenarios/*` through `node build/headless.mjs`,
   writes `docs/proof/phase-N/verify-report.md` and raw `runs/*.jsonl`. Exit code 0 = all pass.
3. `node scripts/mutation-check.mjs phase-N` — must report 0 surviving mutations (else a test is too weak or a number is hardcoded).
4. `npm run build && npm run shot -- phase-N` — Playwright opens the built game and saves screenshots
   in `docs/proof/phase-N/screenshots/`. Open each PNG and check it shows what its name claims.
5. Update `docs/proof/README.md`: one row per requirement → how verified → evidence path → PASS / NOT MET (reason).
6. Update CI `PHASE` in `.github/workflows/ci.yml`. Ask the `reviewer` subagent to review the diff since the previous tag against the phase requirements.

## Adding a scenario

Add an `mk(...)` call in `scripts/gen-scenarios.mjs` (pass `night` in `args` for nights 2/3) and regenerate. It writes `scenario.json`, optional `inputs.json`, and `expect.json`:
`{ note, args: {seed, ticks, snapshot_every?}, events?: [{tick,name,data}], no_events?: [name],
event_count?: {name: n}, snapshots?: [{tick, path, equals}], snapshot_gt?: [{tick, path, gt}], end?: {...}, exit_code? }`.
Compute expected numbers from the tuning by hand and write the arithmetic in `note`.
Then break the rule on purpose once and confirm the scenario fails (mutation check).
