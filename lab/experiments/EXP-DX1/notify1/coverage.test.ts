import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test, type TestContext } from "node:test";
import { openComposition } from "../../../bench/lib/composition.ts";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { DomainOracle } from "../../../bench/lib/w0-gates.ts";
import { W0, reachableRows, triplexValue, worldOf } from "../../../bench/lib/w0-world.ts";
import { Dispatcher } from "./dispatcher.ts";
import {
  assertDeadlinePublication,
  captureDeadlineCut,
  publicationChunk,
  publicationManifest,
} from "./deadline.ts";
import { Notices, type Cut, type Request } from "./journal.ts";
import { Conflict, Documents, hash, pack, parse, type Ack, type Op } from "./store.ts";
import { verify, wireDelivery, type Offered } from "./verify.ts";

const valid = W0.POPULATION_VALID_TIME;
const subjects = ["pl:a", "pl:b"];
const subjectFacts = (e: string, pay: number) => [
  { e, a: "location", v: "loc:a" },
  { e, a: "payRateCents", v: pay },
  { e, a: "bgcStatus", v: "clear" },
];
const seed = [
  ...subjects.flatMap((s) => subjectFacts(s, 1750)),
  { e: "loc:a", a: "jurisdiction", v: "jur:a" },
  { e: "loc:a", a: "localMinWageCents", v: 1700 },
  { e: "jur:a", a: "stateMinWageCents", v: 1650 },
];
const put = (f: (typeof seed)[number], validFrom = 0, validTo?: number): Op => ({
  op: "assert",
  entityId: f.e,
  attribute: f.a,
  value: triplexValue(f.a, f.v),
  validFrom,
  ...(validTo === undefined ? {} : { validTo }),
});
const open = (scope: string) =>
  process.env.NOTIFY_NATIVE === "1"
    ? openComposition("reach", "datomic", scope)
    : Promise.resolve(memoryComposition("datomic", scope));

async function fixture(t: TestContext, roster = subjects) {
  const epoch = randomUUID(),
    src = await open("coverage-" + epoch);
  t.after(() => src.close());
  const receiver = await open("coverage-sink-" + epoch);
  t.after(() => receiver.close());
  const facts = roster.includes("pl:c") ? [...seed, ...subjectFacts("pl:c", 2500)] : seed;
  const initial = await src.transact(
    facts.map((f) => put(f)),
    { commandId: "seed" },
  );
  assert(initial.ok);
  const seeded = initial.value;
  const a = new Notices(src, "account", {
    identity: "raw-shared-wage-fixture",
    roster: async () => roster,
    worlds: async (ids, cut) => {
      const basis = { position: cut.position, validAt: Date.parse(cut.validTime) };
      const result = await src.sweepPage(ids, basis);
      assert.deepEqual(result.reportedBasis, basis);
      return ids.map((s) => worldOf(s, reachableRows([s], result.rows)));
    },
  });
  const worker = new Dispatcher(a, new Documents(receiver, "recipient"));
  await a.create(epoch, valid);
  const publish: Request = {
    id: "publish",
    kind: "activation",
    release: "R2",
    validTime: valid,
    from: valid,
    selection: { kind: "census" },
  };
  function floor(attribute: string, amount: number, effective = 0) {
    const original = seeded.triples.find((t) => t.attribute === attribute)!;
    const prior = facts.find((f) => f.a === attribute)!;
    const changed = { ...prior, v: amount };
    const ops: Op[] = [{ op: "retract", id: original.id }];
    if (effective > 0) ops.push(put(prior, 0, effective));
    ops.push(put(changed, effective));
    const checks = [{ _tag: "TripleLive", id: original.id } as const];
    function witness(saved: Ack) {
      return async (ids: string[], cut: Cut) =>
        ids.map((subject) => ({
          subject,
          facts: facts
            .filter((f) => !W0.isPlacementId(f.e) || f.e === subject)
            .map((f) => {
              if (f.a !== attribute || cut.position < saved.position)
                return { ...f, tx: seeded.position };
              return {
                ...(Date.parse(cut.validTime) < effective ? prior : changed),
                tx: saved.position,
              };
            }),
        }));
    }
    return { ops, checks, witness };
  }
  return { a, worker, publish, floor, src, receiver };
}

test("a shared local floor correction covers both readers of the edge", async (t) => {
  const { a, worker, publish, floor } = await fixture(t);
  const oracle = new DomainOracle(new URL("./oracle.py", import.meta.url).pathname);
  t.after(() => oracle.close());
  const live = await a.append(await a.observe(), publish);
  await worker.drain();
  assert.deepEqual(await worker.effects(), []);
  const save: Request = {
    ...publish,
    id: "floor",
    kind: "reconcile",
    selection: { kind: "subjects", ids: [subjects[0]!] },
  };
  const correction = floor("localMinWageCents", 1800);
  const saved = await a.append(await a.observe(), save, correction.ops, correction.checks);
  await worker.drain();
  const history: Offered[] = [
    { req: publish, receipt: live },
    { req: save, receipt: saved },
  ];
  const witness = correction.witness(saved);
  const proof = await verify(worker, subjects, history, witness);
  const expected = parse<W0.Delivery[]>(
    await oracle.call("fold", {
      basis: { tx: saved.position, validTime: valid },
      release: "R2",
      worlds: await witness(subjects, { position: saved.position, validTime: valid }),
    }),
  );
  assert.deepEqual(
    expected.map((d) => d.subject),
    subjects,
  );
  assert.deepEqual(
    { verified: proof.effects, delivered: (await worker.effects()).map((d) => d.subject) },
    { verified: expected.length, delivered: subjects },
  );
  assert.deepEqual((await a.event(2, saved.position)).value.selection, { kind: "census" });
});

for (const first of ["save", "publish"] as const) {
  test("a backdated two-hop floor save is complete when " + first + " commits first", async (t) => {
    const roster = [...subjects, "pl:c"];
    const { a, worker, publish, floor } = await fixture(t, roster);
    const initial: Request = { ...publish, id: "initial", release: "R1" };
    const events: Offered[] = [
      { req: initial, receipt: await a.append(await a.observe(), initial) },
    ];
    await worker.drain();
    const predecessor = await a.observe();
    const effective = Date.parse(valid) - 86400000;
    const correction = floor("stateMinWageCents", 1800, effective);
    const save: Request = {
      ...initial,
      id: "backdated-correction",
      kind: "reconcile",
      selection: { kind: "subjects", ids: [subjects[0]!] },
    };
    let saved: Ack;
    if (first === "save") {
      saved = await a.append(predecessor, save, correction.ops, correction.checks);
      events.push({ req: save, receipt: saved });
      await assert.rejects(a.append(predecessor, publish), Conflict);
      events.push({ req: publish, receipt: await a.append(await a.observe(), publish) });
    } else {
      events.push({ req: publish, receipt: await a.append(predecessor, publish) });
      await assert.rejects(
        a.append(predecessor, save, correction.ops, correction.checks),
        Conflict,
      );
      const retry = { ...save, release: publish.release };
      saved = await a.append(await a.observe(), retry, correction.ops, correction.checks);
      events.push({ req: retry, receipt: saved });
    }
    const oldTime = new Date(effective - 1).toISOString().replace(/Z$/, "000Z");
    for (const [cut, expected] of [
      [{ position: saved.position - 1, validTime: valid }, 1650],
      [{ position: saved.position, validTime: oldTime }, 1650],
      [{ position: saved.position, validTime: valid }, 1800],
    ] as const) {
      const old = await a.inputs.worlds(subjects, cut);
      assert.deepEqual(
        old.map((w) => w.facts.find((f) => f.a === "stateMinWageCents")?.v),
        [expected, expected],
      );
    }
    await worker.drain();
    const proof = await verify(worker, roster, events, correction.witness(saved));
    assert.deepEqual(proof.coverage[first === "save" ? 1 : 2], {
      affected: hash(subjects),
      complement: hash(["pl:c"]),
      selected: hash(roster),
    });
    assert.deepEqual(
      (await worker.effects()).map((d) => [d.subject, d.seq]),
      [
        [subjects[0], 1n],
        [subjects[1], 1n],
      ],
    );
  });
}

test("an existing narrowed event cannot advance and the verifier identifies the omission", async (t) => {
  const { a, worker, publish, floor } = await fixture(t);
  const live = await a.append(await a.observe(), publish);
  await worker.drain();
  const save: Request = {
    ...publish,
    id: "legacy-floor",
    kind: "reconcile",
    selection: { kind: "subjects", ids: [subjects[0]!] },
  };
  const predecessor = await a.observe();
  const plan = a.plan(predecessor, save);
  const narrowed = { ...plan.recipe, selection: save.selection };
  const correction = floor("localMinWageCents", 1800);
  // [DX-STG1] Why: exercise the actual verifier on an original durable narrowed
  // event. Rejected: substituting a fabricated verify result or a broken receipt.
  const receipt = await a.db.commit(
    "event-command:" + save.id,
    save,
    [
      ...correction.ops,
      ...a.db.change("tail", predecessor, {
        ...predecessor.value,
        sequence: narrowed.sequence,
        parent: hash(narrowed),
      }),
      a.db.put("event:" + narrowed.sequence, narrowed),
    ],
    [...correction.checks, ...plan.preconditions],
  );
  await assert.rejects(worker.drain(), /Legacy selection lacks coverage proof/);
  assert.deepEqual(await worker.effects(), []);
  await assert.rejects(
    verify(
      worker,
      subjects,
      [
        { req: publish, receipt: live },
        { req: save, receipt },
      ],
      correction.witness(receipt),
    ),
    /Durable selection omits affected subject pl:b/,
  );
});

for (const saved of ["late", "missing notice", "complete"] as const) {
  test(
    "physical deadline check during a shared save with recipient offline: " + saved,
    async (t) => {
      const { a, worker, publish, floor, src, receiver } = await fixture(t);
      const prior: Request = { ...publish, id: "baseline", release: "R1" };
      const initial = await a.append(await a.observe(), prior);
      const recipientPosition = await receiver.currentPosition();
      const readerStore = await open(src.scopeName!);
      t.after(() => readerStore.close());
      const reader = new Notices(readerStore, "account", a.inputs);
      const correction = floor("localMinWageCents", 1800);
      const save: Request = {
        ...prior,
        id: "live-save",
        kind: "reconcile",
        selection: { kind: "subjects", ids: [subjects[0]!] },
      };
      const waiting = Promise.withResolvers<void>(),
        resume = Promise.withResolvers<void>();
      const heldPublisher = new Notices(
        {
          ...src,
          async transact(...args) {
            waiting.resolve();
            await resume.promise;
            return src.transact(...args);
          },
        },
        "account",
        a.inputs,
      );
      const ingress = performance.now();
      const before = await a.observe();
      const active = assert.rejects(heldPublisher.append(before, publish), Conflict);
      await waiting.promise;
      const saving = a.append(before, save, correction.ops, correction.checks);
      let live: Ack;
      try {
        live = await saving;
      } finally {
        resume.resolve();
        await active;
      }
      const receipt = await a.append(await a.observe(), publish);
      assert(live.position < receipt.position);
      const event = await a.event(3, receipt.position);
      const cut = { position: receipt.position, validTime: valid };
      const docs = await a.inputs.worlds(subjects, cut);
      const basis = { tx: cut.position, validTime: cut.validTime };
      const outputs = docs.map((world) => {
        const result = W0.evaluateWorld(world, W0.R2, basis);
        assert(!("error" in result));
        return result;
      });
      const owed = W0.publish(W0.EMPTY_OUTBOX, outputs.map(W0.recordOf)).deliveries.map(
        wireDelivery,
      );
      assert.deepEqual(
        owed.map((d) => d.subject),
        subjects,
      );
      const complete = {
        changed: outputs.map((output) => JSON.parse(W0.outputJson(output))),
        retired: [],
        guards: [{ census: event.value.census.members, release: event.value.nextHash, basis }],
        owed,
      };
      const writePhysical = async (bytes: typeof complete) => {
        const key = publicationManifest(3);
        await a.db.commit(
          "physical-publication",
          [event.id, hash(bytes)],
          [
            a.db.put(publicationChunk(3, 0), pack(bytes)),
            a.db.put(key, {
              format: "notice-publication/1",
              epoch: event.value.epoch,
              assertion: event.id,
              recipe: hash(event.value),
              position: receipt.position,
              txId: receipt.txId,
              chunks: [hash(bytes)],
            }),
          ],
          [a.db.guard(key, undefined)],
        );
      };
      // [DX-STG1] Why: exercise storage at the captured native position while the
      // real recipient is idle. Rejected: substituting newly derived or later rows.
      if (saved !== "late")
        await writePhysical(
          saved === "complete"
            ? complete
            : {
                ...complete,
                owed: owed.slice(0, 1),
              },
        );
      const captured = await captureDeadlineCut(reader, receiver, ingress, recipientPosition);
      t.diagnostic(
        `Native cut ${captured.position}, observed after ${captured.elapsedMs.toFixed(1)} ms while receiver position held at ${recipientPosition}`,
      );
      await assert.rejects(
        captureDeadlineCut(reader, receiver, ingress - 1000, recipientPosition),
        /Publication deadline elapsed/,
      );
      const witness = correction.witness(live);
      const expectedWorlds = await witness(subjects, cut);
      const oracle = new DomainOracle();
      const noticeOracle = new DomainOracle(new URL("./oracle.py", import.meta.url).pathname);
      t.after(() => oracle.close());
      t.after(() => noticeOracle.close());
      const expected = {
        changed: await Promise.all(
          expectedWorlds.map(async (world) =>
            JSON.parse(await oracle.call("evaluate", { world, basis, release: "R2" })),
          ),
        ),
        retired: [],
        guards: [{ census: hash(subjects), release: W0.R2.hash, basis }],
        owed: JSON.parse(
          await noticeOracle.call("fold", {
            worlds: expectedWorlds,
            basis,
            release: "R2",
          }),
        ),
      };
      const claim = {
        event: 3,
        request: publish.id,
        command: a.db.command("event-command:" + publish.id),
        receipt,
        validTime: valid,
        release: W0.R2.hash,
        census: hash(subjects),
        expected,
      };
      if (saved === "late") {
        await assert.rejects(
          assertDeadlinePublication(reader, captured, claim),
          /Missing physical publication/,
        );
        await writePhysical(complete);
        assert((await a.db.head()) > captured.position);
        await assert.rejects(
          assertDeadlinePublication(reader, captured, claim),
          /Missing physical publication/,
        );
      } else if (saved === "missing notice") {
        await assert.rejects(assertDeadlinePublication(reader, captured, claim), /owed differs/);
      } else {
        await assertDeadlinePublication(reader, captured, claim);
        if (process.env.NOTIFY_NATIVE === "1") {
          execFileSync(
            process.execPath,
            ["--experimental-strip-types", fileURLToPath(new URL("deadline.ts", import.meta.url))],
            {
              input: JSON.stringify({
                cut: captured,
                offer: claim,
                account: "account",
                inputs: a.inputs.identity,
              }),
              timeout: 15000,
            },
          );
        }
      }
      assert.equal(await receiver.currentPosition(), recipientPosition);
      await worker.drain();
      assert.deepEqual(
        (await worker.effects()).map((d) => [d.subject, d.seq]),
        [
          [subjects[0], 1n],
          [subjects[1], 1n],
        ],
      );
      await verify(
        worker,
        subjects,
        [
          { req: prior, receipt: initial },
          { req: save, receipt: live },
          { req: publish, receipt },
        ],
        witness,
      );
    },
  );
}
