// Copies study-kit/src into an app, so both apps use exactly the same study
// code and wording. The copy is git-ignored – always edit study-kit/src.
//
//   node ../study-kit/sync.mjs .study-kit                 copy once (used by "prebuild")
//   node ../study-kit/sync.mjs .study-kit --watch -- next dev
//        copy, start `next dev`, and re-copy whenever a study-kit file changes
//        (used by "dev", so study-kit edits show up without restarting)
import { cpSync, rmSync, writeFileSync, watch } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const target = args[0];
if (!target || target.startsWith('-')) {
  console.error('usage: node ../study-kit/sync.mjs <target-dir> [--watch -- <command>]');
  process.exit(1);
}
const src = join(dirname(fileURLToPath(import.meta.url)), 'src');
const dest = resolve(process.cwd(), target);

function copy() {
  rmSync(dest, { recursive: true, force: true });
  cpSync(src, dest, { recursive: true });
  writeFileSync(join(dest, 'DO_NOT_EDIT.md'), 'Generated copy of /study-kit/src. Edit the originals in /study-kit/src.\n');
}

copy();
console.log(`study-kit → ${target}`);

if (args.includes('--watch')) {
  // Re-copy on any change (debounced, so a save of several files copies once).
  let timer = null;
  watch(src, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        copy();
        console.log('study-kit changed → re-copied');
      } catch (err) {
        console.warn('study-kit re-copy failed:', err.message);
      }
    }, 150);
  });

  // Run the app's own dev command alongside, and stop together.
  const sep = args.indexOf('--');
  const cmd = sep >= 0 ? args.slice(sep + 1).join(' ') : '';
  if (cmd) {
    const child = spawn(cmd, { stdio: 'inherit', shell: true });
    child.on('exit', (code) => process.exit(code ?? 0));
    for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
  }
}
