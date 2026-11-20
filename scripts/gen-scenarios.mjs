// Source of truth for tests/scenarios/*. Expectations are computed BY HAND from the rules (see each note).
// Regenerate: node scripts/gen-scenarios.mjs   (never paste program output into an expectation)
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SCEN_DIR } from './scenario-lib.mjs';

const OFF = { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false };
const j = (o) => JSON.stringify(o, null, 2) + '\n';
const ev = (tick, name, data = {}) => ({ tick, name, data });
const snap = (tick, path, equals) => ({ tick, path, equals });
const made = [];
function mk(name, scenario, inputs, expect) {
  const d = join(SCEN_DIR, name);
  rmSync(d, { recursive: true, force: true });
  mkdirSync(d, { recursive: true });
  writeFileSync(join(d, 'scenario.json'), j(scenario));
  if (inputs) writeFileSync(join(d, 'inputs.json'), j(inputs));
  writeFileSync(join(d, 'expect.json'), j(expect));
  made.push(name);
}

// ---------------- Phase 1 behaviours, recomputed with the Ticket-02 standard numbers ----------------
mk('p1-pickup', { ...OFF, motes: [[0, 0, 5]] }, { frames: [{ tick: 0, move: [0, 1] }] }, {
  note: 'v1.1: pickup_radius 1.0 -> picked when z >= 4 (40 steps of 0.1 m) -> tick 40. Score 0: points now come from DEPOSITING (+10/mote), not picking up.',
  args: { seed: 1, ticks: 60 },
  events: [ev(40, 'mote_picked', { carried: 1 })],
  snapshots: [snap(60, 'player.pos', [0, 0, 6]), snap(60, 'score', 0)],
  end: { state: 'playing', ticks: 60, score: 0 },
});
mk('p1-carry-capacity', { ...OFF, player: { carried: 10 }, motes: [[0, 0, 0]] }, null, {
  note: 'carry_capacity 10: a full player does not pick up a mote at their feet; it stays.',
  args: { seed: 1, ticks: 20 },
  no_events: ['mote_picked'],
  snapshots: [snap(20, 'motes_active', 1), snap(20, 'player.carried', 10)],
});
mk('p1-deposit-light', { ...OFF, motes: [], shades: [], player: { pos: [0, 0, 24], carried: 10 } },
  { frames: [{ tick: 0, interact: true }, { tick: 1, interact: false }] }, {
  note: 'v1.1: lantern_cost 10, interact 2 m (player 1 m from L1). 10 deposited -> lit. Score 10*10 + 100 = 200.',
  args: { seed: 1, ticks: 10 },
  events: [ev(1, 'deposit', { lantern_id: 'L1', amount: 10, deposited: 10 }), ev(1, 'lantern_lit', { lantern_id: 'L1' })],
  snapshots: [snap(10, 'lanterns.0.lit', true), snap(10, 'player.carried', 0)],
  end: { state: 'playing', score: 200 },
});
mk('p1-partial-deposit', { ...OFF, motes: [], shades: [], player: { pos: [0, 0, 23], carried: 10 }, lanterns: [{ id: 'L1', deposited: 4 }] },
  { frames: [{ tick: 0, interact: true }] }, {
  note: 'L1 has 4/10; player exactly 2 m away (<= interact 2). Deposit min(10, 6) = 6, keep 4. Score 60 + 100.',
  args: { seed: 1, ticks: 10 },
  events: [ev(1, 'deposit', { lantern_id: 'L1', amount: 6, deposited: 10 }), ev(1, 'lantern_lit', { lantern_id: 'L1' })],
  snapshots: [snap(10, 'player.carried', 4), snap(10, 'score', 160)],
});
mk('p1-held-interact', { ...OFF, motes: [], shades: [], player: { pos: [0, 0, 24], carried: 3 } },
  { frames: [{ tick: 0, interact: true }, { tick: 5, move: [0, 0] }] }, {
  note: 'Interact fires only on false->true; holding does not deposit again. Lantern remembers 3/10.',
  args: { seed: 1, ticks: 30 },
  events: [ev(1, 'deposit', { lantern_id: 'L1', amount: 3, deposited: 3 })],
  no_events: ['lantern_lit'],
  event_count: { deposit: 1 },
});
mk('p1-win', { ...OFF, motes: [], shades: [], player: { pos: [0, 0, 24], carried: 10 },
  lanterns: ['L2', 'L3', 'L4', 'L5'].map((id) => ({ id, lit: true })) },
  { frames: [{ tick: 0, interact: true }] }, {
  note: 'Preset lit lanterns give no score. Tick 1: 10*10 + 100 + floor(299.98)=299 s *2 + 3 flames*50 = 100+100+598+150 = 948. night_start at tick 1.',
  args: { seed: 1, ticks: 600 },
  events: [ev(1, 'night_start', { night: 1 }), ev(1, 'lantern_lit', { lantern_id: 'L1' }), ev(1, 'game_over', { result: 'won', reason: 'all_lit' })],
  end: { state: 'won', ticks: 1, score: 948 },
});
mk('p1-hit-invuln', { ...OFF, motes: [], player: { carried: 4 }, shades: [{ id: 'S9', pos: [0.5, 1, 0] }] }, null, {
  note: 'Hit at tick 1 (drop floor(4/2)=2), shade recoils, invuln 90 ticks -> hits allowed again at 91 and 181 (shade is back by then). 3 flames -> lost at 181.',
  args: { seed: 1, ticks: 600 },
  events: [
    ev(1, 'player_hit', { by: 'shade', flames: 2, dropped: 2 }),
    ev(91, 'player_hit', { by: 'shade', flames: 1, dropped: 1 }),
    ev(181, 'player_hit', { by: 'shade', flames: 0, dropped: 0 }),
    ev(181, 'game_over', { result: 'lost', reason: 'no_flames' }),
  ],
  event_count: { player_hit: 3 },
  end: { state: 'lost', ticks: 181, score: 0 },
});
mk('p1-dawn', { ...OFF, motes: [], shades: [], time_left_s: 1 }, null, {
  note: '1 s left -> after 60 steps time is 0 -> lost at dawn.',
  args: { seed: 1, ticks: 100 },
  events: [ev(60, 'game_over', { result: 'lost', reason: 'dawn' })],
  snapshots: [snap(30, 'time_left_s', 0.5)],
  end: { state: 'lost', ticks: 60, score: 0 },
});
mk('p1-pulse-stun', { ...OFF, motes: [], player: { carried: 3 }, shades: [{ id: 'S1', pos: [4, 1, 0] }] },
  { frames: [{ tick: 0, pulse: true }, { tick: 1, pulse: false }] }, {
  note: 'v1.1: cost 3, radius 5 (3D from feet+0.8: |(4,0.2,0)| = 4.005). Stun 120 ticks (ticks 1..120), push 4 m over 15 ticks (4/15 per tick): x=4+10*4/15=6.667 at tick 10, 8 at tick 20. +5 score.',
  args: { seed: 1, ticks: 200 },
  events: [ev(1, 'pulse', { stunned_ids: ['S1'] })],
  no_events: ['player_hit'],
  snapshots: [
    snap(10, 'shades.0.state', 'stunned'),
    snap(10, 'shades.0.pos', [6.667, 1, 0]),
    snap(20, 'shades.0.pos', [8, 1, 0]),
    snap(10, 'player.carried', 0),
    snap(120, 'shades.0.state', 'stunned'),
    snap(130, 'shades.0.state', 'chase'),
  ],
  end: { score: 5 },
});
mk('p1-pulse-no-light', { ...OFF, motes: [], player: { carried: 2 }, shades: [{ pos: [5, 1, 0] }] },
  { frames: [{ tick: 0, pulse: true }] }, {
  note: 'pulse_cost 3 but only 2 carried: no pulse, no event. The shade (5 m <= 12) chases.',
  args: { seed: 1, ticks: 20 },
  no_events: ['pulse'],
  snapshots: [snap(20, 'player.carried', 2), snap(20, 'shades.0.state', 'chase')],
});
mk('p1-pulse-cooldown', { ...OFF, motes: [], shades: [], player: { carried: 9 } },
  { frames: [{ tick: 0, pulse: true }, { tick: 1, pulse: false }, { tick: 60, pulse: true }, { tick: 61, pulse: false }, { tick: 178, pulse: true }, { tick: 179, pulse: false }, { tick: 180, pulse: true }] }, {
  note: 'Cooldown 3 s = 180 ticks from the pulse at tick 1 -> ready at tick 181. Presses landing on ticks 61 and 179 are ignored; tick 181 works.',
  args: { seed: 1, ticks: 200 },
  events: [ev(1, 'pulse', { stunned_ids: [] }), ev(181, 'pulse', { stunned_ids: [] })],
  event_count: { pulse: 2 },
  snapshots: [snap(200, 'player.carried', 3), snap(10, 'player.pulse_cd_s', 2.85)],
});
mk('p1-safe-radius', { ...OFF, motes: [], player: { pos: [0, 0, 25] }, lanterns: [{ id: 'L1', lit: true }], shades: [{ id: 'S1', pos: [0, 1, 15] }] }, null, {
  note: 'Player at lit L1. The shade (10 m away -> chase) is held at the 6 m edge: z = 19; never hits.',
  args: { seed: 1, ticks: 600 },
  no_events: ['player_hit'],
  snapshots: [snap(600, 'shades.0.pos', [0, 1, 19])],
});
mk('p1-camera-yaw', { ...OFF, motes: [], shades: [] }, { frames: [{ tick: 0, move: [0, 1], cam_yaw_deg: 90 }] }, {
  note: 'theta = 90: x = 0*cos + 1*sin = 1, z = 0 -> +X at 0.1 m/tick.',
  args: { seed: 1, ticks: 10 },
  snapshots: [snap(10, 'player.pos', [1, 0, 0])],
});
mk('p1-move-normalize', { ...OFF, motes: [], shades: [] }, { frames: [{ tick: 0, move: [1, 1] }] }, {
  note: '[1,1] normalized: 10 ticks * 0.1 / sqrt2 = 0.707 per axis.',
  args: { seed: 1, ticks: 10 },
  snapshots: [snap(10, 'player.pos', [0.707, 0, 0.707]), snap(10, 'player.vel', [4.243, 0, 4.243])],
});
mk('p1-jump', { ...OFF, motes: [], shades: [] }, { frames: [{ tick: 0, jump: true }] }, {
  note: 'v1.1: jump 7 m/s, gravity 20: y after 10 ticks = (70 - 10*11/6)/60 = 0.861; airtime ~0.7 s -> grounded again by tick 50.',
  args: { seed: 1, ticks: 50 },
  snapshots: [snap(10, 'player.pos', [0, 0.861, 0]), snap(10, 'player.grounded', false), snap(50, 'player.pos', [0, 0, 0]), snap(50, 'player.grounded', true)],
});
mk('p1-bad-inputs-order', { ...OFF }, { frames: [{ tick: 5, move: [0, 1] }, { tick: 5, move: [0, 0] }] }, {
  note: 'Frame ticks must strictly increase -> exit code 2.', args: { seed: 1, ticks: 10 }, exit_code: 2,
});
mk('p1-bad-scenario-lantern', { ...OFF, lanterns: [{ id: 'L9', lit: true }] }, null, {
  note: 'Unknown lantern id on night 1 -> exit code 2.', args: { seed: 1, ticks: 10 }, exit_code: 2,
});
mk('p1-no-scenario-default', {}, null, {
  note: 'Standard Đêm 1: start (0,0,0), 3 flames, 300 s, 5 lanterns at the standard positions, 20 motes, no shades before tick 300.',
  args: { seed: 7, ticks: 0 },
  snapshots: [
    snap(0, 'player.pos', [0, 0, 0]), snap(0, 'player.flames', 3), snap(0, 'time_left_s', 300), snap(0, 'night', 1),
    snap(0, 'lanterns.length', 5), snap(0, 'lanterns.1.pos', [23.8, 0, 7.7]), snap(0, 'lanterns.3.pos', [-14.7, 0, -20.2]),
    snap(0, 'motes_active', 20), snap(0, 'shades.length', 0),
  ],
  end: { state: 'playing', ticks: 0, score: 0 },
});

// ---------------- Phase 2 features ----------------
mk('p2-fall-respawn', { ...OFF, motes: [], shades: [], player: { pos: [39.95, 0, 0], carried: 4 } },
  { frames: [{ tick: 0, move: [1, 0] }, { tick: 30, move: [0, 0] }] }, {
  note: 'Leaves the island (r 40) on tick 1 and falls: y_k = -k(k+1)/360 < -10 first at k = 60 -> player_hit fall at tick 60 (-1 flame, lose all 4). Wait 60 ticks -> respawn at (0,0,0) on tick 120 with 90 ticks invuln.',
  args: { seed: 1, ticks: 130 },
  events: [ev(60, 'player_hit', { by: 'fall', flames: 2, dropped: 0, lost: 4 })],
  event_count: { player_hit: 1 },
  snapshots: [snap(90, 'player.carried', 0), snap(120, 'player.pos', [0, 0, 0]), snap(120, 'player.invuln', true), snap(130, 'player.flames', 2)],
});
mk('p2-fall-last-flame', { ...OFF, motes: [], shades: [], player: { pos: [39.95, 0, 0], flames: 1 } }, { frames: [{ tick: 0, move: [1, 0] }] }, {
  note: 'Falling with the last flame loses immediately (no respawn).',
  args: { seed: 1, ticks: 300 },
  events: [ev(60, 'player_hit', { by: 'fall', flames: 0, dropped: 0, lost: 0 }), ev(60, 'game_over', { result: 'lost', reason: 'no_flames' })],
  end: { state: 'lost', ticks: 60 },
});
mk('p2-dash', { ...OFF, motes: [], shades: [] },
  { frames: [{ tick: 0, dash: true }, { tick: 1, dash: false }, { tick: 30, dash: true }, { tick: 31, dash: false }, { tick: 90, dash: true }] }, {
  note: 'Standing still -> dash along facing (+Z): 12 ticks * 14/60 = 2.8 m. Cooldown 90 ticks from dash start (tick 1): press on tick 31 ignored, tick 91 works.',
  args: { seed: 1, ticks: 100 },
  events: [ev(1, 'dash'), ev(91, 'dash')],
  event_count: { dash: 2 },
  snapshots: [snap(20, 'player.pos', [0, 0, 2.8]), snap(20, 'player.dash_cd_s', 1.183)],
});
mk('p2-dash-air', { ...OFF, motes: [], shades: [] },
  { frames: [{ tick: 0, jump: true }, { tick: 1, jump: false }, { tick: 10, dash: true }] }, {
  note: 'Jump, then dash on tick 11 at y = 0.861: altitude is held for the 12 dash ticks (11..22).',
  args: { seed: 1, ticks: 30, snapshot_every: 1 },
  events: [ev(11, 'dash')],
  snapshots: [snap(11, 'player.pos.1', 0.861), snap(22, 'player.pos.1', 0.861), snap(22, 'player.pos.2', 2.8)],
});
mk('p2-shade-spawn', { random_motes: false, random_drifters: false }, null, {
  note: 'Đêm 1 schedule: 2 shades at tick 300 (S1, S2), then 1 per 480 ticks (tick 780 -> S3). New shades are "spawning" for 60 ticks, then "wander" (spawn points are >= 15 m away).',
  args: { seed: 3, ticks: 800 },
  events: [ev(300, 'shade_spawned', { id: 'S1' }), ev(300, 'shade_spawned', { id: 'S2' }), ev(780, 'shade_spawned', { id: 'S3' })],
  snapshots: [snap(290, 'shades.length', 0), snap(300, 'shades.0.state', 'spawning'), snap(350, 'shades.1.state', 'spawning'), snap(360, 'shades.0.state', 'wander')],
  xz_dist: [{ tick: 300, path: 'shades.0.pos', to: [0, 0, 0], min: 36.99, max: 37.01 }],
});
mk('p2-shade-detect-lose', { ...OFF, motes: [], shades: [{ id: 'S1', pos: [-11, 1, 0] }] }, { frames: [{ tick: 0, move: [1, 0] }] }, {
  note: 'Shade 11 m away (<= 12) -> chase. Mây runs +X at 6 m/s, shade 4 m/s: gap 11 + k/30 > 18 after k > 210 -> wander.',
  args: { seed: 1, ticks: 230 },
  snapshots: [snap(10, 'shades.0.state', 'chase'), snap(200, 'shades.0.state', 'chase'), snap(220, 'shades.0.state', 'wander')],
});
mk('p2-shade-recoil', { ...OFF, motes: [], shades: [{ id: 'S1', pos: [0.5, 1, 0] }] }, null, {
  note: 'After hitting, the shade recoils 2 m over 60 ticks: x = 0.4333 + 59 * 2/60 = 2.4 at tick 60, then chases again.',
  args: { seed: 1, ticks: 70 },
  events: [ev(1, 'player_hit', { by: 'shade', flames: 2, dropped: 0 })],
  snapshots: [snap(30, 'shades.0.state', 'recoil'), snap(60, 'shades.0.pos', [2.4, 1, 0]), snap(70, 'shades.0.state', 'chase')],
});
mk('p2-drop-ttl', { ...OFF, motes: [], player: { carried: 6, flames: 9 }, shades: [{ id: 'S1', pos: [0.5, 1, 0] }] }, null, {
  note: 'Hits at 1 (drop 3), 91 (drop 1), 181 (drop 1), 271 (drop 0). Dropped motes land 1.5-2.5 m away and live 480 ticks: the first 3 vanish at tick 481.',
  args: { seed: 1, ticks: 500 },
  snapshots: [snap(10, 'motes_active', 3), snap(10, 'motes.0.kind', 'dropped'), snap(10, 'motes.0.ttl_s', 7.85), snap(470, 'motes_active', 5), snap(490, 'motes_active', 2)],
  xz_dist: [{ tick: 10, path: 'motes.0.pos', to: [0, 0, 0], min: 1.5, max: 2.5 }, { tick: 10, path: 'motes.2.pos', to: [0, 0, 0], min: 1.5, max: 2.5 }],
});
mk('p2-safe-evict', { ...OFF, motes: [], player: { pos: [0, 0, 24], carried: 10 }, shades: [{ id: 'S1', pos: [2, 1, 22] }] },
  { frames: [{ tick: 0, interact: true }] }, {
  note: 'Shade is 3.6 m from L1 when it is lit: pushed out to the 6 m edge within 30 ticks, harmless meanwhile, then held at the edge -> never hits.',
  args: { seed: 1, ticks: 200 },
  events: [ev(1, 'lantern_lit', { lantern_id: 'L1' })],
  no_events: ['player_hit'],
  xz_dist: [
    { tick: 10, path: 'shades.0.pos', to: [0, 0, 25], max: 5.99 },
    { tick: 30, path: 'shades.0.pos', to: [0, 0, 25], min: 5.999 },
    { tick: 200, path: 'shades.0.pos', to: [0, 0, 25], min: 5.999 },
  ],
});
mk('p2-lantern-tie', { ...OFF, motes: [], shades: [], player: { carried: 3 }, lanterns: [{ id: 'L2', pos: [0, 0, 1] }, { id: 'L1', pos: [0, 0, -1] }] },
  { frames: [{ tick: 0, interact: true }] }, {
  note: 'Two unlit lanterns at the same distance -> the smaller id (L1) gets the deposit.',
  args: { seed: 1, ticks: 5 },
  events: [ev(1, 'deposit', { lantern_id: 'L1', amount: 3, deposited: 3 })],
});
mk('p2-pause', { ...OFF, motes: [], shades: [] }, { frames: [{ tick: 0, pause: true }, { tick: 1, pause: false }, { tick: 30, pause: true }] }, {
  note: 'Pause on tick 1: tick keeps counting but sim_tick/time freeze; resume on tick 31 (sim runs again).',
  args: { seed: 1, ticks: 40 },
  events: [ev(1, 'night_start', { night: 1 }), ev(1, 'paused'), ev(31, 'resumed')],
  snapshots: [snap(10, 'state', 'paused'), snap(10, 'sim_tick', 0), snap(10, 'time_left_s', 300), snap(40, 'state', 'playing'), snap(40, 'sim_tick', 10), snap(40, 'time_left_s', 299.833)],
  end: { ticks: 40, state: 'playing' },
});
mk('p2-mote-schedule', { random_shades: false, random_drifters: false }, null, {
  note: 'Đêm 1 has 24 mote points: 20 at start, +1 at ticks 240, 480, 720, 960 -> 24, then no free point -> stays 24.',
  args: { seed: 5, ticks: 1200 },
  snapshots: [snap(0, 'motes_active', 20), snap(240, 'motes_active', 21), snap(960, 'motes_active', 24), snap(1200, 'motes_active', 24), snap(0, 'motes.0.kind', 'random')],
});
mk('p2-night2-start', {}, null, {
  note: 'Đêm 2 – Đảo Cau: start (0,0,0), 330 s, lanterns L1..L6 at standard positions, charm C1 available.',
  args: { seed: 1, ticks: 0, night: 2 },
  snapshots: [snap(0, 'night', 2), snap(0, 'time_left_s', 330), snap(0, 'lanterns.length', 6), snap(0, 'lanterns.4.pos', [87, 0, -10]), snap(0, 'charms.0.id', 'C1'), snap(0, 'charms.0.available', true)],
});
mk('p2-night2-pad', { ...OFF, motes: [], shades: [], player: { pos: [20, 0, 18] } }, null, {
  note: 'Standing on the pad at (20,0,18) launches Mây (vy 14, 24 m/s towards B). ~1.4 s flight lands on island B (within 28 m of (70,0,0)), no fall.',
  args: { seed: 1, ticks: 120, night: 2 },
  no_events: ['player_hit'],
  snapshots: [snap(10, 'player.grounded', false), snap(120, 'player.grounded', true), snap(120, 'player.pos.1', 0)],
  xz_dist: [{ tick: 120, path: 'player.pos', to: [70, 0, 0], max: 28 }],
});
mk('p2-charm', { ...OFF, motes: [], shades: [], player: { pos: [34.5, 0, 0] } },
  { frames: [{ tick: 20, move: [1, 0], dash: true }, { tick: 21, dash: false }, { tick: 40, dash: true }, { tick: 41, dash: false }] }, {
  note: 'Charm C1 at (35,0,0) within 1 m -> picked tick 1 (600 ticks). Speed 7.2 m/s; dash has no cooldown (dashes on 21 and 41). Respawn after 2700 ticks.',
  args: { seed: 1, ticks: 70, night: 2 },
  events: [ev(1, 'charm_picked', { charm_id: 'C1', charm_ticks: 600 }), ev(21, 'dash'), ev(41, 'dash')],
  event_count: { dash: 2 },
  snapshots: [snap(70, 'player.vel', [7.2, 0, 0]), snap(70, 'player.charm_s', 8.85), snap(10, 'charms.0.available', false), snap(10, 'charms.0.respawn_s', 44.85)],
});
mk('p2-drifter-steal', { ...OFF, motes: [], shades: [], player: { carried: 6 }, drifters: [{ id: 'D1', pos: [3, 1, 0] }] }, null, {
  note: 'Carrying 6 (>= 5) within 15 m -> chase at 7 m/s: x = 3 - 16*7/60 = 1.133 <= 1.2 on tick 16 -> steals 3. Flees 240 ticks -> removed at tick 256.',
  args: { seed: 1, ticks: 300, night: 2 },
  events: [ev(16, 'drifter_steal', { drifter_id: 'D1', amount: 3, carried: 3 })],
  snapshots: [snap(10, 'drifters.0.state', 'chase'), snap(20, 'drifters.0.state', 'flee'), snap(20, 'drifters.0.stolen', 3), snap(260, 'drifters.0.state', 'removed')],
});
mk('p2-drifter-pulse-chase', { ...OFF, motes: [], shades: [], player: { carried: 6 }, drifters: [{ id: 'D1', pos: [4, 1, 0], state: 'chase' }] },
  { frames: [{ tick: 0, pulse: true }] }, {
  note: 'Pulse hits a chasing drifter (4.005 m) -> it flees without stealing.',
  args: { seed: 1, ticks: 60, night: 2 },
  events: [ev(1, 'pulse', { stunned_ids: [] })],
  no_events: ['drifter_steal'],
  snapshots: [snap(10, 'drifters.0.state', 'flee'), snap(10, 'drifters.0.stolen', 0), snap(10, 'player.carried', 3)],
});
mk('p2-drifter-pulse-drop', { ...OFF, motes: [], shades: [], player: { carried: 3 }, drifters: [{ id: 'D1', pos: [3, 1, 0], state: 'flee', stolen: 3 }] },
  { frames: [{ tick: 0, pulse: true }] }, {
  note: 'Pulse hits a fleeing drifter carrying 3 -> drops them as dropped motes, disappears after 120 ticks.',
  args: { seed: 1, ticks: 130, night: 2 },
  events: [ev(1, 'drifter_drop', { drifter_id: 'D1', amount: 3 })],
  snapshots: [snap(10, 'motes_active', 3), snap(10, 'motes.0.kind', 'dropped'), snap(10, 'drifters.0.stolen', 0), snap(130, 'drifters.0.state', 'removed')],
});
mk('p2-drifter-spawn', { random_motes: false, random_shades: false }, null, {
  note: 'Đêm 2: drifters D1 at tick 1200 and D2 at tick 2400 (idle), never more than 2.',
  args: { seed: 2, ticks: 3600, night: 2 },
  snapshots: [snap(1190, 'drifters.length', 0), snap(1200, 'drifters.0.id', 'D1'), snap(1200, 'drifters.0.state', 'idle'), snap(2400, 'drifters.1.id', 'D2'), snap(3600, 'drifters.length', 2)],
});
mk('p2-night3-start', {}, null, {
  note: 'Đêm 3 – Đảo Chuông: start (0,0,-15), 360 s, 7 lanterns (L1 on tier 2 at y=6), 2 charms.',
  args: { seed: 1, ticks: 0, night: 3 },
  snapshots: [snap(0, 'player.pos', [0, 0, -15]), snap(0, 'time_left_s', 360), snap(0, 'lanterns.length', 7), snap(0, 'lanterns.0.pos', [0, 6, 6]), snap(0, 'charms.length', 2)],
});
mk('p2-night3-wall', { ...OFF, motes: [], shades: [] }, { frames: [{ tick: 0, move: [0, 1] }] }, {
  note: 'Walking +Z from (0,0,-15) hits the vertical wall of tier 2 (r = 8, y = 6): Mây stops at r ~ 8 and stays at y = 0.',
  args: { seed: 1, ticks: 200, night: 3 },
  snapshots: [snap(200, 'player.pos.1', 0)],
  xz_dist: [{ tick: 200, path: 'player.pos', to: [0, 0, 0], min: 8, max: 8.11 }],
});
mk('p2-night3-ramp', { ...OFF, motes: [], shades: [], player: { pos: [26.847, 0, 15.5] } }, { frames: [{ tick: 0, move: [-0.866, -0.5] }] }, {
  note: 'Ramp at 30 deg: start at s = 31, walk inward 0.1 m/tick. s = 24 (top, y = 3) after 70 ticks; at tick 110 s = 20 on tier 1 (y = 3).',
  args: { seed: 1, ticks: 110, night: 3 },
  snapshots: [snap(40, 'player.pos.1', 1.5), snap(110, 'player.pos.1', 3), snap(110, 'player.grounded', true)],
});
mk('p2-night3-pad', { ...OFF, motes: [], shades: [], player: { pos: [0, 3, 13] } }, null, {
  note: 'Pad (0,3,13): vy 12, 8 m/s towards -Z. Lands at t ~ 0.845 s, z ~ 6.2 (r <= 8) on tier 2 (y = 6).',
  args: { seed: 1, ticks: 90, night: 3 },
  no_events: ['player_hit'],
  snapshots: [snap(90, 'player.pos.1', 6), snap(90, 'player.grounded', true)],
  xz_dist: [{ tick: 90, path: 'player.pos', to: [0, 0, 0], min: 2, max: 8 }],
});
mk('p2-night3-wind', { random_motes: false, random_shades: false, random_drifters: false }, null, {
  note: 'Đêm 3 gust: starts at sim tick 1800 for 300 ticks (inactive again at 2100), pushes 2 m/s (~10 m unless a wall stops it).',
  args: { seed: 4, ticks: 2110, night: 3 },
  snapshots: [snap(1790, 'wind.active', false), snap(1800, 'wind.active', true), snap(2090, 'wind.active', true), snap(2100, 'wind.active', false)],
  xz_dist: [{ tick: 2100, path: 'player.pos', to: [0, 0, -15], min: 6.5, max: 10.01 }],
});
mk('p2-pickup-height', { ...OFF, shades: [], motes: [[0, 2, 0.5], [0.3, 1.5, 0]] }, null, {
  note: 'Pickup needs XZ <= 1.0 AND |feet y - mote ground y| <= 1.5: the mote 2 m up is not picked, the one 1.5 m up is (tick 1).',
  args: { seed: 1, ticks: 10 },
  events: [ev(1, 'mote_picked', { carried: 1 })],
  event_count: { mote_picked: 1 },
  snapshots: [snap(10, 'motes_active', 1), snap(10, 'motes.0.pos', [0, 2, 0.5])],
});
mk('p2-bad-night', { ...OFF }, null, { note: '--night 4 is not a night -> non-zero exit (usage error = 1).', args: { seed: 1, ticks: 5, night: 4 }, exit_code: 1 });
mk('p2-bad-shade-state', { ...OFF, shades: [{ pos: [5, 1, 0], state: 'sleeping' }] }, null, {
  note: 'v1.1 shade states are spawning|wander|chase|recoil|stunned -> unknown state = malformed scenario -> exit 2.',
  args: { seed: 1, ticks: 5 },
  exit_code: 2,
});
console.log(`generated ${made.length} scenarios`);
