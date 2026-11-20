import { describe, expect, it } from "vitest";
import contract from "../../game.contract.json";
import { TUNING } from "../../src/core/config";
import { InputTrack, parseInputs } from "../../src/core/inputs";
import {
  NIGHT1,
  NIGHT2,
  NIGHT3,
  groundBelow,
  isBlocked,
} from "../../src/core/maps";
import { runHeadless } from "../../src/core/run";
import { createWorld, IDLE_INPUT, step, worldMove } from "../../src/core/sim";

const OFF = {
  random_motes: false,
  random_shades: false,
  random_drifters: false,
  wind_enabled: false,
};

describe("contract file v1.2 tuning (still valid in v1.3)", () => {
  it("declares the standard numbers of Ticket-02 and the game reads this exact object", () => {
    expect(["1.2", "1.3"]).toContain(contract.contract_version);
    expect(TUNING).toBe(contract.tuning);
    const t = contract.tuning;
    expect([
      t.player_speed,
      t.carry_capacity,
      t.lantern_cost,
      t.pickup_radius,
      t.interact_radius,
    ]).toEqual([6, 10, 10, 1, 2]);
    expect([
      t.pulse_cost,
      t.pulse_radius,
      t.pulse_cooldown_s,
      t.pulse_stun_s,
      t.pulse_push_m,
    ]).toEqual([3, 5, 3, 2, 4]);
    expect([t.dash_speed, t.dash_duration_s, t.dash_cooldown_s]).toEqual([
      14, 0.2, 1.5,
    ]);
    expect([
      t.night1_duration_s,
      t.night2_duration_s,
      t.night3_duration_s,
    ]).toEqual([240, 270, 300]); // v1.2 (was 300/330/360 in v1.1)
    expect([
      t.flames,
      t.invuln_s,
      t.hit_drop_ratio,
      t.safe_radius,
      t.shade_speed,
      t.shade_hit_radius,
    ]).toEqual([3, 1.5, 0.5, 6, 4, 1]);
    expect(t.fall_enabled).toBe(true);
    expect(t.score).toEqual({
      per_mote: 5, // v1.2 (was 10)
      per_lantern: 100,
      per_stun: 5,
      per_second_left: 0, // v1.2: time bonus removed
      per_flame_left: 50,
    });
    expect([t.fuel_max, t.fuel_decay_per_s, t.fuel_per_mote, t.relight_cost, t.win_ratio, t.drain_per_s, t.low_fuel_threshold, t.capacity_max]).toEqual([100, 1, 10, 5, 0.6, 5, 30, 20]);
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
  it("frames only change the fields they contain (incl. dash/pause)", () => {
    const t = new InputTrack(
      parseInputs({
        frames: [
          { tick: 0, move: [1, 0], cam_yaw_deg: 30 },
          { tick: 5, dash: true },
        ],
      }),
    );
    expect(t.at(0)).toEqual({ ...IDLE_INPUT, move: [1, 0], cam_yaw_deg: 30 });
    expect(t.at(5)).toEqual({
      ...IDLE_INPUT,
      move: [1, 0],
      cam_yaw_deg: 30,
      dash: true,
    });
  });
  it("rejects non-increasing ticks", () => {
    expect(() => parseInputs({ frames: [{ tick: 3 }, { tick: 2 }] })).toThrow();
  });
});

describe("tick model", () => {
  it("--ticks N runs exactly N steps; snapshot 0 is before any input; night_start at tick 1", () => {
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
    expect(lines[1]).toEqual({
      type: "event",
      tick: 1,
      name: "night_start",
      data: { night: 1 },
    });
    expect(lines[lines.length - 1]).toEqual({
      type: "end",
      ticks: 25,
      state: "playing",
      score: 0,
    });
  });
  it("events of a tick come before the snapshot of that tick", () => {
    const { lines } = runHeadless({
      seed: 1,
      ticks: 10,
      snapshotEvery: 1,
      scenario: { ...OFF, motes: [[0, 0, 0.5]] },
    });
    const i = lines.findIndex((l: any) => l.name === "mote_picked");
    expect((lines[i + 1] as any).type).toBe("snapshot");
    expect((lines[i + 1] as any).tick).toBe((lines[i] as any).tick);
  });
  it("snapshot has every v1.1 field", () => {
    const { lines } = runHeadless({ seed: 1, ticks: 0, night: 2 });
    const s = lines[0] as any;
    for (const k of [
      "night",
      "wind",
      "motes",
      "drifters",
      "charms",
      "sim_tick",
    ])
      expect(s).toHaveProperty(k);
    for (const k of [
      "vel",
      "grounded",
      "invuln",
      "dash_cd_s",
      "pulse_cd_s",
      "charm_s",
    ])
      expect(s.player).toHaveProperty(k);
  });
});

describe("standard maps", () => {
  it("Đêm 1 is a 40 m disc; Đêm 2 has two islands and a bridge", () => {
    expect(groundBelow(NIGHT1, 39.9, 0, 0)).toBe(0);
    expect(groundBelow(NIGHT1, 40.1, 0, 0)).toBeNull();
    expect(groundBelow(NIGHT2, 35, 1.9, 0)).toBe(0);
    expect(groundBelow(NIGHT2, 35, 2.1, 0)).toBeNull();
    expect(groundBelow(NIGHT2, 70, 27, 0)).toBe(0);
    expect(NIGHT2.moteSpawns.length).toBe(24);
    expect(NIGHT2.shadeSpawns.length).toBe(16);
  });
  it("Đêm 3 tiers are walls from below, ramps connect tier 0 and tier 1, tower blocks", () => {
    expect(isBlocked(NIGHT3, 0, 18, 0)).toBe(true); // tier 1 wall
    expect(groundBelow(NIGHT3, 0, 18, 3)).toBe(3);
    expect(groundBelow(NIGHT3, 0, -18, 3)).toBe(0); // tier 1 only on z > 0
    expect(isBlocked(NIGHT3, 0, 0, 6)).toBe(true); // bell tower
    expect(NIGHT3.moteSpawns.length).toBe(30);
    expect(NIGHT3.shadeSpawns.length).toBe(16);
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
        shades: [{ pos: [-8, 1, 18] }, { pos: [8, 1, 30] }],
      },
    });
    for (let i = 0; i < 1200; i++) {
      step(w, IDLE_INPUT);
      for (const s of w.shades)
        expect(Math.hypot(s.pos[0], s.pos[2] - 25)).toBeGreaterThanOrEqual(
          TUNING.safe_radius - 1e-9,
        );
    }
  });
  it("a STUNNED shade inside the zone when the lantern is lit is pushed out within 30 ticks (coach CP1 #7, Ticket-02)", () => {
    const w = createWorld({
      seed: 1,
      scenario: {
        ...OFF,
        motes: [],
        player: { pos: [0, 0, 23.5], carried: 10 },
        shades: [
          {
            id: "S1",
            pos: [3, 1, 24],
            state: "stunned",
            state_ticks_left: 100,
          },
        ],
      },
    });
    step(w, { ...IDLE_INPUT, interact: true });
    expect(w.lanterns[0].lit).toBe(true);
    for (let i = 0; i < 30; i++) step(w, IDLE_INPUT);
    const s = w.shades[0];
    expect(s.state).toBe("stunned");
    expect(Math.hypot(s.pos[0], s.pos[2] - 25)).toBeGreaterThanOrEqual(
      TUNING.safe_radius - 1e-9,
    );
  });
});

describe("performance", () => {
  it("a full night (21 600 ticks) runs headless in well under 30 s", () => {
    for (const night of [1, 2, 3]) {
      const t0 = Date.now();
      runHeadless({
        seed: 11,
        night,
        ticks: 21600,
        scenario: { player: { flames: 99 } },
      });
      expect(Date.now() - t0).toBeLessThan(30000);
    }
  });
});
