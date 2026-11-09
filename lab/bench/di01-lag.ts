import { evidenceBinding } from "./lib/di01-evidence.ts";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DependencyIndex, SqliteConsumerStore } from "../../packages/host/dist/feed/index.js";
import { DomainOracle } from "./lib/di01-harness.ts";
import { dependencyPlans, memoryReferenceReader, resolveActivation } from "./lib/di01-refs.ts";
import { memoryComposition, dropMemoryScope } from "./lib/memory.ts";
import { W0, V_W0, canonical, sha256, triplexValue } from "./lib/w0-world.ts";
const binding = evidenceBinding();
const root =
  process.argv[2] ?? `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-DI01/lag-${randomUUID()}`;
fs.mkdirSync(root, { recursive: true });
const files = [
  "lab/bench/di01-lag.ts",
  "lab/bench/lib/di01-refs.ts",
  "packages/host/src/feed/ConsumerStore.ts",
  "packages/host/src/feed/DependencyIndex.ts",
  "packages/w0/src/population.ts",
  "packages/w0/src/kernel.ts",
  "lab/oracles/domain/w0.py",
];
const source = () => Object.fromEntries(files.map((f) => [f, sha256(fs.readFileSync(f))]));
const start = source();
const scope = "DI01-lag-" + randomUUID(),
  comp = memoryComposition("xtdb", scope),
  R = W0.rung(100000),
  worlds: W0.World[] = [],
  refs: any[] = [];
// [EXP-DI01] Why: the 100k diagnostic needs the population's exact reference graph; outputs and ballast cannot change dependencies. Rejected: a hand-made 1125/1953 fanout fixture.
for (let r = 1; r <= R.L; r++)
  refs.push([W0.locationId(R, r), "jurisdiction", W0.jurisdictionId(R, W0.jurisdictionOf(R, r))]);
for (let i = 0; i < R.N; i++) {
  const p = W0.plan(R, i),
    facts: W0.Fact[] = [];
  if (p.rank !== null) {
    const L = W0.locationId(R, p.rank),
      J = W0.jurisdictionId(R, W0.jurisdictionOf(R, p.rank));
    facts.push({ e: p.S, a: "location", v: L, tx: 1 }, { e: L, a: "jurisdiction", v: J, tx: 1 });
    refs.push([p.S, "location", L]);
  }
  if (p.doc !== null) {
    facts.push({ e: p.S, a: "documents", v: p.S + "/doc:1", tx: 1 });
    refs.push([p.S, "documents", p.S + "/doc:1"]);
  }
  for (const d of [...p.i9Records, p.bgcRecord, p.payRecordBefore, p.payRecordAfter])
    if (d) {
      facts.push({ e: p.S, a: "decisions", v: d.id, tx: 1 });
      refs.push([p.S, "decisions", d.id]);
    }
  worlds.push({ subject: p.S, facts });
}
const oracleFd = fs.openSync(path.join(root, "oracle.jsonl"), "wx"),
  oracle = new DomainOracle(oracleFd);
let readerMs = 0;
const readMemory = memoryReferenceReader(comp);
const timedRead: typeof readMemory = async (...args) => {
  const started = performance.now();
  try {
    return await readMemory(...args);
  } finally {
    readerMs += performance.now() - started;
  }
};
const index = new DependencyIndex(path.join(root, "di.db"), {
  consumer: "c",
  validAt: V_W0,
  initialRelease: W0.R2.hash,
  plans: dependencyPlans(),
  readRefs: timedRead,
  resolveActivation,
});
const base = new SqliteConsumerStore(path.join(root, "fd.db"));
const pageOf = async (position: number) => {
  const page = await comp.feedPage(position - 1, 1),
    tx: any = page.transactions[0];
  assert.equal(tx.position, position);
  return {
    entries: [
      {
        kind: "commit",
        stream: "lag",
        epoch: "0",
        offset: String(position),
        transactions: [
          {
            positions: [String(position)],
            txIds: [tx.txId],
            commandIds: [],
            operationId: tx.txId,
            stamp: null,
            stampStatus: "pending-RT01",
            changes: tx.changes.map((c: any) => ({
              op: c.op,
              entity: c.entityId,
              attribute: c.attribute,
              assertionId: c.tripleId,
              position: String(position),
              validFrom: c.validFrom,
              validTo: c.validTo ?? null,
            })),
          },
        ],
      },
    ],
    cursor: { source: "DI01/100k/memory", token: String(position) },
  } as any;
};
let locAssertion = "";
for (let at = 0; at < refs.length; at += 2000) {
  const result = await comp.transact(
    refs.slice(at, at + 2000).map(([entityId, attribute, v]) => ({
      op: "assert",
      entityId,
      attribute,
      value: triplexValue(attribute, v),
      validFrom: V_W0,
    })),
    { commandId: "bootstrap:" + at },
  );
  assert(result.ok);
  if (!result.ok) throw Error(result.tag);
  for (const t of result.value.triples)
    if (t.entityId === "loc:l0001" && t.attribute === "jurisdiction") locAssertion = t.id;
  await index.consume(index.checkpoint("c"), await pageOf(result.value.position));
}
const bootstrapPosition = await comp.currentPosition();
let crosscheckSubjects = 0;
for (const w of worlds) {
  const o = W0.evaluateWorld(w, W0.R2, {
    tx: bootstrapPosition,
    validTime: W0.POPULATION_VALID_TIME,
  });
  assert(!W0.isFailure(o));
  assert.deepEqual(index.instantiated(w.subject, W0.R2.hash), o.dependencies);
  crosscheckSubjects++;
}
const tests = [
  ["local", "loc:l0001", "localMinWageCents", 1900],
  ["state", "jur:j001", "stateMinWageCents", 1800],
  ["repoint", "loc:l0001", "jurisdiction", "jur:j002"],
  ["subject", W0.placementId(1), "weeklyMinutes", 3000],
] as const;
const rerunFile = fs.openSync(path.join(root, "reruns.jsonl"), "wx");
const raw = fs.openSync(path.join(root, "samples.jsonl"), "wx"),
  results: any[] = [];
for (const [label, e, a, value] of tests) {
  const expected = await oracle.run("affected", {
    release: "R2",
    basis: { tx: bootstrapPosition, validTime: W0.POPULATION_VALID_TIME },
    worlds,
    writes: [[e, a]],
  });
  assert(!expected.error);
  assert.deepEqual(index.reach([[e, a]], W0.R2.hash), expected.affected);
  const samples: {
    di: number;
    fd: number;
    added: number;
    read: number;
    preparation: number;
    apply: number;
    diWithoutRead: number;
  }[] = [];
  let firstPosition = 0;
  for (let i = 0; i < 1000; i++) {
    const writeValue = label === "repoint" ? (i % 2 ? "jur:j001" : "jur:j002") : value;
    const operations: any[] = [];
    if (label === "repoint") operations.push({ op: "retract", id: locAssertion });
    operations.push({
      op: "assert",
      entityId: e,
      attribute: a,
      value: triplexValue(a, writeValue),
      validFrom: V_W0,
    });
    const write = await comp.transact(operations, { commandId: `${label}:${i}` });
    assert(write.ok);
    if (!write.ok) throw Error(write.tag);
    if (label === "repoint") locAssertion = write.value.triples[0].id;
    if (i === 0) firstPosition = write.value.position;
    const p = await pageOf(write.value.position),
      readerBefore = readerMs,
      beforeRead = performance.now(),
      derive = await index.prepare(p),
      preparation = performance.now() - beforeRead,
      read = readerMs - readerBefore;
    const affected = expected.affected.map((subject: string) => ({
      epoch: "0",
      position: String(write.value.position),
      subject,
    }));
    let di = 0,
      fd = 0;
    const runDI = () => {
      const t = performance.now();
      index.applyDerived("c", index.checkpoint("c"), p, derive);
      di = performance.now() - t;
    };
    const runFD = () => {
      const t = performance.now();
      base.apply("c", base.checkpoint("c"), p, affected);
      fd = performance.now() - t;
    };
    if (i % 2) {
      runDI();
      runFD();
    } else {
      runFD();
      runDI();
    }
    assert.deepEqual(index.affectedAt("c", "0", String(write.value.position)), expected.affected);
    // [EXP-DI01] Why: charge all preparation to DI01; only the actual pinned-reader interval is excluded for the repoint prediction. Rejected: timing only the SQLite transaction and labeling complete prepare time as I/O.
    if (label === "repoint")
      assert(
        index
          .instantiated(expected.affected[0], W0.R2.hash)
          .some(([entity, attr]) => entity === writeValue && attr === "stateMinWageCents"),
      );
    const apply = di;
    di += preparation;
    const diWithoutRead = di - read;
    const sample = {
      di,
      fd,
      added: (label === "repoint" ? diWithoutRead : di) - fd,
      read,
      preparation,
      apply,
      diWithoutRead,
    };
    samples.push(sample);
    fs.writeSync(
      raw,
      JSON.stringify({
        label,
        i,
        position: write.value.position,
        value: writeValue,
        order: i % 2 ? "di-fd" : "fd-di",
        ...sample,
      }) + "\n",
    );
  }
  const p99 = (key: keyof (typeof samples)[number]) =>
    samples.map((s) => s[key]).sort((a, b) => a - b)[989];
  const rerun = index.affectedAt("c", "0", String(firstPosition));
  assert.deepEqual(rerun, expected.affected);
  // [EXP-DI01] Why: execute one kernel rerun per persisted affected worker, separately from timed apply. Complete W0 bodies use normalized commit ages in this offline fixture. Rejected: calling uniqueness of an oracle array a rerun, or calling these synthetic outputs a lane read.
  for (const subject of rerun) {
    const body = W0.build(R, W0.plan(R, Number(subject.slice(4))), 1, false).world;
    const facts = body.facts.filter((f) => !(f.e === e && f.a === a)).map((f) => ({ ...f, tx: 1 }));
    facts.push({ e, a, v: value, tx: 2 });
    if (label === "repoint" && !facts.some((f) => f.e === value && f.a === "stateMinWageCents"))
      facts.push({ e: String(value), a: "stateMinWageCents", v: W0.stateFloor(2), tx: 1 });
    const output = W0.evaluateWorld({ subject, facts }, W0.R2, {
      tx: 2,
      validTime: W0.POPULATION_VALID_TIME,
    });
    assert(!W0.isFailure(output));
    fs.writeSync(
      rerunFile,
      canonical({
        label,
        position: firstPosition,
        subject,
        fixture: "full W0 body with normalized commit ages",
        outputSha256: sha256(W0.outputJson(output)),
      }) + "\n",
    );
  }
  assert.equal(new Set(rerun).size, rerun.length);
  results.push({
    label,
    fanout: expected.affected.length,
    affectedSha256: sha256(canonical(expected.affected)),
    rerunOnce: rerun.length,
    samples: 1000,
    diP99: p99("di"),
    fdP99: p99("fd"),
    addedP99: p99("added"),
    pinnedReadP99: p99("read"),
    preparationP99: p99("preparation"),
    applyP99: p99("apply"),
    diWithoutReadP99: p99("diWithoutRead"),
    predictionMet: p99("added")! <= 20,
  });
  console.log(results.at(-1));
}
assert.deepEqual(source(), start);
assert.deepEqual(evidenceBinding(), binding);
fs.closeSync(raw);
fs.closeSync(rerunFile);
oracle.close();
fs.closeSync(oracleFd);
index.close();
base.close();
dropMemoryScope(scope);
fs.writeFileSync(
  path.join(root, "result.json"),
  JSON.stringify(
    {
      status: "MATCH",
      binding,
      source: start,
      attempt: randomUUID(),
      rung: 100000,
      fixture: "population reference projection",
      referenceRows: refs.length,
      worlds: worlds.length,
      crosscheckSubjects,
      validAt: V_W0,
      offline: true,
      readers: 0,
      slot: null,
      results,
    },
    null,
    2,
  ),
);
console.log(root);
