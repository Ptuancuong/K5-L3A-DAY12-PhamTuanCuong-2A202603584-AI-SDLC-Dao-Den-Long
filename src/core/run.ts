// Headless run loop (contract §B/§E), independent of the file system.
import { InputTrack, parseInputs } from "./inputs";
import { createWorld, snapshot, step, type World } from "./sim";

export interface RunOptions {
  seed: number;
  ticks: number;
  snapshotEvery?: number;
  scenario?: unknown;
  inputs?: unknown;
}

export interface RunResult {
  lines: unknown[];
  world: World;
}

export function runHeadless(o: RunOptions): RunResult {
  const every = o.snapshotEvery ?? 10;
  const w = createWorld({ seed: o.seed, scenario: o.scenario });
  const track = new InputTrack(
    o.inputs === undefined ? [] : parseInputs(o.inputs),
  );
  const lines: unknown[] = [snapshot(w)];
  for (let k = 0; k < o.ticks && w.state === "playing"; k++) {
    for (const e of step(w, track.at(k))) lines.push(e);
    if (w.tick % every === 0) lines.push(snapshot(w));
  }
  lines.push({ type: "end", ticks: w.tick, state: w.state, score: w.score });
  return { lines, world: w };
}

export const toJsonl = (lines: unknown[]) =>
  lines.map((l) => JSON.stringify(l)).join("\n") + "\n";
