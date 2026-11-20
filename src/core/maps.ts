// Standard maps (Ticket-02 part 2). Angles are measured from +X towards +Z: point = (r cos a, y, r sin a).
export type Vec3 = [number, number, number];

export interface Pad {
  pos: Vec3;
  vy: number;
  vh: number;
  dir: [number, number]; // unit XZ
}

export interface NightDef {
  night: 1 | 2 | 3;
  name: string;
  durationS: number;
  start: Vec3;
  lanterns: Vec3[];
  moteSpawns: Vec3[];
  shadeSpawns: Vec3[];
  shadeIntervalTicks: number;
  shadeMax: number;
  /** Night-specific override (Đêm 3 = 4.5 m/s); null = use tuning.shade_speed. */
  shadeSpeed: number | null;
  pads: Pad[];
  charms: Vec3[];
  drifters: boolean;
  wind: boolean;
  /** Heights of every walkable/solid surface at (x, z). Empty = void (sea of clouds). */
  surfaces(x: number, z: number): number[];
}

const r3 = (v: number) => {
  const r = Math.round(v * 1000) / 1000;
  return Object.is(r, -0) ? 0 : r;
};
const polar = (r: number, deg: number, y = 0, cx = 0, cz = 0): Vec3 => {
  const a = (deg * Math.PI) / 180;
  return [r3(cx + r * Math.cos(a)), y, r3(cz + r * Math.sin(a))];
};
const ring = (
  n: number,
  r: number,
  startDeg: number,
  stepDeg: number,
  y = 0,
  cx = 0,
  cz = 0,
) =>
  Array.from({ length: n }, (_, i) =>
    polar(r, startDeg + i * stepDeg, y, cx, cz),
  );
const unit = (x: number, z: number): [number, number] => {
  const d = Math.hypot(x, z);
  return [x / d, z / d];
};

export const NIGHT1: NightDef = {
  night: 1,
  name: "Đảo Bến",
  durationS: 300,
  start: [0, 0, 0],
  lanterns: [
    [0, 0, 25],
    [23.8, 0, 7.7],
    [14.7, 0, -20.2],
    [-14.7, 0, -20.2],
    [-23.8, 0, 7.7],
  ],
  moteSpawns: [...ring(8, 12, 0, 45), ...ring(16, 33, 0, 22.5)],
  shadeSpawns: ring(12, 37, 15, 30, 1),
  shadeIntervalTicks: 480,
  shadeMax: 6,
  shadeSpeed: null,
  pads: [],
  charms: [],
  drifters: false,
  wind: false,
  surfaces: (x, z) => (Math.hypot(x, z) <= 40 ? [0] : []),
};

const B = 70;
export const NIGHT2: NightDef = {
  night: 2,
  name: "Đảo Cau",
  durationS: 330,
  start: [0, 0, 0],
  lanterns: [
    [0, 0, 20],
    [17, 0, -10],
    [-17, 0, -10],
    [70, 0, 20],
    [87, 0, -10],
    [53, 0, -10],
  ],
  moteSpawns: [
    ...ring(4, 10, 0, 90),
    ...ring(8, 22, 0, 45),
    ...ring(4, 10, 0, 90, 0, B, 0),
    ...ring(8, 22, 0, 45, 0, B, 0),
  ],
  shadeSpawns: [...ring(8, 26, 22.5, 45, 1), ...ring(8, 26, 22.5, 45, 1, B, 0)],
  shadeIntervalTicks: 420,
  shadeMax: 8,
  shadeSpeed: null,
  pads: [
    { pos: [20, 0, 18], vy: 14, vh: 24, dir: unit(B - 20, -18) },
    { pos: [50, 0, -18], vy: 14, vh: 24, dir: unit(0 - 50, 18) },
  ],
  charms: [[35, 0, 0]],
  drifters: true,
  wind: false,
  surfaces: (x, z) =>
    Math.hypot(x, z) <= 28 ||
    Math.hypot(x - B, z) <= 28 ||
    (x >= 26 && x <= 44 && z >= -2 && z <= 2)
      ? [0]
      : [],
};

const RAMPS = [30, 150].map((d) => [
  Math.cos((d * Math.PI) / 180),
  Math.sin((d * Math.PI) / 180),
]);
export const TOWER = { r: 2, h: 8 };
export const NIGHT3: NightDef = {
  night: 3,
  name: "Đảo Chuông",
  durationS: 360,
  start: [0, 0, -15],
  lanterns: [
    [0, 6, 6],
    [18, 3, 10],
    [-18, 3, 10],
    [35, 0, -10],
    [-35, 0, -10],
    [20, 0, -35],
    [-20, 0, -35],
  ],
  moteSpawns: [
    ...ring(18, 34, 0, 20, 0),
    ...ring(8, 18, 20, 20, 3),
    ...ring(4, 5, 45, 90, 6),
  ],
  shadeSpawns: ring(16, 43, 0, 22.5, 1),
  shadeIntervalTicks: 360,
  shadeMax: 10,
  shadeSpeed: 4.5,
  pads: [{ pos: [0, 3, 13], vy: 12, vh: 8, dir: [0, -1] }],
  charms: [
    [30, 0, 25],
    [-30, 0, 25],
  ],
  drifters: true,
  wind: true,
  surfaces: (x, z) => {
    const r = Math.hypot(x, z);
    const out: number[] = [];
    if (r > 45) return out;
    out.push(0);
    if (r >= 12 && r <= 24 && z > 0) out.push(3);
    if (r <= 8) out.push(6);
    if (r <= TOWER.r) out.push(TOWER.h);
    for (const [ux, uz] of RAMPS) {
      const s = x * ux + z * uz;
      const lat = Math.abs(x * uz - z * ux);
      if (lat <= 1.5 && s >= 24 && s <= 30) out.push((3 * (30 - s)) / 6);
    }
    return out;
  },
};

export const NIGHTS: Record<number, NightDef> = {
  1: NIGHT1,
  2: NIGHT2,
  3: NIGHT3,
};

/** Max step height the player can walk up (ramps); anything higher is a wall. */
export const STEP = 0.35;

export function groundBelow(
  n: NightDef,
  x: number,
  z: number,
  y: number,
): number | null {
  let best: number | null = null;
  for (const h of n.surfaces(x, z))
    if (h <= y + STEP && (best === null || h > best)) best = h;
  return best;
}
export function isBlocked(
  n: NightDef,
  x: number,
  z: number,
  y: number,
): boolean {
  return n.surfaces(x, z).some((h) => h > y + STEP);
}
/** Highest surface at (x,z) excluding the tower; 0 over the void. Used for hovering entities. */
export function topSurface(n: NightDef, x: number, z: number): number {
  let best = 0;
  for (const h of n.surfaces(x, z)) if (h !== TOWER.h && h > best) best = h;
  return best;
}
