import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { Histogram } from "../../../bench/lib/hist.ts";
import { render as emptyCard } from "./render.ts";
import type { MixedIds } from "./mixed-ids.ts";
import type { adoptedArm } from "./adopted.ts";
import { launchProfile } from "../jvm1/launch.mjs";
import { launchIntegration, selectedWriter, serverStages, writerIntegration, type JvmProfile, type Age, type Writer } from "./profile.ts";
import { cellPath, lastServerCell, ratedTape, serverCellSeconds, serverRates, writerCredits, type CreditMode, type WindowSeconds } from "./server-workload.ts";

import { operationId } from "../scale1/decision/plan.ts";
import { summarizeTelemetry, type Telemetry } from "./cell-telemetry.ts";
import { p99Miss, quietMiss } from "./card-verdict.ts";
import { windowStats, type WindowWrite } from "./windows.ts";

type Card = { source: string; age: Age; writer: Writer; jvm?: JvmProfile; toy: boolean; campaign: string; out: string; forecast: string;
  windowSeconds?: WindowSeconds; creditMode?: CreditMode;
  prepared?: boolean; txJvm?: JvmProfile; separateWal?: boolean; failure?: string };
type Observation = Awaited<ReturnType<typeof adoptedArm>>;
const tag = (x: unknown) => (typeof x === "number" && Number.isFinite(x)) ? String(Number(x.toFixed(3))) : "—";
export function writeAdoptedCard(run: Card) {
  const windowSeconds = run.windowSeconds ?? serverCellSeconds, creditMode = run.creditMode ?? "integration";
  const credits = writerCredits(creditMode);
  const file = (arm: string, name: string) => path.join(run.campaign, arm, name);
  const comparison = "grouped/campaign/", defaultComparison = "server-default/campaign/";
  const policy = launchProfile("server", { jvm: run.jvm, txJvm: run.txJvm });
  const stages = serverStages(run.writer, policy, !!run.separateWal);
  const readArm = (arm: string, load: boolean, writer = run.writer) => {
    if (!fs.existsSync(file(arm, "arm.json"))) return [];
    const x: Observation = JSON.parse(fs.readFileSync(file(arm, "arm.json"), "utf8"));
    const bytes = fs.readFileSync(file(arm, "operations.json"));
    assert.deepEqual([x.source, x.fixture, x.loaded, x.writer], [run.source, run.toy, load, writer]);
    assert(x.startedAt <= x.start && x.start < x.endedAt && x.seed.head === x.firstCut);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), x.observationsSha256);
    const raw = JSON.parse(bytes.toString());
    assert.deepEqual([raw.p1, raw.p4, raw.p6, raw.p7], [x.p1, x.p4, x.p6, x.p7]);
    const dispatch = new Map<string, number>(raw.writes.filter((r: any) => r.receipt && Number.isFinite(r.dispatched))
      .map((r: any) => [r.id, r.dispatched]));
    const feed = new Histogram();
    for (const entry of raw.journal) {
      const due = dispatch.get(entry.id);
      // [DX-V01] Why: the seed or AGE1 can carry logical clocks ahead of the host.
      // Rejected: subtracting the logical record instant and clamping a negative duration to zero.
      if (due !== undefined && Number.isFinite(entry.seen) && entry.seen >= due) feed.recordMs(entry.seen - due);
    }
    return [{ ...x, dispatchToFeed: feed.summary(), tape: raw.tape, writes: raw.writes, journal: raw.journal as typeof raw.journal }];
  };
  const [zero] = readArm("zero", false), [loaded] = readArm("loaded", true);
  const [grouped] = run.writer === "per-person-ordered" ? readArm(comparison + "loaded", true, "grouped") : [];
  const [control] = run.toy || run.writer === "grouped" ? [] : readArm(defaultComparison + "loaded", true);
  const arms = [zero, loaded, control, grouped].filter((arm) => arm !== undefined);
  const inputsFile = path.join(run.campaign, "input.json");
  const prepared = run.prepared === true;
  if (!run.toy && arms.length) assert(fs.existsSync(inputsFile));
  if (!run.toy && fs.existsSync(inputsFile)) {
    const input = JSON.parse(fs.readFileSync(inputsFile, "utf8"));
    assert.deepEqual([input.source, input.age, input.writer, input.jvm, input.txJvm, input.separateWal, input.stages, input.windowSeconds, input.creditMode],
      [run.source, run.age, run.writer, run.jvm, run.txJvm, !!run.separateWal, stages, windowSeconds, creditMode]);
    assert.equal(Boolean(input.pgdata), prepared);
    if (prepared) assert.equal(input.pgdata.length, stages.length);
    let systemIdentifier: string | undefined;
    for (const [i, stage] of stages.entries()) {
      const dir = stage.root + (stage.loaded ? "loaded" : "zero");
      const arm = stage.name === "headline" ? (stage.loaded ? loaded : zero)
        : stage.name === "server-default" ? control : run.writer === "grouped" ? loaded : grouped;
      if (!arm) continue;
      assert.equal(arm.seed.imageSha256, input.imagePin);
      const launch = JSON.parse(fs.readFileSync(file(dir, "launch-check.json"), "utf8"));
      assert.deepEqual([launch.source, launch.slot, launch.attempt, launch.policy, launch.separateWal],
        [run.source, arm.slot, arm.attempt, stage.policy, stage.separateWal]);
      assert(Number.isSafeInteger(launch.at) && launch.at <= arm.startedAt);
      assert.deepEqual(launch.java, (arm.settings.java as { role: string; container: string }[])
        .map(({ role, container }) => ({ role, container })));
      if (prepared) {
        const observed = JSON.parse(fs.readFileSync(file(dir, "pgdata.json"), "utf8"));
        assert.deepEqual([observed.source, observed.slot, observed.attempt, observed.copy],
          [run.source, arm.slot, arm.attempt, input.pgdata[i]]);
        assert.equal(observed.liveFileId, observed.copy.device + ":" + observed.copy.inode);
        assert.match(observed.container, /^[a-f0-9]{64}$/);
        assert.equal(observed.container, launch.postgres);
        assert(Number.isSafeInteger(observed.at) && observed.at <= arm.startedAt);
        assert.match(observed.systemIdentifier, /^[1-9][0-9]*$/);
        systemIdentifier ??= observed.systemIdentifier;
        assert.equal(observed.systemIdentifier, systemIdentifier);
      }
      if (run.age === "1B") {
        const aged = JSON.parse(fs.readFileSync(file(dir, "aged-live-check.json"), "utf8"));
        assert.deepEqual([aged.source, aged.slot, aged.attempt, aged.database, aged.logicalHead, aged.bundleSha],
          [run.source, arm.slot, arm.attempt, arm.seed.database, arm.firstCut, input.agedBundle]);
        assert(aged.records >= 1_000_000_000 && Date.parse(aged.observedAt) <= arm.startedAt);
      }
    }
  }
  if (zero && loaded) {
    assert(!zero.loaded && loaded.loaded && zero.firstCut === loaded.firstCut);
    assert.deepEqual([zero.seed.originalCut, zero.tapeSha256], [loaded.seed.originalCut, loaded.tapeSha256]);
    if (!run.toy) assert.equal(zero.seed.imageSha256, loaded.seed.imageSha256);
  }
  for (const other of [control, grouped]) if (loaded && other) {
    assert.deepEqual([loaded.firstCut, loaded.seed.originalCut, loaded.tapeSha256],
      [other.firstCut, other.seed.originalCut, other.tapeSha256]);
    assert.notEqual(other.attempt, loaded.attempt);
    if (!run.toy) assert.equal(loaded.seed.imageSha256, other.seed.imageSha256);
  }
  // [DX-V01] Why: a shortened tape can report exact observations while the original bars remain unqualified.
  // Rejected: awarding PASS from field-only reads, incomplete commit bands, or one verified arm.
  const base = emptyCard({ ...run, startedAt: new Date(zero?.startedAt ?? Date.now()).toISOString(),
    error: "No compatible measurement from this attempt." }, run.out);
  const evidence = (arm: string) => {
    const rel = path.relative(run.out, file(arm, "arm.json")).split(path.sep).map(encodeURIComponent).join("/");
    return "[adopted arm](" + rel + ")";
  };
  const rows = new Map<string, string[]>();
  const cellWindows: string[] = [], cellTelemetry: string[] = [];
  const partial = "PARTIAL";
  const p2Arms = [[loaded, "loaded"], [control, defaultComparison + "loaded"], [grouped, comparison + "loaded"]] as const;
  const commit = p2Arms.flatMap(([a, dir]) => a && a.p2.offered ? [{
    reading: `${a.writer} p50 ${tag(a.p2.latency.p50Ms)} ms, p99 ${tag(a.p2.latency.p99Ms)} ms (${a.p2.receipts}/${a.p2.offered} receipts)`,
    samples: `${a.writer} ${a.p2.receipts}`, link: evidence(dir),
  }] : []);
  if (commit.length) rows.set("P2", [commit.map((c) => c.reading).join(" · ") + ". Prelude only. Rated save windows, latency bands and retry coverage remain open.",
    partial, commit.map((c) => c.samples).join(" · "), commit.map((c) => c.link).join(" · ")]);
  if (loaded && run.writer === "per-person-ordered") {
    const phases = loaded.p1.map((p) => `L${p.seats} ${tag(p.goodput)}/s, p99 ${tag(p.read.p99Ms)} ms, ${p.errors} errors`).join("; ");
    const baseline = zero?.p2.latency.p99Ms;
    const ratio = baseline && loaded.p2.latency.p99Ms !== null ? loaded.p2.latency.p99Ms / baseline : null;
    const miss = zero && p99Miss(run.toy, loaded.p1.find(p => p.seats === 256)?.read, 100, "L256 checked field-read p99");
    if (loaded.p1.some(p => p.read.count || p.errors)) rows.set("P1", [`${miss ? miss + ". " : ""}${phases}. Whole-tape writer p99 ratio ${tag(ratio)}. Exact seed-cut field probes; full-world and recovery coverage remain open.`, miss ? "MISSED" : partial,
      String(loaded.p1.reduce((a, p) => a + p.read.count, 0)), evidence("loaded")]);
    if (loaded.p3.entries) rows.set("P3", [`${loaded.p3.entries} ordered exact changes; dispatch-to-observation p99 ${tag(loaded.dispatchToFeed.p99Ms)} ms across ${loaded.dispatchToFeed.count} observations. Durable effects and crash resume are open.`, partial,
      String(loaded.p3.entries), evidence("loaded")]);
    if (loaded.p4?.observed.count) rows.set("P4", [`Current demand pulls p50 ${tag(loaded.p4.observed.p50Ms)} ms, p99 ${tag(loaded.p4.observed.p99Ms)} ms. History depth and engine bytes remain open.`, partial,
      String(loaded.p4.observed.count), evidence("loaded")]);
    if (loaded.p3.entries) rows.set("Journal queryable", [`Compared ${loaded.p3.entries} queryable journal entries to original operation and predecessor expectations.`, partial,
      String(loaded.p3.entries), evidence("loaded")]);
    if (loaded.p2.receipts) rows.set("Receipts", [`Verified the journal against ${loaded.p2.receipts} receipts and reopened a sample of durable claims. The retry and lost-ACK bar is open.`, partial,
      String(loaded.p2.receipts), evidence("loaded")]);
    if (loaded.p7) {
      const p = loaded.p7;
      if (prepared) {
        const empty = JSON.parse(fs.readFileSync(file("loaded/p7-empty", "residency.json"), "utf8"));
        assert.equal(empty.source, run.source);
        assert.notEqual(empty.attempt, loaded.attempt);
        assert.notEqual(empty.slot, loaded.slot);
        assert(empty.at <= loaded.startedAt);
        assert.deepEqual(empty.roles, p.empty);
      }
      const footprint = ["tx", "gw-w", "gw-r"].map((role) => {
        const restored = p.restored[role]!, empty = p.empty[role]!;
        return `${role} ${restored.threads} threads, ${tag((restored.rssBytes - empty.rssBytes) / p.people)} added RSS bytes per roster person`;
      }).join("; ");
      const coldMiss = p99Miss(run.toy, p.cold.observed, 100, "Checked first-pull p99");
      rows.set("P7", [`${coldMiss ? coldMiss + ". " : ""}First demand pull at the original cut p99 ${tag(p.cold.observed.p99Ms)} ms, ${p.cold.unavailable} declined. ${footprint}. An activity-matched untouched-person memory slope is unmeasured.`,
        coldMiss ? "MISSED" : partial, `${p.cold.observed.count} first pulls and two residency points`,
        evidence("loaded") + (prepared ? " · [empty stack](campaign/loaded/p7-empty/residency.json)" : "")]);
    }
  }
  const lastQuiet = run.toy ? "p6-235" : lastServerCell;
  const [neighbors] = readArm(lastQuiet, true);
  const quietRows = (prefix: string, writer: Writer, prior?: Observation) => {
    const [alone] = readArm(prefix + "p6-alone", false, writer), [loaded] = readArm(prefix + "p6-235", true, writer);
    if (!alone?.p6 || !loaded?.p6) return;
    assert(prior);
    assert.deepEqual([alone.attempt, alone.slot, alone.seed.database, alone.firstCut],
      [prior.attempt, prior.slot, prior.seed.database, prior.terminal]);
    if (!run.toy && fs.existsSync(inputsFile)) {
      const { imagePin } = JSON.parse(fs.readFileSync(inputsFile, "utf8"));
      assert.equal(alone.seed.imageSha256, imagePin);
      assert.equal(loaded.seed.imageSha256, imagePin);
    }
    const a = alone.p6, b = loaded.p6;
    for (const [arm, title] of [[alone, "alone"], [loaded, "loaded"]] as const) {
      addWindows(arm.writes.filter((row: any) => row.account === 0), arm, `${writer} · toy quiet ${title}`);
    }
    assert.deepEqual([a.quietCell, b.quietCell], ["alone", 235]);
    assert.deepEqual([alone.slot, alone.attempt, alone.seed.database, alone.terminal],
      [loaded.slot, loaded.attempt, loaded.seed.database, loaded.firstCut]);
    const quiet = (ops: any[]) => ops.filter((e) => e.account === 0).map((e) => [e.ms, e.subject, e.width]);
    assert.deepEqual(quiet(alone.tape), quiet(loaded.tape));
    assert.equal(a.read.planned, b.read.planned);
    const ratio = (base: number | null, observed: number | null) => tag(base && observed !== null ? observed / base : null);
    const total = (r: typeof a) => r.totalOffers + "/" + r.totalReceipts;
    return {
      reading: `${writer} quiet p99 ratios for commits ${ratio(a.commit.p99Ms, b.commit.p99Ms)}, pinned reads ${ratio(a.read.read.p99Ms, b.read.read.p99Ms)}, dispatch-to-feed ${ratio(a.feed.p99Ms, b.feed.p99Ms)}. ${total(a)} and ${total(b)} offers/receipts. ${a.read.errors + b.read.errors} read errors or missed offers.`,
      samples: `${writer} ${a.commit.count}/${b.commit.count} commits, ${a.read.read.count}/${b.read.read.count} reads, ${a.feed.count}/${b.feed.count} feed observations`,
      link: evidence(prefix + "p6-alone") + " · " + evidence(prefix + "p6-235"),
      tape: loaded.tape,
    };
  };
  const primaryQuiet = quietRows("", run.writer, loaded);
  const groupedQuiet = run.writer === "per-person-ordered" ? quietRows(comparison, "grouped", grouped) : undefined;
  if (primaryQuiet && groupedQuiet) assert.deepEqual(primaryQuiet.tape, groupedQuiet.tape);
  const quiet = [primaryQuiet, groupedQuiet].filter((arm) => arm !== undefined);
  if (run.toy && quiet.length) rows.set("P6", [quiet.map((a) => a.reading).join(" · ") + " Durable effects, Publish and import overlap remain open.",
    partial, quiet.map((a) => a.samples).join(" · "), quiet.map((a) => a.link).join(" · ")]);
  const completedRates = new Set<string>();
  if (!run.toy) {
    const commits = [], pairs = [], quietMisses: string[] = [];
    const treatments = run.writer === "grouped" ? [[loaded, "", "grouped"]] as const
      : [[loaded, "", "headline"], [control, defaultComparison, "server default"], [grouped, comparison, "grouped"]] as const;
    for (const [anchor, prefix, name] of treatments) {
      if (!anchor) continue;
      let prior = anchor;
      for (const rate of serverRates) {
        const soloPath = prefix + cellPath({rate, loaded: false}), loadPath = prefix + cellPath({rate, loaded: true});
        const [solo] = readArm(soloPath, false, anchor.writer), [busy] = readArm(loadPath, true, anchor.writer);
        if (!solo) break;
        checkRated(solo, prior, rate, false, soloPath);
        addWindows(solo.writes, solo, `${name} · ${rate}/s · quiet alone`);
        if (!busy) break;
        checkRated(busy, solo, rate, true, loadPath);
        addWindows(busy.writes, busy, `${name} · ${rate}/s · all loaded saves`);
        const quietWrites = busy.writes.filter((row: any) => row.account === 0);
        addWindows(quietWrites, busy, `${name} · ${rate}/s · quiet beside neighbours`);
        const a = solo.p6!, b = busy.p6!;
        assert.equal(a.read.planned, b.read.planned);
        if (name === (run.writer === "grouped" ? "grouped" : "headline")) {
          const expired = quietWrites.filter((row: any) => row.status === "expired-before-dispatch").length +
            solo.writes.filter((row: any) => row.status === "expired-before-dispatch").length;
          const miss = quietMiss(a.commit, b.commit, expired, `${name} ${rate}/s quiet commits`);
          if (miss) quietMisses.push(miss);
        }
        const ratio = (base: number | null, loaded: number | null) => tag(base && loaded !== null ? loaded / base : null);
        commits.push({
          reading: `${name} ${rate}/s: ${tag(b.acknowledgedInWindow / b.durationSeconds)}/s in window, ${b.totalReceipts}/${b.totalOffers} durable, ${b.expired} expired, p50/p99 ${tag(busy.p2.latency.p50Ms)}/${tag(busy.p2.latency.p99Ms)} ms`,
          samples: `${name} ${rate}: ${b.totalReceipts}`, link: evidence(loadPath),
        });
        pairs.push({
          reading: `${name} ${rate}/s: quiet commit p99 ${tag(a.commit.p99Ms)} → ${tag(b.commit.p99Ms)} ms (${ratio(a.commit.p99Ms, b.commit.p99Ms)}×), read ${ratio(a.read.read.p99Ms, b.read.read.p99Ms)}×, feed ${ratio(a.feed.p99Ms, b.feed.p99Ms)}×, ${a.read.errors + b.read.errors} read errors or misses`,
          samples: `${name} ${rate}: ${a.commit.count}/${b.commit.count} commits, ${a.read.read.count}/${b.read.read.count} reads, ${a.feed.count}/${b.feed.count} feed`,
          link: evidence(soloPath) + " · " + evidence(loadPath),
        });
        prior = busy;
        if (rate === serverRates.at(-1)) completedRates.add(name);
      }
    }
    if (commits.length) rows.set("P2", [commits.map(c => c.reading).join(" · ") + ". Completed-only field saves. Full size bands and retry coverage remain open.",
      partial, commits.map(c => c.samples).join(" · "), commits.map(c => c.link).join(" · ")]);
    if (!pairs.length && cellWindows.length) rows.set("P6", ["A quiet-only window completed. Its matched loaded window is open.",
      partial, String(cellWindows.length / 3) + " cells", "[Save windows](#within-cell-save-windows)"]);
    if (pairs.length) rows.set("P6", [[...quietMisses, ...pairs.map(c => c.reading)].join(" · ") +
      `. Each side offers ${windowSeconds * 3.5} quiet saves. Publish, import and durable-effect coverage remain open.`,
      quietMisses.length ? "MISSED" : partial, pairs.map(c => c.samples).join(" · "), pairs.map(c => c.link).join(" · ")]);
  }

  function addWindows(writes: WindowWrite[], arm: Observation, title: string) {
    for (const w of windowStats(writes, arm.start, arm.p6!.durationSeconds)) {
      cellWindows.push(`| ${title} | ${w.name} | ${tag(w.storedPerSecond)} | ${tag(w.latency.p50Ms)} | ${tag(w.latency.p99Ms)} | ${tag(w.senderWait.p99Ms)} | ${w.offered} | ${w.acked} | ${w.latency.count} | ${w.expired} |`);
    }
  }

  function checkRated(arm: NonNullable<typeof loaded>, previous: Observation, rate: (typeof serverRates)[number], loadedCell: boolean, dir: string) {
    const cell = { rate, loaded: loadedCell };
    assert.deepEqual([arm.attempt, arm.slot, arm.seed.database, arm.seed.imageSha256, arm.firstCut],
      [previous.attempt, previous.slot, previous.seed.database, previous.seed.imageSha256, previous.terminal]);
    assert(arm.startedAt >= previous.endedAt && arm.p6);
    assert.deepEqual(arm.p6.quietCell, cell);
    assert.deepEqual(arm.tape, ratedTape(100_000, cell, windowSeconds));
    assert.equal(arm.writes.length, arm.tape.length);
    for (const [i, row] of arm.writes.entries()) {
      const offer = arm.tape[i]!;
      assert.deepEqual([row.id, row.db, row.due, row.account, row.subject, row.width, row.ordinal],
        [operationId(arm.attempt, offer.version), arm.seed.database, arm.start + offer.ms, offer.account, offer.subject, offer.width, offer.ordinal]);
    }
    assert.deepEqual([arm.settings.fairCredits, arm.settings.creditMode], [credits, creditMode]);
    assert.equal(arm.p6.durationSeconds, windowSeconds);
    const turns = new Map<number, number>();
    for (const row of arm.writes as { dispatched?: number; fairTurn?: number }[]) {
      if (row.dispatched === undefined) continue;
      assert(Number.isSafeInteger(row.fairTurn) && row.fairTurn! > 0);
      const count = (turns.get(row.fairTurn!) ?? 0) + 1;
      assert(count <= credits);
      turns.set(row.fairTurn!, count);
    }
    const receipts = arm.writes.filter((r: any) => r.receipt);
    assert.equal(arm.p6.totalOffers, arm.tape.length);
    assert.equal(arm.p6.totalReceipts, receipts.length);
    const latency = new Histogram(), quietCommit = new Histogram();
    assert.equal(arm.journal.length, receipts.length);
    const journal = new Map<number, any>(arm.journal.map((r: any) => [r.position, r]));
    assert.equal(journal.size, receipts.length);
    for (const row of receipts) {
      const stored = journal.get(row.receipt.p);
      assert(stored && stored.position > arm.firstCut && stored.position <= arm.terminal);
      assert.deepEqual([stored.db, stored.id, stored.tx, stored.clock, stored.digest],
        [row.db, row.id, row.receipt.tx, row.receipt.clock, row.receipt.digest]);
      journal.delete(stored.position);
      latency.recordMs(row.end - row.due);
      if (row.account === 0) quietCommit.recordMs(row.end - row.due);
    }
    assert.deepEqual(quietCommit.summary(), arm.p6.commit);
    assert.deepEqual(arm.p2.latency, latency.summary());
    assert.equal(arm.p6.acknowledgedInWindow, arm.writes.filter((r: any) =>
      r.receipt && r.status === "acked" && r.end < arm.start + windowSeconds * 1000).length);
    assert.equal(arm.p6.expired, arm.writes.filter((r: any) => r.status === "expired-before-dispatch").length);
    const telemetry = fs.readFileSync(file(dir, "telemetry.json"));
    assert.equal(createHash("sha256").update(telemetry).digest("hex"), arm.telemetrySha256);
    const summary = summarizeTelemetry(JSON.parse(telemetry.toString()) as Telemetry, {
      source: arm.source, attempt: arm.attempt, slot: arm.slot, database: arm.seed.database, firstCut: arm.firstCut,
      cell, start: arm.start, end: arm.start + windowSeconds * 1000,
    }, arm.endedAt);
    cellTelemetry.push(`- ${dir}: ${summary} [Counters](${path.relative(run.out, file(dir, "telemetry.json"))})`);
  }
  let orderedWitnessStart: number | undefined;
  const importPath = file("p8", "result.json");
  if (fs.existsSync(importPath)) {
    const r = JSON.parse(fs.readFileSync(importPath, "utf8"));
    const bytes = fs.readFileSync(file("p8", "pace-32-fixed.offers.json"));
    assert(neighbors && r.proof.cut > r.after);
    assert.deepEqual([r.source, r.toy, r.slot, r.nonce, r.db, r.after, r.arm, r.writer, r.referenceImport],
      [run.source, run.toy, neighbors.slot, neighbors.attempt, neighbors.seed.database, neighbors.terminal, "pace-32-fixed", run.writer, true]);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), r.sha256);
    orderedWitnessStart = r.proof.cut;
    const latency = Object.values(r.neighbors as Record<string, { read: { offered: number; ok: number; p99Ms: number }; save: { offered: number; ok: number; p99Ms: number } }>);
    const reads = latency.map((x) => x.read), saves = latency.map((x) => x.save);
    const totals = (rs: typeof reads) => rs.reduce((n, x) => n + x.ok, 0) + "/" + rs.reduce((n, x) => n + x.offered, 0);
    const max = (rs: typeof reads) => tag(Math.max(...rs.map((x) => x.p99Ms).filter((x) => Number.isFinite(x))));
    rows.set("P8", [`The fixed-pace import in the adopted scope recorded ${tag(r.fps)} facts/s, ${r.queryableFacts} queryable by the window end, ${r.proof.facts} verified. Highest per-account p99 ${max(saves)} ms for saves and ${max(reads)} ms for reads. This uses the reference import path alongside the per-person configuration. Grouped admission guarantees and matched pacing controls remain open.`,
      partial, `${r.proof.observed} exact frames, ${totals(saves)} saves and ${totals(reads)} reads`,
      "[import arm](" + path.relative(run.out, importPath) + ")"]);
  }
  const readMixed = (prefix: string, writer: Writer, expectedStart?: number) => {
    const archive = file(prefix + "mixed-ids.json", "");
    if (!fs.existsSync(archive)) return;
    const record: MixedIds = JSON.parse(fs.readFileSync(archive, "utf8"));
    const [last] = readArm(prefix + lastQuiet, true, writer);
    assert(last);
    assert.deepEqual([record.source, record.writer, record.slot, record.attempt, record.database, record.imageSha256, record.cut],
      [run.source, writer, last.slot, last.attempt, last.seed.database, last.seed.imageSha256, last.seed.originalCut]);
    assert.equal(record.start, expectedStart ?? last.terminal);
    assert(record.startedAt >= last.endedAt && record.endedAt >= record.startedAt);
    assert.equal(record.historical.length, 4);
    assert.equal(record.ids.length, 4);
    assert.equal(record.ids[2], record.first.row.id);
    assert.equal(record.ids[3], record.second.row.id);
    assert.deepEqual([record.installed.attempt, record.installed.database, record.installed.position],
      [record.attempt, record.database, record.start]);
    for (const [i, role, sample] of [[1, "first", record.first], [2, "second", record.second]] as const) {
      assert.deepEqual([sample.observed.db, sample.observed.position, sample.observed.id],
        [record.database, record.start + i, record.attempt + "-mixed-" + role]);
      assert.deepEqual(record.historical[i + 1]?.slice(0, 3),
        [record.subject, sample.row.attribute, { type: "string", value: "scorecard-history-" + (i === 1 ? "one" : "two") }]);
    }
    assert.equal(record.end, record.start + (writer === "per-person-ordered" ? 3 : 2));
    if (writer === "per-person-ordered") {
      assert.deepEqual(record.refusals.map(({ format, id, reason, operation, claim, head }) => [format, id, reason, operation, claim, head]),
        [["old-format", record.ids[0], "IdentityConflict", "absent", null, record.start + 2],
         ["ordered", record.ids[2], "IdentityConflict", "absent", null, record.start + 2]]);
      assert.equal(record.first.row.id, record.first.token + "00");
    }
    return record;
  };
  const mixed = run.writer === "per-person-ordered" && orderedWitnessStart !== undefined &&
    (run.toy || completedRates.has("headline"))
    ? readMixed("", run.writer, orderedWitnessStart) : undefined;
  const groupedMixed = run.writer === "per-person-ordered" && (run.toy || completedRates.has("grouped"))
    ? readMixed(comparison, "grouped") : undefined;
  if (mixed && groupedMixed) {
    // [DX-V01] Why: the raw typed value and valid range must agree at each matching semantic cut.
    // Rejected: comparing just hashes from unbound fixtures or equating logical clocks across different histories.
    assert.deepEqual([mixed.subject, mixed.cut, mixed.historical], [groupedMixed.subject, groupedMixed.cut, groupedMixed.historical]);
    if (!run.toy) assert.equal(mixed.imageSha256, groupedMixed.imageSha256);
    const links = ["mixed-ids.json", comparison + "mixed-ids.json"].map((name) =>
      "[identity witness](" + path.relative(run.out, file(name, "")) + ")").join(" · ");
    rows.set("Mixed assertion identities", ["Both retired IDs returned IdentityConflict under fresh commands. Earlier typed answers matched grouped at the seed, pre-witness and two save cuts.",
      run.toy ? partial : "MET", "2 refusals and 4 paired snapshots", links]);
  }
  const field = ["P5", "P6", "P7", "P8", "P9"];
  const gaps: Record<string, string> = {
    P5: "The held SCALE1 roster has no Publish window in this run. [Server 1 measured Publish under load](https://github.com/OnboardedInc/Triplex-db-experiments/blob/530b88a6e9f7c9ca0593628bdbd7689707c87408/lab/experiments/EXP-DX1/bm1/HANDOFF.md#joined-publish-at-100000).",
    P6: "No verified matched quiet-account pair from this attempt.",
    P9: "A qualifying fault or move measurement needs two servers. [Separate HASYNC1 fault and move procedure](https://github.com/OnboardedInc/Triplex-db-experiments/blob/a0c47480f/lab/experiments/EXP-DX1/hasync1/SCORECARD.md). The one-host rehearsal uses its own physical checkpoint.",
    P8: "No verified fixed-pace import arm from this attempt.",
  };
  const text = base.trimEnd().split("\n").map((line) => {
    if (line === "## Run settings") return (run.writer === "per-person-ordered"
      ? run.toy ? "Per-person-ordered runs the full adopted workload. Grouped repeats P2 and P6 only."
        : "The headline ordered profile runs the full workload. Default ordered and grouped repeat P2 and P6 only."
      : "Grouped comparison only. This attempt covers P2 and P6.") + "\n\n" + line;
    if (line === "Population ten accounts of four deep people.") {
      if (run.toy) return "Population ten deep accounts in one SCALE1 toy database.";
      return "Population ten deep accounts of 100,000 people in one SCALE1 database." +
        (fs.existsSync(inputsFile) ? " [Held seal and run inputs](campaign/input.json)." : "");
    }
    const match = /^\| ((P\d) [^|]+|Journal queryable|Receipts) \| ([^|]+) \|/.exec(line);
    const key = match?.[2] ?? match?.[1]?.trim();
    if (!key || !match) return line.replace("| NOT MEASURED |", "| NOT RUN |");
    const values = rows.get(key) ?? (run.writer === "grouped" && /^P[13478]$/.test(key) ? ["Grouped comparison covers P2 and P6.", "NOT RUN", "0", "—"] : field.includes(key) ? [gaps[key] ?? "No same-seed adapter for this row at this revision.", "NOT RUN", "0", "—"] : undefined);
    return values ? `| ${match[1]!.trim()} | ${match[3]!.trim()} | ${values.join(" | ")} |` : line.replace("| NOT MEASURED |", "| NOT RUN |");
  }).concat([
    "| Mixed assertion identities | Retired old-format and ordered IDs are refused and pinned earlier values match grouped. | " +
    (rows.get("Mixed assertion identities") ?? ["The paired mixed-ID witness is unavailable in this attempt.", "NOT RUN", "0", "—"]).join(" | ") + " |",
    "",
    ...(cellWindows.length ? ["## Within-cell save windows", "",
      "Stored/s counts end-of-save durable ACKs timestamped in each interval. Save latency and sender wait follow the scheduled offer, including slow completions received after its interval. Recovered receipts contribute latency and verified saves, with no in-window ACK credit.", "",
      "| Cell and account scope | Window | Stored/s | Save p50 ms | Save p99 ms | Sender wait p99 ms | Offers | In-window ACKs | Verified receipts by offer | Expired by offer |",
      "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |", ...cellWindows, ""] : []),
    ...(cellTelemetry.length ? ["## Within-cell counters", "", ...cellTelemetry, ""] : []),
  ]).join("\n").replaceAll("No compatible measurement from this attempt.", run.failure ?? "No compatible measurement from this attempt.");
  const settings = {
    ...selectedWriter(run.writer),
    writerIntegration,
    ...(run.toy ? {} : { launchIntegration, stages, offeredRates: serverRates, windowSeconds, creditMode, fairCredits: credits, postgresStartup: prepared ? "prepared PGDATA" : "logical dump" }),
    ...(run.writer === "per-person-ordered" ? { comparison: selectedWriter("grouped") } : {}),
    armReadbacks: arms.map((a) => a.settings),
  };
  fs.writeFileSync(path.join(run.out, "SCORECARD-v0.1.md"),
    text.replace("```json\n{}\n```", "```json\n" + JSON.stringify(settings, null, 2) + "\n```"), { flag: "wx", mode: 0o600 });
}
