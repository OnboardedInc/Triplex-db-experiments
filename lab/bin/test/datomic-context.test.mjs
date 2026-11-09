import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { stageDatomicContext, verifiedTree, verifyDatomicContext } from '../datomic-context.mjs';

// [EXP-DA01] Why: retain the reviewer's extra-file retry as an offline regression. Rejected: a real image build for each malicious fixture (unnecessary lifecycle side effects).
test('Datomic context refuses reused directories, extra bytes, and symlinks', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'da01-context-'));
  try {
    const source = path.join(root, 'source');
    fs.mkdirSync(source);
    fs.writeFileSync(path.join(source, 'verified'), 'pinned');
    const inputs = [{ source, destination: 'datomic', manifest: verifiedTree(source) }];
    const dirty = path.join(root, 'dirty');
    fs.mkdirSync(path.join(dirty, 'datomic'), { recursive: true });
    fs.writeFileSync(path.join(dirty, 'datomic/UNVERIFIED-CX-VDA00'), 'unverified');
    assert.throws(() => stageDatomicContext(dirty, inputs), /EEXIST/);
    const clean = path.join(root, 'clean');
    const expected = stageDatomicContext(clean, inputs);
    fs.writeFileSync(path.join(clean, 'datomic/UNVERIFIED-CX-VDA00'), 'unverified');
    assert.throws(() => verifyDatomicContext(clean, expected), /differs/);
    fs.unlinkSync(path.join(clean, 'datomic/UNVERIFIED-CX-VDA00'));
    fs.symlinkSync(path.join(source, 'verified'), path.join(clean, 'link'));
    assert.throws(() => verifyDatomicContext(clean, expected), /special path/);
    fs.symlinkSync(path.join(source, 'verified'), path.join(source, 'link'));
    assert.throws(() => verifiedTree(source), /special path/);
    const rootLink = path.join(root, 'source-link');
    fs.symlinkSync(source, rootLink);
    assert.throws(() => verifiedTree(rootLink), /source root/);
    fs.unlinkSync(path.join(source, 'link'));
    fs.mkdirSync(path.join(source, 'empty'));
    assert.throws(() => verifiedTree(source), /empty directory/);
    fs.unlinkSync(path.join(clean, 'link'));
    fs.mkdirSync(path.join(clean, 'empty'));
    assert.throws(() => verifyDatomicContext(clean, expected), /empty directory/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
