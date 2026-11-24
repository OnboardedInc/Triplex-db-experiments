import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { Histogram } from "../../../bench/lib/hist.ts";
import { render as emptyCard } from "./render.ts";
import type { MixedIds } from "./mixed-ids.ts";
import type { adoptedArm } from "./adopted.ts";
import { defaultCreditMode, launchProfile, type ServerProfile } from "../jvm1/launch.mjs";
import { barrierRoot, phaseSeconds, launchIntegration, selectedWriter, writeDiagnostics, serverStages, writerIntegration, type JvmProfile, type Age, type Writer } from "./profile.ts";
import { cellPath, lastServerCell, ratedTape, serverCellSeconds, serverRates, writerAdmission, type CreditMode, type WindowSeconds } from "./server-workload.ts";

import { realisticTape, sweepSize, thinLimit, realPin } from "./realistic-plan.ts";
import type { RealisticBinding } from "./realistic.ts";
import type { Image } from "../real1/seal.ts";
import { operationId } from "../scale1/decision/operation-id.ts";
import { summarizeTelemetry, type Telemetry } from "./cell-telemetry.ts";
import { checkAdmission } from "./credit-evidence.ts";
import { p99Miss, quietVerdict } from "./card-verdict.ts";
import { windowStats, type WindowWrite } from "./windows.ts";
import { fullCellTape, parseCardTape, tapeEdge, tapeShape, tapeTitle, type CardTape } from "./production-card.ts";
import { randomLine, readerLaunch, readerTitle, type CardReader } from "./card-reader.ts";

type Card = { source: string; age: Age; writer: Writer; jvm?: JvmProfile; toy: boolean; campaign: string; out: string; forecast: string;
  realistic?: RealisticBinding;
  windowSeconds?: WindowSeconds; creditMode?: CreditMode;
  prepared?: boolean; profile?: ServerProfile; txJvm?: JvmProfile;
  /** [DX-CARD2] The tuned reader (run.ts --reader tuned); absent for the default reader. */
  reader?: CardReader; writeJvm?: JvmProfile; diagnostics?: ReturnType<typeof writeDiagnostics>; separateWal?: boolean; failure?: string;
  /** The save tape: its name, or the input's binding of every loaded cell's tape report (assembled campaigns). */
  tape?: string | { name: string };
  /** [DX-S1] Default-off writer options the campaign ran with (v01/production-card.ts writerOptionNames). */
  writerOptions?: Record<string, string>;
  /** [DX-CARD1] A campaign assembled by a later renderer commit than the one that ran it (run.ts --renderer). */
  renderer?: { commit: string; files: string[] };
  /**
   * [DX-CARD1] "platform": the production tape is regenerated on another platform than the campaign's (the Mac for a
   * Linux campaign), whose Math.log and Math.exp can differ in the last bit. The cell's tape must then hash to the
   * input's binding (made on the campaign's machine before the first offer) and match the regeneration in every field,
   * with `ms` and `gap` within `platformTolerance`. Default "exact": the regeneration must equal the tape.
   */
  tapeRegeneration?: "exact" | "platform" };
export const platformTolerance = { ms: 1e-6, gapSeconds: 1e-9 };
type Observation = Awaited<ReturnType<typeof adoptedArm>>;
const tag = (x: unknown) => (typeof x === "number" && Number.isFinite(x)) ? String(Number(x.toFixed(3))) : "—";
export function writeAdoptedCard(run: Card) {
  const windowSeconds = run.windowSeconds ?? serverCellSeconds, creditMode = run.creditMode ?? defaultCreditMode;
  const admission = writerAdmission(creditMode);
  const file = (arm: string, name: string) => path.join(run.campaign, arm, name);
  const diagnostics = run.diagnostics ?? writeDiagnostics(run.writer);
  const profile = run.profile ?? "server";
  const policy = launchProfile(profile, { jvm: run.jvm, txJvm: run.txJvm, writeJvm: run.writeJvm, creditMode, ...readerLaunch(run.reader) });
  const stages = serverStages(policy, !!run.separateWal);
  const readArm = (arm: string, load: boolean, mode = creditMode) => {
    if (!fs.existsSync(file(arm, "arm.json"))) return [];
    const x: Observation = JSON.parse(fs.readFileSync(file(arm, "arm.json"), "utf8"));
    const bytes = fs.readFileSync(file(arm, "operations.json"));
    assert.deepEqual([x.source, x.fixture, x.loaded, x.writer], [run.source, run.toy, load, run.writer]);
    assert(x.startedAt <= x.start && x.start < x.endedAt && x.seed.head === x.firstCut);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), x.observationsSha256);
    const raw = JSON.parse(bytes.toString());
    assert.deepEqual([raw.p1, raw.p4, raw.p6, raw.p7, raw.thin, raw.selection, raw.fairCredits],
      [x.p1, x.p4, x.p6, x.p7, x.thin, x.settings.selection, x.settings.fairCredits]);
    assert.deepEqual(raw.p1Random, x.p1Random);
    assert.equal(x.settings.creditMode, mode);
    const admission = writerAdmission(mode);
    if (x.p6 || !run.toy || admission.mode === "rolling") {
      assert.deepEqual(x.settings.selection, admission);
      assert.equal(x.settings.fairCredits, admission.credits);
      checkAdmission(raw.writes, admission);
    }
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
  const [control] = readArm(barrierRoot + "loaded", true, defaultCreditMode);
  const arms = [zero, loaded, control].filter((arm) => arm !== undefined);
  const inputsFile = path.join(run.campaign, "input.json");
  const prepared = run.prepared === true;
  // [DX-INT1] Which save tape the loaded cells used; the header names it and every production cell is checked against it.
  const boundTape = !run.toy && fs.existsSync(inputsFile) ? JSON.parse(fs.readFileSync(inputsFile, "utf8")).tape : undefined;
  const cardTape = parseCardTape(boundTape?.name ?? (typeof run.tape === "string" ? run.tape : run.tape?.name ?? process.env.DX_V01_TAPE));
  if (typeof run.tape === "string" && !run.toy && fs.existsSync(inputsFile)) assert.equal(cardTape, run.tape);
  const shape = tapeShape(cardTape);
  const productionRows: string[] = [];
  if (!run.toy && arms.length) assert(fs.existsSync(inputsFile));
  if (!run.toy && fs.existsSync(inputsFile)) {
    const input = JSON.parse(fs.readFileSync(inputsFile, "utf8"));
    assert.deepEqual([input.source, input.age, input.writer, input.jvm, input.txJvm, input.writeJvm, input.diagnostics, input.separateWal, input.stages, input.windowSeconds, input.creditMode],
      [run.source, run.age, run.writer, run.jvm, run.txJvm, run.writeJvm, diagnostics, !!run.separateWal, stages, windowSeconds, creditMode]);
    assert.deepEqual(input.realistic, run.realistic);
    assert.equal(input.profile ?? "server", profile);
    assert.deepEqual(input.reader, run.reader, "the campaign ran another reader setting");
    assert.equal(Boolean(input.pgdata), prepared);
    if (prepared) assert.equal(input.pgdata.length, stages.length);
    let systemIdentifier: string | undefined;
    for (const [i, stage] of stages.entries()) {
      const dir = stage.root + (stage.loaded ? "loaded" : "zero");
      const arm = stage.name === "headline" ? (stage.loaded ? loaded : zero)
        : control;
      if (!arm) continue;
      if (run.realistic) {
        const seal = run.realistic;
        assert.equal(seal.imagePin, input.imagePin);
        assert.equal(seal.transferPin, input.transferPin);
        assert.equal(arm.seed.imageSha256, seal.parent.imageSha);
        assert.deepEqual(arm.seed.realistic, seal);
        assert.deepEqual([arm.firstCut, arm.seed.originalCut, arm.seed.database], [seal.cut, seal.parent.cut, seal.parent.db]);
        const live = JSON.parse(fs.readFileSync(file(dir, "realistic-live.json"), "utf8"));
        assert.deepEqual([live.source, live.slot, live.attempt, live.seal, live.native],
          [run.source, arm.slot, arm.attempt, seal, [seal.cut, seal.census.nativeT, seal.census.nativeRecords]]);
        assert(live.at <= arm.startedAt);
      } else assert.equal(arm.seed.imageSha256, input.imagePin);
      const launch = JSON.parse(fs.readFileSync(file(dir, "launch-check.json"), "utf8"));
      assert.deepEqual([launch.source, launch.slot, launch.attempt, launch.policy, launch.diagnostics, launch.separateWal],
        [run.source, arm.slot, arm.attempt, stage.policy, diagnostics, stage.separateWal]);
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
  if (loaded && control) {
    const other = control;
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
  let rowsRandom: string[] | undefined;
  const cellWindows: string[] = [], cellTelemetry: string[] = [], edgeRows: string[] = [];
  const regenerated: { cell: string; ms: number; gap: number; maxMs: number; maxGap: number }[] = [];
  const partial = "PARTIAL";
  const p2Arms = [[loaded, "loaded"], [control, barrierRoot + "loaded"]] as const;
  const commit = p2Arms.flatMap(([a, dir]) => a && a.p2.offered ? [{
    reading: `${a.settings.creditMode} p50 ${tag(a.p2.latency.p50Ms)} ms, p99 ${tag(a.p2.latency.p99Ms)} ms (${a.p2.receipts}/${a.p2.offered} receipts)`,
    samples: `${a.settings.creditMode} ${a.p2.receipts}`, link: evidence(dir),
  }] : []);
  if (commit.length) rows.set("P2", [commit.map((c) => c.reading).join(" · ") + ". Prelude only. Rated save windows, latency bands and retry coverage remain open.",
    partial, commit.map((c) => c.samples).join(" · "), commit.map((c) => c.link).join(" · ")]);
  if (loaded && run.writer === "per-person-ordered") {
    const phases = loaded.p1.map(p => `L${p.seats} ${tag(p.goodput)}/s, p99 ${tag(p.read.p99Ms)} ms, ${p.errors} errors` +
      (p.mix ? `, checked deep/thin/small ${p.mix.deep}/${p.mix.thin}/${p.mix.small}` : "")).join("; ");
    const baseline = zero?.p2.latency.p99Ms;
    const ratio = baseline && loaded.p2.latency.p99Ms !== null ? loaded.p2.latency.p99Ms / baseline : null;
    const miss = zero && p99Miss(run.toy, loaded.p1.find(p => p.seats === 256)?.read, 100, "L256 checked field-read p99");
    // [DX-CARD2] With the tuned reader the P1 verdict names its case: this row judges re-read subjects (the ladder's
    // seats re-read a fixed sequence of subjects, so most reads find them in the reader's cache), and the next row
    // judges the random-subject line on its own, since the two cases differ by about a factor of seven.
    const judged = run.reader ? "Judges re-read subjects (seat s reads subject 7919·k mod 100,000 of account s mod 10; each subject returns about ten rounds later); random subjects are judged in the next row. " : "";
    const batches = run.reader ? ` Client batches of up to ${loaded.p1[0]?.batch?.size ?? "—"}: mean ${loaded.p1.map(p => `L${p.seats} ${tag(p.batch?.meanBatch)}`).join(", ")}.` : "";
    if (loaded.p1.some(p => p.read.count || p.errors)) rows.set("P1", [`${judged}${miss ? miss + ". " : ""}${phases}.${batches} Whole-tape writer p99 ratio ${tag(ratio)}. Exact seed-cut field probes; full-world and recovery coverage remain open.`, miss ? "MISSED" : partial,
      String(loaded.p1.reduce((a, p) => a + p.read.count, 0)), evidence("loaded")]);
    const line = loaded.p1Random;
    if (run.reader) {
      assert(run.toy || line, "the tuned reader's card has no random-subject line");
      if (line) {
        const l = line.loads;
        const randomMiss = p99Miss(run.toy, line.read, 100, `L${line.seats} random-subject read p99`);
        const bad = line.wrong || line.errors ? `${line.wrong} wrong values and ${line.errors} errors; both bars are zero. ` : "";
        rowsRandom = [`${bad}${randomMiss ? randomMiss + ". " : ""}L${line.seats} random ${tag(line.goodput)}/s, p50 ${tag(line.read.p50Ms)} ms, p99 ${tag(line.read.p99Ms)} ms, ${line.wrong} wrong, ${line.errors} errors; mean batch ${tag(line.meanBatch)}; ` +
          `${line.population?.accounts ?? "—"} accounts × ${line.population?.subjectsPerAccount ?? "—"} subjects, pinned at the seed cut ${line.position}, every value checked against the seed's. ` +
          (l ? `Storage loads per subject ${tag(l.loadsPerSubjectSampled)} (${l.sampledExchanges} sampled exchanges, ${tag(l.storageReadsPerExchange)} per exchange) and ${tag(l.loadsPerSubjectMetrics)} (reader metrics, ${tag(l.metricsSeconds)} s); object-cache share ${tag(l.cacheShare)}; handler CPU ${tag(l.handlerCpuMsPerExchange)} ms per exchange. `
            : "Storage loads and cache share not recorded (no reader trace). ") +
          `Answered from the current database ${line.shortcut.current} of ${line.shortcut.current + line.shortcut.asOf}.`,
          run.toy ? partial : line.wrong || line.errors || randomMiss ? "MISSED" : "MET", String(line.read.count), evidence("loaded")];
      }
    }
    const steps = feedSteps(loaded), at256 = steps.find((x) => x.label === "L256");
    const lagRule = at256?.lag.count ? `Lag judged at P1's 256 readers, as the bar says: p99 ${tag(at256.lag.p99Ms)} ms (${at256.lag.p99Ms !== null && at256.lag.p99Ms <= 250 ? "lag clause met" : "lag clause missed"}). By ladder step: ${steps.map((x) => `${x.label} p99 ${tag(x.lag.p99Ms)} ms (n=${x.lag.count})`).join("; ")}. Whole tape as before: ` : "";
    if (loaded.p3.entries) rows.set("P3", [`${loaded.p3.entries} ordered exact changes${loaded.seed.realistic ? ` (busy deep/thin/small ${armMix(loaded.writes).join("/")})` : ""}; ${lagRule}dispatch-to-observation p99 ${tag(loaded.dispatchToFeed.p99Ms)} ms across ${loaded.dispatchToFeed.count} observations. Durable effects and crash resume are open.`, partial,
      String(loaded.p3.entries), evidence("loaded")]);
    if (loaded.p4?.observed.count) {
      const byKind = loaded.p4.byKind;
      if (byKind) assert.equal(Object.values(byKind).reduce((n, summary) => n + summary.count, 0), loaded.p4.observed.count);
      const cohorts = byKind ? " " + Object.entries(byKind).map(([kind, h]) => `${kind} p99 ${tag(h.p99Ms)} ms (n=${h.count})`).join(" · ") + "." : "";
      const d = loaded.p4Drain, g = loaded.p4Gateway;
      const drained = d ? ` Started after the reader's backlog ${d.drained ? "drained" : "did not drain"} (${tag(d.elapsedMs / 1000)} s; ${d.probes.count} probes, p99 ${tag(d.probes.p99Ms)} ms, max ${tag(d.probes.maxMs)} ms).` : "";
      const gateway = g && !("error" in g) ? ` Gateway time of every pull (${g.found} of ${g.requested} recorded): p50 ${tag(g.p50Ms)}, p99 ${tag(g.p99Ms)}, max ${tag(g.maxMs)} ms.` : "";
      rows.set("P4", [`Current demand pulls p50 ${tag(loaded.p4.observed.p50Ms)} ms, p99 ${tag(loaded.p4.observed.p99Ms)} ms.${drained}${gateway}${cohorts} History depth and engine bytes remain open.`, partial,
      String(loaded.p4.observed.count), evidence("loaded")]);
    }
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
  let realistic: Image | undefined;
  if (run.age === "realistic" && loaded) {
    const name = run.toy ? "loaded/realistic-seed/image.json" : "realistic-image.json";
    const bytes = fs.readFileSync(file(name, ""));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), loaded.seed.realistic?.imagePin);
    realistic = JSON.parse(bytes.toString()) as Image;
    assert.equal(realistic.proof.cut, loaded.firstCut);
    assert.equal(createHash("sha256").update(JSON.stringify(realistic.accounts)).digest("hex"), loaded.seed.realistic?.rosterSha);
  }
  if (loaded?.thin && realistic) {
    const p = loaded.thin, account = realistic.accounts[10]!;
    assert.equal(account.kind, "thin");
    assert.deepEqual([p.cut, p.n, p.thin, p.start, p.read.count],
      [loaded.firstCut, sweepSize(realistic.profile), account.people, thinLimit(account, realistic.profile), sweepSize(realistic.profile)]);
    assert(loaded.startedAt <= p.before.at && p.before.at <= p.after.at && p.after.at <= loaded.start);
    const roles = ["tx", "gw-w", "gw-r"];
    const bytes = (point: typeof p.before, role: string) => {
      const stats = point.roles[role];
      assert(stats && Number.isSafeInteger(stats.rssBytes) && stats.rssBytes > 0 && stats.threads > 0);
      return stats.rssBytes;
    };
    const readings = roles.map(role => `${role} ${bytes(p.before, role)} → ${bytes(p.after, role)} RSS bytes (${tag((bytes(p.after, role) - bytes(p.before, role)) / p.n)} added B/first-read person)`);
    const miss = p99Miss(run.toy, p.read, 100, "Checked first thin read p99");
    rows.set("P7", [`${miss ? miss + ". " : ""}Thin first-read p99 ${tag(p.read.p99Ms)} ms. ${readings.join(" · ")}. The sweep measures first-touch change. Marginal untouched bytes require the first/full pairing.`,
      miss ? "MISSED" : partial, `${p.n} distinct thin people and two residency points`, evidence("loaded")]);
  }
  const lastQuiet = run.toy ? "p6-235" : lastServerCell;
  const [neighbors] = readArm(lastQuiet, true);
  const quietRows = (prefix: string, mode: CreditMode, prior?: Observation) => {
    const [alone] = readArm(prefix + "p6-alone", false, mode), [loaded] = readArm(prefix + "p6-235", true, mode);
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
      addWindows(arm.writes.filter((row: any) => row.account === 0), arm, `${mode} · toy quiet ${title}`);
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
      reading: `${mode} quiet commit p99 ${tag(a.commit.p99Ms)} → ${tag(b.commit.p99Ms)} ms (${ratio(a.commit.p99Ms, b.commit.p99Ms)}×), pinned reads ${ratio(a.read.read.p99Ms, b.read.read.p99Ms)}, dispatch-to-feed ${ratio(a.feed.p99Ms, b.feed.p99Ms)}. ${total(a)} and ${total(b)} offers/receipts. ${a.read.errors + b.read.errors} read errors or missed offers.`,
      samples: `${mode} ${a.commit.count}/${b.commit.count} commits, ${a.read.read.count}/${b.read.read.count} reads, ${a.feed.count}/${b.feed.count} feed observations`,
      link: evidence(prefix + "p6-alone") + " · " + evidence(prefix + "p6-235"),
      tape: loaded.tape,
    };
  };
  const primaryQuiet = quietRows("", creditMode, loaded);
  if (run.toy && shape) for (const [prefix, mode] of [["", creditMode], [barrierRoot, defaultCreditMode]] as const) {
    const [toyCell] = readArm(prefix + "p6-235", true, mode);
    if (toyCell?.production) productionRows.push(productionRow(`toy ${mode}`, toyCell, prefix + "p6-235"));
  }
  const barrierQuiet = quietRows(barrierRoot, defaultCreditMode, control);
  if (primaryQuiet && barrierQuiet) assert.deepEqual(primaryQuiet.tape, barrierQuiet.tape);
  const quiet = [primaryQuiet, barrierQuiet].filter((arm) => arm !== undefined);
  if (run.toy && quiet.length) rows.set("P6", [quiet.map((a) => a.reading).join(" · ") + " Durable effects, Publish and import overlap remain open.",
    partial, quiet.map((a) => a.samples).join(" · "), quiet.map((a) => a.link).join(" · ")]);
  const completedRates = new Set<string>();
  if (!run.toy) {
    const commits = [], pairs = [], headlineVerdicts: ReturnType<typeof quietVerdict>["status"][] = [], steadyVerdicts: boolean[] = [];
    // [DX-CARD2] P2 is judged in steady state: on the second half of each loaded cell (all loaded saves, from the
    // scheduled offer), with the first half reported as "after a start" and the whole cell as before. Cells shorter
    // than 300 s are not judged (on 2026-11-23, 43 to 51% of commits in 90 s cells still read storage in the writer;
    // the same tape at 394/s for 300 s had p50 10.81 ms in minute 1 and 6.3 to 8.2 ms in minutes 2 to 5).
    const steady = windowSeconds >= 300;
    const treatments = [[loaded, "", "headline", creditMode],
      [control, barrierRoot, "barrier6 control", defaultCreditMode]] as const;
    for (const [anchor, prefix, name, mode] of treatments) {
      if (!anchor) continue;
      let prior = anchor;
      for (const rate of serverRates) {
        const soloPath = prefix + cellPath({rate, loaded: false}), loadPath = prefix + cellPath({rate, loaded: true});
        const [solo] = readArm(soloPath, false, mode), [busy] = readArm(loadPath, true, mode);
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
        const expired = quietWrites.filter((row: any) => row.status === "expired-before-dispatch").length +
          solo.writes.filter((row: any) => row.status === "expired-before-dispatch").length;
        const result = quietVerdict(a.commit, b.commit, expired, a.read.wrong + b.read.wrong);
        if (name === "headline") headlineVerdicts.push(result.status);
        const ratio = (base: number | null, loaded: number | null) => tag(base && loaded !== null ? loaded / base : null);
        const mix = armMix(busy.writes);
        if (busy.production) productionRows.push(productionRow(`${name} ${rate}`, busy, loadPath));
        const h = halves(busy);
        const met = h.second.due.p50Ms !== null && h.second.due.p99Ms !== null && h.second.due.p50Ms <= 10 && h.second.due.p99Ms <= 50;
        if (name === "headline") steadyVerdicts.push(met);
        commits.push({
          reading: `${name} ${rate}/s: ${tag(b.acknowledgedInWindow / b.durationSeconds)}/s in window, ${b.totalReceipts}/${b.totalOffers} durable, ${b.expired} expired${busy.seed.realistic ? `, deep/thin/small receipts ${mix.join("/")}` : ""}, ` +
            `second half p50/p99 ${tag(h.second.due.p50Ms)}/${tag(h.second.due.p99Ms)} ms${steady ? (met ? " (met)" : " (missed)") : ""} (from the actual send ${tag(h.second.send.p50Ms)}/${tag(h.second.send.p99Ms)}; driver timer lateness p50/p99 ${tag(h.second.late.p50Ms)}/${tag(h.second.late.p99Ms)}), ` +
            `after a start (first half) ${tag(h.first.due.p50Ms)}/${tag(h.first.due.p99Ms)}, whole cell as before p50/p99 ${tag(busy.p2.latency.p50Ms)}/${tag(busy.p2.latency.p99Ms)} ms`,
          samples: `${name} ${rate}: ${b.totalReceipts}`, link: evidence(loadPath),
        });
        pairs.push({
          reading: `${name} ${rate}/s: ${result.status} on quiet commit gate (${result.reason}). Quiet commit p99 ${tag(a.commit.p99Ms)} → ${tag(b.commit.p99Ms)} ms (${ratio(a.commit.p99Ms, b.commit.p99Ms)}×), read ${tag(a.read.read.p99Ms)} → ${tag(b.read.read.p99Ms)} ms (${ratio(a.read.read.p99Ms, b.read.read.p99Ms)}×), dispatch-to-feed ${tag(a.feed.p99Ms)} → ${tag(b.feed.p99Ms)} ms (${ratio(a.feed.p99Ms, b.feed.p99Ms)}×), ${a.read.errors + b.read.errors} read errors or misses${b.mixedReads ? `; background checked deep/thin/small ${b.mixedReads.mix.deep}/${b.mixedReads.mix.thin}/${b.mixedReads.mix.small}, ${b.mixedReads.errors} missed` : ""}`,
          samples: `${name} ${rate}: ${a.commit.count}/${b.commit.count} commits, ${a.read.read.count}/${b.read.read.count} reads, ${a.feed.count}/${b.feed.count} feed`,
          link: evidence(soloPath) + " · " + evidence(loadPath),
        });
        prior = busy;
        if (rate === serverRates.at(-1)) completedRates.add(name);
      }
    }
    const p2Rule = steady ? "Judged on the second half of each headline loaded cell (p50 ≤ 10 ms and p99 ≤ 50 ms from the scheduled offer, all loaded saves); the first half is reported as after a start, the whole cell as before. "
      : `Not judged: the steady-state rule needs cells of 300 s or more (these are ${windowSeconds} s); second halves, first halves and whole cells are reported. `;
    const p2Status = !steady || !completedRates.has("headline") ? partial : steadyVerdicts.every(Boolean) ? "MET" : "MISSED";
    if (commits.length) rows.set("P2", [p2Rule + commits.map(c => c.reading).join(" · ") + ". Completed-only field saves. Full size bands and retry coverage remain open.",
      p2Status, commits.map(c => c.samples).join(" · "), commits.map(c => c.link).join(" · ")]);
    if (!pairs.length && cellWindows.length) rows.set("P6", ["A quiet-only window completed. Its matched loaded window is open.",
      partial, String(cellWindows.length / 3) + " cells", "[Save windows](#within-cell-save-windows)"]);
    if (pairs.length) rows.set("P6", [pairs.map(c => c.reading).join(" · ") +
      `. Each side offers ${windowSeconds * 3.5} quiet saves. The verdict scores the headline burst commit gate. Pinned-read and feed observations accompany it. Publish, import and durable-effect coverage remain open.`,
      headlineVerdicts.includes("MISSED") ? "MISSED" :
        completedRates.has("headline") && headlineVerdicts.every(v => v === "MET") ? "MET" : partial, pairs.map(c => c.samples).join(" · "), pairs.map(c => c.link).join(" · ")]);
  }

  // [DX-CARD2] Latency of every acknowledged save in each half of a cell, placed by tape offset: from the scheduled offer
  // (the bar's clock), from the actual send, and the driver timer's lateness (enqueued minus due; about 0.7 ms on
  // 2026-11-23, from `sleep(Math.ceil(...))` in scale1/decision/writes.ts `play`).
  function halves(arm: NonNullable<typeof loaded>) {
    const half = arm.p6!.durationSeconds * 500;
    const side = () => ({ due: new Histogram(), send: new Histogram(), late: new Histogram() });
    const h = { first: side(), second: side() };
    for (const [i, row] of (arm.writes as any[]).entries()) {
      if (!row.receipt) continue;
      const s = arm.tape[i]!.ms < half ? h.first : h.second;
      s.due.recordMs(row.end - row.due);
      if (Number.isFinite(row.sent)) s.send.recordMs(row.end - row.sent);
      if (Number.isFinite(row.enqueued)) s.late.recordMs(Math.max(0, row.enqueued - row.due));
    }
    const sum = (x: ReturnType<typeof side>) => ({ due: x.due.summary(), send: x.send.summary(), late: x.late.summary() });
    return { first: sum(h.first), second: sum(h.second) };
  }

  // [DX-CARD2] Change-feed lag (dispatch to observation) per P1 ladder step: the bar's lag clause is at P1's 256 readers;
  // the 1,024-seat step is stress, and the tuned reader's random-subject line is its own step after the ladder.
  function feedSteps(arm: NonNullable<typeof loaded>) {
    const stepMs = (run.toy ? 4 : phaseSeconds) * 1000;
    const seen = new Map<string, number>((arm.journal as any[]).map((e) => [e.id, e.seen]));
    const labels = [...arm.p1.map((p: any) => (p.seats === 1024 ? "L1024 (stress)" : "L" + p.seats)), ...(arm.p1Random ? [`random L${arm.p1Random.seats}`] : [])];
    const steps = labels.map(() => new Histogram());
    for (const [i, row] of (arm.writes as any[]).entries()) {
      const at = seen.get(row.id), step = Math.floor(arm.tape[i]!.ms / stepMs);
      if (!row.receipt || at === undefined || !Number.isFinite(row.dispatched) || at < row.dispatched || !steps[step]) continue;
      steps[step]!.recordMs(at - row.dispatched);
    }
    return labels.map((label, i) => ({ label, lag: steps[i]!.summary() }));
  }

  // [DX-CARD2] Which window each stack measured first after it started: those find their subjects cold.
  function startOrder() {
    if (!fs.existsSync(run.campaign)) return [];
    const found: { dir: string; slot: string; startedAt: number }[] = [];
    for (const rel of fs.readdirSync(run.campaign, { recursive: true, encoding: "utf8" })) {
      if (path.basename(rel) !== "arm.json") continue;
      const x = JSON.parse(fs.readFileSync(path.join(run.campaign, rel), "utf8"));
      if (typeof x.slot === "string" && Number.isFinite(x.startedAt)) found.push({ dir: path.dirname(rel), slot: x.slot, startedAt: x.startedAt });
    }
    const bySlot = new Map<string, typeof found>();
    for (const f of found) bySlot.set(f.slot, [...(bySlot.get(f.slot) ?? []), f]);
    return [...bySlot.values()].map((list) => list.sort((a, b) => a.startedAt - b.startedAt))
      .sort((a, b) => a[0]!.startedAt - b[0]!.startedAt)
      .map((list) => `- Stack \`${list[0]!.slot}\`: **${list[0]!.dir}** (first after the stack started)` + (list.length > 1 ? ", then " + list.slice(1).map((f) => f.dir).join(", ") : "") + ".");
  }

  // [DX-CARD2] The tuned reader's settings, its checks before the first read, and each role's cgroup memory peak per
  // stage against its cap (the caps of server-32 with the tuned reader were set from the 2026-11-23 peaks).
  function tunedReaderSection() {
    const out = ["## Tuned reader", "", readerTitle(run.reader).trim(), "", ...(run.toy ? ["Mac toy: the compact stack's reader runs both pinned options, the early filter and the permits; the random line has " +
      `${randomLine.toySeats} seats; the toy reader writes no trace, so its storage loads and cache share are not recorded.`, ""] : [])];
    const stagesDirs = [["zero", "P1 zero readers"], ["loaded", "P1 readers, P6, P7, P8"], [barrierRoot + "loaded", "barrier6 control"]] as const;
    const caps = { tx: policy.tx.memoryMiB, "gw-w": policy["gw-w"].memoryMiB, "gw-r": policy["gw-r"].memoryMiB, pg: policy.pg.memoryMiB } as Record<string, number>;
    const gib = (bytes: number) => (bytes / 2 ** 30).toFixed(2);
    const memory: string[] = [];
    for (const [dir, title] of stagesDirs) {
      const check = file(dir, "reader-check.json"), peaks = file(dir, "role-memory.json");
      if (fs.existsSync(check)) {
        const c = JSON.parse(fs.readFileSync(check, "utf8"));
        assert.equal(c.source, run.source);
        out.push(`- ${title}: reader checked before the first offer: pinned short-cut ${c.pinned?.pinnedShortcut}, cut lookup ${c.pinned?.pinnedCutLookup}, permits ${c.permits.length ? c.permits.join(" ") : "one per core"}.`);
      }
      if (fs.existsSync(peaks)) {
        const m = JSON.parse(fs.readFileSync(peaks, "utf8"));
        assert.equal(m.source, run.source);
        memory.push(`| ${title} | ` + ["tx", "gw-w", "gw-r", "pg"].map((role) => {
          const r = m.roles[role];
          return r ? `${gib(r.peakBytes)} of ${(caps[role]! / 1024).toFixed(0)}` : "—";
        }).join(" | ") + " |");
      }
    }
    if (memory.length) out.push("", "Peak cgroup memory per role and stage, GiB of the role's cap (`memory.peak`, page cache included):", "",
      "| Stage | Transactor | Writer | Reader | PostgreSQL |", "| --- | ---: | ---: | ---: | ---: |", ...memory);
    return [...out, ""];
  }

  function productionRow(label: string, arm: Observation, dir: string) {
    const p = arm.production!, m = p.metrics, ms = (h: { p50Ms: number | null; p99Ms: number | null }) => `${tag(h.p50Ms)} / ${tag(h.p99Ms)}`;
    const report = JSON.parse(fs.readFileSync(file(dir, "tape-report.json"), "utf8"));
    assert.equal(report.shape, shape);
    const pathCell = (w: typeof m.writerPath.subject) => `${tag(w.perSecond)}/s, p99 ${tag(w.latency.p99Ms)} ms, late reads ${tag(w.lateReadsPerCommit)}`;
    return `| ${label} | ${tag(m.offered.rowsPerSecond)} rows/s · ${tag(m.offered.commitsPerSecond)} commits/s · ${m.offered.saves} saves | ` +
      `${tag(m.stored.rowsPerSecond)} rows/s · ${tag(m.stored.commitsPerSecond)} commits/s · ${m.stored.expired} expired | ` +
      `${ms(m.commitLatency)} · second half ${ms(m.commitLatencySecondHalf)} | ${ms(m.saveCompletion)} · second half ${ms(m.saveCompletionSecondHalf)} | ` +
      `${tag(m.readsPerCommit.firstMinute)} / ${tag(m.readsPerCommit.late)} | ${pathCell(m.writerPath.subject)} | ${pathCell(m.writerPath.general)} | ` +
      `${m.generalIdentityCommits} | ${p.readback.fields} fields of ${p.readback.subjects} subjects; predecessors ${p.predecessors.seedRows} seed, ${p.predecessors.agedRows} AGE1, ${p.predecessors.campaignRows} earlier-cell rows | ${evidence(dir)} · [tape report](${path.relative(run.out, file(dir, "tape-report.json"))}) |`;
  }

  function armMix(writes: { receipt?: unknown; account: number }[]) {
    const n = [0, 0, 0];
    for (const row of writes) if (row.receipt && row.account !== 0)
      n[row.account < 10 ? 0 : row.account === 10 ? 1 : 2]!++;
    return n;
  }

  function addWindows(writes: WindowWrite[], arm: Observation, title: string) {
    // [DX-CARD1] Each row carries its tape offset (checkRated proved writes[i].due === start + tape[i].ms), so
    // windowStats places it by the offset; see windows.ts for the rule on rows whose due rounds to the cell end.
    const offsets = new Map<unknown, number>(arm.writes.map((row: unknown, i: number) => [row, arm.tape[i]!.ms]));
    const stats = windowStats(writes.map((row) => {
      const offset = offsets.get(row);
      assert(offset !== undefined, "a window row is not one of its cell's writes");
      return { ...row, offset };
    }), arm.start, arm.p6!.durationSeconds);
    const edge = stats.find((w) => w.name === "whole")!.edge;
    if (edge) edgeRows.push(`${title}: ${edge}`);
    for (const w of stats) {
      cellWindows.push(`| ${title} | ${w.name} | ${tag(w.storedPerSecond)} | ${tag(w.latency.p50Ms)} | ${tag(w.latency.p99Ms)} | ${tag(w.senderWait.p99Ms)} | ${w.offered} | ${w.acked} | ${w.latency.count} | ${w.expired} |`);
    }
  }

  function checkRated(arm: NonNullable<typeof loaded>, previous: Observation, rate: (typeof serverRates)[number], loadedCell: boolean, dir: string) {
    const cell = { rate, loaded: loadedCell };
    assert.deepEqual([arm.attempt, arm.slot, arm.seed.database, arm.seed.imageSha256, arm.firstCut],
      [previous.attempt, previous.slot, previous.seed.database, previous.seed.imageSha256, previous.terminal]);
    assert(arm.startedAt >= previous.endedAt && arm.p6);
    assert.deepEqual(arm.p6.quietCell, cell);
    if (arm.seed.realistic) {
      const bytes = fs.readFileSync(file("realistic-image.json", ""));
      assert.equal(createHash("sha256").update(bytes).digest("hex"), arm.seed.realistic.imagePin);
      const shape: Image = JSON.parse(bytes.toString());
      assert.deepEqual(arm.seed.realistic, run.realistic);
      assert.deepEqual(arm.tape.map(({ owner: _owner, ...offer }: any) => offer),
        realisticTape(shape, cellPath(cell), windowSeconds, cell.loaded ? cell.rate - 3.5 : 0));
    } else if (shape && cell.loaded) {
      const bound = boundTape?.cells.find((c: { cell: string }) => c.cell === cellPath(cell));
      const again = fullCellTape(shape, cell, windowSeconds, tapeEdge(cardTape));
      if (run.tapeRegeneration === "platform") {
        assert(bound);
        assert.equal(createHash("sha256").update(JSON.stringify(arm.tape)).digest("hex"), bound.tapeSha256,
          "the cell's tape differs from the one bound in the card's input");
        assert.equal(arm.tape.length, again.length);
        const seen = { cell: dir, ms: 0, gap: 0, maxMs: 0, maxGap: 0 };
        for (const [i, offer] of (arm.tape as any[]).entries()) {
          const { ms, gap, ...rest } = offer, { ms: ms2, gap: gap2, ...rest2 } = again[i] as any;
          assert.deepEqual(rest, rest2);
          assert.equal(typeof gap, typeof gap2);
          const dMs = Math.abs(ms - ms2), dGap = typeof gap === "number" ? Math.abs(gap - gap2) : 0;
          assert(dMs <= platformTolerance.ms && dGap <= platformTolerance.gapSeconds, `${seen.cell} offer ${i}: regenerated tape differs`);
          if (dMs) seen.ms++;
          if (dGap) seen.gap++;
          seen.maxMs = Math.max(seen.maxMs, dMs); seen.maxGap = Math.max(seen.maxGap, dGap);
        }
        regenerated.push(seen);
      } else assert.deepEqual(arm.tape, again);
      const reportBytes = fs.readFileSync(file(dir, "tape-report.json"));
      const report = JSON.parse(reportBytes.toString());
      assert(bound && arm.production);
      assert.equal(createHash("sha256").update(reportBytes).digest("hex"), arm.production.tapeReportSha256);
      assert.deepEqual([report.tapeSha256, createHash("sha256").update(JSON.stringify(report)).digest("hex")],
        [bound.tapeSha256, bound.reportSha256], "the cell's tape differs from the one bound in the card's input");
      assert.equal(report.tapeSha256, arm.tapeSha256);
    } else assert.deepEqual(arm.tape, ratedTape(100_000, cell, windowSeconds));
    assert.equal(arm.writes.length, arm.tape.length);
    for (const [i, row] of arm.writes.entries()) {
      const offer = arm.tape[i]!;
      assert.deepEqual([row.id, row.db, row.due, row.account, row.subject, row.width, row.ordinal],
        [operationId(arm.attempt, offer.version), arm.seed.database, arm.start + offer.ms, offer.account, offer.subject, offer.width, offer.ordinal]);
    }
    assert.equal(arm.p6.durationSeconds, windowSeconds);
    const receipts = arm.writes.filter((r: any) => r.receipt);
    assert.equal(arm.p6.totalOffers, arm.tape.length);
    assert.equal(arm.p6.quietOffers, arm.tape.filter((offer: any) => offer.account === 0).length);
    assert.equal(arm.p6.read.planned, arm.p6.read.read.count + arm.p6.read.errors);
    assert(Number.isInteger(arm.p6.read.wrong) && arm.p6.read.wrong >= 0 && arm.p6.read.wrong <= arm.p6.read.errors);
    assert.equal(arm.terminal - arm.firstCut, receipts.length);
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
    const [last] = readArm(prefix + lastQuiet, true);
    assert(last);
    assert.deepEqual([record.source, record.writer, record.slot, record.attempt, record.database, record.imageSha256, record.cut],
      [run.source, writer, last.slot, last.attempt, last.seed.database, last.seed.imageSha256, last.seed.originalCut]);
    assert.equal(record.start, expectedStart ?? last.terminal);
    assert(record.startedAt >= last.endedAt && record.endedAt >= record.startedAt);
    assert.equal(record.historical.length, 4);
    assert.deepEqual(record.historical, record.expectedHistorical);
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
  if (mixed) rows.set("Mixed assertion identities", [
    "Fresh commands refused both retired IDs. Four pinned reads matched the original seed, pre-witness and two saved values.",
    run.toy ? partial : "MET", "2 refusals and 4 checked snapshots", "[identity witness](campaign/mixed-ids.json)"]);
  const field = ["P5", "P6", "P7", "P8", "P9"];
  const randomBar = `${randomLine.seats} readers, each read a random subject of the whole population at the seed cut: read p99 ≤ 100 ms and zero wrong reads (the P1 read bar for subjects not in the reader's memory).`;
  const gaps: Record<string, string> = {
    P5: "The held SCALE1 roster has no Publish window in this run. [Server 1 measured Publish under load](https://github.com/OnboardedInc/Triplex-db-experiments/blob/530b88a6e9f7c9ca0593628bdbd7689707c87408/lab/experiments/EXP-DX1/bm1/HANDOFF.md#joined-publish-at-100000).",
    P6: "No verified matched quiet-account pair from this attempt.",
    P9: "Version 0.1 uses option B. A qualifying fault or move measurement needs two servers. [Separate HASYNC1 fault and move procedure](https://github.com/OnboardedInc/Triplex-db-experiments/blob/a0c47480f/lab/experiments/EXP-DX1/hasync1/SCORECARD.md). The one-host rehearsal uses its own physical checkpoint.",
    P8: "No verified fixed-pace import arm from this attempt.",
  };
  const text = base.trimEnd().split("\n").map((line) => {
    if (run.renderer && line.startsWith("Source `" + run.source + "`")) return line + "\n\n" +
      `Assembled at renderer \`${run.renderer.commit}\` from this campaign, run at source \`${run.source}\`. The renderer differs from the source only in: ${run.renderer.files.map((f) => "`" + f + "`").join(", ")}.` +
      (run.tapeRegeneration === "platform" ? ` Production tapes checked by platform regeneration: each cell's tape hashes to the binding made before its first offer and matches this platform's regeneration in every field except the floating-point \`ms\` and \`gap\` (tolerance ${platformTolerance.ms} ms and ${platformTolerance.gapSeconds} s). ${regenerated.map((r) => `${r.cell}: ${r.ms} offsets differ (max ${r.maxMs.toExponential(2)} ms), ${r.gap} gaps (max ${r.maxGap.toExponential(2)} s)`).join("; ")}.` : "") + "\n";
    if (line === "## Run settings") return `**Save tape:** ${tapeTitle(cardTape)}.` + (shape ? " P2 below counts commits; the production table gives rows and saves." : "") + "\n\n" +
      // [DX-S1] Default-off writer options the campaign ran with, when any (v01/production-card.ts writerOptionNames).
      (run.writerOptions ? `**Writer options on:** ${Object.entries(run.writerOptions).map(([n, v]) => "`" + n + "=" + v + "`").join(", ")}.\n\n` : "") + (run.writer === "per-person-ordered"
      ? run.toy ? "The headline toy runs the full adopted workload. Barrier6 repeats P2 and P6."
        : "The headline ordered profile runs the full workload. Barrier6 repeats P2 and P6 on the same launch profile."
      : "Grouped comparison only. This attempt covers P2 and P6.") + "\n\n" + line;
    if (line === "Population ten accounts of four deep people.") {
      if (run.age === "realistic") return realistic
        ? `Population ${realistic.accounts.length} accounts with ${realistic.people.toLocaleString("en-US")} people in one REAL1 database.`
        : "Population sealed by REAL1.";
      if (run.toy) return "Population ten deep accounts in one SCALE1 toy database.";
      return "Population ten deep accounts of 100,000 people in one SCALE1 database." +
        (fs.existsSync(inputsFile) ? " [Held seal and run inputs](campaign/input.json)." : "");
    }
    const match = /^\| ((P\d) [^|]+|Journal queryable|Receipts) \| ([^|]+) \|/.exec(line);
    const key = match?.[2] ?? match?.[1]?.trim();
    if (!key || !match) return line.replace("| NOT MEASURED |", "| NOT RUN |");
    const values = rows.get(key) ?? (run.writer === "grouped" && /^P[13478]$/.test(key) ? ["Grouped comparison covers P2 and P6.", "NOT RUN", "0", "—"] : field.includes(key) ? [gaps[key] ?? "No same-seed adapter for this row at this revision.", "NOT RUN", "0", "—"] : undefined);
    const bar = key === "P6"
      ? "Quiet loaded commit p99 ≤ 50 ms or ≤ 1.25× alone, zero wrong quiet reads or expired quiet commands."
      : match[3]!.trim();
    const randomRow = key === "P1" && rowsRandom ? `\n| P1 random subjects | ${randomBar} | ${rowsRandom.join(" | ")} |` : "";
    return values ? `| ${match[1]!.trim()} | ${bar} | ${values.join(" | ")} |${randomRow}` : line.replace("| NOT MEASURED |", "| NOT RUN |");
  }).concat([
    "| Mixed assertion identities | Retired old-format and ordered IDs are refused and four pinned reads match their expected values. | " +
    (rows.get("Mixed assertion identities") ?? ["The mixed-ID witness is unavailable in this attempt.", "NOT RUN", "0", "—"]).join(" | ") + " |",
    "",
    ...(cellWindows.length ? ["## Within-cell save windows", "",
      "Stored/s counts end-of-save durable ACKs timestamped in each interval. Save latency and sender wait follow the scheduled offer, including slow completions received after its interval. Recovered receipts contribute latency and verified saves, with no in-window ACK credit.", "",
      "| Cell and account scope | Window | Stored/s | Save p50 ms | Save p99 ms | Sender wait p99 ms | Offers | In-window ACKs | Verified receipts by offer | Expired by offer |",
      "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |", ...cellWindows, "",
      ...(edgeRows.length ? ["Rows are placed in a cell and a half by their scheduled tape offset. Rows scheduled within half a floating-point step of their cell's end have a due time equal to the end on the epoch clock; they are counted in the cell and the second half they were offered in. Such rows per scope: " + edgeRows.join(" · ") + ".", ""] : [])] : []),
    ...(cellTelemetry.length ? ["## Within-cell counters", "", ...cellTelemetry, ""] : []),
    ...(() => { const order = startOrder(); return order.length ? ["## Order after each stack start", "",
      "The first window each stack measured after it started finds its subjects cold (the quiet account's 52 and 59 ms p99 of 2026-11-23 was such a window). P1's two sides each run first on their own stack, so their writer ratio compares two such windows.", "", ...order, ""] : []; })(),
    ...(run.reader ? tunedReaderSection() : []),
    ...(productionRows.length ? ["## Production-shaped neighbour saves", "",
      `Neighbour accounts only (the quiet account is P6). Latencies are p50 / p99 ms from the scheduled offer to the durable acknowledgement; save completion runs from a save's first row offered to its last row acknowledged. Storage reads are SQL reads per commit from each acknowledgement, in the first 60 s / from 150 s. The per-subject ordered writer takes only commits of one to three facts that each replace a value; every other commit takes the general writer. Commits over 256 assertions carry the general identity. Every field of every production subject was read back at the cell's terminal cut and matched the acknowledged writes.`, "",
      "| Cell | Offered | Stored in window | Commit p50 / p99 ms | Save completion p50 / p99 ms | Reads per commit, first minute / late | Per-subject writer | General writer | General-identity commits | Exactness | Evidence |",
      "| --- | --- | --- | --- | --- | --- | --- | --- | ---: | --- | --- |", ...productionRows, ""] : []),
  ]).join("\n").replaceAll("No compatible measurement from this attempt.", run.failure ?? "No compatible measurement from this attempt.");
  const settings = {
    ...selectedWriter(run.writer),
    writerIntegration,
    ...(run.age === "realistic" ? { realisticSealRuntime: realPin, seed: loaded?.seed.realistic, busyMix: "80% deep, 15% thin, 5% small" } : {}),
    creditMode, admission: run.toy && admission.mode === "barrier" ? { ...admission, scope: "quiet cells" } : admission,
    ...(run.toy ? {} : { launchIntegration, stages, offeredRates: serverRates, windowSeconds, postgresStartup: prepared ? "prepared PGDATA" : "logical dump" }),
    diagnostics, comparison: defaultCreditMode,
    ...(run.reader ? { reader: run.reader } : {}),
    armReadbacks: arms.map((a) => a.settings),
  };
  fs.writeFileSync(path.join(run.out, "SCORECARD-v0.1.md"),
    text.replace("```json\n{}\n```", "```json\n" + JSON.stringify(settings, null, 2) + "\n```"), { flag: "wx", mode: 0o600 });
}
