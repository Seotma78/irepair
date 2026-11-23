import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure relative data/public/dist paths resolve against the app directory even on Hostinger/Passenger
if (process.cwd() !== __dirname && fs.existsSync(path.join(__dirname, 'package.json'))) {
  process.chdir(__dirname);
}

const compiledServerPath = path.join(__dirname, 'dist-server', 'server.mjs');
const distIndexPath = path.join(__dirname, 'dist', 'index.html');

// Default to production when running compiled build via `node server.js`
if (!process.env.NODE_ENV && fs.existsSync(distIndexPath)) {
  process.env.NODE_ENV = 'production';
}

async function boot() {
  if (!fs.existsSync(distIndexPath) && fs.existsSync(path.join(__dirname, 'vite.config.ts'))) {
    console.log('dist/index.html not found — building production client bundle...');
    const { build } = await import('vite');
    await build();
    if (!process.env.NODE_ENV && fs.existsSync(distIndexPath)) {
      process.env.NODE_ENV = 'production';
    }
  }

  if (fs.existsSync(compiledServerPath)) {
    await import(pathToFileURL(compiledServerPath).href);
    return;
  }

  // Fallback: run server.ts in-process via tsx/esm/api so Hostinger/Passenger port binding hooks work
  try {
    const { tsImport } = await import('tsx/esm/api');
    await tsImport('./server.ts', import.meta.url);
    return;
  } catch (err) {
    console.warn('In-process tsx fallback unavailable, spawning tsx CLI:', err?.message || err);
  }

  const localTsx = path.join(
    __dirname,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'tsx.cmd' : 'tsx'
  );
  const cmd = fs.existsSync(localTsx) ? localTsx : 'npx';
  const args = fs.existsSync(localTsx) ? ['server.ts'] : ['tsx', 'server.ts'];
  const child = spawn(cmd, args, {
    cwd: __dirname,
    stdio: 'inherit',
    env: process.env,
  });
  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

// Keep module top-level synchronous (no top-level await) so CommonJS require() wrappers like Hostinger/lsnode succeed
boot().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
