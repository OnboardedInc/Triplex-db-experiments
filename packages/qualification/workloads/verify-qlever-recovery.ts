import { parseLatencyReceipt } from "../../../lab/receipts/parse.ts";
/** Independent read-only checks of acknowledged data predating the OOM waves. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Effect } from "effect";
import {
  EntityId,
  Triples,
  blob,
  boolean,
  datetime,
  integer,
  json,
  number,
  ref,
  string,
} from "@triplex-build/triplex";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import { loadQualificationBackend } from "@triplex-build/triplex-qualification";

const root = path.resolve(import.meta.dirname, "../../..");
const argument = process.argv.indexOf("--output");
const output = path.resolve(process.argv[argument + 1]!);
assert.ok(argument >= 0 && output.startsWith(path.join(root, "qualification") + path.sep));
const inputs = {
  scalarLog: "qualification/evidence/qlever/cases-2026-11-06T14-53-16-698Z-2891552e.log",
  workloadRun:
    "qualification/evidence/qlever/workloads-2026-11-06T14-37-48-090Z-ef903d8b-workloads.json",
  events: "qualification/workloads/temporal-workloads.json",
  sentinel:
    "qualification/evidence/qlever-cancel-restart-ab62c5a3-b727-47a9-8f57-bf5f5f175ba8.json",
};
const read = (file: string) => readFileSync(path.join(root, file), "utf8");
const oldRun = parseLatencyReceipt(read(inputs.workloadRun), { lane: "qlever", source: inputs.workloadRun });
const events = JSON.parse(read(inputs.events)).workloads.find(
  (workload: any) => workload.id === "17",
).events;
const oldFunnel = oldRun.workloads.find((workload: any) => workload.id === "17");
const sentinel = parseLatencyReceipt(read(inputs.sentinel), { lane: "qlever", source: inputs.sentinel });
const scalarStart = read(inputs.scalarLog)
  .split("\n")
  .flatMap((line) => {
    try {
      const item = JSON.parse(line);
      return item.case === "datalog projections preserve scalar types without guessing from text"
        ? [item]
        : [];
    } catch {
      return [];
    }
  })[0];
assert.ok(scalarStart?.scope);
const backend = await loadQualificationBackend();
assert.equal(backend.name, "qlever");
const run = <A, E>(scope: DatabaseScope, program: Effect.Effect<A, E, Triples>) =>
  Effect.runPromise(
    program.pipe(
      Effect.provide(backend.makeRuntime().layer({ scope, capabilities: Capabilities.none })),
      Effect.scoped,
    ),
  );
const scalarExpected = {
  ":conf/code": string("007"),
  ":conf/count": number(7),
  ":conf/enabled": boolean(true),
  ":conf/instant": datetime(1700000000000),
  ":conf/data": json({ ok: true }),
  ":conf/owner": ref(EntityId.make("7")),
  ":conf/blob": blob("sha256:artifact", "application/pdf", 128, "artifact.pdf"),
};
const scalar = await run(
  scalarStart.scope as DatabaseScope,
  Effect.gen(function* () {
    const triples = yield* Triples;
    const facts = yield* triples.entity(EntityId.make("42"), { validAt: Number.MAX_SAFE_INTEGER });
    assert.equal(facts.length, 7);
    assert.deepEqual(
      Object.fromEntries(facts.map((fact) => [fact.attribute, fact.value])),
      scalarExpected,
    );
    const journal = yield* triples.transactions({ after: 0, limit: 2 });
    assert.equal(journal.transactions.length, 1);
    const receipt = journal.transactions[0]!;
    assert.equal(receipt.position, 1);
    assert.equal(receipt.changes.length, 7);
    for (const change of receipt.changes)
      assert.ok(
        facts.some(
          (fact) =>
            fact.id === change.tripleId &&
            JSON.stringify(fact.value) === JSON.stringify(change.value),
        ),
      );
    assert.equal(yield* triples.currentPosition(), 1);
    return {
      status: "PASS",
      scope: scalarStart.scope,
      sourcePosition: 1,
      typedFacts: 7,
      receipt: receipt.txId,
    };
  }),
);
const sentinelResult = await run(
  DatabaseScope.test(`recovery:${sentinel.run}`),
  Effect.gen(function* () {
    const triples = yield* Triples;
    const facts = yield* triples.entity(EntityId.make("recovery:sentinel"), { validAt: 100 });
    assert.equal(facts.length, 2);
    const values = Object.fromEntries(facts.map((fact) => [fact.attribute, fact.value]));
    assert.deepEqual(values[":recovery/exact"], integer("9223372036854775807"));
    assert.deepEqual(values[":recovery/float"], number(1.0000000000000002));
    const receipt = yield* triples.transactionByCommand(`recovery:${sentinel.run}`);
    assert.equal(receipt?.txId, sentinel.recovered.receipt.txId);
    assert.equal(receipt?.position, 1);
    assert.equal(yield* triples.currentPosition(), 1);
    return { status: "PASS", sourcePosition: 1, typedFacts: facts.length, receipt: receipt?.txId };
  }),
);
const funnel = await run(
  oldFunnel.scope as DatabaseScope,
  Effect.gen(function* () {
    const triples = yield* Triples;
    const receipt = yield* triples.transactionByCommand(oldFunnel.groups[0].commandId);
    assert.equal(receipt?.position, 1);
    assert.equal(receipt?.changes.length, 36);
    let checkedFacts = 0;
    for (const event of events) {
      const facts = yield* triples.entity(EntityId.make(event.id), {
        validAt: 1000050,
        recordedAt: 1001,
      });
      assert.equal(facts.length, 3);
      for (const [field, payload] of Object.entries(event.payload) as [
        string,
        { tag: string; value: string },
      ][]) {
        const attribute = `:w17/a${Buffer.from(field).toString("hex")}`;
        const expected = payload.tag === "i64" ? integer(payload.value) : string(payload.value);
        const fact = facts.find((fact) => fact.attribute === attribute);
        assert.ok(fact);
        assert.deepEqual(fact.value, expected);
        assert.equal(fact.validFrom, 1000000 + Number(event.occurred_at));
        assert.equal(fact.recordedAt, 1001);
        assert.ok(
          receipt!.changes.some(
            (change) => change.tripleId === fact.id && change.attribute === attribute,
          ),
        );
        checkedFacts++;
      }
    }
    assert.equal(yield* triples.currentPosition(), 1);
    return {
      status: "PASS",
      sourcePosition: 1,
      typedFacts: checkedFacts,
      entities: events.length,
      receipt: receipt?.txId,
    };
  }),
);
const report = {
  format: "triplex-independent-qlever-data-recovery/1",
  timestampUtc: new Date().toISOString(),
  status: "PASS_READ_RECOVERY_ONLY",
  backend: backend.name,
  scalar,
  sentinel: sentinelResult,
  funnel,
  sourceSha256: Object.fromEntries(
    Object.values(inputs).map((file) => [
      file,
      createHash("sha256").update(read(file)).digest("hex"),
    ]),
  ),
  limitations: [
    "Reads retained original development data through public Triplex storage APIs. No queries of the candidate copies are used.",
    "Independent expected payloads come from upstream fixture literals and immutable business events, not current query answers.",
    "This verifies selected acknowledged data/source cuts after read OOM and owned restart; it does not prove interrupted write or power-loss atomicity.",
  ],
};
writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ status: report.status, output, typedFacts: 45 }));
