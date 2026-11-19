import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { W0, canonical, sha256 } from "../../../bench/lib/w0-world.ts";
import { DomainOracle, emptyWireState } from "../../../bench/lib/w0-gates.ts";
import {
  buildIndex,
  eadRelease,
  selectRelease,
  type SelectorCut,
  type Selection,
} from "../../../bench/lib/w0-selector.ts";
import { selectorOracle } from "../../../bench/lib/w0-selector-oracle.ts";
import { observe, open, oracleRecord } from "./check.ts";
import { publishChanged } from "../../../bench/lib/w0-replica.ts";

test("one narrow release covers the independent 1k roster and survives page interruption", async () => {
  const id = randomUUID(),
    dir = mkdtempSync(join(process.env.DX_ACT1_SELECTOR_DIR ?? tmpdir(), "act1-"));
  const rung = W0.rung(1000),
    initial = W0.populationBasis(rung),
    basis = { ...initial, tx: initial.tx + 1 },
    release = eadRelease();
  const roster = Array.from({ length: rung.N }, (_, i) => "pl:s" + String(i).padStart(8, "0"));
  const worlds = new Map([...W0.population(rung)].map((p) => [p.world.subject, p.world]));
  const cut: SelectorCut = {
    scope: "act1",
    generation: id,
    basis,
    frontier: basis.tx,
    erasure: "seed",
    source: sha256(readFileSync("packages/w0/dist/kernel.js")),
  };
  const file = join(dir, "members.sqlite"),
    start = performance.now();
  const seal = buildIndex(file, cut, roster, worlds.values());
  const buildMs = performance.now() - start;
  const reference = new DomainOracle(selectorOracle(dir, release));
  const expected = new Map<string, string>(),
    terminal = new Map<string, string>();
  const firstRecords: W0.EvaluationRecord[] = [],
    selectedRecords: W0.EvaluationRecord[] = [];
  let changes = 0,
    changedTasks = 0,
    noDocs = 0;
  try {
    for (const subject of roster) {
      const world = worlds.get(subject)!;
      noDocs += Number(!world.facts.some((f) => f.e === subject && f.a === "documents"));
      const [r1, r2] = await Promise.all(
        ["R1", "R2"].map((rel) =>
          reference.call("evaluate", {
            world,
            release: rel,
            basis: rel === "R1" ? initial : basis,
          }),
        ),
      );
      const old = W0.sweepSubject(world, W0.R1, initial);
      assert.ok(!("error" in old));
      assert.equal(old.json, r1);
      firstRecords.push(old.record);
      const a = JSON.parse(r1!),
        b = JSON.parse(r2!);
      changedTasks += Number(
        canonical([a.tasks, a.obligations]) !== canonical([b.tasks, b.obligations]),
      );
      const first = JSON.parse(
        await reference.call("publish", {
          state: emptyWireState(),
          evaluations: [oracleRecord(JSON.parse(r1))],
        }),
      );
      const second = JSON.parse(
        await reference.call("publish", {
          state: first.state,
          evaluations: [oracleRecord(JSON.parse(r2))],
        }),
      );
      assert.ok(first.state && second.state);
      changes += Number(canonical(first.state.items) !== canonical(second.state.items));
      expected.set(subject, r2!);
      terminal.set(subject, canonical(second.state));
    }
    const timings: Record<string, number> = {};
    const base = {
      attempt: id,
      cut,
      roster,
      release,
      world: (s: string) => worlds.get(s)!,
      index: { file, seal },
      checkpoint: join(dir, "good.sqlite"),
    };
    const check = (rows: readonly Selection[]) => {
      for (const r of rows) {
        assert.equal(W0.outputJson(r.output), expected.get(r.subject));
        const w = worlds.get(r.subject)!;
        const docs = w.facts.filter((f) => f.a === "docType" && f.v === "ead").map((f) => f.e);
        const candidate = w.facts.some(
          (f) => f.e === r.subject && f.a === "documents" && docs.includes(String(f.v)),
        );
        if (r.mode !== "full") assert.equal(r.mode, candidate ? "candidate" : "excluded");
      }
    };
    const fullStart = performance.now();
    const control = selectRelease({
      ...base,
      index: undefined,
      checkpoint: join(dir, "control.sqlite"),
      onPage: check,
    });
    timings.fullMs = performance.now() - fullStart;
    assert.equal(control.full, roster.length);
    const fastStart = performance.now();
    const result = selectRelease({
      ...base,
      onPage: (rows) => {
        check(rows);
        selectedRecords.push(...rows.map((r) => W0.recordOf(r.output)));
      },
    });
    timings.selectorMs = performance.now() - fastStart;
    assert.ok(result.excluded && result.candidates && noDocs && changedTasks);
    const scope = "act1-select-" + id;
    let store = await open(scope);
    try {
      await publishChanged(store, firstRecords, { layout: "guard-fact", frameSize: 32 });
      const committed = await publishChanged(store, selectedRecords, {
        layout: "guard-fact",
        frameSize: 32,
      });
      assert.equal(committed.changed, roster.length);
      await store.close();
      store = await open(scope);
      const pos = await store.currentPosition();
      for (let i = 0; i < roster.length; i += 64) {
        const ids = roster.slice(i, i + 64);
        const states = await observe(store, ids, pos);
        states.forEach((state, j) => assert.equal(canonical(state), terminal.get(ids[j]!)));
      }
    } finally {
      await store.close();
    }
    assert.equal(result.candidates + result.excluded, roster.length);
    for (const [at, point] of [
      [0, "bytes"],
      [256, "checkpoint"],
      [768, "bytes"],
    ] as const) {
      const job = { ...base, checkpoint: join(dir, String(at) + ".sqlite"), onPage: check };
      assert.throws(
        () =>
          selectRelease({
            ...job,
            interrupt: (i, where) => {
              if (i === at && where === point) throw Error("interruption");
            },
          }),
        /interruption/,
      );
      const seen: string[] = [];
      const resumed = selectRelease({
        ...job,
        resume: true,
        onPage: (rows) => {
          check(rows);
          seen.push(...rows.map((r) => r.subject));
        },
      });
      assert.deepEqual(seen, roster);
      assert.equal(resumed.replayed, point === "bytes" ? Math.min(256, roster.length - at) : 0);
      assert.equal(resumed.binding, result.binding);
    }
    assert.throws(
      () =>
        selectRelease({
          ...base,
          cut: { ...cut, generation: "later" },
          resume: true,
          onPage: check,
        }),
      /checkpoint/,
    );
    const db = new DatabaseSync(base.checkpoint);
    db.prepare(
      "UPDATE pages SET bytes=(SELECT bytes FROM pages WHERE first=256) WHERE first=0",
    ).run();
    db.close();
    assert.throws(() => selectRelease({ ...base, resume: true, onPage: check }), /digest/);
    assert.throws(
      () => buildIndex(join(dir, "missing.sqlite"), cut, roster, [...worlds.values()].slice(1)),
      /roster/,
    );
    const duplicate = [...roster];
    duplicate[0] = duplicate[1]!;
    assert.throws(() => selectRelease({ ...base, roster: duplicate, onPage: check }), /duplicates/);
    const metrics = {
      ...result,
      changes,
      changedTasks,
      noDocs,
      buildMs,
      ...timings,
      compared: expected.size,
      expectedOutputs: sha256(canonical([...expected])),
      terminalStates: sha256(canonical([...terminal])),
      cut,
      release: release.hash,
    };
    writeFileSync(join(dir, "selector.json"), JSON.stringify(metrics, null, 2));
    console.log(JSON.stringify(metrics));
  } finally {
    reference.close();
  }
});

test("changed time, stale source, missing ranges, broad edits and previously absent edges take the full path", () => {
  const dir = mkdtempSync(join(tmpdir(), "act1-cuts-"));
  const roster = ["pl:a"],
    old = { subject: roster[0]!, facts: [] } satisfies W0.World;
  const cut = {
    scope: "act1",
    generation: randomUUID(),
    basis: { tx: 10, validTime: W0.POPULATION_VALID_TIME },
    frontier: 10,
    erasure: "initial",
    source: "fixture",
  };
  const file = join(dir, "index"),
    seal = buildIndex(file, cut, roster, [old]);
  const run = (next: typeof cut, release: W0.CompiledRelease, world: W0.World, full: number) => {
    const result = selectRelease({
      index: { file, seal },
      checkpoint: join(dir, randomUUID()),
      attempt: "cuts",
      cut: next,
      release,
      roster,
      world: () => world,
      onPage: ([r]) => {
        const ref = W0.sweepSubject(world, release, next.basis);
        assert.ok(!("error" in ref));
        assert.equal(W0.outputJson(r!.output), ref.json);
      },
    });
    assert.equal(result.full, full);
  };
  const release = eadRelease(),
    after = { ...cut, basis: { ...cut.basis, tx: 11 }, frontier: 11 };
  const withDoc: W0.World = {
    ...old,
    facts: [
      { e: "pl:a", a: "documents", v: "pl:a/doc:1", tx: 11 },
      { e: "pl:a/doc:1", a: "docType", v: "ead", tx: 11 },
    ],
  };
  run(cut, release, old, 0);
  for (const facts of [
    withDoc.facts,
    withDoc.facts.slice(1),
    [],
    [...withDoc.facts.slice(0, 1), { ...withDoc.facts[1]!, v: "visa" }],
  ])
    run(after, release, { ...old, facts }, 1);
  run(
    { ...cut, basis: { ...cut.basis, validTime: "2026-11-05T00:00:00.000000Z" } },
    release,
    old,
    1,
  );
  run({ ...cut, erasure: "erased" }, release, old, 1);
  run({ ...cut, basis: { ...cut.basis, tx: 5 }, frontier: 5 }, release, old, 1);
  run(cut, W0.R2, old, 1);
  const db = new DatabaseSync(file);
  db.exec("DELETE FROM members");
  db.close();
  run(cut, release, old, 1);
});

test("the live selector worker publishes every ordinal from its immutable replica snapshot", async () => {
  const { ReplicaSnapshot, packEntity } =
    await import("../../../../packages/datomic/dist/index.js");
  const { V_W0, triplexValue } = await import("../../../bench/lib/w0-world.ts");
  const { evaluateSelected } = await import("../../../bench/lib/w0-selector-sweep.ts");
  const cut = 20,
    id = randomUUID(),
    roster = ["pl:a", "pl:b"],
    dir = mkdtempSync(join(tmpdir(), "act1-worker-"));
  const view = new ReplicaSnapshot({
    position: cut,
    validAt: V_W0,
    entities: [
      ["pl:b", packEntity(1, [])],
      [
        "pl:a",
        packEntity(1, [
          {
            id: "d",
            entityId: "pl:a",
            attribute: "documents",
            value: triplexValue("documents", "pl:a/doc:1"),
            validFrom: 0,
            position: 1,
          },
        ]),
      ],
      [
        "pl:a/doc:1",
        packEntity(1, [
          {
            id: "t",
            entityId: "pl:a/doc:1",
            attribute: "docType",
            value: triplexValue("docType", "ead"),
            validFrom: 0,
            position: 1,
          },
        ]),
      ],
    ],
  });
  const store = await open("act1-worker-" + id);
  const oracle = new DomainOracle(selectorOracle(dir, eadRelease()));
  try {
    const options = {
      view,
      position: cut,
      subjects: roster,
      releases: eadRelease(),
      publish: store,
      publication: { layout: "guard-fact" as const },
    };
    const context = {
      dir: join(dir, "worker"),
      attempt: id,
      source: "fixture",
      scope: "worker",
      generation: id,
    };
    const result = await evaluateSelected(options, context);
    assert.equal(result.selector.excluded, 1);
    assert.equal(result.selector.candidates, 1);
    const position = await store.currentPosition();
    const resume = { ...context, resumeSealSha256: result.selector.sealSha256 };
    const reopened = await evaluateSelected(options, resume);
    assert.equal(reopened.selector.reused, roster.length);
    assert.equal(await store.currentPosition(), position);
    await assert.rejects(
      evaluateSelected(options, { ...resume, resumeSealSha256: "wrong" }),
      /seal mismatch/,
    );
    const actual = await observe(store, roster, await store.currentPosition());
    for (const [i, r] of result.records.entries()) {
      const world = {
        subject: r.subject,
        facts: view
          .world(r.subject)
          .map((f) => ({ e: f.entityId, a: f.attribute, v: f.value.value, tx: f.position })),
      };
      const expected = await oracle.call("evaluate", {
        world,
        release: "R2",
        basis: { tx: cut, validTime: W0.POPULATION_VALID_TIME },
      });
      assert.equal(r.candidates[0]!.json, expected);
      const publication = JSON.parse(
        await oracle.call("publish", {
          state: emptyWireState(),
          evaluations: [oracleRecord(JSON.parse(expected))],
        }),
      );
      assert.deepEqual(actual[i], publication.state);
    }
  } finally {
    oracle.close();
    await store.close();
  }
});
