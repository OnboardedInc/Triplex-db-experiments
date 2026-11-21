import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { Histogram } from "../../../bench/lib/hist.ts";
import { render as emptyCard } from "./render.ts";
import type { adoptedArm } from "./adopted.ts";
import { selectedWriter, type Age, type Writer } from "./profile.ts";

type Card = { source: string; age: Age; writer: Writer; toy: boolean; campaign: string; out: string; forecast: string; failure?: string };
type Observation = Awaited<ReturnType<typeof adoptedArm>>;
const tag = (x: unknown) => (typeof x === "number" && Number.isFinite(x)) ? String(Number(x.toFixed(3))) : "—";
export function writeAdoptedCard(run: Card) {
  const file = (arm: string, name: string) => path.join(run.campaign, arm, name);
  const readArm = (arm: string, load: boolean) => {
    if (!fs.existsSync(file(arm, "arm.json"))) return [];
    const x: Observation = JSON.parse(fs.readFileSync(file(arm, "arm.json"), "utf8"));
    const bytes = fs.readFileSync(file(arm, "operations.json"));
    assert.deepEqual([x.source, x.fixture, x.loaded], [run.source, run.toy, load]);
    assert(x.startedAt <= x.start && x.start < x.endedAt && x.seed.head === x.firstCut);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), x.observationsSha256);
    const raw = JSON.parse(bytes.toString());
    assert.deepEqual(raw.p6, x.p6);
    assert.deepEqual(raw.p7, x.p7);
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
  const arms = [...readArm("zero", false), ...readArm("loaded", true)];
  const [zero, loaded] = arms;
  if (zero && loaded) {
    assert(!zero.loaded && loaded.loaded && zero.firstCut === loaded.firstCut);
    assert.deepEqual([zero.seed.originalCut, zero.tapeSha256], [loaded.seed.originalCut, loaded.tapeSha256]);
    if (!run.toy) assert.equal(zero.seed.imageSha256, loaded.seed.imageSha256);
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
  if (loaded) {
    const phases = loaded.p1.map((p) => `L${p.seats} ${tag(p.goodput)}/s, p99 ${tag(p.read.p99Ms)} ms, ${p.errors} errors`).join("; ");
    const baseline = zero?.p2.latency.p99Ms;
    const ratio = baseline && loaded.p2.latency.p99Ms !== null ? loaded.p2.latency.p99Ms / baseline : null;
    rows.set("P1", [`${phases}. Whole-tape writer p99 ratio ${tag(ratio)}. Exact seed-cut field probes; full-world and recovery coverage remain open.`, run.toy ? "DIAGNOSTIC" : "NOT MEASURED",
      String(loaded.p1.reduce((a, p) => a + p.read.count, 0)), evidence("loaded")]);
    rows.set("P2", [`Scheduled offer to ACK p50 ${tag(loaded.p2.latency.p50Ms)} ms, p99 ${tag(loaded.p2.latency.p99Ms)} ms. ${loaded.p2.receipts}/${loaded.p2.offered} receipts. This tape edits 1–3 fields.`, run.toy ? "DIAGNOSTIC" : "NOT MEASURED",
      String(loaded.p2.receipts), evidence("loaded")]);
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
  const [alone] = readArm("p6-alone", false), [neighbors] = readArm("p6-235", true);
  if (alone?.p6 && neighbors?.p6) {
    const a = alone.p6, b = neighbors.p6;
    assert.deepEqual([a.quietCell, b.quietCell], ["alone", 235]);
    assert.deepEqual([alone.slot, alone.attempt, alone.seed.database, alone.terminal],
      [neighbors.slot, neighbors.attempt, neighbors.seed.database, neighbors.firstCut]);
    const quiet = (ops: any[]) => ops.filter((e) => e.account === 0).map((e) => [e.ms, e.subject, e.width]);
    assert.deepEqual(quiet(alone.tape), quiet(neighbors.tape));
    assert.equal(a.read.planned, b.read.planned);
    const ratio = (base: number | null, loaded: number | null) => tag(base && loaded !== null ? loaded / base : null);
    const total = (r: typeof a) => r.totalOffers + "/" + r.totalReceipts;
    rows.set("P6", [`Quiet-account p99 ratios for commits ${ratio(a.commit.p99Ms, b.commit.p99Ms)}, pinned reads ${ratio(a.read.read.p99Ms, b.read.read.p99Ms)}, dispatch-to-feed ${ratio(a.feed.p99Ms, b.feed.p99Ms)}. ${total(a)} and ${total(b)} offers/receipts. ${a.read.errors + b.read.errors} read errors or missed offers. Durable effects, Publish and import overlap remain open.`,
      run.toy ? "DIAGNOSTIC" : "NOT MEASURED",
      `${a.commit.count}/${b.commit.count} commits, ${a.read.read.count}/${b.read.read.count} reads, ${a.feed.count}/${b.feed.count} feed observations`,
      evidence("p6-alone") + " · " + evidence("p6-235")]);
  }
  const field = ["P5", "P6", "P7", "P8", "P9"];
  const gaps: Record<string, string> = {
    P5: "The published INT1 Publish producer creates its own flat scope. No adapter binds it to the held SCALE1 roster and live release cut.",
    P6: "No verified same-scope alone and 235-save quiet-account pair from this attempt.",
  };
  const text = base.split("\n").map((line) => {
    if (line === "Population ten accounts of four deep people.") return "Population ten deep accounts in one SCALE1 database.";
    const match = /^\| ((P\d) [^|]+|Journal queryable|Receipts) \| ([^|]+) \|/.exec(line);
    const key = match?.[2] ?? match?.[1]?.trim();
    if (!key || !match) return line;
    const values = rows.get(key) ?? (field.includes(key) ? [gaps[key] ?? "No same-seed adapter for this row at this revision.", "NOT MEASURED", "0", "—"] : undefined);
    return values ? `| ${match[1]!.trim()} | ${match[3]!.trim()} | ${values.join(" | ")} |` : line;
  }).join("\n").replaceAll("No compatible measurement from this attempt.", run.failure ?? "No compatible measurement from this attempt.");
  const settings = { ...selectedWriter(run.writer), armReadbacks: arms.map((a) => a.settings) };
  fs.writeFileSync(path.join(run.out, "SCORECARD-v0.1.md"),
    text.replace("{}", JSON.stringify(settings, null, 2)), { flag: "wx", mode: 0o600 });
}
