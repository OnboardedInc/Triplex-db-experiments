import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { openNative } from "./native.ts";
import { ImportRun, pace } from "./lane.ts";
import { fileSource, snapshot, bytes, sha, type Group } from "./source.ts";
import { openTriples, runtimeApi } from "../../../bench/lib/triplex.ts";
import { DatomicClient, withDatomicImportClock } from "../../../../packages/datomic/dist/index.js";
const root = process.argv[2]!;
mkdirSync(root);
const id = randomUUID(),
  scope = "import-history-strict-control-" + id,
  live = await openNative(scope, "snapshot");
const h = await openTriples("datomic", scope),
  client = new DatomicClient(process.env.DATOMIC_URL!);
try {
  const key = String(runtimeApi.DatabaseScope.test(scope));
  assert((await client.create(key, "lean", false)).strictRecordClocks);
  const ops = [
    {
      op: "assert",
      entityId: "p",
      attribute: ":correction",
      value: { type: "integer", value: "42" },
      validFrom: 100,
    },
  ];
  const bad = await h.runExit(
    withDatomicImportClock(key, 200, h.triples.transact(ops, { commandId: "old-record-clock" })),
  );
  assert.equal(bad._tag, "Failure");
  assert.equal(await live.currentPosition(), 0);
  const r = await live.write(ops, { commandId: "old-valid-clock" });
  assert(r.instant > 200);
  assert.equal((await live.pull("p", { recordedAt: 200, validAt: 100 })).triples.length, 0);
  assert.equal(
    (await live.pull("p", { recordedAt: r.instant, validAt: 100 })).triples[0]!.validFrom,
    100,
  );
  const src = snapshot("thin", 6, "dedup/", id),
    policy = pace(8, 1),
    ck = join(root, "cursor"),
    run = await ImportRun.open(live, src, policy, ck);
  const first = await run.importAt(0);
  await assert.rejects(run.importAt(3), /Gap/);
  run.close();
  const retry = await ImportRun.open(live, src, policy, ck);
  assert.deepEqual(await retry.importAt(0), first);
  retry.close();
  const rebuilt = await ImportRun.open(live, src, policy, join(root, "rebuilt"));
  const recovered = await rebuilt.step();
  assert(recovered?.recovered && recovered.txId === first.txId);
  rebuilt.close();
  const other = {
    ...src,
    group(i: number) {
      const g = src.group(i);
      g.ops[0] = { ...(g.ops[0] as any), attribute: ":different" };
      return g;
    },
  };
  const mismatch = await ImportRun.open(live, other, policy, join(root, "different"));
  const before = await live.currentPosition();
  await assert.rejects(mismatch.step());
  mismatch.close();
  assert.equal(await live.currentPosition(), before);
  await assert.rejects(ImportRun.open(live, src, pace(16, 1), join(root, "changed-boundary")));
  const m = { source: "edges", generation: id, mode: "history" as const, groups: 1, validAt: 250 },
    g: Group = {
      ordinal: 0,
      id: "a",
      instant: 10,
      ops: [
        {
          op: "assert",
          ref: "x",
          entityId: "p",
          attribute: ":a",
          value: { type: "string", value: "x" },
          validFrom: 1,
        },
      ],
    };
  for (const [i, bad] of [
    [{ ...g, ordinal: 1 }],
    [{ ...g, ops: [...g.ops, { ...g.ops[0], validFrom: 2, validTo: 2 }] }],
    [{ ...g, ops: [{ op: "erase", target: "x" }] }],
  ].entries())
    assert.throws(() => fileSource(join(root, "invalid" + i), m, bad as Group[]));
  writeFileSync(
    join(root, "edges.json"),
    bytes({
      id,
      scope,
      strict: true,
      nativeFirst: sha(bytes(first)),
      replayed: sha(bytes(await live.transactionByCommand(first.commandId))),
      position: before,
      record: r.instant,
      valid: 100,
    }),
    { flag: "wx" },
  );
} finally {
  client.close();
  await h.close();
  await live.close();
}
