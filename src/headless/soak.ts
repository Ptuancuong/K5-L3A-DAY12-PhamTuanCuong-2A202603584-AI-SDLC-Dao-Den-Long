// soak_cmd: node --expose-gc build/soak.mjs --seed 7 --nights 10 --out soak.json
// Plays N nights in ONE process (1 -> 2 -> 3 -> 1 ...), night i uses seed + i, random seeded input.
import { writeFileSync } from "node:fs";
import { playSoakNight, type SoakNightResult } from "../core/soak";

function arg(name: string, dflt?: string): string {
  const i = process.argv.indexOf(`--${name}`);
  const v = i >= 0 ? process.argv[i + 1] : dflt;
  if (v === undefined) throw new Error(`--${name} is required`);
  return v;
}
const gc = (globalThis as { gc?: () => void }).gc;
const mb = (b: number) => Math.round((b / 1048576) * 10) / 10;
let heapStart: number | null = null;
const rssMb = () => {
  gc?.();
  return mb(process.memoryUsage().rss);
};

function main(): number {
  let seed: number, nights: number, out: string;
  try {
    seed = Number(arg("seed", "7"));
    nights = Number(arg("nights", "10"));
    out = arg("out");
    if (!Number.isInteger(seed) || !Number.isInteger(nights) || nights < 1)
      throw new Error("--seed and --nights must be integers, nights >= 1");
  } catch (e) {
    process.stderr.write(`error: ${(e as Error).message}\n`);
    return 1;
  }
  const t0 = performance.now();
  let crashes = 0;
  let memStart: number | null = null;
  const results: string[] = [];
  const detail: (SoakNightResult | { index: number; error: string })[] = [];
  for (let i = 1; i <= nights; i++) {
    try {
      const r = playSoakNight(i, seed, () => {
        if (memStart === null) {
          memStart = rssMb(); // after the first night has loaded
          heapStart = mb(process.memoryUsage().heapUsed);
        }
      });
      results.push(r.result);
      detail.push(r);
    } catch (e) {
      crashes++;
      results.push("crash");
      detail.push({ index: i, error: String((e as Error).stack ?? e) });
    }
  }
  // Reset after the last night: every World above is out of scope; collect, then read RSS.
  const memEnd = rssMb();
  const report = {
    nights,
    crashes,
    results,
    mem_start_mb: memStart,
    mem_end_mb: memEnd,
    // live JS heap (after gc) at the same two moments: a leak of game state would show here
    heap_used_start_mb: heapStart,
    heap_used_end_mb: mb(process.memoryUsage().heapUsed),
    duration_s: Math.round((performance.now() - t0) / 100) / 10,
    seed,
    gc_exposed: gc !== undefined,
    node: process.version,
    detail,
  };
  writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
  const ok = crashes === 0 && memStart !== null && memEnd <= 1.2 * memStart;
  process.stdout.write(
    `soak: ${results.join(",")} crashes=${crashes} mem ${memStart} -> ${memEnd} MB ${ok ? "PASS" : "FAIL"}\n`,
  );
  return 0;
}

process.exitCode = main();
