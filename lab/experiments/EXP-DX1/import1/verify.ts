import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { bytes, sha, type Source } from "./source.ts";
import { ImportRun } from "./lane.ts";

// [DX-ACT1] Why: verify each application's physical rows at a single cut, including unlinked entities, against the sealed source and its original assertion IDs. Rejected: reporting import rate on an acknowledged cursor alone.
export async function verifySnapshot(run: ImportRun, complete = true, ownedNamespace?: string) {
  const cut = await run.target.currentPosition(),
    source = run.source,
    hash = createHash("sha256");
  assert.equal(source.header.mode, "snapshot");
  let groups = 0,
    facts = 0,
    frames = 0,
    cursor = 0,
    previous = 0;
  const marker = await run.lookup(run.key + "/manifest");
  assert(marker?.correlationId === run.binding);
  let position: number = marker.position,
    buffer: any[] = [];
  async function nextBulk() {
    while (position < cut) {
      if (!buffer.length) {
        const page = await run.target.feedPage(position, 8);
        buffer = [...page.transactions];
        assert(buffer.length, "Feed stopped before verified cut");
      }
      const row = buffer.shift();
      assert.equal(row.position, ++position);
      if (typeof row.commandId === "string" && row.commandId.startsWith(run.key + "/")) return row;
      if (ownedNamespace)
        assert(
          !row.changes.some((c: any) => c.entityId.startsWith(ownedNamespace)),
          "Unexpected imported-namespace feed change",
        );
    }
    return undefined;
  }
  for (const e of run.entries()) {
    assert.equal(e.first, groups);
    const batch = Array.from({ length: e.end - e.first }, (_, i) => source.group(e.first + i));
    const ops = batch.flatMap((g) => g.ops);
    assert(ops.every((o) => o.op === "assert"));
    const journal = await nextBulk();
    assert.equal(journal?.commandId, e.command);
    assert.equal(e.digest, sha(bytes([run.binding, e.first, e.end, batch])));
    assert(
      journal &&
        journal.position === e.position &&
        journal.position > previous &&
        journal.position <= cut &&
        journal.txId === e.txId &&
        journal.correlationId === e.digest,
    );
    previous = e.position;
    const want = new Map<string, string>();
    for (const [i, o] of ops.entries()) {
      assert(o.op === "assert");
      const c = journal.changes[i];
      assert.equal(c.op, "assert");
      assert.equal(c.recordedAt, e.instant);
      want.set(
        c.tripleId,
        bytes([o.entityId, o.attribute, o.value, o.validFrom, o.validTo ?? null, e.position]),
      );
    }
    assert.equal(want.size, ops.length);
    assert.equal(journal.changes.length, ops.length);
    const entities = [...new Set(ops.map((o) => o.entityId))],
      owned = new Set(entities),
      got = new Map<string, string>();
    for (let j = 0; j < entities.length; j += 64) {
      const b = { position: cut, validAt: source.header.validAt },
        page = await run.target.sweepPage(entities.slice(j, j + 64), b);
      assert.deepEqual(page.reportedBasis, b);
      for (const r of page.rows)
        if (owned.has(r.entityId))
          got.set(
            r.id,
            bytes([r.entityId, r.attribute, r.value, r.validFrom, r.validTo ?? null, r.position]),
          );
    }
    assert.deepEqual(got, want);
    hash.update(
      bytes([e.first, e.end, e.txId, e.digest, [...got].sort(([a], [b]) => a.localeCompare(b))]) +
        "\n",
    );
    facts += ops.length;
    groups = e.end;
    frames++;
    cursor = e.position;
  }
  assert.equal(await nextBulk(), undefined, "Unaccounted import transaction in feed");
  assert.equal(position, cut);
  if (complete) assert.equal(groups, source.header.groups);
  return { cut, cursor, groups, facts, frames, sha256: hash.digest("hex") };
}

export async function touchedWitness(
  reader: import("../../../bench/lib/composition.ts").CompositionHandle,
  source: Source,
  i: number,
  position: number,
  present: boolean,
) {
  const ops = source.group(i).ops;
  assert(ops.every((o) => o.op === "assert"));
  const root = ops[0]!.entityId,
    seen = new Set([root]),
    wanted: string[] = [];
  if (present)
    for (const entity of seen)
      for (const o of ops) {
        if (o.entityId !== entity) continue;
        wanted.push(bytes([o.entityId, o.attribute, o.value, o.validFrom, o.validTo ?? null]));
        if (o.value.type === "ref") seen.add(o.value.value);
      }
  const r = await reader.pull(root, {
    recordedPosition: position,
    validAt: source.header.validAt,
  } as import("../../../bench/lib/composition.ts").Basis);
  const observed = r.triples
    .map((o) => bytes([o.entityId, o.attribute, o.value, o.validFrom, o.validTo?.value ?? null]))
    .sort();
  assert.deepEqual(observed, wanted.sort());
  return {
    ordinal: i,
    position,
    present,
    root,
    count: observed.length,
    digest: sha(bytes(observed)),
    route: r.route,
  };
}
