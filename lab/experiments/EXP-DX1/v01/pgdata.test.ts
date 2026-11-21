import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { inspectPgdata, pgdataArgs } from "./pgdata.ts";

test("the paired and grouped-only commands require a copy for each scheduled arm", () => {
  assert.deepEqual(pgdataArgs([], undefined, false), []);
  assert.deepEqual(pgdataArgs(["zero", "loaded", "default", "grouped"], "sealed", false),
    ["sealed", "zero", "loaded", "default", "grouped"]);
  assert.deepEqual(pgdataArgs(["grouped"], "sealed", true), ["sealed", "grouped"]);
  assert.deepEqual(pgdataArgs(["current"], "sealed", false, 2), ["sealed", "current"]);
  assert.throws(() => pgdataArgs(["a", "b"], "sealed", false, 2));
  assert.throws(() => pgdataArgs(["current"], "sealed", true, 2));
  assert.throws(() => pgdataArgs(["loaded"], "sealed", false));
  assert.throws(() => pgdataArgs(["loaded"], undefined, true));
});

test("the prepared directories must be separate, stopped, untouched copies of the sealed control", (t) => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "dx-v01-pgdata-")));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const make = (name: string) => {
    const dir = path.join(root, name);
    fs.mkdirSync(path.join(dir, "global"), { recursive: true });
    fs.writeFileSync(path.join(dir, "PG_VERSION"), "17\n");
    fs.writeFileSync(path.join(dir, "global", "pg_control"), Buffer.alloc(8192));
    return dir;
  };
  const sealed = make("sealed"), copy = make("copy"), second = make("second"), out = path.join(root, "out");
  assert.equal(inspectPgdata(sealed, [copy, second], out).length, 2);
  assert.throws(() => inspectPgdata(sealed, [copy, copy], out), /distinct and disjoint/);
  assert.throws(() => inspectPgdata(sealed, [sealed], out), /distinct and disjoint/);
  assert.throws(() => inspectPgdata(sealed, [copy], path.join(copy, "output")), /separate from scorecard evidence/);
  fs.writeFileSync(path.join(copy, "postmaster.pid"), "123\n");
  assert.throws(() => inspectPgdata(sealed, [copy], out), /must be stopped/);
  fs.rmSync(path.join(copy, "postmaster.pid"));
  fs.writeFileSync(path.join(copy, ".triplex-v01-used"), "{}");
  assert.throws(() => inspectPgdata(sealed, [copy], out), /already used/);
  fs.rmSync(path.join(copy, ".triplex-v01-used"));
  fs.linkSync(path.join(sealed, "PG_VERSION"), path.join(copy, "shared"));
  assert.throws(() => inspectPgdata(sealed, [copy], out), /no links/);
  fs.rmSync(path.join(copy, "shared"));
  fs.symlinkSync(sealed, path.join(copy, "pg_wal"));
  assert.throws(() => inspectPgdata(sealed, [copy], out), /no links/);
  fs.rmSync(path.join(copy, "pg_wal"));
  fs.writeFileSync(path.join(copy, "global", "pg_control"), Buffer.alloc(8192, 1));
  assert.throws(() => inspectPgdata(sealed, [copy], out), /differs from sealed/);
});
