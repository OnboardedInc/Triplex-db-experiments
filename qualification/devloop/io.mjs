import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { promises as fs } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export const exec = promisify(execFile);
export const now = () => new Date().toISOString();
export const digest = value => createHash('sha256').update(value).digest('hex');
export const json = value => JSON.stringify(value, null, 2) + '\n';
export const fail = (code, message) => { const error = new Error(message); error.code = code; throw error; };
export const assert = (condition, code, message) => { if (!condition) fail(code, message); };
export const sleep = ms => new Promise(done => setTimeout(done, ms));
export async function hashFile(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}
export async function readJson(path) { return JSON.parse(await fs.readFile(path, 'utf8')); }
export async function exists(path) { try { await fs.lstat(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } }

// Atomic rename is the publication seam; fsync preserves the terminal record
// before the scheduler releases its reservation. This is a file journal, not a
// substitute for backend commit/ACK reconciliation (wiki/problems/recovery.md).
export async function atomicJson(path, value, { exclusive = false, beforeRename } = {}) {
  await fs.mkdir(dirname(path), { recursive: true });
  if (exclusive) {
    const handle = await fs.open(path, 'wx', 0o600);
    try { await handle.writeFile(json(value)); await handle.sync(); } finally { await handle.close(); }
  } else {
    const temporary = path + '.' + randomUUID() + '.tmp';
    const handle = await fs.open(temporary, 'wx', 0o600);
    try { await handle.writeFile(json(value)); await handle.sync(); } finally { await handle.close(); }
    if (beforeRename) await beforeRename();
    await fs.rename(temporary, path);
  }
  const directory = await fs.open(dirname(path), 'r');
  try { await directory.sync(); } finally { await directory.close(); }
}

export async function appendEvent(path, event) {
  const handle = await fs.open(path, 'a', 0o600);
  try { await handle.writeFile(JSON.stringify({ at: now(), ...event }) + '\n'); await handle.sync(); }
  finally { await handle.close(); }
}

export function inside(root, target) {
  const part = relative(root, target);
  return part === '' || !isAbsolute(part) && part !== '..' && !part.startsWith('..' + sep);
}

/** Reject traversal and every symlink component, including a nonexistent leaf. */
export async function ownedPath(root, name, { allowRoot = false } = {}) {
  assert(typeof name === 'string' && name.length > 0, 'PATH', 'A nonempty owned path is required');
  const absolute = resolve(root, name);
  assert(inside(root, absolute) && (allowRoot || absolute !== root), 'PATH', 'Path escapes the owned root');
  let current = root;
  const pieces = relative(root, absolute).split(sep).filter(Boolean);
  for (const piece of pieces) {
    current = join(current, piece);
    try { assert(!(await fs.lstat(current)).isSymbolicLink(), 'SYMLINK', 'Owned paths cannot cross symlinks: ' + current); }
    catch (error) { if (error.code === 'ENOENT') break; throw error; }
  }
  return absolute;
}

export async function processIdentity(pid) {
  if (!Number.isSafeInteger(pid) || pid < 1) return null;
  try {
    const { stdout } = await exec('ps', ['-p', String(pid), '-o', 'lstart=,stat='], {
      // ps renders lstart in its own TZ/locale. Normalize the observation rather
      // than relying on each caller's shell; old receipt strings stay untouched.
      env: { ...process.env, TZ: 'UTC', LC_ALL: 'C', LANG: 'C' },
    });
    const match = /^(.*\S)\s+(\S+)$/.exec(stdout.trim());
    // Scheduler identity must exclude R/S process state, which can change
    // between observations of the very same process. Keep the birth time.
    return match && !match[2].startsWith('Z') ? match[1] : null;
  } catch (error) { if (error.code === 1) return null; throw error; }
}

export async function sameProcess(owner) {
  return owner?.pid && owner.identity && await processIdentity(owner.pid) === owner.identity;
}

export async function fileTree(root) {
  const output = [];
  async function visit(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      assert(!entry.isSymbolicLink(), 'SYMLINK', 'Evidence trees cannot contain symlinks');
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) output.push({ path: relative(root, path), bytes: (await fs.stat(path)).size, sha256: await hashFile(path) });
      else fail('FILE_TYPE', 'Unsupported evidence file type: ' + path);
    }
  }
  await visit(root);
  return output.sort((a, b) => a.path.localeCompare(b.path));
}
