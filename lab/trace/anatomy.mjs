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
// [DX-T1-5] Why: request ownership is proven by the acknowledged native transaction, not by coincident timestamps.
// Rejected: accepting a trace whose encoding/HTTP spans actually belong to a concurrently running command.
export function validateCommandTrace(writer, requests) {
  if (!Number.isSafeInteger(writer.position) || !writer.commandId || !writer.publicationOperationId)
    throw Error("Missing writer native command identity");
  const hash = (value) => createHash("sha256").update(value).digest("hex");
  const matches = requests.flatMap((request) => request.spans).filter((span) =>
    span.name === "client.transact-encode" &&
    span.attributes?.appliedPosition === writer.position &&
    span.attributes.operationHash === hash(writer.publicationOperationId) &&
    span.attributes.commandHash === hash(JSON.stringify([writer.commandId])),
  );
  if (matches.length !== 1) throw Error("Writer/native ACK trace binding mismatch");
  return true;
}
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
  if (!write || !body || peers.length > 1) return null;
  const encode = owner.spans
    .filter((s) => s.name === "client.encode" && s.end <= http.start && s.parent === http.parent)
    .sort((a, b) => b.end - a.end)[0];
  const parse = owner.spans
    .filter((s) => s.name === "client.parse" && s.start >= body.end && s.parent === http.parent)
    .sort((a, b) => a.start - b.start)[0];
  if (!encode || !parse) return null;
  const peer = peers[0] ?? { start: gateway.end, end: gateway.end };
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
    gatewayRoot: gateway.root,
    peerCalls: peers.length,
    start: encode.start,
    end: parse.end,
    peerStart: peer.start,
    peerEnd: peer.end,
    wallMs: wall,
    steps,
    boundaryOverlapMs: -Object.values(steps)
      .filter((x) => x < 0)
      .reduce((a, b) => a + b, 0),
  };
}
// [DX-T1-4] Why: retries belong to one commit's latency; parallel HTTP intervals cannot simply be added.
// Rejected: treating each attempt as another commit or hiding an overlapping exchange in TypeScript time.
export function aggregateExchanges(root, exchanges) {
  const own = exchanges.filter((e) => e.traceId === root.traceId).sort((a, b) => a.start - b.start);
  let union = 0,
    end = -Infinity,
    overlap = 0;
  for (const e of own) {
    if (e.start < end) overlap += Math.min(end, e.end) - e.start;
    union += Math.max(0, e.end - Math.max(end, e.start));
    end = Math.max(end, e.end);
  }
  const steps =
    overlap > 0.001
      ? null
      : Object.fromEntries(
          [...new Set(own.flatMap((e) => Object.keys(e.steps)))].map((k) => [
            k,
            own.reduce((a, e) => a + (e.steps[k] ?? 0), 0),
          ]),
        );
  const outside = root.wallMs - union;
  if (
    steps &&
    own.length &&
    Math.abs(Object.values(steps).reduce((a, b) => a + b, 0) + outside - root.wallMs) > 0.01
  )
    throw Error("Per-commit anatomy does not close");
  return {
    traceId: root.traceId,
    phase: root.name,
    commitMs: root.wallMs,
    attempts: own.length,
    httpWallMs: union,
    outsideHttpMs: outside,
    overlapMs: overlap,
    steps,
  };
}
// [DX-T1-5] Why: partition the same outside-HTTP residual instead of adding overlapping named-scope percentiles.
// Rejected: calling the whole 4.3 ms TypeScript CPU, or silently dropping uninstrumented continuation time.
export function outsideAnatomy(commit, exchanges) {
  const root = commit.root;
  if (!root || !Number.isFinite(root.start) || !Number.isFinite(root.end) || root.end < root.start)
    throw Error("Invalid outside anatomy root");
  const own = exchanges.filter((e) => e.traceId === commit.traceId);
  if (
    own.some(
      (e) =>
        !Number.isFinite(e.start) ||
        !Number.isFinite(e.end) ||
        e.end < e.start ||
        e.start < root.start - 1 ||
        e.end > root.end + 1,
    )
  )
    throw Error("Invalid outside exchange bounds");
  const spans = commit.spans.filter(
    (s) => Number.isFinite(s.start) && Number.isFinite(s.end) && s.end >= s.start,
  );
  const ids = new Map(spans.map((s) => [s.id, s]));
  const ancestors = (s) => {
    const out = [],
      seen = new Set();
    while (s && !seen.has(s.id)) {
      out.push(s);
      seen.add(s.id);
      s = ids.get(s.parent);
    }
    return out;
  };
  const depth = new Map(spans.map((s) => [s, ancestors(s).length]));
  const ordered = [...spans].sort(
    (a, b) => depth.get(b) - depth.get(a) || a.end - a.start - (b.end - b.start),
  );
  const points = [
    ...new Set([
      root.start,
      root.end,
      ...spans.flatMap((s) => [
        Math.max(root.start, Math.min(root.end, s.start)),
        Math.max(root.start, Math.min(root.end, s.end)),
      ]),
      ...own.flatMap((e) => [Math.max(root.start, e.start), Math.min(root.end, e.end)]),
    ]),
  ].sort((a, b) => a - b);
  const groups = {};
  const classify = (selected) => {
    if (!selected) return "unmatched / continuation";
    const chain = ancestors(selected),
      names = chain.map((s) => s.name);
    if (names.some((n) => /(?:\/begin|\/snapshot)|^client.begin/.test(n)))
      return "begin snapshot / claim / prefetch";
    if (names.some((n) => n === "driver.publication.capture"))
      return "publication event capture (witness deferred)";
    if (names.some((n) => n === "driver.publication")) return "durable publication witness";
    if (names.some((n) => n.startsWith("driver.expected-state.")))
      return "expected-state bookkeeping";
    if (names.some((n) => n === "driver.oracle-record")) return "oracle command bookkeeping";
    if (names.some((n) => n === "driver.ryow-dispatch")) return "read-your-own-write dispatch";
    if (names.some((n) => n.startsWith("driver.queue."))) return "queueing";
    if (names.some((n) => /client.clock|client.commit-send-queue/.test(n)))
      return "clock / ticket order";
    if (names.some((n) => n === "client.settle-and-cache"))
      return "receipt settlement / cache publication";
    if (names.some((n) => n === "client.validation-and-staging"))
      return "product validation / staging";
    if (names.some((n) => n === "driver.plan-and-encode-command"))
      return "benchmark command planning";
    if (names.some((n) => n === "driver.ack-and-subject-state"))
      return "benchmark ACK / subject state";
    if (selected.layer === "typescript-gc") return "Node GC";
    return "other named continuation: " + selected.name;
  };
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i];
    if (own.some((e) => e.start <= a && e.end >= b)) continue;
    const name = classify(ordered.find((s) => s.start <= a && s.end >= b));
    groups[name] = (groups[name] ?? 0) + b - a;
  }
  const expected = aggregateExchanges(commit, exchanges).outsideHttpMs;
  if (Math.abs(Object.values(groups).reduce((a, b) => a + b, 0) - expected) > 0.01)
    throw Error("Outside anatomy does not close");
  return { traceId: commit.traceId, outsideHttpMs: expected, groups };
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
// [DX-T1-4] Why: driver reports use ISO timestamps; freshness checks must compare the recorded instant.
// Rejected: coercing the ISO string numerically (rejects every valid attempt), or dropping the upper bound.
export function observedRunEnd(value) {
  const at = typeof value === "string" ? Date.parse(value) : value;
  if (!Number.isFinite(at)) throw Error("Invalid observed run end");
  return at;
}
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
// [DX-T1-5] Why: prove every moved witness actually follows the same source-bound finishedAt used by the latency bar.
// Rejected: trusting a requested mode, a queued count, or an event from a different request/attempt.
export function validateDeferredOrder(writes, events, manifest, endedAt) {
  const byId = new Map(writes.map((w) => [w.traceId, w])),
    seen = new Set(),
    delays = [];
  if (byId.size !== writes.length || writes.some((w) => !/^[a-f0-9]{32}$/.test(w.traceId ?? "")))
    throw Error("Invalid witness writer identities");
  for (const event of events) {
    const w = byId.get(event.attributes?.commitTraceId);
    if (!w) continue;
    if (
      seen.has(w.traceId) ||
      event.run !== manifest.tag ||
      event.slot !== manifest.slot ||
      event.source !== manifest.source ||
      event.thread !== 0 ||
      !Number.isFinite(event.start) ||
      !Number.isFinite(event.end) ||
      event.start < manifest.startedAt ||
      event.end > endedAt ||
      event.end < event.start ||
      event.start < w.finishedAt ||
      event.attributes.finishedAt !== w.finishedAt ||
      event.attributes.position !== String(w.position) ||
      event.attributes.operationId !== w.publicationOperationId ||
      !w.publicationDeferred ||
      !Number.isFinite(w.publicationCapturedAt) ||
      w.publicationCapturedAt < w.publicationStartedAt ||
      w.publicationCapturedAt > w.finishedAt
    )
      throw Error("Deferred witness content/freshness/binding/order mismatch");
    seen.add(w.traceId);
    delays.push(event.start - w.finishedAt);
  }
  if (seen.size !== writes.length) throw Error("Missing deferred witness intervals");
  return { events: seen.size, afterFinishedAt: stats(delays) };
}

export async function writeAnatomy(
  runDir,
  { manifest, commits, resources, childrenOf, copyTo, complete, bench },
) {
  if (!manifest) return null;
  const roots = commits.filter((r) => r.writer?.stream === "background" && !r.writer.resend);
  const exchanges = [];
  for (const root of roots) {
    const linked = childrenOf(root.root);
    for (const gateway of linked.filter((r) => r.name.startsWith("gateway "))) {
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
  const windows = exchanges
    .filter((e) => e.peerCalls)
    .flatMap((e) => {
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
  const perCommit = roots.map((r) => aggregateExchanges(r, exchanges));
  const outside = roots.map((r) => outsideAnatomy(r, exchanges));
  const outsideNames = [...new Set(outside.flatMap((r) => Object.keys(r.groups)))];
  const outsideSteps = Object.fromEntries(
    outsideNames.map((k) => [k, stats(outside.map((r) => r.groups[k] ?? 0))]),
  );
  const medianWall = quantile(
    roots.map((r) => r.wallMs),
    0.5,
  );
  const functionRoots = roots.filter((r) =>
    r.spans.some((s) => s.nativeType === "triplex.TransactionFunction"),
  );
  const sequential = perCommit.filter((r) => r.attempts && r.steps);
  const commitSteps = Object.fromEntries(
    stepNames.map((k) => [k, stats(sequential.map((e) => e.steps[k] ?? 0))]),
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
  const native = roots
    .filter((r) => r.nativeTransactions?.length === 1)
    .map((r) => r.nativeTransactions[0].nativeStats);
  const txKeys = [...new Set(native.flatMap((s) => Object.keys(s["tx-stats"] ?? {})))];
  const ioKeys = [...new Set(native.flatMap((s) => Object.keys(s["io-stats"]?.reads ?? {})))];
  const nativeResidual = [];
  for (const root of roots)
    for (const metric of root.nativeTransactions ?? []) {
      const e = exchanges.find(
        (e) => e.traceId === root.traceId && e.gatewayRoot === metric.gatewayRoot,
      );
      if (e) nativeResidual.push(e.peerEnd - e.peerStart - metric.nativeStats.msec);
    }
  const result = {
    nativeTransactions: {
      n: native.length,
      applySteps: Object.fromEntries(
        txKeys.map((k) => [
          k,
          stats(native.map((s) => s["tx-stats"]?.[k]).filter(Number.isFinite)),
        ]),
      ),
      ioReads: Object.fromEntries(
        ioKeys.map((k) => [
          k,
          stats(native.map((s) => s["io-stats"]?.reads?.[k]).filter(Number.isFinite)),
        ]),
      ),
      peerMinusNativeMs: stats(nativeResidual),
      transactorMs: stats(native.map((s) => s.msec)),
      applyMs: stats(native.map((s) => s["apply-msec"])),
      txWithMs: stats(native.map((s) => s["io-stats"]?.["api-ms"]).filter(Number.isFinite)),
      queueAndStorageRemainderMs: stats(native.map((s) => s.msec - s["apply-msec"])),
    },
    schema: "triplex.commit-anatomy.v1",
    tag: manifest.tag,
    source: manifest.source,
    level: manifest.level,
    collectionComplete: complete,
    commits: roots.length,
    exchanges: exchanges.length,
    steps,
    commitSteps,
    transactorFunction: stats(functionRoots.map((r) => r.layers.transactor)),
    remainingPeerWait: stats(roots.map((r) => r.layers["peer-wait"])),
    unobservedFunctionCommits: roots.length - functionRoots.length,
    partitionedCommits: sequential.length,
    overlappingCommits: perCommit.filter((r) => r.overlapMs > 0.001).length,
    missingExchangeCommits: perCommit.filter((r) => !r.attempts).length,
    commitWall: stats(roots.map((r) => r.wallMs)),
    clientOutsideHttp: stats(perCommit.map((e) => e.outsideHttpMs)),
    outsideSteps,
    deferredPublication: bench?.deferredPublication ?? null,
    typescript: stats(roots.map((r) => r.typescriptMs)),
    typescriptOwn: stats(roots.map((r) => r.layers.typescript)),
    synchronousCpu: stats(roots.map((r) => r.cpuRuntimeMs).filter(Number.isFinite)),
    synchronousRunqueue: stats(roots.map((r) => r.cpuRunqueueMs).filter(Number.isFinite)),
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
    examples: perCommit.sort((a, b) => b.commitMs - a.commitMs).slice(0, 20),
    medianExample:
      [...perCommit].sort(
        (a, b) => Math.abs(a.commitMs - medianWall) - Math.abs(b.commitMs - medianWall),
      )[0] ?? null,
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
    `Run ${result.tag}; source ${result.source}; tracing ${result.level}. ${exchanges.length} linked HTTP exchanges / ${roots.length} primary commits; ${sequential.length} sequential per-commit partitions, ${result.overlappingCommits} with overlapping HTTP and ${result.missingExchangeCommits} without a complete HTTP exchange. Collection complete: ${complete}.`,
    "",
    "Cross-boundary network values are signed residuals including Jetty dispatch and Node callbacks. Negative values expose concurrent write/header milestones and are retained. Quantiles do not add. Parse ends inside the resolve callback; later continuation work is outside this HTTP partition. The table sums sequential attempts per primary commit. Concurrent exchanges remain explicitly unpartitioned; raw per-exchange quantiles are retained in JSON.",
    "",
    `Whole commit p50/p99 ${n(result.commitWall.p50)}/${n(result.commitWall.p99)} ms; outside the HTTP partition ${n(result.clientOutsideHttp.p50)}/${n(result.clientOutsideHttp.p99)} ms. TypeScript total wall including offer queue p50/p99 ${n(result.typescript.p50)}/${n(result.typescript.p99)} ms, share ${n(result.typescriptShare.p50)}/${n(result.typescriptShare.p99)}.`,
    "",
    `TypeScript own scopes p50/p99 ${n(result.typescriptOwn.p50)}/${n(result.typescriptOwn.p99)} ms. Their observed synchronous CPU p50/p99 ${n(result.synchronousCpu.p50)}/${n(result.synchronousCpu.p99)} ms; run-queue wait ${n(result.synchronousRunqueue.p50)}/${n(result.synchronousRunqueue.p99)} ms. Synchronous counters exclude async scopes and can be quantized.`,
    "",
    "| Step | n | p50 ms | p99 ms |",
    "| --- | ---: | ---: | ---: |",
    ...Object.entries(commitSteps).map(([k, s]) => `| ${k} | ${s.n} | ${n(s.p50)} | ${n(s.p99)} |`),
    "",
    "| Outside transact HTTP (exclusive per commit) | n | p50 ms | p99 ms |",
    "| --- | ---: | ---: | ---: |",
    ...Object.entries(outsideSteps).map(
      ([k, s]) => `| ${k} | ${s.n} | ${n(s.p50)} | ${n(s.p99)} |`,
    ),
    "",
    "Outside steps retain queueing, apparatus and unknown continuation; marginal percentiles do not add. The measured offer-to-ACK/finished boundary is unchanged. Begin is a separate snapshot/claim/prefetch request only when the optimistic predecessor path declines. Publication is the benchmark durable producer witness; staging and settlement are product work; expected-state/oracle/RYOW validation is apparatus.",
    "",
    ...(result.deferredPublication
      ? [
          `Deferred benchmark witness: ${result.deferredPublication.persisted}/${result.deferredPublication.captured} persisted, ${result.deferredPublication.pending} pending; SQLite/verification p50/p99 ${n(result.deferredPublication.storage.p50Ms)}/${n(result.deferredPublication.storage.p99Ms)} ms, source capture to durable p50/p99 ${n(result.deferredPublication.captureToDurable.p50Ms)}/${n(result.deferredPublication.captureToDurable.p99Ms)} ms. Primary persistence starts only after the unchanged scheduler finishedAt; every persistence interval remains a linked thread overlay. Native engine durability still precedes the ACK.`,
          "",
        ]
      : []),
    `Authored transactor function: ${result.transactorFunction.n}/${roots.length} commits observed, p50/p99 ${n(result.transactorFunction.p50)}/${n(result.transactorFunction.p99)} ms. Remaining peer wait excluding that function p50/p99 ${n(result.remainingPeerWait.p50)}/${n(result.remainingPeerWait.p99)} ms. Function wall includes any internal wait/GC; it is not an exclusive CPU claim.`,
    "",
    `Native database/t counters: ${native.length} primary commits; transactor p50/p99 ${n(result.nativeTransactions.transactorMs.p50)}/${n(result.nativeTransactions.transactorMs.p99)} ms; apply ${n(result.nativeTransactions.applyMs.p50)}/${n(result.nativeTransactions.applyMs.p99)} ms; queue/storage/other remainder ${n(result.nativeTransactions.queueAndStorageRemainderMs.p50)}/${n(result.nativeTransactions.queueAndStorageRemainderMs.p99)} ms. These are native counters, not reconstructed timeline boundaries.`,
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
