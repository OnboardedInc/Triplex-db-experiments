import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const pgdataTarget = "/var/lib/postgresql/data";
export const pgdataGrowthGiB = 16;
const used = ".triplex-v01-used";

export function pgdataArgs(copies: string[], sealed: string | undefined, grouped: boolean) {
  assert(sealed ? copies.length === (grouped ? 1 : 3) : copies.length === 0,
    "Use --pgdata-source with three --pgdata directories (ordered zero, ordered loaded, grouped loaded), or one for grouped-only");
  return sealed ? [sealed, ...copies] : [];
}

function identify(dir: string) {
  const stat = fs.statSync(dir, { bigint: true });
  assert(stat.isDirectory());
  assert.equal(fs.readFileSync(path.join(dir, "PG_VERSION"), "utf8").trim(), "17");
  assert(!fs.existsSync(path.join(dir, "postmaster.pid")), "PostgreSQL directory must be stopped");
  const control = fs.readFileSync(path.join(dir, "global", "pg_control"));
  assert.equal(control.length, 8192, "Missing PostgreSQL control data");
  return { dir, device: String(stat.dev), inode: String(stat.ino),
    controlSha256: createHash("sha256").update(control).digest("hex") };
}

type Directory = ReturnType<typeof identify>;

function assertCopyTree(dir: string, dev: bigint) {
  for (const entry of fs.readdirSync(dir)) {
    const file = path.join(dir, entry);
    const stat = fs.lstatSync(file, { bigint: true });
    assert.equal(stat.dev, dev, "PGDATA copy must be on one filesystem");
    if (stat.isDirectory()) assertCopyTree(file, dev);
    else assert(stat.isFile() && stat.nlink === 1n, "PGDATA copy must have private regular files and no links");
  }
}

function overlaps(a: string, b: string) {
  return a === b || a.startsWith(b + path.sep) || b.startsWith(a + path.sep);
}

export function inspectPgdata(source: string, paths: string[], output: string) {
  const dirs = [source, ...paths].map((dir) => {
    const canonical = fs.realpathSync(dir);
    assert(canonical !== "/" && !/[,\r\n"]/.test(canonical), "PGDATA path cannot be used as a bind source");
    assert(!overlaps(canonical, output), "Keep PGDATA separate from scorecard evidence");
    return identify(canonical);
  });
  const [sealed, ...copies] = dirs as [Directory, ...Directory[]];
  for (const [i, current] of dirs.entries()) {
    for (const peer of dirs.slice(0, i)) {
      assert(!overlaps(current.dir, peer.dir), "PGDATA paths must be distinct and disjoint");
      assert.notEqual(current.device + ":" + current.inode, peer.device + ":" + peer.inode,
        "PGDATA paths refer to the same directory");
    }
  }
  for (const copy of copies) {
    assert.equal(copy.controlSha256, sealed.controlSha256, "PGDATA copy differs from sealed PostgreSQL control data");
    assert(!fs.existsSync(path.join(copy.dir, used)), "PGDATA copy was already used");
    assertCopyTree(copy.dir, BigInt(copy.device));
  }
  return copies;
}

export function claimPgdata(copy: Directory, source: string, slot: string, attempt: string) {
  // [DX-V01] Why: one arm owns an untouched copy before PostgreSQL can write to it.
  // Rejected: reusing a directory after a partial start or treating a path name as identity.
  assert.deepEqual(identify(copy.dir), copy, "PGDATA copy changed after admission");
  assertCopyTree(copy.dir, BigInt(copy.device));
  const space = fs.statfsSync(copy.dir, { bigint: true });
  assert(space.bavail * space.bsize >= BigInt(pgdataGrowthGiB) * 1024n ** 3n,
    `Allow ${pgdataGrowthGiB} GiB of free space on the PGDATA filesystem`);
  fs.writeFileSync(path.join(copy.dir, used), JSON.stringify({ source, slot, attempt }), { flag: "wx", mode: 0o600, flush: true });
}
