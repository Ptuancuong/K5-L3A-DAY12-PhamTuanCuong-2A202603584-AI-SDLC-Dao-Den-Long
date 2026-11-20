// Shared by tests/scenarios.test.ts and scripts/verify.mjs.
// Runs a scenario directory through the REAL headless CLI (build/headless.mjs) and checks expect.json.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SCEN_DIR = join(ROOT, 'tests', 'scenarios');
export const CLI = join(ROOT, 'build', 'headless.mjs');

export function listScenarios() {
  return readdirSync(SCEN_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(SCEN_DIR, d.name, 'expect.json')))
    .map((d) => d.name)
    .sort();
}

/** Runs the CLI. Returns { code, stderr, lines, outFile }. */
export function runCli({ seed, night = 1, ticks, scenario, inputs, snapshotEvery, outFile }) {
  mkdirSync(dirname(outFile), { recursive: true });
  const args = [CLI, '--seed', String(seed), '--night', String(night), '--ticks', String(ticks), '--out', outFile];
  if (scenario) args.push('--scenario', scenario);
  if (inputs) args.push('--inputs', inputs);
  if (snapshotEvery) args.push('--snapshot-every', String(snapshotEvery));
  const r = spawnSync(process.execPath, args, { encoding: 'utf8' });
  let lines = [];
  if (r.status === 0) lines = readFileSync(outFile, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  return { code: r.status, stderr: r.stderr, lines, outFile, text: r.status === 0 ? readFileSync(outFile, 'utf8') : '' };
}

const get = (o, path) => path.split('.').reduce((v, k) => (v == null ? undefined : v[k]), o);

/** Returns a list of failure messages (empty = pass). */
export function checkScenario(name, outDir) {
  const dir = join(SCEN_DIR, name);
  const exp = JSON.parse(readFileSync(join(dir, 'expect.json'), 'utf8'));
  const sc = join(dir, 'scenario.json');
  const inp = join(dir, 'inputs.json');
  const r = runCli({
    seed: exp.args.seed,
    ticks: exp.args.ticks,
    snapshotEvery: exp.args.snapshot_every,
    night: exp.args.night ?? 1,
    scenario: existsSync(sc) ? sc : undefined,
    inputs: existsSync(inp) ? inp : undefined,
    outFile: join(outDir, `${name}.jsonl`),
  });
  const fails = [];
  const wantCode = exp.exit_code ?? 0;
  if (r.code !== wantCode) fails.push(`exit code ${r.code}, expected ${wantCode} (${r.stderr.trim()})`);
  if (wantCode !== 0 || r.code !== 0) return { fails, exp, run: r };

  const lines = r.lines;
  const events = lines.filter((l) => l.type === 'event');
  const snaps = new Map(lines.filter((l) => l.type === 'snapshot').map((s) => [s.tick, s]));
  const end = lines[lines.length - 1];
  if (end?.type !== 'end') fails.push('last line is not an end record');

  for (const e of exp.events ?? []) {
    if (!events.some((x) => x.tick === e.tick && x.name === e.name && isDeepStrictEqual(x.data, e.data))) {
      const got = events.filter((x) => x.name === e.name).map((x) => `${x.tick}:${JSON.stringify(x.data)}`);
      fails.push(`missing event ${e.tick} ${e.name} ${JSON.stringify(e.data)}; got [${got.join(', ')}]`);
    }
  }
  for (const n of exp.no_events ?? []) {
    if (events.some((x) => x.name === n)) fails.push(`unexpected event ${n}`);
  }
  for (const [n, c] of Object.entries(exp.event_count ?? {})) {
    const got = events.filter((x) => x.name === n).length;
    if (got !== c) fails.push(`event ${n} count ${got}, expected ${c}`);
  }
  for (const s of exp.snapshots ?? []) {
    const snap = snaps.get(s.tick);
    if (!snap) fails.push(`no snapshot at tick ${s.tick}`);
    else if (!isDeepStrictEqual(get(snap, s.path), s.equals))
      fails.push(`tick ${s.tick} ${s.path} = ${JSON.stringify(get(snap, s.path))}, expected ${JSON.stringify(s.equals)}`);
  }
  for (const s of exp.xz_dist ?? []) {
    const v = get(snaps.get(s.tick), s.path);
    const d = Array.isArray(v) ? Math.hypot(v[0] - s.to[0], v[2] - s.to[2]) : NaN;
    if (!(d >= (s.min ?? -Infinity) && d <= (s.max ?? Infinity))) fails.push(`tick ${s.tick} xz-dist(${s.path}, ${JSON.stringify(s.to)}) = ${d}, expected [${s.min ?? '-inf'}, ${s.max ?? 'inf'}]`);
  }
  for (const s of exp.snapshot_gt ?? []) {
    const v = get(snaps.get(s.tick), s.path);
    if (!(typeof v === 'number' && v > s.gt)) fails.push(`tick ${s.tick} ${s.path} = ${v}, expected > ${s.gt}`);
  }
  for (const [k, v] of Object.entries(exp.end ?? {})) {
    if (!isDeepStrictEqual(end?.[k], v)) fails.push(`end.${k} = ${JSON.stringify(end?.[k])}, expected ${JSON.stringify(v)}`);
  }
  return { fails, exp, run: r };
}
