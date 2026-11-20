// Proves the scenarios are not "always pass": change one tuning number at a time, rebuild the headless
// bundle, run every scenario, and record which ones fail. Restores game.contract.json afterwards.
// Usage: node scripts/mutation-check.mjs [phase-N]
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { checkScenario, listScenarios, ROOT } from './scenario-lib.mjs';

const phase = process.argv[2] ?? 'phase-3';
const file = join(ROOT, 'game.contract.json');
const original = readFileSync(file, 'utf8');
const MUTATIONS = [
  ['pickup_radius', 1.2],
  ['lantern_cost', 9],
  ['pulse_stun_s', 2.5],
  ['pulse_cost', 2],
  ['invuln_s', 1],
  ['dash_speed', 13],
  ['dash_cooldown_s', 1],
  ['safe_radius', 5],
  ['shade_speed', 5],
  ['fuel_decay_per_s', 2],
  ['relight_cost', 4],
  ['drain_per_s', 4],
  ['low_fuel_threshold', 25],
  ['win_ratio', 0.8],
  ['capacity_max', 18],
];
const build = () => spawnSync('npm', ['run', 'build:headless', '--silent'], { cwd: ROOT, shell: true });
const lines = [`# Mutation check — ${phase}`, '', '| Mutation | Failing scenarios |', '|---|---|'];
let survived = 0;
try {
  for (const [key, value] of MUTATIONS) {
    const c = JSON.parse(original);
    c.tuning[key] = value;
    writeFileSync(file, JSON.stringify(c, null, 2));
    build();
    const failed = listScenarios().filter((n) => checkScenario(n, join(tmpdir(), 'ddl-mut')).fails.length > 0);
    if (!failed.length) survived++;
    lines.push(`| \`${key}\`: ${JSON.parse(original).tuning[key]} → ${value} | ${failed.length ? failed.join(', ') : '**none (mutation survived)**'} |`);
    console.log(key, '->', failed.length, 'failing');
  }
} finally {
  writeFileSync(file, original);
  build();
}
lines.push('', `Mutations survived: ${survived} / ${MUTATIONS.length}`);
mkdirSync(join(ROOT, 'docs', 'proof', phase), { recursive: true });
writeFileSync(join(ROOT, 'docs', 'proof', phase, 'mutation-check.md'), lines.join('\n') + '\n');
process.exit(survived ? 1 : 0);
