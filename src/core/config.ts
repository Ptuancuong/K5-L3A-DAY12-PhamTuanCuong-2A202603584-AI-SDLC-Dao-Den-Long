// Tuning comes straight from game.contract.json so the declared numbers
// can never drift from the numbers the game actually uses.
import contract from "../../game.contract.json";

export interface ScoreTuning {
  per_mote: number;
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
  score: ScoreTuning;
}

export const TUNING: Tuning = contract.tuning;

export const TICK_HZ = 60;

/** Values not covered by the contract (documented in docs/notes/assumptions.md). */
export const WORLD = {
  islandRadius: 40,
  lanternRingRadius: 25,
  jumpSpeed: 6, // m/s upward
  gravity: 20, // m/s^2
  initialMotes: 30,
  maxMotes: 30,
  moteRespawnTicks: 60, // one new mote per second while below maxMotes
  moteMinR: 4,
  moteMaxR: 38,
  initialShades: 2,
  maxShades: 6,
  shadeSpawnTicks: 30 * 60, // a new shade every 30 s
  shadeSpawnMinDist: 20, // from the player
  shadeSpawnMinR: 28,
  shadeSpawnMaxR: 38,
  shadeHoverY: 1,
} as const;
