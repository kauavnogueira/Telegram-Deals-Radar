import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import readline from 'node:readline';
const rootDir = path.resolve(process.cwd());

console.log('Starting Next.js and Telegram collector...');
console.log('Dashboard: http://localhost:3000\n');
function pipeWithPrefix(proc: ChildProcess, prefix: string, color: string) {
  if (proc.stdout) {
    const rlOut = readline.createInterface({ input: proc.stdout });
    rlOut.on('line', (line) => {
      console.log(`${color}${prefix}\x1b[0m ${line}`);
    });
  }

  if (proc.stderr) {
    const rlErr = readline.createInterface({ input: proc.stderr });
    rlErr.on('line', (line) => {
      console.error(`${color}${prefix}\x1b[0m ${line}`);
    });
  }
}

const nextProc = spawn('npx', ['next', 'dev', '-H', '0.0.0.0'], {
  cwd: rootDir,
  shell: true,
  stdio: ['inherit', 'pipe', 'pipe'],
  env: { ...process.env, FORCE_COLOR: '1' },
});
pipeWithPrefix(nextProc, '[web]', '\x1b[36m');

const envPath = path.resolve(rootDir, '.env.local');
let hasSession = false;
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  hasSession = Boolean(envContent.match(/TELEGRAM_STRING_SESSION\s*=\s*([^\r\n]+)/));
}

let collectorProc: ChildProcess | null = null;

if (hasSession) {
  collectorProc = spawn('npx', ['tsx', 'src/scripts/collect.ts'], {
    cwd: rootDir,
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '1' },
  });
  pipeWithPrefix(collectorProc, '[telegram]', '\x1b[35m');
} else {
  console.log('\x1b[33m[telegram] Credentials not configured in .env.local. Run "npm run setup" to enable live monitoring.\x1b[0m\n');
}
let isExiting = false;
function shutdown(signal: string) {
  if (isExiting) return;
  isExiting = true;
  console.log(`\n\x1b[33mShutting down (${signal})...\x1b[0m`);
  if (collectorProc) {
    try {
      collectorProc.kill('SIGINT');
    } catch {}
  }
  try {
    nextProc.kill('SIGINT');
  } catch {}

  setTimeout(() => {
    if (collectorProc) {
      try {
        collectorProc.kill('SIGKILL');
      } catch {}
    }
    try {
      nextProc.kill('SIGKILL');
    } catch {}
    process.exit(0);
  }, 1000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

nextProc.on('exit', (code) => {
  if (!isExiting) {
    console.log(`\x1b[31m[web] Next.js process exited with code ${code}\x1b[0m`);
    shutdown('NEXT_EXIT');
  }
});
if (collectorProc) {
  collectorProc.on('exit', (code) => {
    if (!isExiting) {
      if (code === 0) {
        console.log('\x1b[33m[telegram] Collector exited cleanly.\x1b[0m');
      } else {
        console.log(`\x1b[33m[telegram] Collector exited with code ${code}.\x1b[0m`);
      }
    }
  });
}
