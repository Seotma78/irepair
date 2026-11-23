import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure relative data/public/dist paths resolve against the app directory even on hosts like Hostinger
if (process.cwd() !== __dirname && fs.existsSync(path.join(__dirname, 'package.json'))) {
  process.chdir(__dirname);
}

// Default to production when running compiled server bundle via `node server.js`
const compiledServerPath = path.join(__dirname, 'dist-server', 'server.mjs');
const distIndexPath = path.join(__dirname, 'dist', 'index.html');

if (!process.env.NODE_ENV && fs.existsSync(distIndexPath)) {
  process.env.NODE_ENV = 'production';
}

if (fs.existsSync(compiledServerPath)) {
  await import(pathToFileURL(compiledServerPath).href);
} else {
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
