import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

// [EXP-DA01] Why: exclusive creation and a final byte comparison close V-DA00's extra-file retry. Rejected: recursive copy into an existing content-addressed directory (unhashed payload survives).
export function verifiedTree(root) {
  if (!fs.lstatSync(root).isDirectory()) throw new Error(`Unverified source root: ${root}`);
  const files = [];
  const visit = dir => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    if (!entries.length) throw new Error(`Unverified empty directory: ${dir}`);
    for (const entry of entries) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile()) {
        const bytes = fs.readFileSync(file);
        files.push({ path: path.relative(root, file), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
      } else throw new Error(`Unverified special path: ${file}`);
    }
  };
  visit(root);
  return files.sort((a, b) => a.path.localeCompare(b.path));
}
export function stageDatomicContext(context, inputs) {
  fs.mkdirSync(context);
  const expected = [];
  for (const { source, destination, manifest } of inputs) {
    const target = path.join(context, destination);
    fs.cpSync(source, target, { recursive: true, dereference: false });
    for (const file of manifest) expected.push({ ...file, path: path.join(destination, file.path) });
  }
  return verifyDatomicContext(context, expected);
}
export function verifyDatomicContext(context, expected) {
  const actual = verifiedTree(context);
  if (JSON.stringify(actual) !== JSON.stringify([...expected].sort((a, b) => a.path.localeCompare(b.path))))
    throw new Error('Datomic build context differs from verified inputs');
  return actual;
}
