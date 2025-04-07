#!/usr/bin/env node
// Use ES modules syntax since package.json has "type": "module"
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// First, run the normal build
console.log('Running initial build...');
execSync('bun build src/server/http-server.ts --outdir build --target browser --external node:* --external fs --external path --external crypto --external http --external timers --external stream --external zlib --external async_hooks --external buffer', {
  stdio: 'inherit'
});

// Path to the built file - using path.resolve for proper path resolution
const projectRoot = path.resolve(__dirname, '..');
const workerFile = path.join(projectRoot, 'build', 'http-server.js');

console.log('Patching node:sqlite and other Node.js dependencies...');

// Read the file
let content = fs.readFileSync(workerFile, 'utf8');

// Replace problematic require statements with try/catch blocks to prevent runtime errors
// This is specifically targeting the undici SQLite issue
content = content.replace(
  /require\(['"]node:sqlite['"]\)/g,
  `(() => { try { return require('node:sqlite'); } catch(e) { return { DatabaseSync: class {} }; } })()`
);

// Apply similar patching for other Node.js modules
content = content.replace(
  /require\(['"]node:(.*?)['"]\)/g,
  `(() => { try { return require('node:$1'); } catch(e) { return {}; } })()`
);

// Write the patched file back
fs.writeFileSync(workerFile, content);

console.log('Build patching complete!');
