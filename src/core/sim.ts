// Pure, deterministic game logic. No DOM, no Three.js, no Math.random, no clocks.
import { TICK_HZ, TUNING, WORLD, type Tuning } from "./config";
import { Rng } from "./rng";

export type Vec3 = [number, number, number];
export type GameState = "playing" | "won" | "lost";
export type ShadeState = "chase" | "stunned";

export interface Input {
  move: [number, number];
  cam_yaw_deg: number;
  jump: boolean;
  interact: boolean;
  pulse: boolean;
}

export const IDLE_INPUT: Input = {
  move: [0, 0],
  cam_yaw_deg: 0,
  jump: false,
  interact: false,
  pulse: false,
};

export interface Player {
  pos: Vec3;
  vy: number;
  grounded: boolean;
  flames: number;
  carried: number;
  invulnUntil: number; // tick at which hits are allowed again
  pulseReadyAt: number; // tick at which a pulse is allowed again
}
export interface Mote {
  id: string;
  pos: Vec3;
}
export interface Shade {
  id: string;
  pos: Vec3;
  stunUntil: number; // stunned while tick < stunUntil
}
export interface Lantern {
  id: string;
  pos: Vec3;
  lit: boolean;
  deposited: number;
}

export interface GameEvent {
  type: "event";
  tick: number;
  name: string;
  data: Record<string, unknown>;
}

export interface World {
  t: Tuning;
  rng: Rng;
  tick: number; // steps executed so far
  state: GameState;
  startTimeLeft: number;
  score: number;
  player: Player;
  motes: Mote[];
  shades: Shade[];
  lanterns: Lantern[];
  randomMotes: boolean;
  randomShades: boolean;
  nextMoteId: number;
  nextShadeId: number;
  prev: Input;
  result?: { result: "won" | "lost"; reason: string };
}

export class ScenarioError extends Error {}

// ---------- helpers ----------
const dist2 = (a: Vec3, b: Vec3) => {
  const dx = a[0] - b[0];
  const dz = a[2] - b[2];
  return Math.hypot(dx, dz);
};
export const within = (a: Vec3, b: Vec3, r: number) => dist2(a, b) <= r + 1e-9;
const secToTicks = (s: number) => Math.round(s * TICK_HZ);

export function timeLeft(w: World): number {
  return Math.max(0, w.startTimeLeft - w.tick / TICK_HZ);
}

export function isStunned(w: World, s: Shade): boolean {
  return w.tick < s.stunUntil;
}

function randomPointInRing(rng: Rng, rMin: number, rMax: number): Vec3 {
  const a = rng.range(0, Math.PI * 2);
  const r = Math.sqrt(rng.range(rMin * rMin, rMax * rMax));
  return [r * Math.cos(a), 0, r * Math.sin(a)];
}

function addMote(w: World, pos: Vec3) {
  w.motes.push({ id: `M${w.nextMoteId++}`, pos });
}

function freeShadeId(w: World): string {
  const used = new Set(w.shades.map((s) => s.id));
  let id: string;
  do id = `S${w.nextShadeId++}`;
  while (used.has(id));
  return id;
}

function spawnShadePos(w: World): Vec3 {
  let p: Vec3 = [0, WORLD.shadeHoverY, 0];
  for (let i = 0; i < 20; i++) {
    const q = randomPointInRing(
      w.rng,
      WORLD.shadeSpawnMinR,
      WORLD.shadeSpawnMaxR,
    );
    p = [q[0], WORLD.shadeHoverY, q[2]];
    const farFromPlayer = !within(p, w.player.pos, WORLD.shadeSpawnMinDist);
    const outsideLight = w.lanterns.every(
      (l) => !l.lit || !within(p, l.pos, w.t.safe_radius),
    );
    if (farFromPlayer && outsideLight) break;
  }
  return p;
}

export function defaultLanterns(n: number): Lantern[] {
  // L1 at (0,0,R) then evenly spaced around the ring.
  const out: Lantern[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i * 2 * Math.PI) / n;
    const x = round3(WORLD.lanternRingRadius * Math.sin(a));
    const z = round3(WORLD.lanternRingRadius * Math.cos(a));
    out.push({ id: `L${i + 1}`, pos: [x, 0, z], lit: false, deposited: 0 });
  }
  return out;
}

// ---------- scenario ----------
const isNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
function vec3(v: unknown, what: string): Vec3 {
  if (!Array.isArray(v) || v.length !== 3 || !v.every(isNum))
    throw new ScenarioError(`${what} must be [x,y,z]`);
  return [v[0], v[1], v[2]];
}
function optBool(o: Record<string, unknown>, k: string): boolean | undefined {
  if (!(k in o)) return undefined;
  if (typeof o[k] !== "boolean")
    throw new ScenarioError(`${k} must be boolean`);
  return o[k] as boolean;
}
function optNonNegInt(
  o: Record<string, unknown>,
  k: string,
): number | undefined {
  if (!(k in o)) return undefined;
  const v = o[k];
  if (!isNum(v) || v < 0 || !Number.isInteger(v))
    throw new ScenarioError(`${k} must be a non-negative integer`);
  return v;
}
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export interface CreateOptions {
  seed: number;
  scenario?: unknown;
  tuning?: Tuning;
}

export function createWorld(opts: CreateOptions): World {
  const t = opts.tuning ?? TUNING;
  const w: World = {
    t,
    rng: new Rng(opts.seed),
    tick: 0,
    state: "playing",
    startTimeLeft: t.night1_duration_s,
    score: 0,
    player: {
      pos: [0, 0, 0],
      vy: 0,
      grounded: true,
      flames: t.flames,
      carried: 0,
      invulnUntil: 0,
      pulseReadyAt: 0,
    },
    motes: [],
    shades: [],
    lanterns: defaultLanterns(t.lantern_count_night1),
    randomMotes: true,
    randomShades: true,
    nextMoteId: 1,
    nextShadeId: 1,
    prev: { ...IDLE_INPUT },
  };

  const sc = opts.scenario;
  if (sc !== undefined && !isObj(sc))
    throw new ScenarioError("scenario must be an object");
  const s = (sc ?? {}) as Record<string, unknown>;

  const rm = optBool(s, "random_motes");
  const rs = optBool(s, "random_shades");
  if (rm !== undefined) w.randomMotes = rm;
  if (rs !== undefined) w.randomShades = rs;

  if ("player" in s) {
    const p = s.player;
    if (!isObj(p)) throw new ScenarioError("player must be an object");
    if ("pos" in p) {
      w.player.pos = vec3(p.pos, "player.pos");
      w.player.grounded = w.player.pos[1] <= 0;
      if (w.player.grounded) w.player.pos[1] = 0;
    }
    const c = optNonNegInt(p, "carried");
    const f = optNonNegInt(p, "flames");
    if (c !== undefined) w.player.carried = c;
    if (f !== undefined) w.player.flames = f;
  }

  if ("time_left_s" in s) {
    if (!isNum(s.time_left_s) || s.time_left_s < 0)
      throw new ScenarioError("time_left_s must be a number >= 0");
    w.startTimeLeft = s.time_left_s;
  }

  if ("lanterns" in s) {
    if (!Array.isArray(s.lanterns))
      throw new ScenarioError("lanterns must be an array");
    for (const l of s.lanterns) {
      if (!isObj(l) || typeof l.id !== "string")
        throw new ScenarioError("lantern entries need a string id");
      const target = w.lanterns.find((x) => x.id === l.id);
      if (!target) throw new ScenarioError(`unknown lantern id ${l.id}`);
      if ("pos" in l) target.pos = vec3(l.pos, `lantern ${l.id}.pos`);
      const d = optNonNegInt(l, "deposited");
      if (d !== undefined) target.deposited = d;
      const lit = optBool(l, "lit");
      if (lit !== undefined) target.lit = lit;
    }
  }

  const motesGiven = "motes" in s;
  if (motesGiven) {
    if (!Array.isArray(s.motes))
      throw new ScenarioError("motes must be an array");
    for (const m of s.motes) addMote(w, vec3(m, "mote"));
  }
  const shadesGiven = "shades" in s;
  if (shadesGiven) {
    if (!Array.isArray(s.shades))
      throw new ScenarioError("shades must be an array");
    const ids = new Set<string>();
    for (const sh of s.shades) {
      if (!isObj(sh)) throw new ScenarioError("shade entries must be objects");
      if ("id" in sh && typeof sh.id !== "string")
        throw new ScenarioError("shade id must be a string");
      const pos = vec3(sh.pos, "shade.pos");
      const id = sh.id as string | undefined;
      if (id !== undefined) {
        if (ids.has(id)) throw new ScenarioError(`duplicate shade id ${id}`);
        ids.add(id);
      }
      w.shades.push({ id: id ?? "", pos, stunUntil: 0 });
    }
    for (const sh of w.shades) if (sh.id === "") sh.id = freeShadeId(w);
  }

  // Default population (only if the scenario did not replace the list and random spawning is on).
  if (!motesGiven && w.randomMotes) {
    for (let i = 0; i < WORLD.initialMotes; i++)
      addMote(w, randomPointInRing(w.rng, WORLD.moteMinR, WORLD.moteMaxR));
  }
  if (!shadesGiven && w.randomShades) {
    for (let i = 0; i < WORLD.initialShades; i++)
      w.shades.push({
        id: freeShadeId(w),
        pos: spawnShadePos(w),
        stunUntil: 0,
      });
  }
  return w;
}

// ---------- step ----------
function rising(w: World, input: Input, k: "jump" | "interact" | "pulse") {
  return input[k] && !w.prev[k];
}

function finish(
  w: World,
  ev: GameEvent[],
  result: "won" | "lost",
  reason: string,
) {
  w.state = result;
  w.result = { result, reason };
  if (result === "won") {
    w.score +=
      Math.floor(timeLeft(w)) * w.t.score.per_second_left +
      w.player.flames * w.t.score.per_flame_left;
  }
  ev.push({
    type: "event",
    tick: w.tick,
    name: "game_over",
    data: { result, reason },
  });
}

/** World-space move direction per contract §C. */
export function worldMove(
  move: [number, number],
  camYawDeg: number,
): [number, number] {
  let [x, z] = move;
  const len = Math.hypot(x, z);
  if (len > 1) {
    x /= len;
    z /= len;
  }
  const th = (camYawDeg * Math.PI) / 180;
  return [
    x * Math.cos(th) + z * Math.sin(th),
    -x * Math.sin(th) + z * Math.cos(th),
  ];
}

/**
 * Executes one step: reads `input` for tick w.tick, produces state w.tick+1.
 * Events are stamped with the new tick (contract §B).
 */
export function step(w: World, input: Input): GameEvent[] {
  const ev: GameEvent[] = [];
  if (w.state !== "playing") return ev;
  const t = w.t;
  const p = w.player;
  const k = w.tick; // input tick
  w.tick = k + 1; // tick of the resulting state; events use this
  const now = w.tick;
  const emit = (name: string, data: Record<string, unknown>) =>
    ev.push({ type: "event", tick: now, name, data });

  // 1. Player movement (horizontal) + jump.
  const [mx, mz] = worldMove(input.move, input.cam_yaw_deg);
  const v = t.player_speed / TICK_HZ;
  let nx = p.pos[0] + mx * v;
  let nz = p.pos[2] + mz * v;
  if (!t.fall_enabled && (mx !== 0 || mz !== 0)) {
    const r = Math.hypot(nx, nz);
    if (r > WORLD.islandRadius) {
      nx = (nx / r) * WORLD.islandRadius;
      nz = (nz / r) * WORLD.islandRadius;
    }
  }
  p.pos[0] = nx;
  p.pos[2] = nz;
  if (rising(w, input, "jump") && p.grounded) {
    p.vy = WORLD.jumpSpeed;
    p.grounded = false;
  }
  if (!p.grounded) {
    p.vy -= WORLD.gravity / TICK_HZ;
    p.pos[1] += p.vy / TICK_HZ;
    if (p.pos[1] <= 0) {
      p.pos[1] = 0;
      p.vy = 0;
      p.grounded = true;
    }
  }

  // 2. Mote pickup (automatic, list order, capped by carry_capacity).
  for (let i = 0; i < w.motes.length && p.carried < t.carry_capacity;) {
    if (within(w.motes[i].pos, p.pos, t.pickup_radius)) {
      w.motes.splice(i, 1);
      p.carried++;
      w.score += t.score.per_mote;
      emit("mote_picked", { carried: p.carried });
    } else i++;
  }

  // 3. Interact: deposit into the nearest unlit lantern in range.
  if (rising(w, input, "interact") && p.carried > 0) {
    let best: Lantern | undefined;
    let bestD = Infinity;
    for (const l of w.lanterns) {
      if (l.lit || !within(l.pos, p.pos, t.interact_radius)) continue;
      const d = dist2(l.pos, p.pos);
      if (d < bestD) {
        bestD = d;
        best = l;
      }
    }
    if (best) {
      const amount = Math.min(
        p.carried,
        Math.max(0, t.lantern_cost - best.deposited),
      );
      if (amount > 0) {
        p.carried -= amount;
        best.deposited += amount;
        emit("deposit", {
          lantern_id: best.id,
          amount,
          deposited: best.deposited,
        });
      }
      if (best.deposited >= t.lantern_cost) {
        best.lit = true;
        w.score += t.score.per_lantern;
        emit("lantern_lit", { lantern_id: best.id });
      }
    }
  }
  if (w.lanterns.every((l) => l.lit)) {
    finish(w, ev, "won", "all_lit");
    w.prev = { ...input };
    return ev;
  }

  // 4. Shades move (stunned ones stay put).
  const sv = t.shade_speed / TICK_HZ;
  for (const s of w.shades) {
    if (isStunned(w, s)) continue; // stunned in the resulting state => does not move
    const dx = p.pos[0] - s.pos[0];
    const dz = p.pos[2] - s.pos[2];
    const d = Math.hypot(dx, dz);
    if (d > 0) {
      const m = Math.min(sv, d);
      s.pos[0] += (dx / d) * m;
      s.pos[2] += (dz / d) * m;
    }
    keepOutOfLight(w, s);
  }

  // 5. Pulse.
  if (
    rising(w, input, "pulse") &&
    now >= p.pulseReadyAt &&
    p.carried >= t.pulse_cost
  ) {
    p.carried -= t.pulse_cost;
    p.pulseReadyAt = now + secToTicks(t.pulse_cooldown_s);
    const stunned: string[] = [];
    for (const s of w.shades) {
      if (!within(s.pos, p.pos, t.pulse_radius)) continue;
      s.stunUntil = now + secToTicks(t.pulse_stun_s);
      let dx = s.pos[0] - p.pos[0];
      let dz = s.pos[2] - p.pos[2];
      const d = Math.hypot(dx, dz);
      if (d === 0) {
        dx = 1;
        dz = 0;
      } else {
        dx /= d;
        dz /= d;
      }
      s.pos[0] += dx * t.pulse_push_m;
      s.pos[2] += dz * t.pulse_push_m;
      keepOutOfLight(w, s);
      stunned.push(s.id);
    }
    w.score += stunned.length * t.score.per_stun;
    emit("pulse", { stunned_ids: stunned });
  }

  // 6. Shade hits.
  if (now >= p.invulnUntil) {
    const hitter = w.shades.find(
      (s) => !isStunned(w, s) && within(s.pos, p.pos, t.shade_hit_radius),
    );
    if (hitter) {
      p.flames = Math.max(0, p.flames - 1);
      const dropped = Math.floor(p.carried * t.hit_drop_ratio);
      p.carried -= dropped;
      p.invulnUntil = now + secToTicks(t.invuln_s);
      emit("player_hit", { by: "shade", flames: p.flames, dropped });
      if (p.flames <= 0) {
        finish(w, ev, "lost", "no_flames");
        w.prev = { ...input };
        return ev;
      }
    }
  }

  // 7. Spawning.
  if (
    w.randomMotes &&
    w.motes.length < WORLD.maxMotes &&
    now % WORLD.moteRespawnTicks === 0
  ) {
    addMote(w, randomPointInRing(w.rng, WORLD.moteMinR, WORLD.moteMaxR));
  }
  if (
    w.randomShades &&
    w.shades.length < WORLD.maxShades &&
    now % WORLD.shadeSpawnTicks === 0
  ) {
    const id = freeShadeId(w);
    w.shades.push({ id, pos: spawnShadePos(w), stunUntil: 0 });
    emit("shade_spawned", { id });
  }

  // 8. Dawn.
  if (timeLeft(w) <= 1e-9) finish(w, ev, "lost", "dawn");

  w.prev = { ...input };
  return ev;
}

/** Shades cannot enter safe_radius around a lit lantern. */
function keepOutOfLight(w: World, s: Shade) {
  const r = w.t.safe_radius;
  for (const l of w.lanterns) {
    if (!l.lit) continue;
    let dx = s.pos[0] - l.pos[0];
    let dz = s.pos[2] - l.pos[2];
    const d = Math.hypot(dx, dz);
    if (d > r) continue;
    if (d === 0) {
      dx = 1;
      dz = 0;
    } else {
      dx /= d;
      dz /= d;
    }
    // Place just outside (rounding to 3 decimals still shows > r).
    s.pos[0] = l.pos[0] + dx * (r + 0.001);
    s.pos[2] = l.pos[2] + dz * (r + 0.001);
  }
}

// ---------- output ----------
export function round3(v: number): number {
  const r = Math.round(v * 1000) / 1000;
  return Object.is(r, -0) ? 0 : r;
}
const r3v = (p: Vec3): Vec3 => [round3(p[0]), round3(p[1]), round3(p[2])];

export function snapshot(w: World) {
  return {
    type: "snapshot",
    tick: w.tick,
    sim_tick: w.tick,
    state: w.state,
    time_left_s: round3(timeLeft(w)),
    score: w.score,
    player: {
      pos: r3v(w.player.pos),
      flames: w.player.flames,
      carried: w.player.carried,
    },
    lanterns: w.lanterns.map((l) => ({
      id: l.id,
      pos: r3v(l.pos),
      lit: l.lit,
      deposited: l.deposited,
    })),
    shades: w.shades.map((s) => ({
      id: s.id,
      pos: r3v(s.pos),
      state: (isStunned(w, s) ? "stunned" : "chase") as ShadeState,
    })),
    motes_active: w.motes.length,
    motes: w.motes.map((m) => ({ id: m.id, pos: r3v(m.pos) })),
  };
}
