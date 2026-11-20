// <headless_cmd> --seed <int> --night 1|2|3 [--scenario f] [--inputs f] --ticks <int> --out f [--snapshot-every n]
import { readFileSync, writeFileSync } from "node:fs";
import { runHeadless, toJsonl } from "../core/run";
import { ScenarioError } from "../core/sim";

class UsageError extends Error {}

function parseArgs(argv: string[]) {
  const a: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith("--")) throw new UsageError(`unexpected argument ${k}`);
    const v = argv[i + 1];
    if (v === undefined || v.startsWith("--"))
      throw new UsageError(`missing value for ${k}`);
    a[k.slice(2)] = v;
    i++;
  }
  return a;
}

function int(
  a: Record<string, string>,
  k: string,
  required: boolean,
  min: number,
): number | undefined {
  if (!(k in a)) {
    if (required) throw new UsageError(`--${k} is required`);
    return undefined;
  }
  if (!/^-?\d+$/.test(a[k])) throw new UsageError(`--${k} must be an integer`);
  const n = Number(a[k]);
  if (n < min) throw new UsageError(`--${k} must be >= ${min}`);
  return n;
}

function readJson(path: string, what: string): unknown {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (e) {
    throw new ScenarioError(
      `cannot read ${what} file ${path}: ${(e as Error).message}`,
    );
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new ScenarioError(
      `${what} file is not valid JSON: ${(e as Error).message}`,
    );
  }
}

function main(): number {
  try {
    const a = parseArgs(process.argv.slice(2));
    const seed = int(a, "seed", true, -Infinity)!;
    const night = int(a, "night", true, 1)!;
    if (night > 3) throw new UsageError(`night ${night} is not available (1, 2, 3)`);
    const ticks = int(a, "ticks", true, 0)!;
    const every = int(a, "snapshot-every", false, 1) ?? 10;
    if (!a.out) throw new UsageError("--out is required");
    const scenario = a.scenario ? readJson(a.scenario, "scenario") : undefined;
    const inputs = a.inputs ? readJson(a.inputs, "inputs") : undefined;
    const { lines } = runHeadless({
      seed,
      night,
      ticks,
      snapshotEvery: every,
      scenario,
      inputs,
    });
    writeFileSync(a.out, toJsonl(lines));
    return 0;
  } catch (e) {
    process.stderr.write(`error: ${(e as Error).message}\n`);
    return e instanceof ScenarioError ? 2 : 1;
  }
}

process.exitCode = main();
