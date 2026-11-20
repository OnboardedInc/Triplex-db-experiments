import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import type { CompositionHandle, Receipt } from "../../../bench/lib/composition.ts";
import { deepOwnFacts, string } from "../../../bench/lib/deep-world.ts";
import { SEED_VALID_FROM, ids, memberOf } from "../../../bench/lib/world.ts";

const namespace = (id: string) => "incoming:" + id;
const incomingAccount = "account-011";
const now = () => performance.timeOrigin + performance.now();
const sha = (rows: readonly string[]) =>
  createHash("sha256")
    .update(JSON.stringify([...rows].sort()))
    .digest("hex");

export function* importFrames(people: number) {
  assert(Number.isSafeInteger(people) && people > 0);
  let frame: ReturnType<typeof importRows> = [];
  for (let i = 0; i < people; i++) {
    const rows = importRows(i);
    if (frame.length && frame.length + rows.length > 1_600) {
      yield frame;
      frame = [];
    }
    frame.push(...rows);
  }
  if (frame.length) yield frame;
}

function importRows(person: number) {
  return [
    ...deepOwnFacts(person),
    { e: ids.placement(person), a: ":subject/account", v: string(incomingAccount) },
  ].map((f) => ({
    op: "assert" as const,
    entityId: namespace(f.e),
    attribute: f.a,
    value: f.v.type === "ref" ? { ...f.v, value: namespace(f.v.value) } : f.v,
    validFrom: SEED_VALID_FROM,
  }));
}

export async function runImport(
  writer: CompositionHandle,
  file: string,
  run: string,
  people: number,
  deadline: number,
  observe: (r: Receipt) => void,
) {
  // [DX-THIN1] Why: import a separate logical account through the live database's ordinary writer.
  // Rejected: measuring a second database or treating generated facts as imported facts.
  const start = now();
  const fd = fs.openSync(file, "wx", 0o600);
  let facts = 0,
    position = 0,
    frames = 0;
  const spool = createHash("sha256");
  try {
    for (const rows of importFrames(people)) {
      assert(now() < deadline, "Import still had unsent frames at the window ceiling");
      const commandId = `${run}:import:${frames}`;
      const sentAt = now();
      const saved = await writer.transact(rows, { actor: "batch-import", commandId });
      assert(saved.ok, saved.ok ? "" : saved.tag);
      const r = saved.value;
      observe(r);
      const wanted = rows.map((op) => memberOf(op.entityId, op.attribute, op.value));
      const actual = r.triples.map((t) => {
        assert(typeof t.id === "string" && t.id.length && t.validFrom === SEED_VALID_FROM);
        return memberOf(t.entityId, t.attribute, t.value);
      });
      assert(r.position > position && new Set(r.triples.map((t) => t.id)).size === rows.length);
      assert.deepEqual(actual.sort(), wanted.sort());
      facts += actual.length;
      frames++;
      position = r.position;
      const row =
        JSON.stringify({
          commandId,
          position,
          txId: r.txId,
          facts: actual.length,
          rows: sha(actual),
          sentAt,
          ackAt: now(),
        }) + "\n";
      spool.update(row);
      fs.writeSync(fd, row);
      await sleep(5);
    }
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  const endedAt = now();
  assert(endedAt <= deadline, "Import completed outside its observation window");
  return {
    format: "int1-import/1",
    incomingAccount,
    people,
    facts,
    frames,
    position,
    start,
    endedAt,
    factsPerSecond: (facts * 1000) / (endedAt - start),
    sha256: spool.digest("hex"),
  };
}

export function importDigest(rows: ReturnType<typeof importRows>) {
  return sha(rows.map((r) => memberOf(r.entityId, r.attribute, r.value)));
}
