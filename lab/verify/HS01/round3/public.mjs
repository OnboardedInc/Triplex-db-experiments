// [CX-VHS01-R3] Why: verify genuine core journal writes through the built public match API and publication bytes. Rejected: assuming hand-built worker rows prove the public path.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { Effect, Layer, ManagedRuntime } from "effect";
import * as core from "../../../../packages/core/dist/index.js";
import * as rt from "../../../../packages/core/dist/runtime/index.js";
import * as q from "../../../../packages/qlever/dist/index.js";
import { buildPublication } from "../../../../packages/qlever/dist/broker/sparql.js";
import { createRequire } from "node:module";
const Database = createRequire(
  new URL("../../../../packages/qlever/package.json", import.meta.url),
)("better-sqlite3");
const out = process.env.VHS01_OUT;
if (!out) throw Error("bound runner required");
const results = [];
for (const option of [undefined, true]) {
  const dir = path.join(out, option ? "records" : "default"),
    scope = "vhs3:public";
  const broker = await q.HostBroker.open({
    dir,
    scopeKey: scope,
    minFreeBytes: 0,
    ...(option ? { journalRecords: true } : {}),
  });
  const detached = {
    query: async () => [],
    update: async () => {
      throw Error("offline");
    },
    command: async () => {
      throw Error("offline");
    },
    cancel: async () => {},
    close: async () => {},
  };
  const adapter = q.makeQleverStorageAdapter(detached, scope, {
    broker,
    brokerOptions: { basisWaitMs: 1 },
  });
  const layer = rt.Runtime.define({
    name: "vhs3-public",
    storage: Layer.succeed(rt.StorageAdapter, adapter),
    queries: Layer.succeed(
      rt.QueryExecutor,
      q.makeQleverQueryExecutor(detached, scope, { sourceView: adapter.sourceView }),
    ),
  }).layer({
    scope: rt.DatabaseScope.test(scope),
    capabilities: rt.Capabilities.none,
    deterministic: { startTime: 1790000000000, seed: scope },
  });
  const managed = ManagedRuntime.make(layer);
  try {
    const T = await managed.runPromise(Effect.service(core.Triples));
    const receipt = await managed.runPromise(
      T.transact(
        [
          {
            op: "assert",
            entityId: "witness:1",
            attribute: ":name",
            entityType: "Witness",
            value: { type: "string", value: "example" },
          },
        ],
        { actor: "test-client", commandId: "witness-command" },
      ),
    );
    const changed = await managed.runPromise(
      T.match({ entityId: receipt.txId, attribute: ":_tx/changed-entity" }),
    );
    const changes = await managed.runPromise(
      T.match({ entityId: receipt.txId, attribute: ":_tx/change" }),
    );
    assert.equal(changed.length, 1);
    assert.equal(changes.length, 1);
    assert.deepEqual(changed[0].value, { type: "ref", value: "witness:1" });
    const payload = changes[0].value.value;
    assert.equal(payload.tripleId, receipt.triples[0].id);
    assert.equal(payload.entityId, "witness:1");
    const db = new Database(path.join(dir, "broker.db"), { readonly: true });
    const records = db.prepare("select count(*) n from jrec").get().n;
    const journal = db.prepare("select count(*) n from journal").get().n;
    const members = db
      .prepare("select payload from frames where kind=1 order by lsn")
      .all()
      .flatMap((f) => q.decodeCommitGroup(f.payload).members);
    db.close();
    const journalRows = members
      .flatMap((m) => m.rows)
      .filter((r) => r.entity_type === "_Transaction");
    for (const attribute of [":_tx/changed-entity", ":_tx/change"])
      assert.equal(journalRows.filter((r) => r.attribute === attribute).length, 1);
    const publication = buildPublication(
      scope,
      { position: 0, epoch: 1 },
      { position: receipt.position, epoch: 1 },
      members,
    );
    assert(publication.sparql.includes(":_tx/changed-entity"));
    assert(publication.sparql.includes(":_tx/change"));
    if (option) assert.equal(records, 1);
    else {
      assert.equal(records, 0);
      assert.equal(journal, journalRows.length);
    }
    results.push({
      option: option ?? false,
      receipt,
      changed,
      changes,
      records,
      journal,
      publicationInserts: publication.inserts,
      publicationContainsBothJournalAttributes: true,
    });
  } finally {
    await managed.dispose();
    await broker.close();
  }
}
assert.deepEqual(results[0].changed, results[1].changed);
assert.deepEqual(results[0].changes, results[1].changes);
fs.writeFileSync(path.join(out, "public.json"), JSON.stringify(results, null, 2));
console.log(
  JSON.stringify({
    matchedJournalAttributes: 2,
    defaultAndOnExact: true,
    publicationPreservesBoth: true,
  }),
);
