import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
type Stage = {
  tag: string;
  attempt: any;
  terminal: any;
  summary: any;
  disk: any;
  size: any;
  resources: any;
};
const load = (dir: string, f: string) =>
  fs.existsSync(path.join(dir, f)) ? JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) : null;
const round = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : "—");
const metric = (b: any) =>
  b && Number.isFinite(b.value)
    ? `${round(b.value)} · ${b.n ?? "—"}${b.interval90 ? ` [${round(b.interval90.low)}, ${round(b.interval90.high)}]` : ""}`
    : "—";
const bar = (s: Stage, id: string, scope = false) =>
  (scope ? s.summary?.perScope?.[0]?.bars : s.summary?.pooledBars)?.find((b: any) => b.id === id);
export function updateReport(evidence: string) {
  const stages: Stage[] = [];
  if (fs.existsSync(evidence))
    for (const tag of fs.readdirSync(evidence)) {
      const dir = path.join(evidence, tag, "summaries"),
        attempt = load(dir, "attempt.json");
      if (!attempt) continue;
      const terminal = load(dir, "terminal.json");
      if (
        terminal?.source !== attempt.source ||
        terminal.nonce !== attempt.nonce ||
        terminal.slot !== attempt.slot ||
        terminal.cleanup !== true
      )
        throw Error("Unbound transfer");
      stages.push({
        tag,
        attempt,
        terminal,
        summary: load(dir, "summary.json"),
        disk: load(dir, "seed-disk.json"),
        size: load(dir, "sizing.json"),
        resources: load(dir, "resource-summary.json"),
      });
    }
  stages.sort((a, b) => a.attempt.at - b.attempt.at);
  const recent = (item: number, mode: string) =>
    stages.filter((s) => s.attempt.item === item && s.attempt.mode === mode).at(-1);
  const one = recent(2, "reader"),
    ten = recent(4, "reader"),
    a1 = recent(2, "activation"),
    a10 = recent(4, "activation"),
    base = recent(1, "zero");
  const cost = (s: Stage | undefined) =>
    s?.summary
      ? `${metric(s.summary.commit.p99)} ms commit p99, ${metric(bar(s, "NS-P1-READ-P99-256-MS"))} ms read p99, ${round((s.size?.sharedPeakBytes + s.size?.driverPeakBytes * s.summary.scopeCount) / 1024 ** 3)} GiB summed component peaks, ${round(s.disk?.bytesPerFact)} database bytes per current fact`
      : "awaiting a completed bare-metal reader arm";
  const act = (s: Stage | undefined) =>
    s?.summary
      ? `${s.summary.perScope.map((p: any) => round(p.deep.r2.wallMs / 1000)).join(", ")} s; ${s.summary.perScope.reduce((n: number, p: any) => n + (p.deep.activationOracle?.checked ?? 0), 0)} independently checked people`
      : "pending";
  const emptied = stages.find((s) => s.resources?.firstObservedEngineOOM);
  const lines = [
    "# DX-SCALE1 · deep accounts",
    "",
    `One account of 100,000 people — ${cost(one)}.`,
    `Ten accounts of 100,000 people — ${cost(ten)}.`,
    `Activation for one account is ${act(a1)}. Activation for ten accounts is ${act(a10)}.`,
    emptied
      ? `First recorded engine memory-limit kill was in ${emptied.resources.firstObservedEngineOOM.role}, attempt ${emptied.tag}.`
      : "The first shared resource to reach its limit is still unknown.",
    "Three experiments could distinguish the limits. Give senders another physical core if offer delays dominate, enlarge the transactor object cache if storage misses dominate, and distribute databases across transactors if their JVM saturates.",
    `The 10,000-person fixture generates 1,604,464 current facts, or 160.45 per person. ${base?.disk ? `Its measured PostgreSQL allocation is ${round(base.disk.bytesPerFact)} bytes per fact.` : "Bytes per fact on the bench await the first completed seed measurement."}`,
    "",
    "**Bench measurements**",
    "",
    "| Item and arm | Scope | Commit p50 ms | Commit p99 ms | L256 read p99 ms | L256 feed p99 ms | Status |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (let item = 1; item <= 4; item++) {
    const modes = item === 1 ? ["zero", "reader"] : ["zero", "reader", "activation", "seed"];
    for (const mode of modes) {
      const s = recent(item, mode);
      if (!s) continue;
      const m = s.summary;
      const ids =
        mode === "activation"
          ? ["pooled"]
          : m?.scopeCount > 1
            ? ["pooled", "account 0"]
            : ["account 0"];
      for (const id of ids) {
        const sentinel = id === "account 0",
          c = sentinel ? m?.perScope?.[0]?.commit : m?.commit;
        lines.push(
          `| ${item} ${mode} | ${id} | ${metric(c?.p50)} | ${metric(c?.p99)} | ${metric(bar(s, "NS-P1-READ-P99-256-MS", sentinel))} | ${metric(bar(s, "NS-P3 lag p99 ms at L256", sentinel))} | ${m?.invalid?.length ? "Unjudged" : m ? "Observed" : s.terminal.service} · ${s.tag} |`,
        );
      }
    }
  }
  if (!stages.length)
    lines.push("| 1–4 | 1 or 10 | — | — | — | — | Awaiting bench release and public source |");
  lines.push(
    "",
    "Cells give estimate · n [90% interval] where available. The regular arms target 5,910 seconds of offers. Each transferred summary retains every per-account bar, pooled sample distributions and the count of accounts meeting each obligation.",
    "",
    "**Population and checks**",
    "",
    "| People per account | Placements | Tasks | Subtasks | Field values | Current facts |",
    "| ---: | ---: | ---: | ---: | ---: | ---: |",
    "| 10,000 | 18,000 | 57,000 | 313,500 | 758,100 | 1,604,464 |",
    "| 100,000 | 180,000 | 570,000 | 3,135,000 | 7,581,000 | 16,045,255 |",
    "",
    "Ten full accounts target 160,452,550 current facts. The first account has 56,505 primary offers and 1,633 resends over the regular arm. The eligible daily roster is 200 or 2,000 people depending on the rung. [Profile and assumptions](PROFILE.md)",
    "",
    "The functional Datomic trial used two four-person databases at once. Each accepted 70 primary commands. O-REPLAY checked 16 historical/current reads and 508 entity queries across both. O-DOMAIN checked eight R2 outputs and durable outbox states. The original slot image lacked the current write endpoint. The successful retry used the existing source-matched image. [Evidence manifest](SHA256SUMS)",
    "",
    "**Audit of evidence and verdicts**",
    "",
    "- `deep-profile.ts` checks a fresh empty scope, consecutively acknowledged seed contents and IDs, the independent population count and the frozen seed and command hashes. The coordinator binds each ready file to its nonce, source, slot and account.",
    "- The NS driver keeps the receipt-clock, full-row, feed/replay, old-basis, split-read, history and O-REPLAY checks. Deep terminal samples come from actual public reads at the seed and latest cut. The regular trace and phase plan have distinct identity fields.",
    "- `deep-activation.ts` binds each fresh release receipt to its cut, hashes each evaluated world/output, re-reads the same cut, and checks both releases plus the durable R2 outbox against O-DOMAIN for every person.",
    "- `measurements.ts` checks source-file hashes, fork exits, complete planned offers, exact receipt times and positions, and recomputes the sampled oracle comparisons from retained bytes. Missing or invalid accounts leave the pooled result unjudged.",
    "- `bench.ts` reads database and volume allocation on the owned stack at the seed barrier, records the component limits and restores an empty exact-prefix inventory. `control.ts` checks archive size, hash, nonce and source before indexing a transfer.",
    "- The functional tests use new databases and real public receipts. They check replacement semantics, duplicate receipts, independent replay and publication. The renderer fix preserves fresh output destinations for derived evidence. A timed-out local terminal read was traced to a closed replica. The collector now uses the live source at both recorded positions.",
    "",
    "The acceptance contract and frozen v3 verdict rules retain their original pins. See [handoff](HANDOFF.md) for the queue and [resource layout](PROFILE.md) for sharing and measurement boundaries.",
  );
  if (lines.length > 60) throw Error("Owner report exceeds 60 lines");
  fs.writeFileSync(path.join(here, "REPORT.md"), lines.join("\n") + "\n");
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  updateReport(process.argv[2]!);
