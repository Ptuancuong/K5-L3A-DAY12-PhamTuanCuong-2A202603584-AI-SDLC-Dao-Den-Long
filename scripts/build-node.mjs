// Bundles the Node entry points: headless_cmd, soak_cmd, run_cmd (static server + leaderboard).
import { build } from 'esbuild';

const entries = {
  headless: 'src/headless/cli.ts',
  soak: 'src/headless/soak.ts',
  serve: 'src/server/serve.ts',
};
await Promise.all(
  Object.entries(entries).map(([name, entry]) =>
    build({
      entryPoints: [entry],
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'node18',
      outfile: `build/${name}.mjs`,
      logLevel: 'warning',
    }),
  ),
);
