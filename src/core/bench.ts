// Ticket-04 §1: the standard benchmark scene (same for every team).
// Night 1, Mây still at (0,0,0), exactly 200 wandering shades and 100 motes spread uniformly over the island
// (seed 42), L1-L3 lit with full fuel. World.bench switches off spawning, damage, pickup, fuel change,
// wander->chase detection and the end of the night; shades keep moving by the normal wander rule.
import { STD, TUNING } from "./config";
import { NIGHT1 } from "./maps";
import { Rng } from "./rng";
import { createWorld, type World } from "./sim";

export const BENCH = {
  shades: 200,
  motes: 100,
  litLanterns: ["L1", "L2", "L3"],
  /** Spread radius: Night 1 island is r 40; keep 2 m from the edge. */
  spreadR: 38,
  warmupS: 3,
  orbitR: 30,
  orbitY: 15,
  orbitPeriodS: 15,
} as const;

/** Uniform point in a disc (area-uniform: r = R * sqrt(u)). */
function discPoint(rng: Rng, R: number): [number, number] {
  const a = rng.range(0, Math.PI * 2);
  const r = R * Math.sqrt(rng.next());
  return [r * Math.cos(a), r * Math.sin(a)];
}

export function createBenchWorld(seed = 42): World {
  const rng = new Rng(seed);
  const shades = Array.from({ length: BENCH.shades }, () => {
    const [x, z] = discPoint(rng, BENCH.spreadR);
    return { pos: [x, STD.shadeHover, z], state: "wander" };
  });
  const motes = Array.from({ length: BENCH.motes }, () => {
    const [x, z] = discPoint(rng, BENCH.spreadR);
    return [x, 0, z];
  });
  const w = createWorld({
    seed,
    night: NIGHT1.night,
    scenario: {
      random_motes: false,
      random_shades: false,
      random_drifters: false,
      wind_enabled: false,
      player: { pos: [0, 0, 0] },
      lanterns: BENCH.litLanterns.map((id) => ({
        id,
        lit: true,
        fuel: TUNING.fuel_max,
      })),
      shades,
      motes,
    },
  });
  w.bench = true;
  return w;
}

/** Camera orbit (Ticket-04): centre (0,0,0), r 30 m, Y 15 m, start at angle 0 = (30,15,0),
 *  counter-clockwise seen from above (+X towards -Z in three.js axes), 15 s per turn. */
export function benchCamera(tS: number): [number, number, number] {
  const a = (2 * Math.PI * tS) / BENCH.orbitPeriodS;
  return [
    BENCH.orbitR * Math.cos(a),
    BENCH.orbitY,
    -BENCH.orbitR * Math.sin(a),
  ];
}
