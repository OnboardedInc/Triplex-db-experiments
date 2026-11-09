// @ts-nocheck -- [EXP-CHECKJS] runtime error inspection. Binding errors remain checked by lab/bin/checkjs.mjs.
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

const [mode = 'ok', marker] = process.argv.slice(2);
const output = process.env.TRIPLEX_RUN_ARTIFACTS;
if (!output) throw new Error('Owned run directory is missing');
if (mode === 'fail-once') {
  try { await fs.writeFile(marker, 'first-attempt-preserved\n', { flag: 'wx' }); process.exit(7); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
}
if (mode === 'tree' || mode === 'leak') {
  const script = `const {spawn}=require('node:child_process');const c=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});require('node:fs').writeFileSync(process.argv[1],JSON.stringify({child:process.pid,grandchild:c.pid}));setInterval(()=>{},1000);`;
  const child = spawn(process.execPath, ['-e', script, join(output, 'descendants.json')], { stdio: 'ignore' });
  await fs.writeFile(join(output, 'started.json'), JSON.stringify({ pid: process.pid, child: child.pid }));
  if (mode === 'leak') process.exit(0);
  setInterval(() => {}, 1000);
} else if (mode === 'sleep') {
  await fs.writeFile(join(output, 'started.json'), JSON.stringify({ pid: process.pid }));
  setInterval(() => {}, 1000);
} else if (mode === 'log-flood') {
  setInterval(() => process.stdout.write('x'.repeat(8192)), 5);
} else {
  await fs.writeFile(join(output, 'answer.json'), mode === 'bad-answer' ? '{"ok":false}\n' : '{"ok":true}\n', { flag: 'wx' });
  if (mode === 'fail-with-artifact') process.exitCode = 7;
  if (mode === 'fail-with-symlink') { await fs.symlink(marker, join(output, 'unowned-link')); process.exitCode = 7; }
}
