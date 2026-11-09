import { evidenceBinding } from "./lib/di01-evidence.ts";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  DomainOracle,
  ParallelDomainOracle,
  Replay,
  indexFor,
  checkPosition,
  crosscheck,
  writesOf,
  W0,
  sha256,
  canonical,
  type Row,
} from "./lib/di01-harness.ts";
import { seedCommands } from "./lib/w0-seed.ts";
import { generateTrace, traceDigest } from "./lib/trace.ts";
import { mapW0Trace } from "./lib/w0-trace.ts";
import { V_W0 } from "./lib/w0-world.ts";
import { Rng, seedOf } from "./lib/rng.ts";
const binding = evidenceBinding();
const mode = process.argv[2] ?? "cases";
const root =
  process.argv[3] ??
  `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-DI01/${mode}-${randomUUID()}`;
fs.mkdirSync(root, { recursive: true });
const results: any = {
  binding,
  attempt: randomUUID(),
  mode,
  started: new Date().toISOString(),
  offline: true,
  slot: null,
  readers: 0,
  source: {},
};
const files = [
  "lab/bench/di01.ts",
  "lab/bench/lib/di01-harness.ts",
  "lab/bench/lib/di01-refs.ts",
  "lab/bench/lib/w0-trace.ts",
  "lab/bench/lib/trace.ts",
  "lab/bench/lib/w0-seed.ts",
  "packages/host/src/feed/ConsumerStore.ts",
  "packages/host/src/feed/DependencyIndex.ts",
  "packages/testkit/src/feed/index.ts",
  "pnpm-lock.yaml",
  "lab/bench/lib/w0-oracle.py",
  "lab/oracles/domain/w0.py",
  "lab/oracles/domain/jsontok.py",
];
const source = () => Object.fromEntries(files.map((f) => [f, sha256(fs.readFileSync(f))]));
results.source = source();
const out = fs.openSync(path.join(root, "oracle.jsonl"), "wx"),
  oracle = mode === "trace" ? new ParallelDomainOracle(root, out) : new DomainOracle(out);
try {
  if (mode === "cases") {
    results.cases = [];
    for (const name of fs
      .readdirSync("lab/world/W0/cases")
      .filter((f) => /^C(34|35|36|57|58|59|60|87|121)-/.test(f))) {
      const file = "lab/world/W0/cases/" + name,
        c = JSON.parse(fs.readFileSync(file, "utf8")),
        input = c.input;
      const replay = new Replay(),
        V = Date.parse(input.basis.validTime),
        release = W0.RELEASES_BY_NAME.get(input.release)!;
      const index = indexFor(path.join(root, name + ".db"), replay, V, release);
      const facts = new Map<string, any>();
      for (const world of input.worlds)
        for (const f of world.facts) {
          const key = canonical([f.e, f.a, f.tx]);
          if (facts.has(key)) assert.deepEqual(facts.get(key), f, "shared facts disagree");
          facts.set(key, f);
        }
      for (const tx of [...new Set([...facts.values()].map((f) => f.tx))].sort((a, b) => a - b)) {
        const page = replay.add(
          [...facts.values()].filter((f) => f.tx === tx).map((f) => [f.e, f.a, f.v] as Row),
          V,
          [],
          tx,
        );
        await index.consume(index.checkpoint("c"), page);
      }
      for (const w of input.worlds) {
        const basis = input.basis,
          actual = W0.evaluateWorld(replay.world(w.subject, basis.tx, V), release, basis),
          expected = W0.evaluateWorld(w, release, basis);
        assert(!W0.isFailure(actual) && !W0.isFailure(expected));
        assert.deepEqual(actual.dependencies, expected.dependencies);
      }
      const values = (a: string) =>
        a === "jurisdiction"
          ? "jur:di01"
          : a === "localMinWageCents" || a === "stateMinWageCents"
            ? 2000
            : a === "answers"
              ? "pl:a/ans:di01"
              : "di01";
      const page = replay.add(
        input.writes.map(([e, a]: [string, string]) => [e, a, values(a)] as Row),
        V,
        [],
        input.basis.tx + 1,
      );
      await index.consume(index.checkpoint("c"), page);
      const expected = await oracle.run("affected", input);
      assert.deepEqual(expected, c.expected);
      const observed = index.affectedAt("c", "0", String(input.basis.tx + 1));
      assert.deepEqual(observed, expected.affected);
      results.cases.push({
        name,
        sha256: sha256(fs.readFileSync(file)),
        observed,
        expected: expected.affected,
        fixtureDependenciesMatch: true,
      });
      index.close();
    }
    assert.equal(results.cases.length, 9);
    results.notApplicable = ["C67", "C96"];
    results.boundaries = [];
    for (const prefix of ["C19-", "C20-"]) {
      const file =
        "lab/world/W0/cases/" +
        fs.readdirSync("lab/world/W0/cases").find((f) => f.startsWith(prefix));
      const c = JSON.parse(fs.readFileSync(file, "utf8")),
        input = c.input,
        V = Date.parse(input.basis.validTime),
        replay = new Replay();
      const index = indexFor(path.join(root, prefix + ".db"), replay, V);
      const output = await oracle.run("evaluate", input);
      assert(output.obligations.length > 0);
      index.recordObligations(
        input.world.subject,
        String(input.basis.tx),
        output.obligations.map((o: any) => ({
          at: Date.parse(o.boundary),
          kind: o.kind + ":" + o.id,
        })),
      );
      const due = index.due("c", Date.parse("2027-01-16T00:00:00Z"));
      assert.deepEqual(
        due.map((b) => b.at).sort(),
        output.obligations
          .filter((o: any) => Date.parse(o.boundary) <= Date.parse("2027-01-16T00:00:00Z"))
          .map((o: any) => Date.parse(o.boundary))
          .sort(),
      );
      assert.equal(index.affected("c").length, 0);
      assert.equal(index.effects("c").length, 0);
      index.recordObligations(input.world.subject, String(input.basis.tx + 1), []);
      index.recordObligations(
        input.world.subject,
        String(input.basis.tx),
        output.obligations.map((o: any) => ({ at: Date.parse(o.boundary), kind: o.kind })),
      );
      assert.deepEqual(index.due("c", Infinity), []);
      results.boundaries.push({
        file,
        obligations: output.obligations,
        due,
        newerEmptyResistsOlder: true,
      });
      index.close();
    }
  } else if (mode === "trace") {
    const V = Date.parse("2026-12-01T00:00:00Z"),
      replay = new Replay();
    replay.seedRung = W0.rung(10000);
    replay.seedMode = true;
    const index = indexFor(path.join(root, "trace.db"), replay, V);
    let release = W0.R1;
    const checksFile = fs.openSync(path.join(root, "checks.jsonl"), "wx");
    let positions = 0,
      differ = 0,
      full = 0,
      crosschecks = 0;
    const durationS = 180,
      events = generateTrace({ seed: "DI01-trace-1", subjects: 10000, durationS }),
      rng = new Rng(seedOf("DI01-overlay-1"));
    // [EXP-DI01] Why: immutable P5 mapping stays separate from a seeded discriminating overlay. Rejected: rewriting the mapper to manufacture shared writes.
    const S = W0.placementId(1),
      L = W0.locationId(replay.seedRung, 1),
      J = W0.jurisdictionId(replay.seedRung, 1),
      L2 = W0.locationId(replay.seedRung, 2),
      J2 = W0.jurisdictionId(replay.seedRung, 2);
    const overlay: { rows: Row[]; retract?: [string, string][]; label: string }[] = [
      { label: "state", rows: [[J, "stateMinWageCents", 1700]] },
      { label: "local-r1", rows: [[L, "localMinWageCents", 1900]] },
      {
        label: "unlinked-doc",
        rows: [
          [S + "/doc:di01", "docType", "ead"],
          [S + "/doc:di01", "expiresOn", "2027-01-15"],
        ],
      },
      { label: "link-doc", rows: [[S, "documents", S + "/doc:di01"]] },
      {
        label: "unlinked-decision",
        rows: [
          [S + "/dec:di01", "target", "bgc.adjudication"],
          [S + "/dec:di01", "verdict", "approve"],
          [S + "/dec:di01", "author", "person"],
        ],
      },
      { label: "link-decision", rows: [[S, "decisions", S + "/dec:di01"]] },
      { label: "activation", rows: [["p5:tenant", "p5/activation", W0.R2.hash]] },
      { label: "local-r2", rows: [[L, "localMinWageCents", 1950]] },
      {
        label: "same-hop-jur",
        rows: [
          [L, "jurisdiction", J2],
          [J2, "stateMinWageCents", 1800],
        ],
      },
      {
        label: "same-hop-location",
        rows: [
          [S, "location", L2],
          [L2, "localMinWageCents", 2000],
        ],
      },
      { label: "retract-location", rows: [], retract: [[S, "location"]] },
      {
        label: "ballast",
        rows: [
          [S, "answers", S + "/ans:di01"],
          [S + "/ans:di01", "value", String(rng.next())],
        ],
      },
    ];
    const originalEvents = events.filter((e) => !e.resend).length;
    const overlayStride = Math.max(2, Math.floor(originalEvents / (overlay.length + 1)));
    const overlaySchedule = overlay.map((o, i) => ({
      atEvent: (i + 1) * overlayStride + rng.int(Math.max(1, Math.floor(overlayStride / 2))),
      ...o,
    }));
    results.overlaySeed = "DI01-overlay-1";
    results.overlaySchedule = overlaySchedule;
    results.overlaySha256 = sha256(
      canonical({ seed: "DI01-overlay-1", schedule: overlaySchedule }),
    );
    results.overlay = overlay;
    results.mapperSha256 = sha256(fs.readFileSync("lab/bench/lib/w0-trace.ts"));
    results.traceSha256 = traceDigest(events);
    results.trace = { seed: "DI01-trace-1", subjects: 10000, durationS, events: events.length };
    results.validAt = V;
    let pending: any[] = [];
    const flush = async () => {
      if (!pending.length) return;
      const pages = pending;
      pending = [];
      await index.consume(index.checkpoint("c"), {
        entries: pages.flatMap((p) => p.entries),
        cursor: pages.at(-1).cursor,
      });
      // [EXP-DI01] Why: overlap independent expected-side requests for the already committed page; O-DOMAIN still computes every position and sees all full-check worlds. Rejected: skipping ballast calls or reusing an affected result.
      const checks = pages.map((page) => {
        const position = Number(page.cursor.token),
          shared = writesOf(page).some(([e]) => e.startsWith("loc:") || e.startsWith("jur:"));
        const all = Boolean(page.overlay) || position % 1000 === 0 || shared;
        const atRelease = release;
        if (
          page.entries[0].transactions[0].changes.some((c: any) => c.attribute === "p5/activation")
        )
          release = W0.R2;
        return checkPosition(index, replay, page, V, atRelease, oracle, all);
      });
      const outcomes = await Promise.allSettled(checks);
      for (const outcome of outcomes) {
        if (outcome.status === "rejected") throw outcome.reason;
        const check = outcome.value;
        fs.writeSync(checksFile, canonical(check) + "\n");
        positions++;
        if (check.differsFromDirect) differ++;
        if (check.full) full++;
        if (positions % 1000 === 0)
          console.log(JSON.stringify({ positions, differ, subjects: replay.subjects.size }));
      }
    };
    const processPage = async (page: any, overlayPosition = false) => {
      pending.push({ ...page, overlay: overlayPosition });
      if (pending.length >= 100 || overlayPosition) await flush();
    };
    for (const c of seedCommands(10000)) await processPage(replay.add(c.rows, c.validFrom));
    await flush();
    replay.seedMode = false;
    const seedEnd = replay.position;
    // [EXP-DI01] Why: check every subject at 100 distinct sampled positions and the end. Rejected: checking only subjects returned by the candidate index.
    const sampleEvery = Math.max(1, Math.floor(events.filter((e) => !e.resend).length / 100));
    let evCount = 0,
      overlayAt = 0;
    for (const event of events) {
      if (event.resend) continue;
      const mapped = mapW0Trace(event);
      await processPage(replay.add(mapped.rows, mapped.validFrom));
      evCount++;
      if (evCount % sampleEvery === 0 && crosschecks < 100) {
        await flush();
        crosscheck(index, replay, replay.position, V, release);
        crosschecks++;
      }
      if (overlayAt < overlay.length && evCount >= overlaySchedule[overlayAt]!.atEvent) {
        const o = overlay[overlayAt++];
        await processPage(replay.add(o.rows, V_W0, o.retract ?? []), true);
      }
    }
    while (overlayAt < overlay.length) {
      const o = overlay[overlayAt++];
      await processPage(replay.add(o.rows, V_W0, o.retract ?? []), true);
    }
    await flush();
    crosscheck(index, replay, replay.position, V, release);
    assert.equal(crosschecks, 100);
    assert(differ > 0, "Void direct-subject gate");
    const raises = [...replay.subjects]
      .filter((s) => W0.plan(replay.seedRung!, Number(s.slice(4))).raise)
      .sort();
    // [EXP-DI01] Why: a separate pre-raise V observes future fact edges. Rejected: expecting a past edge in the fixed December trace basis.
    const boundaryReplay = new Replay();
    boundaryReplay.seedRung = W0.rung(10000);
    boundaryReplay.seedMode = true;
    const boundaryIndex = indexFor(path.join(root, "fact-edges.db"), boundaryReplay, V_W0);
    let boundaryPages: any[] = [];
    const flushBoundaries = async () => {
      if (!boundaryPages.length) return;
      await boundaryIndex.consume(boundaryIndex.checkpoint("c"), {
        entries: boundaryPages.flatMap((p) => p.entries),
        cursor: boundaryPages.at(-1).cursor,
      });
      boundaryPages = [];
    };
    for (const c of seedCommands(10000)) {
      boundaryPages.push(boundaryReplay.add(c.rows, c.validFrom));
      if (boundaryPages.length >= 100) await flushBoundaries();
    }
    await flushBoundaries();
    const actual = [
      ...new Set(
        boundaryIndex
          .due("c", Date.parse("2026-11-16T00:00:00Z"))
          .filter((b) => b.at === Date.parse("2026-11-16T00:00:00Z"))
          .map((b) => b.subject),
      ),
    ].sort();
    assert.deepEqual(actual, raises);
    results.factEdges = {
      expected: raises.length,
      observed: actual.length,
      sha256: sha256(canonical(actual)),
    };
    boundaryIndex.close();
    results.traceResult = {
      positions,
      seedEnd,
      differentFromDirect: differ,
      fullWorldPositions: full,
      crosscheckPositions: crosschecks + 1,
      subjects: replay.subjects.size,
      commandLogSha256: replay.logHash.digest("hex"),
      expectedWorldMaterializations: replay.cacheStats,
    };
    fs.closeSync(checksFile);
    index.close();
  } else throw Error("Unknown DI01 mode");
  assert.deepEqual(source(), results.source, "source changed during gate");
  assert.deepEqual(evidenceBinding(), binding);
  results.status = "MATCH";
} catch (error) {
  results.status = "FAIL";
  results.error = String(error);
  throw error;
} finally {
  oracle.close();
  fs.closeSync(out);
  results.finished = new Date().toISOString();
  fs.writeFileSync(path.join(root, "result.json"), JSON.stringify(results, null, 2));
  console.log(root);
}
