import assert from "node:assert/strict";
import { test, after } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Replay, indexFor, W0, crosscheck } from "./lib/di01-harness.ts";
import {
  dependencyPlans,
  storageReferenceReader,
  memoryReferenceReader,
  resolveActivation,
} from "./lib/di01-refs.ts";
import { DependencyIndex } from "../../packages/host/dist/feed/index.js";
import { memoryComposition } from "./lib/memory.ts";
import { triplexValue, V_W0 } from "./lib/w0-world.ts";
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "DI01-test-"));
after(() => fs.rmSync(dir, { recursive: true, force: true }));
let n = 0;
const make = (r: Replay) => indexFor(path.join(dir, `${n++}.db`), r, V_W0, W0.R2);
test("before-state fanout, unlinked owned records, retraction, multiposition ordering and duplicate replay", async () => {
  const r = new Replay(),
    d = make(r);
  const seed = r.add(
    [
      ["loc:a", "jurisdiction", "jur:a"],
      ["loc:b", "jurisdiction", "jur:b"],
      ["pl:a", "location", "loc:a"],
      ["pl:b", "location", "loc:b"],
    ],
    V_W0,
  );
  await d.consume(null, seed);
  const unlinked = r.add([["pl:a/doc:1", "docType", "ead"]], V_W0);
  await d.consume(seed.cursor, unlinked);
  assert.deepEqual(d.affectedAt("c", "0", "2"), []);
  const link = r.add(
    [
      ["pl:a", "documents", "pl:a/doc:1"],
      ["pl:a/doc:1", "reverified", true],
    ],
    V_W0,
  );
  const hop = r.add(
    [
      ["loc:a", "jurisdiction", "jur:b"],
      ["jur:b", "stateMinWageCents", 1900],
    ],
    V_W0,
  );
  const next = r.add([["jur:b", "stateMinWageCents", 2000]], V_W0);
  const page = { entries: [...link.entries, ...hop.entries, ...next.entries], cursor: next.cursor };
  await d.consume(unlinked.cursor, page);
  assert.deepEqual(d.affectedAt("c", "0", "3"), ["pl:a"]);
  assert.deepEqual(d.affectedAt("c", "0", "4"), ["pl:a", "pl:b"]);
  assert.deepEqual(d.affectedAt("c", "0", "5"), ["pl:a", "pl:b"]);
  crosscheck(d, r, 5, V_W0, W0.R2);
  const snap = d.dependencySnapshot("c");
  await d.consume(next.cursor, page);
  assert.deepEqual(d.dependencySnapshot("c"), snap);
  const retract = r.add([], V_W0, [["pl:a", "location"]]);
  await d.consume(page.cursor, retract);
  const write = r.add([["jur:b", "stateMinWageCents", 2100]], V_W0);
  await d.consume(retract.cursor, write);
  assert.deepEqual(d.affectedAt("c", "0", "7"), ["pl:b"]);
  d.close();
});
test("failed pinned reads, invalid time references and deriver exceptions leave all durable state unchanged", async () => {
  const r = new Replay(),
    file = path.join(dir, `${n++}.db`),
    opts = {
      consumer: "c",
      validAt: V_W0,
      initialRelease: W0.R1.hash,
      plans: dependencyPlans(),
      resolveActivation,
    };
  const d = new DependencyIndex(file, {
      ...opts,
      readRefs: async () => {
        throw Error("BasisNotAvailable");
      },
    }),
    page = r.add([["pl:a", "location", "loc:a"]], V_W0);
  const before = d.dependencySnapshot("c");
  await assert.rejects(d.consume(null, page), /BasisNotAvailable/);
  assert.deepEqual(d.dependencySnapshot("c"), before);
  assert.equal(d.checkpoint("c"), null);
  assert.throws(
    () =>
      d.applyDerived("c", null, page, (db) => {
        db.prepare("INSERT INTO di_ref VALUES(?,?,?,?)").run("c", "pl:a", "location", "loc:a");
        return [{ epoch: "0", position: "999", subject: "pl:a" }];
      }),
    /outside page/,
  );
  assert.deepEqual(d.dependencySnapshot("c"), before);
  d.close();
  const invalid = new DependencyIndex(file, {
    ...opts,
    readRefs: async () => [
      { entity: "pl:a", attribute: "location", value: "loc:a", position: 2, validFrom: V_W0 },
    ],
  });
  await assert.rejects(
    invalid.consume(null, page),
    (e: any) => e._tag === "BasisNotAvailable" && e.reason === "row-outside-basis",
  );
  const future = r.add([["pl:a", "location", "loc:b"]], V_W0 + 1);
  await assert.rejects(invalid.consume(null, future), /fixed-valid-time/);
  invalid.close();
});
test("durable basis binding rejects reopening at a different V, release or compiled plan", async () => {
  const r = new Replay(),
    file = path.join(dir, `${n++}.db`),
    p = r.add([["pl:a", "location", "loc:a"]], V_W0),
    d = indexFor(file, r, V_W0);
  await d.consume(null, p);
  d.close();
  const changed = indexFor(file, r, V_W0 + 1);
  await assert.rejects(changed.consume(p.cursor, p), /configuration changed/);
  changed.close();
});
test("storage reader uses one position-pinned batch, rejects behind and retracted results; memory reader is one hop", async () => {
  let calls = 0;
  const storage = {
    currentCommitPosition: () => 10,
    getByEntities: (entities: any, basis: any) => {
      calls++;
      assert.deepEqual(entities, ["loc:a"]);
      assert.deepEqual(basis, { recordedPosition: 5, validAt: V_W0 });
      return new Map([
        [
          "loc:a",
          [
            {
              id: "a",
              entity_id: "loc:a",
              attribute: "jurisdiction",
              value_string: "jur:a",
              recorded_position: 4,
              valid_from: V_W0,
            },
          ],
        ],
      ]);
    },
  };
  const reader = storageReferenceReader({ storage, run: async (e: any) => e });
  assert.equal((await reader(["loc:a"], 5, V_W0))[0].value, "jur:a");
  assert.equal(calls, 1);
  storage.currentCommitPosition = () => 1;
  await assert.rejects(reader(["loc:a"], 5, V_W0), /BasisNotAvailable/);
  const comp = memoryComposition("xtdb", "DI01-reader-" + n++);
  await comp.transact(
    [
      ["pl:a", "location", "loc:a"],
      ["loc:a", "jurisdiction", "jur:a"],
    ].map(([entityId, attribute, v]) => ({
      op: "assert",
      entityId,
      attribute,
      value: triplexValue(attribute, v),
      validFrom: V_W0,
    })),
    {},
  );
  const memory = memoryReferenceReader(comp);
  assert.deepEqual(
    (await memory(["pl:a"], 1, V_W0)).map((r) => r.entity),
    ["pl:a"],
  );
});
