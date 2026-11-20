// Ticket-04 §2: soak test logic (pure; memory is measured by the CLI in src/headless/soak.ts).
import { TICK_HZ, TUNING } from "./config";
import { Rng } from "./rng";
import {
  createWorld,
  nightDuration,
  step,
  type Input,
  type World,
} from "./sim";

export const SOAK = {
  dirEveryTicks: 30,
  pJump: 0.05,
  pDash: 0.03,
  pPulse: 0.02,
  pInteract: 0.1,
} as const;

/** Night i (1-based) of the soak run: nights rotate 1 -> 2 -> 3 -> 1 ..., seed = base + i. */
export const soakNight = (i: number) => ((i - 1) % 3) + 1;
export const soakSeed = (base: number, i: number) => base + i;

/** Random input stream for one night. Uses its own Rng (seed XOR a constant) so it does not consume
 *  the world's random stream. Every 30 ticks a new direction (uniform angle, full stick);
 *  each tick independently: jump 5 %, dash 3 %, pulse 2 %, interact 10 %. */
export class SoakInput {
  private rng: Rng;
  private move: [number, number] = [0, 1];
  constructor(seed: number) {
    this.rng = new Rng((seed ^ 0x5eed5eed) >>> 0);
  }
  at(k: number): Input {
    const r = this.rng;
    if (k % SOAK.dirEveryTicks === 0) {
      const a = r.range(0, Math.PI * 2);
      this.move = [Math.cos(a), Math.sin(a)];
    }
    return {
      move: [this.move[0], this.move[1]],
      cam_yaw_deg: 0,
      jump: r.next() < SOAK.pJump,
      dash: r.next() < SOAK.pDash,
      pulse: r.next() < SOAK.pPulse,
      interact: r.next() < SOAK.pInteract,
      pause: false,
    };
  }
}

export interface SoakNightResult {
  index: number;
  night: number;
  seed: number;
  result: "won" | "lost";
  reason: string;
  ticks: number;
  score: number;
}

/** Plays one night to its end (or the standard duration + 10 s safety margin). */
export function playSoakNight(
  index: number,
  baseSeed: number,
  onLoaded?: (w: World) => void,
): SoakNightResult {
  const night = soakNight(index);
  const seed = soakSeed(baseSeed, index);
  const w = createWorld({ seed, night });
  onLoaded?.(w);
  const input = new SoakInput(seed);
  const cap = (nightDuration(TUNING, night) + 10) * TICK_HZ;
  for (
    let k = 0;
    k < cap && (w.state === "playing" || w.state === "paused");
    k++
  )
    step(w, input.at(k));
  return {
    index,
    night,
    seed,
    result: w.state === "won" ? "won" : "lost",
    reason: w.result?.reason ?? "timeout",
    ticks: w.tick,
    score: w.score,
  };
}
