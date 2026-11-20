// Pure, deterministic game logic (Test Contract v1.1). No DOM, no Three.js, no Math.random, no clocks.
// step() follows the mandatory per-tick order of Ticket-02 (numbered comments 1..12).
import { STD, TICK_HZ, TUNING, type Tuning } from "./config";
import {
  groundBelow,
  isBlocked,
  NIGHTS,
  topSurface,
  TOWER,
  type NightDef,
  type Vec3,
} from "./maps";
import { Rng } from "./rng";

export type { Vec3 } from "./maps";
export type GameState = "playing" | "paused" | "won" | "lost";
export type ShadeState =
  | "spawning"
  | "wander"
  | "chase"
  | "recoil"
  | "stunned"
  | "drain";
export type DrifterState = "idle" | "chase" | "flee" | "removed";

export interface Input {
  move: [number, number];
  cam_yaw_deg: number;
  jump: boolean;
  interact: boolean;
  pulse: boolean;
  dash: boolean;
  pause: boolean;
}
export const IDLE_INPUT: Input = {
  move: [0, 0],
  cam_yaw_deg: 0,
  jump: false,
  interact: false,
  pulse: false,
  dash: false,
  pause: false,
};

export interface Player {
  pos: Vec3;
  vel: Vec3;
  grounded: boolean;
  facing: [number, number];
  flames: number;
  carried: number;
  invulnTicks: number;
  dashCdTicks: number;
  pulseCdTicks: number;
  charmTicks: number;
  dashTicks: number;
  dashDir: [number, number];
  launch: [number, number] | null; // horizontal launch velocity from a jump pad
  fallWait: number; // >0 while waiting to respawn after falling
}
export interface Mote {
  id: string;
  pos: Vec3;
  kind: "random" | "dropped";
  ttl: number | null;
  point: number; // spawn point index, -1 if not tied to one
}
export interface Shade {
  id: string;
  pos: Vec3;
  hover: number;
  state: ShadeState;
  stateTicks: number; // spawning / recoil / stunned remaining
  pushTicks: number;
  pushDir: [number, number];
  recoilDir: [number, number];
  evicting: boolean;
  target: [number, number] | null;
  targetLantern: string | null; // drain target (v1.2)
  drainTicks: number;
}
export interface Drifter {
  id: string;
  pos: Vec3;
  state: DrifterState;
  stolen: number;
  timer: number;
  robbed: boolean;
  target: [number, number] | null;
}
export interface Charm {
  id: string;
  pos: Vec3;
  available: boolean;
  respawn: number;
}
export interface Lantern {
  id: string;
  pos: Vec3;
  lit: boolean;
  deposited: number;
  fuel60: number; // fuel in integer units of 1/60 (Ticket-03 precision advice)
  everLit: boolean;
  relitCount: number;
}
export interface GameEvent {
  type: "event";
  tick: number;
  name: string;
  data: Record<string, unknown>;
}

export interface World {
  t: Tuning;
  n: NightDef;
  rng: Rng;
  tick: number;
  simTick: number;
  timeTicks: number; // remaining night time in ticks
  state: GameState;
  score: number;
  player: Player;
  motes: Mote[];
  shades: Shade[];
  drifters: Drifter[];
  charms: Charm[];
  lanterns: Lantern[];
  randomMotes: boolean;
  randomShades: boolean;
  randomDrifters: boolean;
  windEnabled: boolean;
  wind: { ticks: number; dir: number };
  nextMote: number;
  nextShade: number;
  nextDrifter: number;
  prev: Input;
  started: boolean;
  successfulLights: number;
  result?: { result: "won" | "lost"; reason: string };
}

export class ScenarioError extends Error {}

// ---------- helpers ----------
const dxz = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[2] - b[2]);
export const within = (a: Vec3, b: Vec3, r: number) => dxz(a, b) <= r + 1e-9;
const secToTicks = (s: number) => Math.round(s * TICK_HZ);
const idNum = (id: string) => {
  const m = /(\d+)$/.exec(id);
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
};
const byId = <T extends { id: string }>(a: T, b: T) =>
  idNum(a.id) - idNum(b.id) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const away = (from: Vec3, to: Vec3): [number, number] => {
  const x = to[0] - from[0];
  const z = to[2] - from[2];
  const d = Math.hypot(x, z);
  return d === 0 ? [1, 0] : [x / d, z / d];
};

export function capacity(w: World): number {
  return Math.min(w.t.capacity_max, w.t.carry_capacity + STD.capacityPerLight * w.successfulLights);
}
export function hasZone(w: World, l: Lantern): boolean {
  return l.lit && l.fuel60 >= w.t.low_fuel_threshold * TICK_HZ;
}
export const round1 = (v: number) => {
  const r = Math.round(v * 10) / 10;
  return Object.is(r, -0) ? 0 : r;
};
export function timeLeft(w: World): number {
  return Math.max(0, w.timeTicks / TICK_HZ);
}
export function isStunned(_w: World, s: Shade): boolean {
  return s.state === "stunned";
}
export function nightDuration(t: Tuning, night: number): number {
  return night === 1
    ? t.night1_duration_s
    : night === 2
      ? t.night2_duration_s
      : t.night3_duration_s;
}

function newShade(
  w: World,
  id: string,
  pos: Vec3,
  state: ShadeState,
  ticks: number,
): Shade {
  const s: Shade = {
    id,
    pos: [pos[0], pos[1], pos[2]],
    hover: pos[1] - topSurface(w.n, pos[0], pos[2]),
    state,
    stateTicks: ticks,
    pushTicks: 0,
    pushDir: [1, 0],
    recoilDir: [1, 0],
    evicting: false,
    target: null,
    targetLantern: null,
    drainTicks: 0,
  };
  if (state === "recoil") s.recoilDir = away(w.player.pos, s.pos);
  return s;
}
function freeId(
  prefix: string,
  used: Set<string>,
  counter: { v: number },
): string {
  let id: string;
  do id = `${prefix}${counter.v++}`;
  while (used.has(id));
  return id;
}
function shadeId(w: World) {
  const c = { v: w.nextShade };
  const id = freeId("S", new Set(w.shades.map((s) => s.id)), c);
  w.nextShade = c.v;
  return id;
}
function drifterId(w: World) {
  const c = { v: w.nextDrifter };
  const id = freeId("D", new Set(w.drifters.map((s) => s.id)), c);
  w.nextDrifter = c.v;
  return id;
}
function addMote(
  w: World,
  pos: Vec3,
  kind: "random" | "dropped",
  ttl: number | null,
  point = -1,
) {
  w.motes.push({ id: `M${w.nextMote++}`, pos, kind, ttl, point });
}

// ---------- scenario ----------
const isNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
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
function optInt(o: Record<string, unknown>, k: string): number | undefined {
  if (!(k in o)) return undefined;
  const v = o[k];
  if (!isNum(v) || v < 0 || !Number.isInteger(v))
    throw new ScenarioError(`${k} must be a non-negative integer`);
  return v;
}
function optId(o: Record<string, unknown>): string | undefined {
  if (!("id" in o)) return undefined;
  if (typeof o.id !== "string") throw new ScenarioError("id must be a string");
  return o.id;
}
const SHADE_STATES: ShadeState[] = [
  "spawning",
  "wander",
  "chase",
  "recoil",
  "stunned",
  "drain",
];
const DRIFTER_STATES: DrifterState[] = ["idle", "chase", "flee", "removed"];

export interface CreateOptions {
  seed: number;
  night?: number;
  scenario?: unknown;
  tuning?: Tuning;
}

export function createWorld(opts: CreateOptions): World {
  const t = opts.tuning ?? TUNING;
  const night = opts.night ?? 1;
  const n = NIGHTS[night];
  if (!n) throw new Error(`night ${night} is not available (1, 2, 3)`);
  const w: World = {
    t,
    n,
    rng: new Rng(opts.seed),
    tick: 0,
    simTick: 0,
    timeTicks: secToTicks(nightDuration(t, night)),
    state: "playing",
    score: 0,
    player: {
      pos: [...n.start],
      vel: [0, 0, 0],
      grounded: true,
      facing: [0, 1],
      flames: t.flames,
      carried: 0,
      invulnTicks: 0,
      dashCdTicks: 0,
      pulseCdTicks: 0,
      charmTicks: 0,
      dashTicks: 0,
      dashDir: [0, 1],
      launch: null,
      fallWait: 0,
    },
    motes: [],
    shades: [],
    drifters: [],
    charms: n.charms.map((p, i) => ({
      id: `C${i + 1}`,
      pos: [...p],
      available: true,
      respawn: 0,
    })),
    lanterns: n.lanterns.map((p, i) => ({
      id: `L${i + 1}`,
      pos: [...p],
      lit: false,
      deposited: 0,
      fuel60: 0,
      everLit: false,
      relitCount: 0,
    })),
    randomMotes: true,
    randomShades: true,
    randomDrifters: true,
    windEnabled: true,
    wind: { ticks: 0, dir: 0 },
    nextMote: 1,
    nextShade: 1,
    nextDrifter: 1,
    prev: { ...IDLE_INPUT },
    started: false,
    successfulLights: 0,
  };

  const sc = opts.scenario;
  if (sc !== undefined && !isObj(sc))
    throw new ScenarioError("scenario must be an object");
  const s = (sc ?? {}) as Record<string, unknown>;
  for (const [k, f] of [
    ["random_motes", "randomMotes"],
    ["random_shades", "randomShades"],
    ["random_drifters", "randomDrifters"],
    ["wind_enabled", "windEnabled"],
  ] as const) {
    const v = optBool(s, k);
    if (v !== undefined) w[f] = v;
  }

  const p = w.player;
  if ("player" in s) {
    const sp = s.player;
    if (!isObj(sp)) throw new ScenarioError("player must be an object");
    if ("pos" in sp) {
      p.pos = vec3(sp.pos, "player.pos");
      const g = groundBelow(n, p.pos[0], p.pos[2], p.pos[1]);
      p.grounded = g !== null && Math.abs(p.pos[1] - g) < 1e-6;
    }
    const map: [string, (v: number) => void][] = [
      ["carried", (v) => (p.carried = v)],
      ["flames", (v) => (p.flames = v)],
      ["invuln_ticks", (v) => (p.invulnTicks = v)],
      ["dash_cd_ticks", (v) => (p.dashCdTicks = v)],
      ["pulse_cd_ticks", (v) => (p.pulseCdTicks = v)],
      ["charm_ticks", (v) => (p.charmTicks = v)],
      ["successful_lights", (v) => (w.successfulLights = v)],
    ];
    for (const [k, set] of map) {
      const v = optInt(sp, k);
      if (v !== undefined) set(v);
    }
  }
  if ("time_left_s" in s) {
    if (!isNum(s.time_left_s) || s.time_left_s < 0)
      throw new ScenarioError("time_left_s must be a number >= 0");
    w.timeTicks = Math.round(s.time_left_s * TICK_HZ);
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
      const d = optInt(l, "deposited");
      if (d !== undefined) target.deposited = d;
      const lit = optBool(l, "lit");
      if (lit !== undefined) target.lit = lit;
      if ("fuel" in l) {
        if (!isNum(l.fuel) || l.fuel < 0)
          throw new ScenarioError(`lantern ${l.id}.fuel must be >= 0`);
        target.fuel60 = Math.round(Math.min(l.fuel, t.fuel_max) * TICK_HZ);
      } else if (target.lit) target.fuel60 = t.fuel_max * TICK_HZ; // lit without fuel -> 100
      if (!target.lit) target.fuel60 = 0;
      const ever = optBool(l, "ever_lit");
      target.everLit = ever ?? (target.everLit || target.lit);
      const rc = optInt(l, "relit_count");
      if (rc !== undefined) target.relitCount = rc;
    }
  }
  const motesGiven = "motes" in s;
  if (motesGiven) {
    if (!Array.isArray(s.motes))
      throw new ScenarioError("motes must be an array");
    for (const m of s.motes) {
      if (Array.isArray(m)) addMote(w, vec3(m, "mote"), "random", null);
      else if (isObj(m)) {
        const kind = m.kind === undefined ? "random" : m.kind;
        if (kind !== "random" && kind !== "dropped")
          throw new ScenarioError("mote.kind must be random|dropped");
        let ttl: number | null = kind === "dropped" ? STD.dropTtl : null;
        if ("ttl_s" in m) {
          if (!isNum(m.ttl_s) || m.ttl_s < 0)
            throw new ScenarioError("mote.ttl_s must be >= 0");
          ttl = Math.round(m.ttl_s * TICK_HZ);
        }
        addMote(w, vec3(m.pos, "mote.pos"), kind, ttl);
      } else throw new ScenarioError("mote must be [x,y,z] or an object");
    }
  }
  const shadesGiven = "shades" in s;
  if (shadesGiven) {
    if (!Array.isArray(s.shades))
      throw new ScenarioError("shades must be an array");
    const pending: { id?: string; sh: Shade }[] = [];
    const ids = new Set<string>();
    for (const sh of s.shades) {
      if (!isObj(sh)) throw new ScenarioError("shade entries must be objects");
      const id = optId(sh);
      if (id !== undefined) {
        if (ids.has(id)) throw new ScenarioError(`duplicate shade id ${id}`);
        ids.add(id);
      }
      let state: ShadeState = "wander";
      if ("state" in sh) {
        if (!SHADE_STATES.includes(sh.state as ShadeState))
          throw new ScenarioError(`bad shade state ${String(sh.state)}`);
        state = sh.state as ShadeState;
      }
      const dflt =
        state === "spawning"
          ? STD.shadeSpawnTicks
          : state === "recoil"
            ? STD.shadeRecoilTicks
            : state === "stunned"
              ? secToTicks(t.pulse_stun_s)
              : 0;
      const ticks = optInt(sh, "state_ticks_left") ?? dflt;
      const shade = newShade(w, id ?? "", vec3(sh.pos, "shade.pos"), state, ticks);
      if ("target_lantern_id" in sh) {
        if (typeof sh.target_lantern_id !== "string" || !w.lanterns.some((l) => l.id === sh.target_lantern_id))
          throw new ScenarioError("target_lantern_id must be a lantern id");
        shade.targetLantern = sh.target_lantern_id;
      }
      if (state === "drain" && !shade.targetLantern) {
        // default: nearest lantern
        shade.targetLantern = [...w.lanterns].sort((a, b) => dxz(a.pos, shade.pos) - dxz(b.pos, shade.pos) || idNum(a.id) - idNum(b.id))[0].id;
      }
      pending.push({ id, sh: shade });
    }
    for (const x of pending) w.shades.push(x.sh);
    for (const x of w.shades) if (x.id === "") x.id = shadeId(w);
  }
  if ("drifters" in s) {
    if (!Array.isArray(s.drifters))
      throw new ScenarioError("drifters must be an array");
    for (const d of s.drifters) {
      if (!isObj(d)) throw new ScenarioError("drifter entries must be objects");
      let state: DrifterState = "idle";
      if ("state" in d) {
        if (!DRIFTER_STATES.includes(d.state as DrifterState))
          throw new ScenarioError(`bad drifter state ${String(d.state)}`);
        state = d.state as DrifterState;
      }
      const stolen = optInt(d, "stolen") ?? 0;
      w.drifters.push({
        id: optId(d) ?? "",
        pos: vec3(d.pos, "drifter.pos"),
        state,
        stolen,
        timer: state === "flee" ? STD.drifterFleeTicks : 0,
        robbed: state === "flee" && stolen > 0,
        target: null,
      });
    }
    for (const d of w.drifters) if (d.id === "") d.id = drifterId(w);
  }
  if ("charms" in s) {
    if (!Array.isArray(s.charms))
      throw new ScenarioError("charms must be an array");
    const list: Charm[] = [];
    s.charms.forEach((c, i) => {
      if (!isObj(c)) throw new ScenarioError("charm entries must be objects");
      const id = optId(c) ?? `C${i + 1}`;
      const dflt = n.charms[idNum(id) - 1];
      const pos =
        "pos" in c
          ? vec3(c.pos, "charm.pos")
          : dflt
            ? ([...dflt] as Vec3)
            : null;
      if (!pos) throw new ScenarioError(`charm ${id} needs pos`);
      const available = optBool(c, "available") ?? true;
      let respawn = available ? 0 : STD.charmRespawn;
      const rt = optInt(c, "respawn_ticks");
      if (rt !== undefined) respawn = rt;
      if ("respawn_s" in c) {
        if (!isNum(c.respawn_s) || c.respawn_s < 0)
          throw new ScenarioError("respawn_s must be >= 0");
        respawn = Math.round(c.respawn_s * TICK_HZ);
      }
      list.push({ id, pos, available, respawn });
    });
    w.charms = list;
  }

  // Default population (setup emits no events).
  if (!motesGiven && w.randomMotes) {
    const idx = n.moteSpawns.map((_, i) => i);
    for (let i = 0; i < Math.min(STD.moteStart, idx.length); i++) {
      const j = i + Math.floor(w.rng.next() * (idx.length - i));
      [idx[i], idx[j]] = [idx[j], idx[i]];
      const pt = n.moteSpawns[idx[i]];
      addMote(w, [...pt], "random", null, idx[i]);
    }
  }
  return w;
}

// ---------- step ----------
const rising = (
  w: World,
  input: Input,
  k: "jump" | "interact" | "pulse" | "dash" | "pause",
) => input[k] && !w.prev[k];

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

function finish(
  w: World,
  ev: GameEvent[],
  result: "won" | "lost",
  reason: string,
) {
  w.state = result;
  w.result = { result, reason };
  if (result === "won") {
    // v1.2 dawn bonus: each lit lantern 50 + floor(fuel); each flame +50. Time bonus removed.
    for (const l of w.lanterns)
      if (l.lit) w.score += STD.dawnLitBase + Math.floor(l.fuel60 / TICK_HZ);
    w.score += w.player.flames * w.t.score.per_flame_left;
  }
  ev.push({
    type: "event",
    tick: w.tick,
    name: "game_over",
    data: { result, reason },
  });
}

export function step(w: World, input: Input): GameEvent[] {
  const ev: GameEvent[] = [];
  if (w.state === "won" || w.state === "lost") return ev;
  const t = w.t;
  const p = w.player;
  const n = w.n;
  w.tick += 1;
  const emit = (name: string, data: Record<string, unknown> = {}) =>
    ev.push({ type: "event", tick: w.tick, name, data });
  if (!w.started) {
    w.started = true;
    emit("night_start", { night: n.night });
  }

  // 1. Input: pause first.
  if (rising(w, input, "pause")) {
    if (w.state === "paused") {
      w.state = "playing";
      emit("resumed");
    } else {
      w.state = "paused";
      emit("paused");
    }
  }
  if (w.state === "paused") {
    w.prev = { ...input };
    return ev;
  }
  w.simTick += 1;

  // 2. Counters.
  w.timeTicks = Math.max(0, w.timeTicks - 1);
  if (p.dashCdTicks > 0) p.dashCdTicks--;
  if (p.pulseCdTicks > 0) p.pulseCdTicks--;
  if (p.invulnTicks > 0) p.invulnTicks--;
  if (p.charmTicks > 0) p.charmTicks--;
  if (w.wind.ticks > 0) w.wind.ticks--;
  for (const s of w.shades) {
    if (s.stateTicks > 0) {
      s.stateTicks--;
      if (s.stateTicks === 0) {
        if (s.state === "spawning") s.state = "wander";
        else if (s.state === "stunned") s.state = "wander"; // v1.2: stun ends -> wander
        else if (s.state === "recoil")
          s.state = dxz(s.pos, p.pos) <= STD.shadeDetect ? "chase" : "wander";
      }
    }
  }
  for (let i = w.motes.length - 1; i >= 0; i--) {
    const m = w.motes[i];
    if (m.ttl !== null && --m.ttl <= 0) w.motes.splice(i, 1);
  }
  for (const c of w.charms) {
    if (!c.available && c.respawn > 0 && --c.respawn === 0) c.available = true;
  }
  for (const d of w.drifters) {
    if (
      (d.state === "flee" || d.timer > 0) &&
      d.state !== "removed" &&
      d.timer > 0 &&
      --d.timer === 0
    )
      d.state = "removed";
  }
  if (p.fallWait > 0 && --p.fallWait === 0) {
    p.pos = [...n.start];
    p.vel = [0, 0, 0];
    p.grounded = true;
    p.launch = null;
    p.dashTicks = 0;
    p.invulnTicks = secToTicks(t.invuln_s);
  }
  // 2b. Fuel (v1.2): decay + drain, then lanterns at fuel <= 0 go out.
  for (const l of w.lanterns) {
    if (!l.lit) continue;
    const drainers = w.shades.filter((s) => s.state === "drain" && s.targetLantern === l.id && !s.evicting).sort(byId);
    l.fuel60 -= t.fuel_decay_per_s + drainers.length * t.drain_per_s;
    for (const s of drainers) {
      s.drainTicks++;
      if (s.drainTicks % STD.drainEventEvery === 0)
        emit("fuel_drain", { lantern_id: l.id, shade_id: s.id, fuel: round1(Math.max(0, l.fuel60) / TICK_HZ) });
    }
  }
  for (const l of w.lanterns) {
    if (l.lit && l.fuel60 <= 0) {
      l.lit = false;
      l.deposited = 0;
      l.fuel60 = 0;
      emit("lantern_out", { lantern_id: l.id });
    }
  }
  const alive = p.fallWait === 0;

  // 3. Move Mây (jump, dash, pads, wind) then check falling.
  if (alive) movePlayer(w, input, emit);

  // 4. Pick up motes and charms.
  if (alive) {
    for (let i = 0; i < w.motes.length && p.carried < capacity(w);) {
      const m = w.motes[i];
      if (
        within(m.pos, p.pos, t.pickup_radius) &&
        Math.abs(p.pos[1] - m.pos[1]) <= STD.pickupHeight
      ) {
        w.motes.splice(i, 1);
        p.carried++;
        emit("mote_picked", { carried: p.carried });
      } else i++;
    }
    for (const c of w.charms) {
      if (
        c.available &&
        within(c.pos, p.pos, t.pickup_radius) &&
        Math.abs(p.pos[1] - c.pos[1]) <= STD.pickupHeight
      ) {
        c.available = false;
        c.respawn = STD.charmRespawn;
        p.charmTicks = STD.charmTicks;
        emit("charm_picked", { charm_id: c.id, charm_ticks: p.charmTicks });
      }
    }
  }

  // 5. Interact with lanterns (v1.2: unlit -> light/relight, lit & not full -> refuel).
  if (alive && rising(w, input, "interact") && p.carried > 0) {
    const max60 = t.fuel_max * TICK_HZ;
    const perMote60 = t.fuel_per_mote * TICK_HZ;
    let best: Lantern | undefined;
    let bestD = Infinity;
    for (const l of w.lanterns) {
      if (l.lit && l.fuel60 >= max60) continue; // full: not selectable
      if (!within(l.pos, p.pos, t.interact_radius)) continue;
      const d = dxz(l.pos, p.pos);
      if (d < bestD - 1e-9 || (Math.abs(d - bestD) <= 1e-9 && best && idNum(l.id) < idNum(best.id))) {
        bestD = d;
        best = l;
      }
    }
    if (best && best.lit) {
      const used = Math.min(p.carried, Math.ceil((max60 - best.fuel60) / perMote60));
      if (used > 0) {
        p.carried -= used;
        best.fuel60 = Math.min(max60, best.fuel60 + used * perMote60);
        w.score += used * t.score.per_mote;
        emit("refuel", { lantern_id: best.id, amount: used, fuel: round1(best.fuel60 / TICK_HZ) });
      }
    } else if (best) {
      const cost = best.everLit ? t.relight_cost : t.lantern_cost;
      const amount = Math.min(p.carried, Math.max(0, cost - best.deposited));
      if (amount > 0) {
        p.carried -= amount;
        best.deposited += amount;
        w.score += amount * t.score.per_mote;
        emit("deposit", { lantern_id: best.id, amount, deposited: best.deposited });
      }
      if (best.deposited >= cost) {
        const relight = best.everLit;
        best.lit = true;
        best.fuel60 = max60;
        best.everLit = true;
        if (relight) best.relitCount++;
        w.successfulLights++;
        w.score += relight ? STD.relightScore : t.score.per_lantern;
        emit("lantern_lit", { lantern_id: best.id, relight });
      }
    }
  }

  // 6. Safe zones: shades already inside a lit zone start being evicted (harmless meanwhile).
  // v1.2: only lit lanterns with fuel >= low_fuel_threshold have a zone.
  for (const l of w.lanterns) {
    if (!hasZone(w, l)) continue;
    for (const s of w.shades)
      if (!s.evicting && dxz(s.pos, l.pos) < t.safe_radius - 1e-6) {
        s.evicting = true;
        if (s.state === "drain") {
          s.state = "wander";
          s.targetLantern = null;
        }
      }
  }

  // 7. Pulse.
  if (
    alive &&
    rising(w, input, "pulse") &&
    p.pulseCdTicks === 0 &&
    p.carried >= t.pulse_cost
  ) {
    p.carried -= t.pulse_cost;
    p.pulseCdTicks = secToTicks(t.pulse_cooldown_s);
    const c: Vec3 = [p.pos[0], p.pos[1] + STD.pulseCenterY, p.pos[2]];
    const in3d = (q: Vec3) =>
      Math.hypot(q[0] - c[0], q[1] - c[1], q[2] - c[2]) <=
      t.pulse_radius + 1e-9;
    const hit = w.shades.filter((s) => in3d(s.pos)).sort(byId);
    for (const s of hit) {
      w.score += s.state === "drain" ? STD.stunDrainScore : t.score.per_stun;
      s.targetLantern = null;
      s.state = "stunned";
      s.stateTicks = secToTicks(t.pulse_stun_s);
      s.pushTicks = STD.pulsePushTicks;
      s.pushDir = away(p.pos, s.pos);
    }
    for (const d of [...w.drifters].sort(byId)) {
      if (!in3d(d.pos)) continue;
      if (d.state === "chase") {
        d.state = "flee";
        d.timer = STD.drifterFleeTicks;
      } else if (d.state === "flee" && d.stolen > 0) {
        const amount = d.stolen;
        for (let i = 0; i < amount; i++)
          addMote(
            w,
            [d.pos[0], topSurface(n, d.pos[0], d.pos[2]), d.pos[2]],
            "dropped",
            STD.dropTtl,
          );
        d.stolen = 0;
        d.timer = STD.drifterDropTicks;
        emit("drifter_drop", { drifter_id: d.id, amount });
      }
    }
    emit("pulse", { stunned_ids: hit.map((s) => s.id) });
  }

  // 8. Move shades and drifters.
  moveShades(w);
  moveDrifters(w);

  // 9. Touch: drifters steal first, then shades hit (ascending id).
  if (alive) {
    for (const d of [...w.drifters].sort(byId)) {
      if (
        (d.state !== "idle" && d.state !== "chase") ||
        d.robbed ||
        p.carried === 0
      )
        continue;
      if (!within(d.pos, p.pos, STD.drifterTouch)) continue;
      const amount = Math.min(STD.drifterSteal, p.carried);
      p.carried -= amount;
      d.stolen = amount;
      d.robbed = true;
      d.state = "flee";
      d.timer = STD.drifterFleeTicks;
      emit("drifter_steal", { drifter_id: d.id, amount, carried: p.carried });
    }
    if (p.invulnTicks === 0) {
      const hitter = [...w.shades]
        .sort(byId)
        .find(
          (s) =>
            (s.state === "wander" || s.state === "chase") &&
            !s.evicting &&
            within(s.pos, p.pos, t.shade_hit_radius) &&
            Math.abs(s.pos[1] - p.pos[1]) <= STD.hitHeight,
        );
      if (hitter) {
        p.flames = Math.max(0, p.flames - 1);
        const dropped = Math.floor(p.carried * t.hit_drop_ratio);
        p.carried -= dropped;
        const gy = groundBelow(n, p.pos[0], p.pos[2], p.pos[1]) ?? p.pos[1];
        for (let i = 0; i < dropped; i++) {
          const a = w.rng.range(0, Math.PI * 2);
          const r = w.rng.range(STD.dropRingMin, STD.dropRingMax);
          addMote(
            w,
            [p.pos[0] + r * Math.cos(a), gy, p.pos[2] + r * Math.sin(a)],
            "dropped",
            STD.dropTtl,
          );
        }
        p.invulnTicks = secToTicks(t.invuln_s);
        hitter.state = "recoil";
        hitter.stateTicks = STD.shadeRecoilTicks;
        hitter.recoilDir = away(p.pos, hitter.pos);
        emit("player_hit", { by: "shade", flames: p.flames, dropped });
      }
    }
  }

  // 10. Scheduled spawns (new entities interact from the next tick).
  spawn(w, emit);

  // 11. Win / lose.
  // v1.2: no early win; at dawn need ceil(win_ratio * lanterns) lit; no flames always loses first.
  if (p.flames <= 0) finish(w, ev, "lost", "no_flames");
  else if (w.timeTicks <= 0) {
    const need = Math.ceil(t.win_ratio * w.lanterns.length - 1e-9);
    const lit = w.lanterns.filter((l) => l.lit).length;
    if (lit >= need) finish(w, ev, "won", "dawn_survived");
    else finish(w, ev, "lost", "dawn");
  }

  w.prev = { ...input };
  return ev;
}

function movePlayer(
  w: World,
  input: Input,
  emit: (n: string, d?: Record<string, unknown>) => void,
) {
  const p = w.player;
  const n = w.n;
  const t = w.t;
  const [mx, mz] = worldMove(input.move, input.cam_yaw_deg);
  const moving = mx !== 0 || mz !== 0;
  if (moving) {
    const d = Math.hypot(mx, mz);
    p.facing = [mx / d, mz / d];
  }
  if (rising(w, input, "jump") && p.grounded && p.dashTicks === 0) {
    p.vel[1] = STD.jumpSpeed;
    p.grounded = false;
  }
  if (
    rising(w, input, "dash") &&
    p.dashTicks === 0 &&
    (p.dashCdTicks === 0 || p.charmTicks > 0)
  ) {
    p.dashTicks = secToTicks(t.dash_duration_s);
    p.dashDir = moving
      ? [mx / Math.hypot(mx, mz), mz / Math.hypot(mx, mz)]
      : [...p.facing];
    p.dashCdTicks = p.charmTicks > 0 ? 0 : secToTicks(t.dash_cooldown_s);
    emit("dash");
  }

  let hx: number;
  let hz: number;
  const dashing = p.dashTicks > 0;
  if (dashing) {
    hx = p.dashDir[0] * t.dash_speed;
    hz = p.dashDir[1] * t.dash_speed;
    p.dashTicks--;
    p.vel[1] = 0; // dash keeps altitude
  } else if (p.launch) {
    [hx, hz] = p.launch;
  } else {
    const sp = p.charmTicks > 0 ? STD.charmSpeed : t.player_speed;
    hx = mx * sp;
    hz = mz * sp;
  }
  if (w.wind.ticks > 0) {
    const a = (w.wind.dir * Math.PI) / 180;
    hx += Math.cos(a) * STD.windSpeed;
    hz += Math.sin(a) * STD.windSpeed;
  }

  // Horizontal move with wall sliding (vertical walls of higher tiers, the bell tower).
  const [x0, y0, z0] = p.pos;
  let nx = x0 + hx / TICK_HZ;
  let nz = z0 + hz / TICK_HZ;
  if (isBlocked(n, nx, nz, y0)) {
    if (!isBlocked(n, nx, z0, y0)) nz = z0;
    else if (!isBlocked(n, x0, nz, y0)) nx = x0;
    else {
      nx = x0;
      nz = z0;
    }
  }
  if (!t.fall_enabled && n.surfaces(nx, nz).length === 0) {
    nx = x0;
    nz = z0;
  }

  // Vertical.
  let y = y0;
  const g = groundBelow(n, nx, nz, y0);
  if (p.grounded && !dashing) {
    if (g !== null && g >= y0 - STEP_DOWN) y = g;
    else p.grounded = false;
  }
  if (!p.grounded && !dashing) {
    p.vel[1] -= STD.gravity / TICK_HZ;
    y = y0 + p.vel[1] / TICK_HZ;
    const g2 = groundBelow(n, nx, nz, Math.max(y0, y));
    if (g2 !== null && y <= g2 && p.vel[1] <= 0) {
      y = g2;
      p.vel[1] = 0;
      p.grounded = true;
      p.launch = null;
    }
  }
  p.pos = [nx, y, nz];
  p.vel[0] = (nx - x0) * TICK_HZ;
  p.vel[2] = (nz - z0) * TICK_HZ;

  // Jump pads: feet touching the pad launches Mây towards the target.
  if (p.grounded && !p.launch) {
    for (const pad of n.pads) {
      if (within(pad.pos, p.pos, 1) && Math.abs(p.pos[1] - pad.pos[1]) < 0.05) {
        p.launch = [pad.dir[0] * pad.vh, pad.dir[1] * pad.vh];
        p.vel[1] = pad.vy;
        p.grounded = false;
        break;
      }
    }
  }

  // Falling off the island.
  if (p.pos[1] < STD.fallY) {
    p.flames = Math.max(0, p.flames - 1);
    const lost = p.carried;
    p.carried = 0;
    p.fallWait = STD.fallWaitTicks;
    p.vel = [0, 0, 0];
    p.launch = null;
    p.dashTicks = 0;
    emit("player_hit", { by: "fall", flames: p.flames, dropped: 0, lost });
  }
}
const STEP_DOWN = 0.35;

function keepOut(w: World, s: Shade) {
  for (const l of w.lanterns) {
    if (!hasZone(w, l)) continue;
    const d = dxz(s.pos, l.pos);
    if (d >= w.t.safe_radius) continue;
    const [ux, uz] = away(l.pos, s.pos);
    s.pos[0] = l.pos[0] + ux * w.t.safe_radius;
    s.pos[2] = l.pos[2] + uz * w.t.safe_radius;
  }
}
function setHover(w: World, s: { pos: Vec3 }, hover: number) {
  s.pos[1] = topSurface(w.n, s.pos[0], s.pos[2]) + hover;
}
function inTower(w: World, x: number, z: number, y: number) {
  return w.n.night === 3 && Math.hypot(x, z) <= TOWER.r && y < TOWER.h;
}
function stepToward(pos: Vec3, tx: number, tz: number, dist: number) {
  const dx = tx - pos[0];
  const dz = tz - pos[2];
  const d = Math.hypot(dx, dz);
  if (d === 0) return;
  const m = Math.min(dist, d);
  pos[0] += (dx / d) * m;
  pos[2] += (dz / d) * m;
}

function moveShades(w: World) {
  const p = w.player;
  const sp = (w.n.shadeSpeed ?? w.t.shade_speed) / TICK_HZ;
  for (const s of [...w.shades].sort(byId)) {
    if (s.evicting) {
      // Push out towards the edge of every lit zone it is in; reaches the edge within 30 ticks.
      let inside = false;
      for (const l of w.lanterns) {
        if (!hasZone(w, l)) continue;
        const d = dxz(s.pos, l.pos);
        if (d >= w.t.safe_radius) continue;
        inside = true;
        const [ux, uz] = away(l.pos, s.pos);
        const nd = Math.min(
          w.t.safe_radius,
          d + w.t.safe_radius / STD.evictMaxTicks,
        );
        s.pos[0] = l.pos[0] + ux * nd;
        s.pos[2] = l.pos[2] + uz * nd;
      }
      if (
        !inside ||
        w.lanterns.every(
          (l) => !hasZone(w, l) || dxz(s.pos, l.pos) >= w.t.safe_radius - 1e-9,
        )
      )
        s.evicting = false;
      setHover(w, s, s.hover);
      continue;
    }
    const d = dxz(s.pos, p.pos);
    if (s.state === "stunned") {
      if (s.pushTicks > 0) {
        s.pushTicks--;
        const step = w.t.pulse_push_m / STD.pulsePushTicks;
        const nx = s.pos[0] + s.pushDir[0] * step;
        const nz = s.pos[2] + s.pushDir[1] * step;
        if (inTower(w, nx, nz, s.pos[1])) s.pushTicks = 0;
        else {
          s.pos[0] = nx;
          s.pos[2] = nz;
        }
      }
    } else if (s.state === "recoil") {
      const step = STD.shadeRecoilM / STD.shadeRecoilTicks;
      s.pos[0] += s.recoilDir[0] * step;
      s.pos[2] += s.recoilDir[1] * step;
    } else if (s.state === "drain") {
      // v1.2 drain: stand still; chase if Mây within 6 m; wander if lantern out, refuelled >= 30 or > 2 m away.
      const l = w.lanterns.find((x) => x.id === s.targetLantern);
      if (d <= STD.drainChaseRange + 1e-9) {
        s.state = "chase";
        s.targetLantern = null;
        stepToward(s.pos, p.pos[0], p.pos[2], sp);
      } else if (!l || !l.lit || l.fuel60 >= w.t.low_fuel_threshold * TICK_HZ || !within(s.pos, l.pos, STD.drainRange)) {
        s.state = "wander";
        s.targetLantern = null;
      }
    } else if (s.state === "wander" || s.state === "chase") {
      if (s.state === "wander" && d <= STD.shadeDetect) s.state = "chase";
      else if (s.state === "chase" && d > STD.shadeLose) s.state = "wander";
      if (s.state === "chase") stepToward(s.pos, p.pos[0], p.pos[2], sp);
      else {
        // v1.2 wander: go to the nearest lit lantern with fuel < 30 (tie: smaller id); else nearest unlit lantern;
        // else drift randomly.
        const near = (ls: Lantern[]) =>
          ls.sort((a, b) => dxz(a.pos, s.pos) - dxz(b.pos, s.pos) || idNum(a.id) - idNum(b.id))[0];
        const weak = near(w.lanterns.filter((l) => l.lit && l.fuel60 < w.t.low_fuel_threshold * TICK_HZ));
        const goal = weak ?? near(w.lanterns.filter((l) => !l.lit));
        if (goal) {
          stepToward(s.pos, goal.pos[0], goal.pos[2], STD.shadeWanderSpeed / TICK_HZ);
          if (weak && within(s.pos, weak.pos, STD.drainRange)) {
            s.state = "drain";
            s.targetLantern = weak.id;
            s.drainTicks = 0;
          }
        } else {
          if (!s.target || Math.hypot(s.target[0] - s.pos[0], s.target[1] - s.pos[2]) < 0.1) {
            const a = w.rng.range(0, Math.PI * 2);
            const r = w.rng.range(2, 6);
            s.target = [s.pos[0] + r * Math.cos(a), s.pos[2] + r * Math.sin(a)];
          }
          stepToward(s.pos, s.target[0], s.target[1], STD.shadeWanderSpeed / TICK_HZ);
        }
      }
    }
    if (s.state !== "spawning") keepOut(w, s);
    setHover(w, s, s.hover);
  }
}

function moveDrifters(w: World) {
  const p = w.player;
  for (const d of [...w.drifters].sort(byId)) {
    if (d.state === "removed") continue;
    const dist = dxz(d.pos, p.pos);
    if (d.state === "idle" || d.state === "chase") {
      const want =
        !d.robbed &&
        p.carried >= STD.drifterChaseCarry &&
        dist <= STD.drifterChaseDist;
      d.state = want ? "chase" : "idle";
    }
    if (d.state === "chase")
      stepToward(d.pos, p.pos[0], p.pos[2], STD.drifterSpeed / TICK_HZ);
    else if (d.state === "flee") {
      const [ux, uz] = away(p.pos, d.pos);
      d.pos[0] += (ux * STD.drifterSpeed) / TICK_HZ;
      d.pos[2] += (uz * STD.drifterSpeed) / TICK_HZ;
    } else {
      if (
        !d.target ||
        Math.hypot(d.target[0] - d.pos[0], d.target[1] - d.pos[2]) < 0.1
      ) {
        const a = w.rng.range(0, Math.PI * 2);
        const r = w.rng.range(3, 8);
        d.target = [d.pos[0] + r * Math.cos(a), d.pos[2] + r * Math.sin(a)];
      }
      stepToward(
        d.pos,
        d.target[0],
        d.target[1],
        STD.drifterIdleSpeed / TICK_HZ,
      );
    }
    setHover(w, d, STD.drifterHover);
  }
}

function spawn(
  w: World,
  emit: (n: string, d?: Record<string, unknown>) => void,
) {
  const n = w.n;
  const st = w.simTick;
  if (
    w.randomMotes &&
    st % STD.moteSpawnEvery === 0 &&
    w.motes.length < STD.moteCap
  ) {
    const used = new Set(
      w.motes.filter((m) => m.point >= 0).map((m) => m.point),
    );
    const free = n.moteSpawns.map((_, i) => i).filter((i) => !used.has(i));
    if (free.length) {
      const i = free[Math.floor(w.rng.next() * free.length)];
      addMote(w, [...n.moteSpawns[i]], "random", null, i);
    }
  }
  if (
    w.randomShades &&
    st >= STD.shadeFirstSpawnTick &&
    (st - STD.shadeFirstSpawnTick) % n.shadeIntervalTicks === 0
  ) {
    const count = st === STD.shadeFirstSpawnTick ? 2 : 1;
    for (let c = 0; c < count && w.shades.length < n.shadeMax; c++) {
      const valid = n.shadeSpawns.filter(
        (q) => !within(q, w.player.pos, STD.shadeSpawnMinDist - 1e-9),
      );
      if (!valid.length) break;
      const q = valid[Math.floor(w.rng.next() * valid.length)];
      const id = shadeId(w);
      w.shades.push(newShade(w, id, [...q], "spawning", STD.shadeSpawnTicks));
      emit("shade_spawned", { id });
    }
  }
  if (n.drifters && w.randomDrifters && st % STD.drifterSpawnEvery === 0) {
    if (
      w.drifters.filter((d) => d.state !== "removed").length < STD.drifterMax
    ) {
      const q = n.shadeSpawns[Math.floor(w.rng.next() * n.shadeSpawns.length)];
      w.drifters.push({
        id: drifterId(w),
        pos: [q[0], topSurface(n, q[0], q[2]) + STD.drifterHover, q[2]],
        state: "idle",
        stolen: 0,
        timer: 0,
        robbed: false,
        target: null,
      });
    }
  }
  if (n.wind && w.windEnabled && st % STD.windEvery === 0) {
    w.wind = { ticks: STD.windTicks, dir: Math.floor(w.rng.next() * 360) };
  }
}

// ---------- output ----------
export function round3(v: number): number {
  const r = Math.round(v * 1000) / 1000;
  return Object.is(r, -0) ? 0 : r;
}
const r3v = (p: Vec3): Vec3 => [round3(p[0]), round3(p[1]), round3(p[2])];
const sec = (ticks: number) => round3(ticks / TICK_HZ);

/** Next wind gust start (sim tick), for the 2 s warning in the view. */
export function nextWindTick(w: World): number | null {
  if (!w.n.wind || !w.windEnabled) return null;
  return (Math.floor(w.simTick / STD.windEvery) + 1) * STD.windEvery;
}

export function snapshot(w: World) {
  const p = w.player;
  return {
    type: "snapshot",
    tick: w.tick,
    sim_tick: w.simTick,
    night: w.n.night,
    state: w.state,
    time_left_s: round3(timeLeft(w)),
    score: w.score,
    wind: {
      active: w.wind.ticks > 0,
      dir_deg: w.wind.ticks > 0 ? w.wind.dir : null,
    },
    player: {
      pos: r3v(p.pos),
      vel: r3v(p.vel),
      grounded: p.grounded,
      flames: p.flames,
      carried: p.carried,
      invuln: p.invulnTicks > 0,
      dash_cd_s: sec(p.dashCdTicks),
      pulse_cd_s: sec(p.pulseCdTicks),
      charm_s: sec(p.charmTicks),
      capacity: capacity(w),
    },
    lanterns: w.lanterns.map((l) => ({
      id: l.id,
      pos: r3v(l.pos),
      lit: l.lit,
      deposited: l.deposited,
      fuel: l.lit ? round1(l.fuel60 / TICK_HZ) : 0,
      ever_lit: l.everLit,
      relit_count: l.relitCount,
    })),
    shades: w.shades.map((s) => ({
      id: s.id,
      pos: r3v(s.pos),
      state: s.state,
    })),
    motes_active: w.motes.length,
    motes: w.motes.map((m) => ({
      id: m.id,
      pos: r3v(m.pos),
      kind: m.kind,
      ttl_s: m.ttl === null ? null : sec(m.ttl),
    })),
    drifters: w.drifters.map((d) => ({
      id: d.id,
      pos: r3v(d.pos),
      state: d.state,
      stolen: d.stolen,
    })),
    charms: w.charms.map((c) => ({
      id: c.id,
      available: c.available,
      respawn_s: sec(c.available ? 0 : c.respawn),
    })),
  };
}
