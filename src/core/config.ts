// Tuning comes straight from game.contract.json so the declared numbers
// can never drift from the numbers the game actually uses.
import contract from "../../game.contract.json";

export interface ScoreTuning {
  per_mote: number; // per mote DEPOSITED (Ticket-02)
  per_lantern: number;
  per_stun: number;
  per_second_left: number;
  per_flame_left: number;
}

export interface Tuning {
  player_speed: number;
  carry_capacity: number;
  lantern_cost: number;
  lantern_count_night1: number;
  pickup_radius: number;
  interact_radius: number;
  pulse_cost: number;
  pulse_radius: number;
  night1_duration_s: number;
  night2_duration_s: number;
  night3_duration_s: number;
  flames: number;
  invuln_s: number;
  hit_drop_ratio: number;
  pulse_stun_s: number;
  pulse_push_m: number;
  pulse_cooldown_s: number;
  safe_radius: number;
  shade_speed: number;
  shade_hit_radius: number;
  fall_enabled: boolean;
  dash_speed: number;
  dash_duration_s: number;
  dash_cooldown_s: number;
  score: ScoreTuning;
}

export const TUNING: Tuning = contract.tuning;
export const TICK_HZ = 60;

/** Standard numbers from Ticket-02 that are not tuning keys, plus my own choices (marked). */
export const STD = {
  jumpSpeed: 7,
  gravity: 20,
  pickupHeight: 1.5, // max |player feet y - mote ground y|
  hitHeight: 1.5,
  pulseCenterY: 0.8,
  pulsePushTicks: 15,
  shadeSpawnTicks: 60, // "spawning" state
  shadeDetect: 12,
  shadeLose: 18,
  shadeRecoilM: 2,
  shadeRecoilTicks: 60,
  shadeFirstSpawnTick: 300,
  shadeSpawnMinDist: 15,
  evictMaxTicks: 30,
  moteStart: 20,
  moteCap: 30,
  moteSpawnEvery: 240,
  dropTtl: 480,
  dropRingMin: 1.5,
  dropRingMax: 2.5,
  fallY: -10,
  fallWaitTicks: 60,
  drifterSpeed: 7,
  drifterIdleSpeed: 2,
  drifterMax: 2,
  drifterSpawnEvery: 1200,
  drifterChaseCarry: 5,
  drifterChaseDist: 15,
  drifterTouch: 1.2,
  drifterSteal: 3,
  drifterFleeTicks: 240,
  drifterDropTicks: 120,
  charmTicks: 600,
  charmRespawn: 2700,
  charmSpeed: 7.2,
  windEvery: 1800,
  windTicks: 300,
  windSpeed: 2,
  // My choices (not specified by the ticket):
  shadeWanderSpeed: 1.5, // m/s
  shadeHover: 1, // m above the surface below
  drifterHover: 1,
} as const;
