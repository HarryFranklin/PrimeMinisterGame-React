// Copies study-kit/src into an app before it builds or runs, so both apps
// use exactly the same study code and wording. Run automatically by the
// apps' "predev" and "prebuild" scripts:  node ../study-kit/sync.mjs .study-kit
// The copy is git-ignored – always edit the files in study-kit/src, never the copy.
import { cpSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const target = process.argv[2];
if (!target) {
  console.error('usage: node ../study-kit/sync.mjs <target-dir>');
  process.exit(1);
}
const src = join(dirname(fileURLToPath(import.meta.url)), 'src');
const dest = resolve(process.cwd(), target);
rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
writeFileSync(join(dest, 'DO_NOT_EDIT.md'), 'Generated copy of /study-kit/src. Edit the originals in /study-kit/src.\n');
console.log(`study-kit → ${target}`);
