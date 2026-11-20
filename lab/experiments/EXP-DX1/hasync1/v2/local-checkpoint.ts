import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Evidence } from "../../ha1/common.ts";
import type { Checkpoint } from "../seed.ts";

type Credentials = { secret: string; admin: string };
const read = (dir: string, file: string) =>
  JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));

export function localCheckpoint(
  e: Evidence,
  folder: string,
  token: string | undefined,
  people: number,
) {
  const seed = e.mode === "hasync-seed-edited";
  if (!seed && token === undefined) return;
  assert(
    seed ? token === undefined : ["hasync-ack", "hasync-index", "hasync-move"].includes(e.mode),
  );
  const from = seed ? e.nonce : token!;
  assert.match(from, /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/);
  const scratch = path.join(folder, "scratch", "DX-HASYNC1", from);
  const ownerUid = process.getuid!();
  const ownerGid = process.getgid!();
  let credentials: Credentials;
  let checkpoint: Checkpoint | undefined;
  if (seed) {
    credentials = {
      secret: randomBytes(18).toString("hex"),
      admin: randomBytes(18).toString("hex"),
    };
    fs.mkdirSync(path.dirname(scratch), { recursive: true, mode: 0o700 });
    fs.mkdirSync(scratch, { mode: 0o700 });
    fs.writeFileSync(path.join(scratch, "owner.json"), JSON.stringify({ from, credentials }), {
      flag: "wx",
      mode: 0o600,
    });
  } else {
    const dir = path.join(folder, "evidence", "DX-HASYNC1", "hasync-seed-edited-" + from);
    const attempt = read(dir, "attempt.json"),
      cleanup = read(dir, "cleanup.json");
    const saved = read(dir, "observations.json");
    // [DX-HASYNC1] Why: the run must consume the declared edited seed whose container ownership released cleanly. Rejected: restoring the newest backup by modification time.
    assert.equal(attempt.mode, "hasync-seed-edited");
    assert.deepEqual(cleanup, { nonce: from, containers: 0, networks: 0 });
    assert.equal(attempt.nonce, from);
    assert.equal(saved.nonce, from);
    assert.equal(saved.slot, attempt.slot);
    assert.deepEqual(saved.source, attempt.source);
    assert.deepEqual(saved.source, e.source);
    checkpoint = saved.result as Checkpoint;
    assert(checkpoint.history && checkpoint.people === people && checkpoint.layout === "legacy");
    const owner = path.join(scratch, "owner.json");
    const stat = fs.lstatSync(owner);
    assert(stat.isFile() && stat.uid === ownerUid && (stat.mode & 0o077) === 0);
    const mark = read(scratch, "owner.json");
    assert.equal(mark.from, from);
    credentials = mark.credentials;
    assert(
      credentials && [credentials.secret, credentials.admin].every((v) => /^[0-9a-f]{36}$/.test(v)),
    );
    e.log("checkpoint-source", {
      nonce: from,
      people,
      manifest: checkpoint.manifest,
      seal: checkpoint.seal,
    });
  }
  return {
    path: scratch,
    credentials,
    ...(checkpoint ? { checkpoint } : {}),
    deadline: performance.now() + 765000,
    ownerUid,
    ownerGid,
  };
}
