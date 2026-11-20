// Claude Code Stop hook: the agent may not finish its turn while `npm test` is red.
// Exit 2 = block stopping and feed stderr back to the agent.
import { spawnSync } from 'node:child_process';

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  let payload = {};
  try {
    payload = JSON.parse(input || '{}');
  } catch {}
  // Second stop attempt in a row: let it through to avoid an endless loop; the agent was already told.
  if (payload.stop_hook_active) process.exit(0);

  const r = spawnSync('npm', ['test', '--silent'], { shell: true, encoding: 'utf8' });
  if (r.status === 0) process.exit(0);
  const out = (r.stdout + r.stderr).replace(/\x1b\[[0-9;]*m/g, '').split('\n').slice(-40).join('\n');
  process.stderr.write(`npm test is failing. Fix the code (do not weaken tests) before finishing.\n${out}\n`);
  process.exit(2);
});
