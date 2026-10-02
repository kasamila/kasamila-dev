import {readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
let count = 0;
function visit(dir) {
  for (const e of readdirSync(dir, {withFileTypes: true})) {
    if (['node_modules', '__pycache__'].includes(e.name)) continue;
    const path = join(dir, e.name);
    if (e.isDirectory()) visit(path);
    else if (/\.(mjs|js)$/.test(e.name)) {execFileSync(process.execPath, ['--check', path]); count++;}
  }
}
visit('examples/realtime-integrations'); visit('content/blog');
console.log(`Syntax checked ${count} JavaScript files.`);
