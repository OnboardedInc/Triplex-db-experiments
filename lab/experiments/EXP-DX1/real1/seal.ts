import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { addedFacts, roster, source, type Profile } from "./population.ts";
import { hex, openScaleSeal, scopeKey } from "../v01/adopt.ts";

const digest = /^[a-f0-9]{64}$/;
const revision = /^[a-f0-9]{40}$/;
export const write = (file: string, value: unknown) =>
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", {
    flag: "wx",
    flush: true,
    mode: 0o400,
  });

export async function fileHash(file: string) {
  const hash = createHash("sha256");
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

// [DX-REAL1] Why: use SCALE1's stoppedInventory byte order and file metadata in the physical seal.
// Rejected: control-file-only equality, which misses changed relation and WAL bytes.
export async function stoppedInventory(dir: string) {
  assert.equal(fs.realpathSync(dir), dir);
  assert.equal(fs.readFileSync(path.join(dir, "PG_VERSION"), "utf8").trim(), "17");
  assert(!fs.existsSync(path.join(dir, "postmaster.pid")));
  assert(fs.lstatSync(path.join(dir, "pg_wal")).isDirectory());
  const control = path.join(dir, "global", "pg_control");
  assert.equal(fs.statSync(control).size, 8192);
  const { dev } = fs.statSync(dir);
  const hash = createHash("sha256");
  let bytes = 0,
    files = 0;
  async function visit(parent: string) {
    for (const name of fs.readdirSync(parent).sort()) {
      const file = path.join(parent, name);
      const stat = fs.lstatSync(file);
      assert.equal(stat.dev, dev);
      assert(
        stat.isDirectory() || (stat.isFile() && stat.nlink === 1),
        "PGDATA must contain private files",
      );
      hash.update(
        JSON.stringify([
          path.relative(dir, file),
          stat.mode,
          stat.uid,
          stat.gid,
          stat.isFile() ? await fileHash(file) : null,
        ]) + "\n",
      );
      if (stat.isDirectory()) await visit(file);
      else {
        bytes += stat.size;
        files++;
      }
    }
  }
  await visit(dir);
  assert(!fs.existsSync(path.join(dir, "postmaster.pid")));
  return { bytes, files, controlSha: await fileHash(control), treeSha: hash.digest("hex") };
}

export type Census = { head: number; nativeT: number; nativeRecords: number; sqlBytes: number };
type Inventory = Awaited<ReturnType<typeof stoppedInventory>>;
export type Parent = {
  tag: string;
  imageSha: string;
  transferSha: string;
  pgdataSha: string;
  scope: string;
  db: string;
  cut: number;
  facts: number;
  people: number;
};
export type Proof = {
  cut: number;
  cursor: number;
  observed: number;
  facts: number;
  manifest: string;
  terminal: string;
  terminalTx: string;
  first: number;
  sourceSeal: string;
  ledgerSha: string;
};
export type Image = {
  format: "scale1-realistic-pgdata/1";
  source: string;
  slot: string;
  nonce: string;
  profile: Profile;
  layout: "pooled";
  verification: "extension-commands-feed-and-pinned-members";
  parent: Parent;
  accounts: ReturnType<typeof roster>;
  census: Census;
  people: number;
  facts: number;
  scopes: [{ name: string; db: string; seedCut: number; cut: number; accounts: number[] }];
  proof: Proof;
  pgdata: Inventory | null;
};

export function openRealisticSeal(
  dir: string,
  imagePin: string,
  transferPin: string,
  toy = false,
): Image {
  function pinned(name: string, expected: string) {
    assert.match(expected, digest);
    const bytes = fs.readFileSync(path.join(dir, name));
    assert.equal(hex(bytes), expected);
    return JSON.parse(bytes.toString());
  }
  const image: Image = pinned("image.json", imagePin);
  const transfer = pinned("transfer.json", transferPin);
  assert.deepEqual(transfer, {
    source: image.source,
    nonce: image.nonce,
    slot: image.slot,
    tag: path.basename(dir),
    result: "success",
    summaryFiles: { "image.json": imagePin },
  });
  return validateImage(dir, image, toy);
}

export function validateImage(dir: string, image: Image, toy: boolean) {
  assert.match(image.source, revision);
  assert.match(image.slot, toy ? /^tx2-datomic-s[123]$/ : /^tx2-dxreal1-[a-f0-9-]{36}$/);
  assert.match(image.nonce, /^[a-f0-9-]{36}$/);
  assert.equal(image.format, "scale1-realistic-pgdata/1");
  assert.equal(image.layout, "pooled");
  assert.equal(image.verification, "extension-commands-feed-and-pinned-members");
  assert(toy ? image.profile === "toy" : image.profile === "first" || image.profile === "full");
  const { parent, proof, census } = image;
  const accounts = roster(image.profile);
  assert.deepEqual(image.accounts, accounts);
  const extension = accounts.filter((a) => a.kind !== "deep");
  const expected = source(extension, parent.imageSha, image.source);
  assert.equal(proof.sourceSeal, expected.seal);
  assert.equal(proof.cursor, expected.groups);
  assert.equal(
    proof.facts,
    extension.reduce((sum, a) => sum + addedFacts(a), 0),
  );
  assert.equal(image.people, parent.people + proof.cursor);
  assert.equal(image.facts, parent.facts + proof.facts);
  assert.deepEqual(image.scopes, [
    {
      name: parent.scope,
      db: parent.db,
      seedCut: proof.cut,
      cut: proof.cut,
      accounts: accounts.map((a) => a.id),
    },
  ]);
  assert.equal(parent.db, "s2-" + Buffer.from(scopeKey(parent.scope)).toString("base64url"));
  assert.equal(proof.cut, parent.cut + 1 + proof.observed);
  assert.equal(proof.cut, census.head);
  assert(Number.isSafeInteger(proof.observed) && proof.observed > 0);
  assert(Number.isSafeInteger(proof.first) && proof.first >= 0 && proof.first < proof.cursor);
  assert.match(proof.ledgerSha, digest);
  for (const value of [parent.imageSha, parent.transferSha, parent.pgdataSha])
    assert.match(value, digest);
  if (toy) {
    assert.equal(image.pgdata, null);
    assert.equal(parent.people, 500);
  } else {
    assert.match(parent.tag, /^[a-z0-9][a-z0-9-]+$/);
    const original = openScaleSeal(
      path.join(dir, "parent", parent.tag, "image.json"),
      parent.imageSha,
      false,
      parent.transferSha,
      false,
    );
    assert.deepEqual(
      [parent.scope, parent.db, parent.cut, parent.facts, parent.people],
      [
        original.scope.name,
        original.scope.db,
        original.scope.cut,
        original.image.facts,
        original.proof.cursor,
      ],
    );
    for (const field of ["bytes", "files"] as const)
      assert(image.pgdata && Number.isSafeInteger(image.pgdata[field]) && image.pgdata[field] > 0);
    assert(
      image.pgdata && digest.test(image.pgdata.controlSha) && digest.test(image.pgdata.treeSha),
    );
    assert(
      [census.head, census.nativeT, census.nativeRecords, census.sqlBytes].every(
        Number.isSafeInteger,
      ),
    );
    assert(census.nativeT > 0 && census.nativeRecords > 429_778_659 && census.sqlBytes > 0);
  }
  return image;
}

export async function verifyPgdata(dir: string, image: Image) {
  assert(image.pgdata, "Physical seal required");
  assert.deepEqual(await stoppedInventory(dir), image.pgdata);
}
