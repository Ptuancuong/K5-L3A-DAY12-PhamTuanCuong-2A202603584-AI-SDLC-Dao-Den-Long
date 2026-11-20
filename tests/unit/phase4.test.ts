// Ticket-04 (contract v1.3): bench scene, soak, leaderboard, bench formulas, accessibility key map.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import contract from "../../game.contract.json";
import { BENCH, benchCamera, createBenchWorld } from "../../src/core/bench";
import { TUNING } from "../../src/core/config";
import {
  SoakInput,
  playSoakNight,
  soakNight,
  soakSeed,
} from "../../src/core/soak";
import { IDLE_INPUT, snapshot, step } from "../../src/core/sim";
import {
  ACTIONS,
  DEFAULT_KEYS,
  conflictOf,
  sanitizeKeys,
} from "../../src/render/controls";
import { addToBoard, readBoard } from "../../src/server/api";
import { benchStats } from "../../src/shared/benchStats";
import {
  insertEntry,
  isoWithOffset,
  normalizeName,
  sortEntries,
  type LbEntry,
} from "../../src/shared/leaderboard";

describe("contract v1.3", () => {
  it("adds bench_cmd and soak_cmd and keeps every earlier field", () => {
    expect(contract.contract_version).toBe("1.3");
    expect(contract.bench_cmd).toBe("node scripts/bench.mjs");
    expect(contract.soak_cmd).toMatch(/build\/soak\.mjs$/);
    for (const k of ["team", "build_cmd", "run_cmd", "headless_cmd", "tuning"])
      expect(contract).toHaveProperty(k);
  });
});

describe("bench scene", () => {
  const idle = { ...IDLE_INPUT, move: [0, 0] as [number, number] };
  it("has exactly 200 wandering shades, 100 motes, L1-L3 lit with fuel 100, Mây at the origin", () => {
    const w = createBenchWorld(42);
    expect(w.shades).toHaveLength(200);
    expect(w.shades.every((s) => s.state === "wander")).toBe(true);
    expect(w.motes).toHaveLength(100);
    expect(w.lanterns.map((l) => [l.id, l.lit, l.fuel60 / 60])).toEqual([
      ["L1", true, 100],
      ["L2", true, 100],
      ["L3", true, 100],
      ["L4", false, 0],
      ["L5", false, 0],
    ]);
    expect(w.player.pos).toEqual([0, 0, 0]);
    for (const e of [...w.shades, ...w.motes])
      expect(Math.hypot(e.pos[0], e.pos[2])).toBeLessThanOrEqual(
        BENCH.spreadR + 1e-9,
      );
  });

  it("is the same for the same seed and differs for another seed", () => {
    expect(snapshot(createBenchWorld(42))).toEqual(
      snapshot(createBenchWorld(42)),
    );
    expect(createBenchWorld(42).shades[0].pos).not.toEqual(
      createBenchWorld(7).shades[0].pos,
    );
  });

  it("33 s without input: no spawns, damage, pickups, fuel loss or end; shades keep moving", () => {
    const w = createBenchWorld(42);
    const start = w.shades.map((s) => [...s.pos]);
    const names: string[] = [];
    for (let k = 0; k < 33 * 60; k++)
      for (const e of step(w, idle)) names.push(e.name);
    expect(names).toEqual(["night_start"]);
    expect(w.state).toBe("playing");
    expect(w.shades).toHaveLength(200);
    expect(w.motes).toHaveLength(100);
    expect(w.player.flames).toBe(TUNING.flames);
    expect(w.player.carried).toBe(0);
    expect(w.player.pos).toEqual([0, 0, 0]);
    expect(
      w.lanterns
        .slice(0, 3)
        .every((l) => l.lit && l.fuel60 === TUNING.fuel_max * 60),
    ).toBe(true);
    expect(w.shades.every((s) => s.state === "wander")).toBe(true);
    const moved = w.shades.filter(
      (s, i) =>
        Math.hypot(s.pos[0] - start[i][0], s.pos[2] - start[i][2]) > 0.5,
    ).length;
    expect(moved).toBeGreaterThan(150);
  });

  it("does not change normal games (bench flag is off by default)", () => {
    expect(createBenchWorld(42).bench).toBe(true);
    const w = createBenchWorld(42);
    w.bench = false;
    let hit = false;
    for (let k = 0; k < 120 && !hit; k++)
      hit = step(w, idle).some((e) => e.name === "player_hit");
    expect(hit).toBe(true); // same scene with the flag off: shades chase and hit Mây
  });

  it("camera orbit: r 30, Y 15, starts at (30,15,0), counter-clockwise from above, 15 s per turn", () => {
    const c0 = benchCamera(0);
    expect(c0[0]).toBeCloseTo(30);
    expect(c0[1]).toBe(15);
    expect(c0[2]).toBeCloseTo(0);
    // quarter turn: +X -> -Z (three.js: looking down -Y with +X right, -Z is up the screen => counter-clockwise)
    const q = benchCamera(3.75);
    expect(q[0]).toBeCloseTo(0);
    expect(q[2]).toBeCloseTo(-30);
    expect(benchCamera(15)[0]).toBeCloseTo(30);
  });
});

describe("bench.json formulas", () => {
  it("avg_fps, p1_low_fps (k = max(1, ceil(0.01 N)) worst frames), p95 nearest rank", () => {
    const dts = [...Array(198).fill(10), 40, 60]; // N = 200 -> k = 2
    const s = benchStats(dts);
    expect(s.frames).toBe(200);
    expect(s.avg_fps).toBe(Math.round(((1000 * 200) / (1980 + 100)) * 10) / 10); // 96.2
    expect(s.p1_low_fps).toBe(20); // 1000 / mean(60, 40)
    expect(s.frame_ms_p95).toBe(10); // 190th smallest
    expect(benchStats([5, 50]).p1_low_fps).toBe(20); // k = 1
  });
});

describe("soak", () => {
  it("nights rotate 1->2->3 and night i uses seed + i", () => {
    expect([1, 2, 3, 4, 5, 10].map(soakNight)).toEqual([1, 2, 3, 1, 2, 1]);
    expect(soakSeed(7, 1)).toBe(8);
    expect(soakSeed(7, 10)).toBe(17);
  });
  it("random input: new direction every 30 ticks, button rates ~5/3/2/10 %", () => {
    const inp = new SoakInput(8);
    const n = 60000;
    const c = { jump: 0, dash: 0, pulse: 0, interact: 0 };
    let changes = 0;
    let prev = "";
    for (let k = 0; k < n; k++) {
      const i = inp.at(k);
      for (const b of ["jump", "dash", "pulse", "interact"] as const)
        if (i[b]) c[b]++;
      const m = i.move.join();
      if (m !== prev) {
        changes++;
        expect(k % 30).toBe(0);
      }
      prev = m;
      expect(Math.hypot(...i.move)).toBeCloseTo(1);
    }
    expect(changes).toBe(n / 30);
    expect(c.jump / n).toBeCloseTo(0.05, 2);
    expect(c.dash / n).toBeCloseTo(0.03, 2);
    expect(c.pulse / n).toBeCloseTo(0.02, 2);
    expect(c.interact / n).toBeCloseTo(0.1, 2);
  });
  it("a night plays to its end and is deterministic", () => {
    const a = playSoakNight(1, 7);
    expect(a).toEqual(playSoakNight(1, 7));
    expect(["won", "lost"]).toContain(a.result);
    expect(a.night).toBe(1);
    expect(a.seed).toBe(8);
  });
});

describe("leaderboard", () => {
  const e = (name: string, score: number, at: string): LbEntry => ({
    name,
    score,
    nights_won: 1,
    achieved_at: at,
    seed: 1,
  });
  it("names: 3-12 of [A-Za-z0-9_], Vietnamese letters accepted", () => {
    expect(normalizeName("ab")).toBeNull();
    expect(normalizeName("abc")).toBe("abc");
    expect(normalizeName("a".repeat(12))).toBe("a".repeat(12));
    expect(normalizeName("a".repeat(13))).toBeNull();
    expect(normalizeName("may 01")).toBeNull();
    expect(normalizeName("x-y-z")).toBeNull();
    expect(normalizeName("Player_7")).toBe("Player_7");
    expect(normalizeName("  Mây_Đèn  ")).toBe("Mây_Đèn");
    expect(normalizeName("Nguyễn".normalize("NFD"))).toBe("Nguyễn"); // decomposed input is normalised to NFC
    expect(normalizeName("名前です")).toBeNull();
  });
  it("sorts by score desc, ties: earlier achieved_at first (instants, any offset)", () => {
    const list = sortEntries([
      e("late", 300, "2026-11-20T10:00:00Z"),
      e("early", 300, "2026-11-20T15:00:00+07:00"), // = 08:00Z
      e("top", 500, "2026-11-21T00:00:00Z"),
    ]);
    expect(list.map((x) => x.name)).toEqual(["top", "early", "late"]);
  });
  it("keeps the top 10 and reports the rank (0 = not in the top 10)", () => {
    let list: LbEntry[] = [];
    for (let i = 0; i < 10; i++)
      list = insertEntry(
        list,
        e(`p${i}x`, 100 + i, `2026-11-20T10:0${i}:00Z`),
      ).entries;
    const low = insertEntry(list, e("low", 50, "2026-11-20T11:00:00Z"));
    expect(low.rank).toBe(0);
    expect(low.entries).toHaveLength(10);
    const tie = insertEntry(list, e("tie", 105, "2026-11-20T11:00:00Z"));
    expect(tie.rank).toBe(6); // below the earlier 105 (p5x)
    expect(tie.entries.at(-1)!.name).toBe("p1x");
  });
  it("achieved_at is ISO 8601 with an offset", () => {
    expect(isoWithOffset(new Date())).toMatch(
      /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d$/,
    );
  });
  it("saves to disk and run_cmd --export-leaderboard writes {entries} in order", () => {
    const dir = mkdtempSync(join(tmpdir(), "ddl-"));
    const path = join(dir, "leaderboard.json");
    addToBoard(e("Bao", 200, "2026-11-20T10:00:00+07:00"), path);
    addToBoard(e("Ánh", 400, "2026-11-20T11:00:00+07:00"), path);
    addToBoard(e("Cuc", 200, "2026-11-20T09:00:00+07:00"), path);
    expect(readBoard(path).map((x) => x.name)).toEqual(["Ánh", "Cuc", "Bao"]);
    const out = join(dir, "out.json");
    const [cmd, ...args] = contract.run_cmd.split(" ");
    execFileSync(cmd, [...args, "--export-leaderboard", out], {
      env: { ...process.env, DDL_SAVE_DIR: dir },
    });
    const exported = JSON.parse(readFileSync(out, "utf8"));
    expect(Object.keys(exported)).toEqual(["entries"]);
    expect(exported.entries.map((x: LbEntry) => x.name)).toEqual([
      "Ánh",
      "Cuc",
      "Bao",
    ]);
    expect(Object.keys(exported.entries[0]).sort()).toEqual([
      "achieved_at",
      "name",
      "nights_won",
      "score",
      "seed",
    ]);
  });
});

describe("accessibility key map", () => {
  it("covers every action, detects duplicates, falls back to defaults on a bad save", () => {
    expect(new Set(ACTIONS.map((a) => DEFAULT_KEYS[a])).size).toBe(
      ACTIONS.length,
    );
    for (const a of [
      "up",
      "down",
      "left",
      "right",
      "jump",
      "dash",
      "interact",
      "pulse",
      "pause",
    ])
      expect(ACTIONS).toContain(a);
    expect(conflictOf(DEFAULT_KEYS, "jump", "KeyE")).toBe("interact");
    expect(conflictOf(DEFAULT_KEYS, "jump", "KeyJ")).toBeNull();
    expect(sanitizeKeys({ ...DEFAULT_KEYS, jump: "KeyE" })).toEqual(
      DEFAULT_KEYS,
    );
    expect(sanitizeKeys({ ...DEFAULT_KEYS, jump: "KeyJ" }).jump).toBe("KeyJ");
    expect(sanitizeKeys(null)).toEqual(DEFAULT_KEYS);
  });
});
