import { describe, expect, it } from "vitest";
import contract from "../../game.contract.json";
import { TUNING } from "../../src/core/config";
import { InputTrack, parseInputs } from "../../src/core/inputs";
import { runHeadless } from "../../src/core/run";
import {
  createWorld,
  defaultLanterns,
  IDLE_INPUT,
  step,
  worldMove,
} from "../../src/core/sim";

const OFF = { random_motes: false, random_shades: false };

describe("contract file", () => {
  it("declares every tuning key of contract v1.0 and the game reads those exact numbers", () => {
    const keys = [
      "player_speed",
      "carry_capacity",
      "lantern_cost",
      "lantern_count_night1",
      "pickup_radius",
      "interact_radius",
      "pulse_cost",
      "pulse_radius",
      "night1_duration_s",
      "flames",
      "invuln_s",
      "hit_drop_ratio",
      "pulse_stun_s",
      "pulse_push_m",
      "pulse_cooldown_s",
      "safe_radius",
      "shade_speed",
      "shade_hit_radius",
      "fall_enabled",
      "score",
    ];
    expect(Object.keys(contract.tuning).sort()).toEqual([...keys].sort());
    expect(Object.keys(contract.tuning.score).sort()).toEqual([
      "per_flame_left",
      "per_lantern",
      "per_mote",
      "per_second_left",
      "per_stun",
    ]);
    expect(TUNING).toBe(contract.tuning);
    expect(contract.contract_version).toBe("1.0");
    expect(contract.tuning.lantern_count_night1).toBe(5);
  });
});

describe("movement", () => {
  it("rotates move by cam_yaw_deg exactly as the contract formula", () => {
    const [x, z] = worldMove([1, 0], 90);
    expect(x).toBeCloseTo(0, 9);
    expect(z).toBeCloseTo(-1, 9);
    expect(worldMove([0, 1], 0)).toEqual([0, 1]);
  });
  it("leaves short vectors alone and normalizes long ones", () => {
    expect(worldMove([0.5, 0], 0)).toEqual([0.5, 0]);
    const [x, z] = worldMove([1, 1], 0);
    expect(Math.hypot(x, z)).toBeCloseTo(1, 12);
  });
});

describe("inputs", () => {
  it("frames only change the fields they contain", () => {
    const t = new InputTrack(
      parseInputs({
        frames: [
          { tick: 0, move: [1, 0], cam_yaw_deg: 30 },
          { tick: 5, pulse: true },
        ],
      }),
    );
    expect(t.at(0)).toEqual({ ...IDLE_INPUT, move: [1, 0], cam_yaw_deg: 30 });
    expect(t.at(4).pulse).toBe(false);
    expect(t.at(5)).toEqual({
      ...IDLE_INPUT,
      move: [1, 0],
      cam_yaw_deg: 30,
      pulse: true,
    });
  });
  it("rejects non-increasing ticks", () => {
    expect(() => parseInputs({ frames: [{ tick: 3 }, { tick: 2 }] })).toThrow();
  });
});

describe("tick model", () => {
  it("--ticks N runs exactly N steps; snapshot 0 is before any input", () => {
    const { lines } = runHeadless({
      seed: 3,
      ticks: 25,
      snapshotEvery: 5,
      scenario: OFF,
    });
    const snaps = lines
      .filter((l: any) => l.type === "snapshot")
      .map((s: any) => s.tick);
    expect(snaps).toEqual([0, 5, 10, 15, 20, 25]);
    expect(lines[lines.length - 1]).toEqual({
      type: "end",
      ticks: 25,
      state: "playing",
      score: 0,
    });
  });
  it("scenario setup emits no events and gives no score", () => {
    const w = createWorld({
      seed: 1,
      scenario: { ...OFF, lanterns: [{ id: "L1", lit: true }] },
    });
    expect(w.score).toBe(0);
  });
  it("default lanterns: L1 at (0,0,25), five on a ring", () => {
    const ls = defaultLanterns(5);
    expect(ls.map((l) => l.id)).toEqual(["L1", "L2", "L3", "L4", "L5"]);
    expect(ls[0].pos).toEqual([0, 0, 25]);
  });
});

describe("safe radius", () => {
  it("a shade never gets within safe_radius of a lit lantern", () => {
    const w = createWorld({
      seed: 1,
      scenario: {
        ...OFF,
        player: { pos: [0, 0, 22] },
        lanterns: [{ id: "L1", lit: true }],
        shades: [{ pos: [-10, 1, 10] }, { pos: [10, 1, 30] }],
      },
    });
    for (let i = 0; i < 1200; i++) {
      step(w, IDLE_INPUT);
      for (const s of w.shades)
        expect(Math.hypot(s.pos[0], s.pos[2] - 25)).toBeGreaterThan(
          TUNING.safe_radius,
        );
    }
  });

  it("a STUNNED shade inside the zone is pushed out on the tick the lantern is lit", () => {
    // Coach answer CP1 #7: after a lantern is lit, no shade may stay inside safe_radius.
    // Tick 0: pulse stuns S1 and pushes it to ~(3.78, 26.28), ~4 m from L1 (0,0,25).
    // Tick 1: interact lights L1 while S1 is still stunned.
    const w = createWorld({
      seed: 1,
      scenario: {
        ...OFF,
        motes: [],
        player: { pos: [0, 0, 22.5], carried: 7 },
        shades: [{ id: "S1", pos: [1, 1, 23.5] }],
      },
    });
    step(w, { ...IDLE_INPUT, pulse: true });
    const s = w.shades[0];
    expect(Math.hypot(s.pos[0], s.pos[2] - 25)).toBeLessThan(
      TUNING.safe_radius,
    );
    step(w, { ...IDLE_INPUT, pulse: true, interact: true });
    expect(w.lanterns[0].lit).toBe(true);
    expect(w.tick < s.stunUntil).toBe(true);
    expect(Math.hypot(s.pos[0], s.pos[2] - 25)).toBeGreaterThan(
      TUNING.safe_radius,
    );
  });
});

describe("random spawning", () => {
  it("spawns shades over time with unique ids and shade_spawned events", () => {
    const { lines } = runHeadless({
      seed: 9,
      ticks: 3600 * 2,
      snapshotEvery: 600,
      scenario: { player: { flames: 99 } },
    });
    const spawned = lines
      .filter((l: any) => l.name === "shade_spawned")
      .map((l: any) => l.data.id);
    expect(spawned.length).toBeGreaterThan(0);
    expect(new Set(spawned).size).toBe(spawned.length);
  });
});
