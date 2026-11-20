export const ROOT: string;
export const SCEN_DIR: string;
export const CLI: string;
export function listScenarios(): string[];
export interface CliRun {
  code: number | null;
  stderr: string;
  lines: any[];
  outFile: string;
  text: string;
}
export function runCli(o: {
  seed: number | string;
  night?: number;
  ticks: number;
  scenario?: string;
  inputs?: string;
  snapshotEvery?: number;
  outFile: string;
}): CliRun;
export function checkScenario(name: string, outDir: string): { fails: string[]; exp: any; run: CliRun };
