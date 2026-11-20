// Parsing of the contract's inputs file (§C) into a per-tick input source.
import { IDLE_INPUT, ScenarioError, type Input } from "./sim";

interface Frame {
  tick: number;
  move?: [number, number];
  cam_yaw_deg?: number;
  jump?: boolean;
  interact?: boolean;
  pulse?: boolean;
}

const BUTTONS = ["jump", "interact", "pulse"] as const;

export function parseInputs(raw: unknown): Frame[] {
  if (
    typeof raw !== "object" ||
    raw === null ||
    !Array.isArray((raw as { frames?: unknown }).frames)
  ) {
    throw new ScenarioError('inputs must be an object with a "frames" array');
  }
  const frames: Frame[] = [];
  let last = -1;
  for (const f of (raw as { frames: unknown[] }).frames) {
    if (typeof f !== "object" || f === null || Array.isArray(f))
      throw new ScenarioError("frame must be an object");
    const o = f as Record<string, unknown>;
    if (typeof o.tick !== "number" || !Number.isInteger(o.tick) || o.tick < 0) {
      throw new ScenarioError("frame.tick must be a non-negative integer");
    }
    if (o.tick <= last)
      throw new ScenarioError("frame ticks must be strictly increasing");
    last = o.tick;
    const fr: Frame = { tick: o.tick };
    if ("move" in o) {
      const m = o.move;
      if (
        !Array.isArray(m) ||
        m.length !== 2 ||
        !m.every(
          (v) =>
            typeof v === "number" && Number.isFinite(v) && v >= -1 && v <= 1,
        )
      ) {
        throw new ScenarioError(
          "move must be [x, z] with components in [-1, 1]",
        );
      }
      fr.move = [m[0], m[1]];
    }
    if ("cam_yaw_deg" in o) {
      if (typeof o.cam_yaw_deg !== "number" || !Number.isFinite(o.cam_yaw_deg))
        throw new ScenarioError("cam_yaw_deg must be a number");
      fr.cam_yaw_deg = o.cam_yaw_deg;
    }
    for (const b of BUTTONS) {
      if (b in o) {
        if (typeof o[b] !== "boolean")
          throw new ScenarioError(`${b} must be boolean`);
        fr[b] = o[b] as boolean;
      }
    }
    frames.push(fr);
  }
  return frames;
}

/** Holds input state; each frame only changes the fields it contains. */
export class InputTrack {
  private i = 0;
  private cur: Input = { ...IDLE_INPUT, move: [0, 0] };
  constructor(private frames: Frame[]) {}
  at(tick: number): Input {
    while (this.i < this.frames.length && this.frames[this.i].tick <= tick) {
      const f = this.frames[this.i++];
      if (f.move) this.cur.move = [f.move[0], f.move[1]];
      if (f.cam_yaw_deg !== undefined) this.cur.cam_yaw_deg = f.cam_yaw_deg;
      for (const b of BUTTONS) if (f[b] !== undefined) this.cur[b] = f[b]!;
    }
    return { ...this.cur, move: [this.cur.move[0], this.cur.move[1]] };
  }
}
