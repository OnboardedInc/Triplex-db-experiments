import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { Histogram } from "../../../bench/lib/hist.ts";
import { render as emptyCard } from "./render.ts";
import type { MixedIds } from "./mixed-ids.ts";
import type { adoptedArm } from "./adopted.ts";
import { physicalJvm, selectedWriter, writerIntegration, type JvmProfile, type Age, type Writer } from "./profile.ts";

type Card = { source: string; age: Age; writer: Writer; jvm?: JvmProfile; toy: boolean; campaign: string; out: string; forecast: string; failure?: string };
type Observation = Awaited<ReturnType<typeof adoptedArm>>;
const tag = (x: unknown) => (typeof x === "number" && Number.isFinite(x)) ? String(Number(x.toFixed(3))) : "—";
export function writeAdoptedCard(run: Card) {
  const file = (arm: string, name: string) => path.join(run.campaign, arm, name);
  const comparison = "grouped/campaign/";
  const readArm = (arm: string, load: boolean, writer = run.writer) => {
    if (!fs.existsSync(file(arm, "arm.json"))) return [];
    const x: Observation = JSON.parse(fs.readFileSync(file(arm, "arm.json"), "utf8"));
    const bytes = fs.readFileSync(file(arm, "operations.json"));
    assert.deepEqual([x.source, x.fixture, x.loaded, x.writer], [run.source, run.toy, load, writer]);
    assert(x.startedAt <= x.start && x.start < x.endedAt && x.seed.head === x.firstCut);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), x.observationsSha256);
    const raw = JSON.parse(bytes.toString());
    assert.deepEqual([raw.p6, raw.p7], [x.p6, x.p7]);
    const dispatch = new Map<string, number>(raw.writes.filter((r: any) => r.receipt && Number.isFinite(r.dispatched))
      .map((r: any) => [r.id, r.dispatched]));
    const feed = new Histogram();
    for (const entry of raw.journal) {
      const due = dispatch.get(entry.id);
      // [DX-V01] Why: the seed or AGE1 can carry logical clocks ahead of the host.
      // Rejected: subtracting the logical record instant and clamping a negative duration to zero.
      if (due !== undefined && Number.isFinite(entry.seen) && entry.seen >= due) feed.recordMs(entry.seen - due);
    }
    return [{ ...x, dispatchToFeed: feed.summary(), tape: raw.tape }];
  };
  const [zero] = readArm("zero", false), [loaded] = readArm("loaded", true);
  const [grouped] = run.writer === "per-person-ordered" ? readArm(comparison + "loaded", true, "grouped") : [];
  const arms = [zero, loaded, grouped].filter((arm) => arm !== undefined);
  const inputsFile = path.join(run.campaign, "input.json");
  if (!run.toy && fs.existsSync(inputsFile)) {
    const input = JSON.parse(fs.readFileSync(inputsFile, "utf8"));
    assert.deepEqual([input.source, input.age, input.writer, input.jvm], [run.source, run.age, run.writer, run.jvm]);
    for (const arm of arms) assert.equal(arm.seed.imageSha256, input.imagePin);
  }
  if (zero && loaded) {
    assert(!zero.loaded && loaded.loaded && zero.firstCut === loaded.firstCut);
    assert.deepEqual([zero.seed.originalCut, zero.tapeSha256], [loaded.seed.originalCut, loaded.tapeSha256]);
    if (!run.toy) assert.equal(zero.seed.imageSha256, loaded.seed.imageSha256);
  }
  if (loaded && grouped) {
    assert.deepEqual([loaded.firstCut, loaded.seed.originalCut, loaded.tapeSha256],
      [grouped.firstCut, grouped.seed.originalCut, grouped.tapeSha256]);
    assert.notEqual(grouped.attempt, loaded.attempt);
    if (!run.toy) assert.equal(loaded.seed.imageSha256, grouped.seed.imageSha256);
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
  const diagnostic = run.toy ? "DIAGNOSTIC" : "NOT MEASURED";
  const p2Arms = [[loaded, "loaded"], [grouped, comparison + "loaded"]] as const;
  const commit = p2Arms.flatMap(([a, dir]) => a ? [{
    reading: `${a.writer} p50 ${tag(a.p2.latency.p50Ms)} ms, p99 ${tag(a.p2.latency.p99Ms)} ms (${a.p2.receipts}/${a.p2.offered} receipts)`,
    samples: `${a.writer} ${a.p2.receipts}`, link: evidence(dir),
  }] : []);
  if (commit.length) rows.set("P2", [commit.map((c) => c.reading).join(" · ") + ". This tape edits 1–3 fields.",
    diagnostic, commit.map((c) => c.samples).join(" · "), commit.map((c) => c.link).join(" · ")]);
  if (loaded && run.writer === "per-person-ordered") {
    const phases = loaded.p1.map((p) => `L${p.seats} ${tag(p.goodput)}/s, p99 ${tag(p.read.p99Ms)} ms, ${p.errors} errors`).join("; ");
    const baseline = zero?.p2.latency.p99Ms;
    const ratio = baseline && loaded.p2.latency.p99Ms !== null ? loaded.p2.latency.p99Ms / baseline : null;
    rows.set("P1", [`${phases}. Whole-tape writer p99 ratio ${tag(ratio)}. Exact seed-cut field probes; full-world and recovery coverage remain open.`, run.toy ? "DIAGNOSTIC" : "NOT MEASURED",
      String(loaded.p1.reduce((a, p) => a + p.read.count, 0)), evidence("loaded")]);
    rows.set("P3", [`${loaded.p3.entries} ordered exact changes; dispatch-to-observation p99 ${tag(loaded.dispatchToFeed.p99Ms)} ms across ${loaded.dispatchToFeed.count} observations. Durable effects and crash resume are open.`, run.toy ? "DIAGNOSTIC" : "NOT MEASURED",
      String(loaded.p3.entries), evidence("loaded")]);
    if (loaded.p4?.observed.count) rows.set("P4", [`Current demand pulls p50 ${tag(loaded.p4.observed.p50Ms)} ms, p99 ${tag(loaded.p4.observed.p99Ms)} ms. History depth and engine bytes remain open.`, run.toy ? "DIAGNOSTIC" : "NOT MEASURED",
      String(loaded.p4.observed.count), evidence("loaded")]);
    rows.set("Journal queryable", [`Compared ${loaded.p3.entries} queryable K journal entries to original operation and predecessor expectations.`, "DIAGNOSTIC",
      String(loaded.p3.entries), evidence("loaded")]);
    rows.set("Receipts", [`Verified the journal against ${loaded.p2.receipts} receipts and reopened a sample of durable claims. The retry and lost-ACK bar is open.`, "DIAGNOSTIC",
      String(loaded.p2.receipts), evidence("loaded")]);
    if (loaded.p7) {
      const p = loaded.p7;
      const footprint = ["tx", "gw-w", "gw-r"].map((role) => {
        const restored = p.restored[role]!, empty = p.empty[role]!;
        return `${role} ${restored.threads} threads, ${tag((restored.rssBytes - empty.rssBytes) / p.people)} added RSS bytes per roster person`;
      }).join("; ");
      rows.set("P7", [`First demand pull at the original cut p99 ${tag(p.cold.observed.p99Ms)} ms, ${p.cold.unavailable} declined. ${footprint}. An activity-matched untouched-person memory slope is unmeasured.`,
        run.toy ? "DIAGNOSTIC" : "NOT MEASURED", `${p.cold.observed.count} first pulls and two residency points`, evidence("loaded")]);
    }
  }
  const [neighbors] = readArm("p6-235", true);
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
  if (quiet.length) rows.set("P6", [quiet.map((a) => a.reading).join(" · ") + " Durable effects, Publish and import overlap remain open.",
    diagnostic, quiet.map((a) => a.samples).join(" · "), quiet.map((a) => a.link).join(" · ")]);
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
      run.toy ? "DIAGNOSTIC" : "NOT MEASURED", `${r.proof.observed} exact frames, ${totals(saves)} saves and ${totals(reads)} reads`,
      "[import arm](" + path.relative(run.out, importPath) + ")"]);
  }
  const readMixed = (prefix: string, writer: Writer, expectedStart?: number) => {
    const archive = file(prefix + "mixed-ids.json", "");
    if (!fs.existsSync(archive)) return;
    const record: MixedIds = JSON.parse(fs.readFileSync(archive, "utf8"));
    const [last] = readArm(prefix + "p6-235", true, writer);
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
  const mixed = run.writer === "per-person-ordered" && orderedWitnessStart !== undefined
    ? readMixed("", run.writer, orderedWitnessStart) : undefined;
  const groupedMixed = run.writer === "per-person-ordered" ? readMixed(comparison, "grouped") : undefined;
  if (mixed && groupedMixed) {
    // [DX-V01] Why: the raw typed value and valid range must agree at each matching semantic cut.
    // Rejected: comparing just hashes from unbound fixtures or equating logical clocks across different histories.
    assert.deepEqual([mixed.subject, mixed.cut, mixed.historical], [groupedMixed.subject, groupedMixed.cut, groupedMixed.historical]);
    if (!run.toy) assert.equal(mixed.imageSha256, groupedMixed.imageSha256);
    const links = ["mixed-ids.json", comparison + "mixed-ids.json"].map((name) =>
      "[identity witness](" + path.relative(run.out, file(name, "")) + ")").join(" · ");
    rows.set("Mixed assertion identities", ["Both retired IDs returned IdentityConflict under fresh commands. Earlier typed answers matched grouped at the seed, pre-witness and two save cuts.",
      run.toy ? "DIAGNOSTIC" : "PASS", "2 refusals and 4 paired snapshots", links]);
  }
  const field = ["P5", "P6", "P7", "P8", "P9"];
  const gaps: Record<string, string> = {
    P5: "The held SCALE1 roster has no Publish window in this run. [Server 1 measured Publish under load](https://github.com/OnboardedInc/Triplex-db-experiments/blob/530b88a6e9f7c9ca0593628bdbd7689707c87408/lab/experiments/EXP-DX1/bm1/HANDOFF.md#joined-publish-at-100000).",
    P6: "No verified same-scope alone and 235-save quiet-account pair from this attempt.",
    P9: "A qualifying fault or move measurement needs two servers. [Separate HASYNC1 fault and move procedure](https://github.com/OnboardedInc/Triplex-db-experiments/blob/a0c47480f/lab/experiments/EXP-DX1/hasync1/SCORECARD.md). The one-host rehearsal uses its own physical checkpoint.",
    P8: "No verified fixed-pace import arm from this attempt.",
  };
  const text = base.trimEnd().split("\n").map((line) => {
    if (line === "## Run settings") return (run.writer === "per-person-ordered"
      ? "Per-person-ordered runs the full adopted workload. Grouped repeats P2 and P6 only."
      : "Grouped comparison only. This attempt covers P2 and P6.") + "\n\n" + line;
    if (line === "Population ten accounts of four deep people.") {
      if (run.toy) return "Population ten deep accounts in one SCALE1 toy database.";
      return "Population ten deep accounts of 100,000 people in one SCALE1 database." +
        (fs.existsSync(inputsFile) ? " [Held seal and run inputs](campaign/input.json)." : "");
    }
    const match = /^\| ((P\d) [^|]+|Journal queryable|Receipts) \| ([^|]+) \|/.exec(line);
    const key = match?.[2] ?? match?.[1]?.trim();
    if (!key || !match) return line;
    const values = rows.get(key) ?? (run.writer === "grouped" && /^P[13478]$/.test(key) ? ["Grouped comparison covers P2 and P6.", "NOT MEASURED", "0", "—"] : field.includes(key) ? [gaps[key] ?? "No same-seed adapter for this row at this revision.", "NOT MEASURED", "0", "—"] : undefined);
    return values ? `| ${match[1]!.trim()} | ${match[3]!.trim()} | ${values.join(" | ")} |` : line;
  }).concat([
    "| Mixed assertion identities | Retired old-format and ordered IDs are refused and pinned earlier values match grouped. | " +
    (rows.get("Mixed assertion identities") ?? ["The paired mixed-ID witness is unavailable in this attempt.", "NOT MEASURED", "0", "—"]).join(" | ") + " |",
    "",
  ]).join("\n").replaceAll("No compatible measurement from this attempt.", run.failure ?? "No compatible measurement from this attempt.");
  const settings = {
    ...selectedWriter(run.writer),
    writerIntegration,
    ...(run.toy ? {} : { jvm: run.jvm, physicalJvm: physicalJvm(run.jvm) }),
    ...(run.writer === "per-person-ordered" ? { comparison: selectedWriter("grouped") } : {}),
    armReadbacks: arms.map((a) => a.settings),
  };
  fs.writeFileSync(path.join(run.out, "SCORECARD-v0.1.md"),
    text.replace("```json\n{}\n```", "```json\n" + JSON.stringify(settings, null, 2) + "\n```"), { flag: "wx", mode: 0o600 });
}
