import { spawn, spawnSync } from 'node:child_process';
import process from 'node:process';

const task = process.argv[2];
const workspaceOrder = [
  '@flashcard/types',
  '@flashcard/utils',
  '@flashcard/database',
  '@flashcard/ui',
  '@flashcard/api',
  '@flashcard/web',
];

if (!task) {
  console.error('Usage: node scripts/turbo-run.mjs <dev|build|lint|test>');
  process.exit(1);
}

const turboAvailable = spawnSync(command('turbo'), ['--version'], {
  stdio: 'ignore',
  shell: true,
});

if (turboAvailable.status === 0) {
  const turbo = spawnSync(command('turbo'), [task], {
    stdio: 'inherit',
    shell: true,
  });

  process.exit(turbo.status ?? 1);
}

console.warn('Turbo binary failed locally; falling back to npm workspace orchestration.');

if (task === 'dev') {
  const children = [
    spawn(command('npm'), ['--workspace', '@flashcard/api', 'run', 'dev'], {
      stdio: 'inherit',
      shell: true,
    }),
    spawn(command('npm'), ['--workspace', '@flashcard/web', 'run', 'dev'], {
      stdio: 'inherit',
      shell: true,
    }),
  ];

  const shutdown = () => {
    for (const child of children) {
      child.kill('SIGTERM');
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  await Promise.race(
    children.map(
      (child) =>
        new Promise((resolve) => {
          child.on('exit', (code) => resolve(code));
        }),
    ),
  );
  shutdown();
  process.exit(0);
}

for (const workspace of workspaceOrder) {
  const result = spawnSync(command('npm'), ['--workspace', workspace, 'run', task, '--if-present'], {
    stdio: 'inherit',
    shell: true,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function command(binary) {
  return process.platform === 'win32' ? `${binary}.cmd` : binary;
}
