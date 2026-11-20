// Ticket-04 §1 bench.json formulas, computed from the per-frame times dt_i (ms) of the measured window.
export interface BenchStats {
  frames: number;
  avg_fps: number;
  p1_low_fps: number;
  frame_ms_p95: number;
}

const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;

export function benchStats(dts: number[]): BenchStats {
  const n = dts.length;
  if (n === 0) return { frames: 0, avg_fps: 0, p1_low_fps: 0, frame_ms_p95: 0 };
  const sum = dts.reduce((a, b) => a + b, 0);
  const sorted = [...dts].sort((a, b) => a - b);
  // p1 low: k = max(1, ceil(0.01 N)) largest dt, 1000 / their mean.
  const k = Math.max(1, Math.ceil(0.01 * n));
  const worst = sorted.slice(n - k);
  const worstMean = worst.reduce((a, b) => a + b, 0) / k;
  // p95: nearest-rank method, the ceil(0.95 N)-th smallest value.
  const p95 = sorted[Math.max(0, Math.ceil(0.95 * n) - 1)];
  return {
    frames: n,
    avg_fps: r1((1000 * n) / sum),
    p1_low_fps: r1(1000 / worstMean),
    frame_ms_p95: r2(p95),
  };
}
