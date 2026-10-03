#!/usr/bin/env node
// Launcher for the kb command. kb's code uses Bun's runtime APIs, so when
// npm starts it with Node this hands off to Bun, or says how to install it.

import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const cli = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'cli.ts');

if (process.versions.bun) {
  await import(cli);
} else {
  const found = spawnSync('bun', ['--version'], { stdio: 'ignore' });
  if (found.error || found.status !== 0) {
    process.stderr.write(
      'kb runs on Bun (https://bun.sh), which was not found on your PATH.\n' +
        'Install it with:  curl -fsSL https://bun.sh/install | bash\n' +
        'or see https://bun.sh/docs/installation, then run kb again.\n'
    );
    process.exit(1);
  }
  const child = spawn('bun', [cli, ...process.argv.slice(2)], { stdio: 'inherit' });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => child.kill(signal));
  }
  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 1);
  });
}
