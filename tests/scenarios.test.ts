// End-to-end: every tests/scenarios/<name>/ is run through the real headless CLI.
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkScenario,
  listScenarios,
  runCli,
} from "../scripts/scenario-lib.mjs";

const out = mkdtempSync(join(tmpdir(), "ddl-"));

describe("headless scenarios (contract v1.0)", () => {
  for (const name of listScenarios() as string[]) {
    it(name, () => {
      const { fails } = checkScenario(name, out);
      expect(fails).toEqual([]);
    });
  }
});

describe("determinism", () => {
  it("same seed, same inputs -> identical output (default level, 3600 ticks, with movement and pulses)", () => {
    const inputs = join(out, "det-inputs.json");
    writeFileSync(
      inputs,
      JSON.stringify({
        frames: [
          { tick: 0, move: [0.3, 1], cam_yaw_deg: 15 },
          { tick: 400, move: [-1, 0], pulse: true },
          { tick: 401, pulse: false },
          { tick: 900, move: [0, -1], cam_yaw_deg: 200, jump: true },
          { tick: 901, jump: false },
        ],
      }),
    );
    const a = runCli({
      seed: 42,
      ticks: 3600,
      inputs,
      outFile: join(out, "det-a.jsonl"),
    });
    const b = runCli({
      seed: 42,
      ticks: 3600,
      inputs,
      outFile: join(out, "det-b.jsonl"),
    });
    expect(a.code).toBe(0);
    expect(a.text.length).toBeGreaterThan(1000);
    expect(a.text).toBe(b.text);
  });

  it("different seeds give different random layouts", () => {
    const a = runCli({ seed: 1, ticks: 0, outFile: join(out, "seed1.jsonl") });
    const b = runCli({ seed: 2, ticks: 0, outFile: join(out, "seed2.jsonl") });
    expect(a.text).not.toBe(b.text);
  });
});

describe("CLI errors", () => {
  it("missing --seed -> non-zero exit, message on stderr", () => {
    const r = runCli({
      seed: "",
      ticks: 5,
      outFile: join(out, "x.jsonl"),
    } as never);
    expect(r.code).not.toBe(0);
    expect(r.stderr).toMatch(/error/);
  });
  it("inputs file that is not JSON -> exit 2", () => {
    const bad = join(out, "bad.json");
    writeFileSync(bad, "{not json");
    expect(
      runCli({ seed: 1, ticks: 5, inputs: bad, outFile: join(out, "y.jsonl") })
        .code,
    ).toBe(2);
  });
  it("move component outside [-1,1] -> exit 2", () => {
    const bad = join(out, "bad2.json");
    writeFileSync(bad, JSON.stringify({ frames: [{ tick: 0, move: [2, 0] }] }));
    expect(
      runCli({ seed: 1, ticks: 5, inputs: bad, outFile: join(out, "z.jsonl") })
        .code,
    ).toBe(2);
  });
});
