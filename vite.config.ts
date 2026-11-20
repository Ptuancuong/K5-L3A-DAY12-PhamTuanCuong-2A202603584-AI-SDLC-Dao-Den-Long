import { defineConfig } from 'vite';
import { leaderboardApi } from './src/server/api';

// The dev and preview servers expose the same /api/leaderboard as build/serve.mjs (saves to save/leaderboard.json).
export default defineConfig({
  base: './',
  build: { outDir: 'dist' },
  plugins: [
    {
      name: 'leaderboard-api',
      configureServer: (s) => void s.middlewares.use(leaderboardApi),
      configurePreviewServer: (s) => void s.middlewares.use(leaderboardApi),
    },
  ],
});
