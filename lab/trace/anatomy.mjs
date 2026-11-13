// @ts-nocheck -- Recorded trace and Postgres wire shapes are validated at this boundary.
import fs from "node:fs";
import path from "node:path";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { createHash } from "node:crypto";
const quantile = (xs, p) =>
  xs.length ? [...xs].sort((a, b) => a - b)[Math.max(0, Math.ceil(xs.length * p) - 1)] : null;
const stats = (xs) => ({ n: xs.length, p50: quantile(xs, 0.5), p99: quantile(xs, 0.99) });
const n = (x) => (Number.isFinite(x) ? x.toFixed(3) : "n/a");
// [DX-T1-4] Why: directional residuals retain callback/dispatch time and observable boundary overlap.
// Rejected: clamping a negative cross-process residual to zero and silently inflating another layer.
export function exchangeAnatomy(owner, gateway) {
  if (
    owner.traceId !== gateway.traceId ||
    owner.run !== gateway.run ||
    owner.source !== gateway.source ||
    owner.slot !== gateway.slot
  )
    throw Error("Foreign anatomy child");
  const http = owner.spans.find((s) => s.id === gateway.parent && s.name === "client.http");
  if (!http) return null;
  const children = owner.spans.filter((s) => s.parent === http.id);
  const write = children.find((s) => s.name === "socket.queue-and-write");
  const body = children.find((s) => s.name === "socket.body-read");
  const peers = gateway.spans
    .filter((s) => s.name === "d/transact" || s.name.startsWith("peer.transact-await"))
    .sort((a, b) => a.start - b.start);
  if (!write || !body || peers.length !== 1) return null;
  const encode = owner.spans
    .filter((s) => s.name === "client.encode" && s.end <= http.start && s.parent === http.parent)
    .sort((a, b) => b.end - a.end)[0];
  const parse = owner.spans
    .filter((s) => s.name === "client.parse" && s.start >= body.end && s.parent === http.parent)
    .sort((a, b) => a.start - b.start)[0];
  if (!encode || !parse) return null;
  const peer = peers[0];
  const steps = {
    "client encode and send": write.end - encode.start,
    "outbound network and Jetty dispatch": gateway.start - write.end,
    "gateway before peer": peer.start - gateway.start,
    "peer transact wait": peer.end - peer.start,
    "gateway after peer": gateway.end - peer.end,
    "return network, body and callback": body.end - gateway.end,
    "client parse and resolve callback": parse.end - body.end,
  };
  if (Object.values(steps).some((x) => !Number.isFinite(x)))
    throw Error("Invalid anatomy milestone");
  const wall = parse.end - encode.start;
  if (Math.abs(Object.values(steps).reduce((a, b) => a + b, 0) - wall) > 0.01)
    throw Error("Anatomy partition does not close");
  return {
    traceId: owner.traceId,
    httpId: http.id,
    peerStart: peer.start,
    peerEnd: peer.end,
    wallMs: wall,
    steps,
    boundaryOverlapMs: -Object.values(steps)
      .filter((x) => x < 0)
      .reduce((a, b) => a + b, 0),
  };
}
export function parsePostgres(line) {
  const m =
    / (\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d+) UTC \[(\d+)\].*?duration: ([\d.]+) ms\s+(?:execute [^:]+:|statement:)\s*(.*)/.exec(
      line,
    );
  if (!m) return null;
  const sql = m[4];
  const kind = /^\s*(select|insert|update|delete|begin|commit|rollback)\b/i
    .exec(sql)?.[1]
    ?.toLowerCase();
  if (!kind || (!/datomic_kvs/i.test(sql) && !["begin", "commit", "rollback"].includes(kind)))
    return null;
  const end = Date.parse(m[1].replace(" ", "T") + "Z"),
    ms = Number(m[3]);
  return { pid: Number(m[2]), kind, start: end - ms, end, ms };
}
// [DX-T1-4] Why: a time-window correlation is weaker than an ID join, and concurrent windows must remain ambiguous.
// Rejected: assigning all SQL in an overlapping peer wait to every transaction.
export function correlateStatements(windows, statements, uncertaintyMs = 2) {
  const rows = windows.map((w) => ({ ...w, statements: [], ambiguousStatements: 0 }));
  const sorted = [...rows].sort((a, b) => a.start - b.start),
    maxEnd = [];
  let end = -Infinity;
  for (const w of sorted) {
    end = Math.max(end, w.end);
    maxEnd.push(end);
  }
  for (const s of statements) {
    let lo = 0,
      hi = sorted.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (sorted[mid].start <= s.end + uncertaintyMs) lo = mid + 1;
      else hi = mid;
    }
    const candidates = [];
    for (let i = lo - 1; i >= 0 && maxEnd[i] >= s.start - uncertaintyMs; i--)
      if (sorted[i].end >= s.start - uncertaintyMs) candidates.push(sorted[i]);
    if (candidates.length === 1) candidates[0].statements.push(s);
    else for (const w of candidates) w.ambiguousStatements++;
  }
  return rows;
}
// [DX-T1-4] Why: two reversed-order pairs retain host drift instead of promoting any lower median.
// Rejected: comparing with a historical control or treating a difference inside bookend drift as a benefit.
export function bookendComparison(controls, candidates) {
  if (
    controls.length !== 2 ||
    candidates.length !== 2 ||
    [...controls, ...candidates].some((x) => !Number.isFinite(x) || x < 0)
  )
    throw Error("Expected two finite bookends and two candidates");
  const baseline = controls.reduce((a, b) => a + b, 0) / 2,
    candidate = candidates.reduce((a, b) => a + b, 0) / 2,
    drift = Math.abs(controls[1] - controls[0]);
  return {
    baseline,
    candidate,
    benefit: baseline - candidate,
    drift,
    lowerBeyondBookendDrift:
      baseline - candidate > drift && candidates.every((x) => x < Math.min(...controls)),
  };
}
export function tailCauses(commits) {
  const groups = new Map();
  for (const r of commits.filter(
    (r) => r.writer?.stream === "background" && !r.writer.resend && r.wallMs > 50,
  )) {
    const causes = Object.entries(r.layers)
      .filter(([k]) => !["driver-queue", "unknown"].includes(k))
      .map(([k, v]) => [k, v]);
    const q = {};
    for (const s of r.root.spans.filter((s) => s.name.startsWith("driver.queue.")))
      q[s.name] = (q[s.name] ?? 0) + s.end - s.start;
    causes.push(...Object.entries(q), ["unknown", r.unexplainedMs]);
    const [cause, ms] = causes.sort((a, b) => b[1] - a[1])[0];
    const key = r.name + " / " + cause,
      old = groups.get(key) ?? {
        phase: r.name,
        cause,
        count: 0,
        totalWallMs: 0,
        totalCauseMs: 0,
        worstMs: 0,
      };
    old.count++;
    old.totalWallMs += r.wallMs;
    old.totalCauseMs += ms;
    if (r.wallMs > old.worstMs)
      Object.assign(old, {
        worstMs: r.wallMs,
        worstTraceId: r.traceId,
        overlappingWork: r.overlappingWork,
        queue: r.writer.queue,
      });
    groups.set(key, old);
  }
  return [...groups.values()].sort((a, b) => b.totalWallMs - a.totalWallMs);
}
export async function writeAnatomy(
  runDir,
  { manifest, commits, resources, childrenOf, copyTo, complete },
) {
  if (!manifest) return null;
  const roots = commits.filter((r) => r.writer?.stream === "background" && !r.writer.resend);
  const exchanges = [];
  for (const root of roots) {
    const linked = childrenOf(root.root);
    for (const gateway of linked.filter(
      (r) =>
        r.name.startsWith("gateway ") &&
        r.spans.some((s) => s.name === "d/transact" || s.name.startsWith("peer.transact-await")),
    )) {
      const owner = [root.root, ...linked].find((r) =>
        r.spans.some((s) => s.id === gateway.parent && s.name === "client.http"),
      );
      if (!owner) continue;
      const anatomy = exchangeAnatomy(owner, gateway);
      if (anatomy)
        exchanges.push({
          ...anatomy,
          phase: root.name,
          clock: owner.clock,
          commitMs: root.wallMs,
          typescriptMs: root.typescriptMs,
        });
    }
  }
  const system = resources.filter(
    (r) => r.process === "system-linux" && r.clock?.domain === "linux-monotonic",
  );
  const windows = exchanges.flatMap((e) => {
    const midpoint = (e.peerStart + e.peerEnd) / 2;
    const near = system.reduce(
      (old, r) => (!old || Math.abs(r.at - midpoint) < Math.abs(old.at - midpoint) ? r : old),
      null,
    );
    if (!near || !e.clock || near.clock.bootId !== e.clock.bootId) return [];
    const shift = (near.rawClockOffsetMs ?? near.clock.offsetMs) - e.clock.offsetMs;
    return [{ traceId: e.traceId, start: e.peerStart + shift, end: e.peerEnd + shift }];
  });
  const statements = [];
  const log = path.join(runDir, "trace/raw/pg.log.gz");
  if (manifest.requirePostgres && fs.existsSync(log)) {
    const bytes = fs.readFileSync(log),
      digest = createHash("sha256").update(bytes).digest("hex");
    const sums = fs.readFileSync(path.join(runDir, "trace/SHA256SUMS"), "utf8");
    if (!sums.split("\n").includes(digest + "  pg.log.gz"))
      throw Error("Postgres anatomy raw hash mismatch");
    for await (const line of createInterface({
      input: fs.createReadStream(log).pipe(createGunzip()),
      crlfDelay: Infinity,
    })) {
      const row = parsePostgres(line);
      if (row && row.end >= manifest.startedAt - 1000) statements.push(row);
    }
  }
  const correlated = correlateStatements(windows, statements);
  const clean = correlated.filter((w) => w.statements.length && !w.ambiguousStatements);
  const stepNames = [...new Set(exchanges.flatMap((e) => Object.keys(e.steps)))];
  const steps = Object.fromEntries(
    stepNames.map((k) => [k, stats(exchanges.map((e) => e.steps[k]))]),
  );
  const wal = resources
    .filter((r) => r.process === "postgres" && r.wal)
    .sort((a, b) => a.at - b.at);
  const first = wal.find(
    (r) => windows.length && r.at >= Math.min(...windows.map((w) => w.start)) - 2000,
  );
  const last = [...wal]
    .reverse()
    .find((r) => windows.length && r.at <= Math.max(...windows.map((w) => w.end)) + 2000);
  const walDelta =
    first && last && first !== last && first.wal.stats_reset === last.wal.stats_reset
      ? Object.fromEntries(
          [
            "wal_records",
            "wal_bytes",
            "wal_write",
            "wal_sync",
            "wal_write_time",
            "wal_sync_time",
          ].map((k) => [k, Number(last.wal[k]) - Number(first.wal[k])]),
        )
      : null;
  const result = {
    schema: "triplex.commit-anatomy.v1",
    tag: manifest.tag,
    source: manifest.source,
    level: manifest.level,
    collectionComplete: complete,
    commits: roots.length,
    exchanges: exchanges.length,
    steps,
    commitWall: stats(roots.map((r) => r.wallMs)),
    clientOutsideHttp: stats(exchanges.map((e) => e.commitMs - e.wallMs)),
    typescript: stats(roots.map((r) => r.typescriptMs)),
    typescriptShare: stats(roots.map((r) => r.typescriptMs / r.wallMs)),
    boundaryOverlaps: exchanges.filter((e) => e.boundaryOverlapMs > 0).length,
    sql: {
      correlation: "time window, not a causal ID; 2ms boundary uncertainty",
      cleanWindows: clean.length,
      ambiguousWindows: correlated.filter((w) => w.ambiguousStatements).length,
      statementsPerWindow: stats(clean.map((w) => w.statements.length)),
      statementMsPerWindow: stats(clean.map((w) => w.statements.reduce((s, r) => s + r.ms, 0))),
      byKind: Object.fromEntries(
        ["select", "insert", "update", "delete", "begin", "commit"].map((k) => [
          k,
          stats(clean.map((w) => w.statements.filter((s) => s.kind === k).length)),
        ]),
      ),
      storageWritesPerWindow: stats(
        clean.map(
          (w) => w.statements.filter((s) => ["insert", "update", "delete"].includes(s.kind)).length,
        ),
      ),
      aggregateWrites:
        first && last
          ? statements.filter(
              (s) =>
                s.end >= first.at &&
                s.end <= last.at &&
                ["insert", "update", "delete"].includes(s.kind),
            ).length
          : null,
      walDelta,
      walScope: first && last ? { start: first.at, end: last.at } : null,
    },
    tail: tailCauses(commits),
    examples: exchanges.sort((a, b) => b.commitMs - a.commitMs).slice(0, 20),
    sqlExamples: clean.slice(0, 10),
  };
  const ownNames = [
    ...new Set(roots.flatMap((r) => r.steps.map(([k]) => k.replace(/^.*?\/thread-\d+\//, "")))),
  ];
  result.namedSteps = Object.fromEntries(
    ownNames.map((k) => [
      k,
      stats(
        roots.map((r) =>
          r.steps
            .filter(([name]) => name.replace(/^.*?\/thread-\d+\//, "") === k)
            .reduce((a, [, v]) => a + v, 0),
        ),
      ),
    ]),
  );
  const text = [
    "# Commit anatomy",
    "",
    `Run ${result.tag}; source ${result.source}; tracing ${result.level}. ${exchanges.length} linked transact exchanges / ${roots.length} primary commits. Collection complete: ${complete}.`,
    "",
    "Cross-boundary network values are signed residuals including Jetty dispatch and Node callbacks. Negative values expose concurrent write/header milestones and are retained. Quantiles do not add. Parse ends inside the resolve callback; later continuation work is outside this HTTP partition.",
    "",
    `Whole commit p50/p99 ${n(result.commitWall.p50)}/${n(result.commitWall.p99)} ms; outside the HTTP partition ${n(result.clientOutsideHttp.p50)}/${n(result.clientOutsideHttp.p99)} ms. TypeScript scope wall p50/p99 ${n(result.typescript.p50)}/${n(result.typescript.p99)} ms, share ${n(result.typescriptShare.p50)}/${n(result.typescriptShare.p99)}.`,
    "",
    "| Step | n | p50 ms | p99 ms |",
    "| --- | ---: | ---: | ---: |",
    ...Object.entries(steps).map(([k, s]) => `| ${k} | ${s.n} | ${n(s.p50)} | ${n(s.p99)} |`),
    "",
    `Postgres: ${clean.length} isolated windows, ${result.sql.ambiguousWindows} ambiguous. Statement count p50/p99 ${n(result.sql.statementsPerWindow.p50)}/${n(result.sql.statementsPerWindow.p99)}; server statement ms p50/p99 ${n(result.sql.statementMsPerWindow.p50)}/${n(result.sql.statementMsPerWindow.p99)}. WAL sample delta: ${JSON.stringify(walDelta)}. WAL counters are aggregate over the stated sample window, including background storage work; they are never presented as exact per-Datomic-transaction counts.`,
    "",
    "Postgres protocol scope: https://www.postgresql.org/docs/17/protocol-flow.html#PROTOCOL-FLOW-EXT-QUERY ; cumulative WAL lag: https://www.postgresql.org/docs/17/monitoring-stats.html#MONITORING-STATS-VIEWS .",
    "",
    "Peer wait still includes peer/transactor networking, transactor computation/queue and storage round trips. SQL windows are correlations without a shared transaction ID. Extended-protocol execute duration excludes the later implicit commit at Sync; it is not complete storage wall time. WAL sync counters have a different aggregate scope and are not added as a per-request measurement. Autocommit statements can each flush WAL. A statement's WAL sync count and transactor own before/after storage remain unsplit without backend-specific observations.",
    "",
    "| Phase / largest observed cause | commits >50ms | total wall ms | total cause ms | worst trace ID |",
    "| --- | ---: | ---: | ---: | --- |",
    ...result.tail.map(
      (r) =>
        `| ${r.phase} / ${r.cause} | ${r.count} | ${n(r.totalWallMs)} | ${n(r.totalCauseMs)} | ${r.worstTraceId} |`,
    ),
    "",
  ];
  for (const dest of [runDir, ...(copyTo ? [copyTo] : [])]) {
    fs.mkdirSync(dest, { recursive: true });
    fs.writeFileSync(path.join(dest, "COMMIT-ANATOMY.md"), text.join("\n"));
  }
  for (const dest of [runDir, ...(copyTo ? [copyTo] : [])])
    fs.writeFileSync(
      path.join(dest, "commit-anatomy.json"),
      JSON.stringify(result, null, 2) + "\n",
    );
  return result;
}
