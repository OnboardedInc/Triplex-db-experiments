// @ts-nocheck -- [DX-T1-10] Why: gap diagnosis needs exact primary IDs and native database/t joins, with unknowns retained. Rejected: nearest-event attribution or a corrected-clock PASS.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { records, filesUnder, alignClockRecord, synchronousCpu, percentile } from "./report.mjs";
import { exchangeAnatomy } from "./anatomy.mjs";
import { bindNativeTransaction, nativeWaitLegs } from "./native-transactions.mjs";
import { verifiedRawManifest } from "./pack-oracle.mjs";
import { commitClocks } from "./instrument.mjs";

const [base, prefix, ...explicit] = process.argv.slice(2);
if (!base || !/^tx2-dxt1-[a-z0-9-]+$/.test(prefix ?? "")) throw Error("Invalid idle analysis");
const session = path.join(base, prefix + "-session"),
  standalone = explicit.includes("--standalone");
const tags = standalone
  ? [prefix]
  : fs
      .readFileSync(path.join(session, "modes.txt"), "utf8")
      .trim()
      .split(/\s+/)
      .map((m, i) => `${prefix}-${i + 1}-${m}`);
const outputIndex = explicit.indexOf("--output-dir");
if (outputIndex >= 0 && !explicit[outputIndex + 1]) throw Error("Missing output directory");
const output =
  outputIndex >= 0
    ? path.resolve(explicit[outputIndex + 1])
    : standalone
      ? path.join(base, prefix, "idle-analysis")
      : session;
fs.mkdirSync(output, { recursive: true });
const read = (f) => JSON.parse(fs.readFileSync(f, "utf8")),
  check = (v, m) => {
    if (!v) throw Error(m);
  },
  sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const q = (xs) => ({
  count: xs.length,
  p50: percentile(xs, 0.5),
  p99: percentile(xs, 0.99),
  min: xs.length ? Math.min(...xs) : null,
  max: xs.length ? Math.max(...xs) : null,
});
const result = {
  at: new Date().toISOString(),
  reporterSha256: sha(fs.readFileSync(new URL(import.meta.url))),
  scope:
    "Fixed-gap zero-reader diagnosis; no oracle or north-star performance acceptance. Marginal quantiles do not add; native residuals include uninstrumented handoffs and storage.",
  runs: [],
};
let build, source;
for (const [i, tag] of tags.entries()) {
  const dir = path.join(base, tag),
    b = read(path.join(dir, "driver/ns-report.json")),
    m = read(path.join(dir, "trace-run.json")),
    t = read(path.join(dir, "trace-summary.json"));
  check(
    b.status === "DONE" &&
      b.finalizationErrors.length === 0 &&
      b.config.zeroReaders &&
      b.config.readerLadderOnly &&
      b.config.idleGapsMs &&
      b.config.probe10PerS === 0 &&
      b.trace.diagnostic &&
      b.oracle.status === "NOT-RUN",
    "Incomplete/non-diagnostic run",
  );
  check(
    m.tag === tag &&
      m.slot === tag &&
      t.tag === tag &&
      m.source === t.source &&
      m.source === fs.readFileSync(path.join(dir, "head.txt"), "utf8").trim() &&
      m.level === "full" &&
      t.complete &&
      !t.errors.length,
    "Unbound/incomplete full trace",
  );
  if (!standalone) {
    check(
      fs.readFileSync(path.join(session, `${i + 1}-exit.txt`), "utf8").trim() === "0" &&
        !fs.readFileSync(path.join(session, `${i + 1}-remaining.txt`), "utf8").trim(),
      "Failed controller/cleanup",
    );
    check(
      m.session === prefix &&
        m.source === fs.readFileSync(path.join(session, "head.txt"), "utf8").trim() &&
        b.seed.seededSubjects === 10000,
      "Wrong session/source/rung",
    );
  }
  const hashes = fs.readFileSync(path.join(dir, "source-build-hashes.json"), "utf8");
  check(
    (!build || build === hashes) && (!source || source === m.source),
    "Build/source differs across session",
  );
  build = hashes;
  source = m.source;
  check(
    b.trace.idlePlanSha256 === b.benchSources["lab/bench/lib/idle-plan.ts"],
    "Idle plan source differs",
  );
  fs.writeFileSync(path.join(output, tag + ".SHA256SUMS"), await verifiedRawManifest(dir));
  const writes = [];
  for await (const w of records(path.join(dir, "driver/ns-writes.jsonl"))) writes.push(w);
  const primary = writes.filter((w) => w.stream === "background" && !w.resend);
  // [DX-T1-12] Why: the explicitly labelled one-time maturation diagnostic may have a different prefix; no warmup runs in judged phases.
  // Rejected: assume 200 commits and reject a legitimate 5,000-commit diagnostic, or change the frozen v3 workload unmeasured.
  check(
    primary.length === (b.config.idleWarmupCommits ?? 200) + b.config.idleCommits * b.config.idleGapsMs.length &&
      new Set(primary.map((w) => w.commandId)).size === primary.length &&
      primary.every(
        (w) => w.facts === 10 && w.outcome === "committed" && !w.expired && !w.resend && !w.ackLoss,
      ),
    "Changed/unfinished gap stream",
  );
  primary.forEach(commitClocks);
  const ids = new Set(primary.map((w) => w.traceId)),
    roots = new Map(),
    gateways = new Map(),
    natives = [],
    host = [],
    sentinel = [];
  const start = Math.min(...primary.map((w) => w.scheduledAt)),
    end = Math.max(...primary.map((w) => w.finishedAt));
  for (const file of filesUnder(path.join(dir, "trace/raw")).filter((f) =>
    /\.jsonl\.gz$/.test(f),
  )) {
    for await (const raw of records(file)) {
      check(raw.run === tag && raw.source === m.source && raw.slot === tag, "Foreign raw record");
      const r = alignClockRecord(raw, t.clockAlignment.reference);
      if (r.type === "request" && ids.has(r.traceId)) {
        if (r.name === "driver.commit") {
          check(!roots.has(r.traceId), "Duplicate writer root");
          roots.set(r.traceId, r);
        }
        if (r.process === "gw-w" && r.name.endsWith("/transact") && r.attributes?.datomicT) {
          check(!gateways.has(r.traceId), "Ambiguous committed gateway");
          gateways.set(r.traceId, r);
        }
      }
      if (r.nativeType === "triplex.NativeTransaction") natives.push(r);
      if (
        raw.process === "system-darwin" &&
        typeof raw.swap === "string" &&
        Number.isFinite(raw.otherCpu)
      )
        host.push(raw);
      if (raw.type === "disk-sentinel" && raw.at >= start && raw.at <= end) sentinel.push(raw);
    }
  }
  check(
    roots.size === primary.length &&
      gateways.size === primary.length &&
      host.length > (standalone ? 1 : 200),
    "Missing primary spans/host samples",
  );
  const rows = [],
    sorted = primary.toSorted((a, b) => a.startedAt - b.startedAt);
  let finish = -Infinity;
  for (const w of sorted) {
    const root = roots.get(w.traceId),
      gateway = gateways.get(w.traceId),
      n = bindNativeTransaction(gateway, natives),
      ex = exchangeAnatomy(root, gateway);
    check(n && ex && w.attempts === 1, "Missing native/exchange or retries");
    const legs = nativeWaitLegs(ex, n),
      cpu = synchronousCpu(root),
      idle = w.startedAt - finish;
    finish = Math.max(finish, w.finishedAt);
    const io = n.nativeStats["io-stats"]?.reads,
      tx = n.nativeStats["tx-stats"] ?? {};
    rows.push({
      traceId: w.traceId,
      gap: w.idleGapMs,
      warmup: w.idleWarmup,
      actualIdleMs: Number.isFinite(idle) ? idle : null,
      scheduledAt: w.scheduledAt,
      ack: w.ackPublishedAt,
      original: w.latencyMs,
      ackOnly: w.ackPublishedAt - w.scheduledAt,
      service: w.finishedAt - w.startedAt,
      ackService: w.ackPublishedAt - w.startedAt,
      lateness: commitClocks(w).timerLatenessMs,
      before: w.transactCalledAt - w.startedAt,
      after: w.ackPublishedAt - w.transactReturnedAt,
      ...ex.steps,
      ...legs,
      ...cpu,
      applyMs: n.nativeStats["apply-msec"],
      functionMs: tx["tx-fn-ms"] ?? null,
      sqlReads: io ? (io.sql ?? 0) : null,
      sqlReadMs: io ? (io["sql-ms"] ?? 0) : null,
      nativeStart: n.start - n.nativeStats.msec,
      nativeEnd: n.start,
      peerStart: ex.peerStart,
      peerEnd: ex.peerEnd,
    });
  }
  const groups = b.config.idleGapsMs.map((gap) => {
    const pop = rows.filter((w) => !w.warmup && w.gap === gap);
    check(pop.length === b.config.idleCommits, "Missing gap population");
    return {
      gap,
      metrics: Object.fromEntries(
        Object.keys(pop[0])
          .filter((k) => !["traceId", "gap", "warmup"].includes(k))
          .map((k) => [k, q(pop.map((w) => w[k]).filter(Number.isFinite))]),
      ),
      examples: pop.toSorted((a, b) => b.service - a.service).slice(0, 3),
    };
  });
  const driver = read(path.join(dir, "driver-container.json"))[0],
    containers = read(path.join(dir, "containers.json"));
  const mode = standalone ? "smoke" : tag.split("-").at(-1);
  for (const c of [...containers, driver])
    check(
      (c.HostConfig.Sysctls?.["net.ipv4.tcp_slow_start_after_idle"] ?? "default") ===
        (mode === "tcp" || standalone ? "0" : "default"),
      "TCP endpoint tuning differs",
    );
  if (mode === "sentinel" || standalone)
    check(
      sentinel.length > (standalone ? 10 : 1000) &&
        sentinel.every((s) => s.bytes === 4096 && s.end >= s.syncAt && s.syncAt >= s.at),
      "Missing/invalid disk sentinel",
    );
  else check(!sentinel.length, "Unexpected disk sentinel");
  if (b.config.idleKeep === "refused") {
    const proof = fs.readFileSync(path.join(dir, "idle-refusal-proof.json"));
    const p = JSON.parse(proof),
      inputText = fs.readFileSync(path.join(dir, "idle-refusal-input.json"), "utf8"),
      input = JSON.parse(inputText);
    check(
      p.run === tag &&
        p.slot === tag &&
        p.source === m.source &&
        p.scope === input.scope &&
        p.requestHash === sha(inputText) &&
        input.run === tag &&
        input.slot === tag &&
        input.source === m.source &&
        input.createdAt >= m.startedAt &&
        p.startedAt >= input.createdAt - 1000 &&
        p.endedAt >= p.startedAt &&
        p.qualifiedAt >= p.endedAt &&
        p.qualifiedAt <= Date.parse(b.startedAt) &&
        p.beforeT === p.afterT &&
        Number.isSafeInteger(p.beforeT) &&
        p.transactions === 0 &&
        p.datoms === 0 &&
        p.responses.length === 25 &&
        p.responses.every((r) => r.status === 409 && r.code === "CasConflict"),
      "Native refusal proof content/attempt differs",
    );
    check(
      sha(proof) === b.config.idleRefusalProofSha256 &&
        b.idleKeep.proofSha256 === b.config.idleRefusalProofSha256,
      "Warm proof hash differs",
    );
    let count = 0,
      previousEnd = m.startedAt;
    for await (const call of records(path.join(dir, "driver/idle-keep.jsonl"))) {
      check(
        call.run === tag &&
          call.source === m.source &&
          call.slot === tag &&
          call.code === "CasConflict" &&
          call.clientId === b.idleKeep.clientId &&
          call.sequence === ++count &&
          Number.isFinite(call.at) &&
          Number.isFinite(call.end) &&
          call.at >= previousEnd &&
          call.end >= call.at &&
          call.end <= Date.parse(b.endedAt) + 1000,
        "Warm refusal sequence/result differs",
      );
      previousEnd = call.end;
    }
    check(count === b.idleKeep.calls, "Warm calls lost");
    fs.appendFileSync(
      path.join(output, tag + ".SHA256SUMS"),
      [
        "idle-refusal-input.json",
        "idle-refusal-proof.json",
        "idle-refusal-stdout.jsonl",
        "driver/idle-keep.jsonl",
      ]
        .map((f) => sha(fs.readFileSync(path.join(dir, f))) + "  " + f)
        .join("\n") + "\n",
    );
  }
  const swaps = host.map((h) => {
    const a = /used\s*=\s*([\d.]+)([MG])/.exec(h.swap);
    check(a, "Missing swap");
    return +a[1] / (a[2] === "M" ? 1024 : 1);
  });
  result.runs.push({
    tag,
    source: m.source,
    mode,
    level: m.level,
    digest: b.trace.digest,
    rows,
    groups,
    host: { swapGiB: q(swaps), macCpu: q(host.map((h) => h.otherCpu)), scope:"whole arm, not a guest phase; no cross-clock bridge" },
    keep: b.idleKeep ?? null,
    sentinel: sentinel.length
      ? {
          count: sentinel.length,
          syncMs: q(sentinel.map((s) => s.end - s.syncAt)),
          cpuMs: sentinel.reduce((n, s) => n + s.cpuMs, 0),
          bytesWritten: sentinel.length * 4096,
        }
      : null,
    correctness: b.correctness,
    rawBytes: t.rawBytes,
  });
}
fs.writeFileSync(path.join(output, "IDLE.json"), JSON.stringify(result, null, 2) + "\n");
const f = (n) => (Number.isFinite(n) ? n.toFixed(3) : "n/a"),
  lines = [
    "# Fixed-gap component diagnosis",
    "",
    result.scope,
    "",
    "Every latency is full tracing; host context and adjacent plain controls accompany each arm. G is scheduled spacing, not assumed idle; actual idle includes overlap as negative values. All groups have 150 measured commits in a full diagnostic. No warming is a verdict setting.",
  ];
for (const r of result.runs) {
  lines.push(
    "",
    `## ${r.tag}`,
    "",
    `Source ${r.source}; swap ${f(r.host.swapGiB.p50)} GiB, Mac non-VM CPU ${f(r.host.macCpu.p50)}/${f(r.host.macCpu.p99)}% median/p99.`,
    "",
    "| G ms | actual idle p50 | original p50/p99 | service p50/p99 | ACK service p50 | client before/after | outbound/return | gateway before/after | peer wait | submit/native/ACK residual | apply / fn / SQL read ms | SQL reads |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  );
  for (const g of r.groups) {
    const m = g.metrics,
      v = (k) => f(m[k]?.p50);
    lines.push(
      `| ${g.gap} | ${v("actualIdleMs")} | ${v("original")}/${f(m.original.p99)} | ${v("service")}/${f(m.service.p99)} | ${v("ackService")} | ${v("before")}/${v("after")} | ${v("outbound network and Jetty dispatch")}/${v("return network, body and callback")} | ${v("gateway before peer")}/${v("gateway after peer")} | ${v("peer transact wait")} | ${v("submitToNativeReadMs")}/${v("nativeProcessMs")}/${v("nativeToPeerMs")} | ${v("applyMs")}/${v("functionMs")}/${v("sqlReadMs")} | ${v("sqlReads")} |`,
    );
  }
  lines.push(
    "",
    `Keep-worker cost: ${JSON.stringify(r.keep)}. Sentinel cost: ${JSON.stringify(r.sentinel)}.`,
  );
}
fs.writeFileSync(path.join(output, "IDLE.md"), lines.join("\n") + "\n");
const files = ["IDLE.json", "IDLE.md", ...tags.map((t) => t + ".SHA256SUMS")];
fs.writeFileSync(
  path.join(output, "IDLE.SHA256SUMS"),
  files.map((n) => sha(fs.readFileSync(path.join(output, n))) + "  " + n).join("\n") + "\n",
);
console.log(path.join(output, "IDLE.md"));
