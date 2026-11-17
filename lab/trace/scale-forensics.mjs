// @ts-nocheck -- [DX-T1-14] Why: preserve explicitly censored observations after a killed driver. Rejected: synthesize a completed writer file, an offer denominator, or any PASS.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createGunzip, constants } from "node:zlib";
import { StringDecoder } from "node:string_decoder";
import { pathToFileURL } from "node:url";
import { attribute, alignClockRecord, percentile, LAYERS } from "./report.mjs";
import { nativeByCommit } from "./scale-reading.mjs";
import { nativeCounterSummary } from "./native-counters.mjs";
import { verifiedRawManifest } from "./pack-oracle.mjs";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const stats = (a) => ({
  n: a.length,
  p50: percentile(a, 0.5),
  p99: percentile(a, 0.99),
  total: a.reduce((n, v) => n + v, 0),
});
const bound = (r, m) => {
  if (r.run !== m.tag || r.source !== m.source || r.slot !== m.slot)
    throw Error("Foreign forensic observation");
  return r;
};
export function observedAcknowledgements(rows, manifest, { minimumStart, bootId }) {
  if (!Number.isFinite(minimumStart) || minimumStart < 0 || !/^[-a-f0-9]{36}$/.test(bootId ?? ""))
    throw Error("Invalid forensic attempt clock");
  const seen = new Set(),
    result = [];
  for (const r of rows) {
    if (r.type !== "request" || r.name !== "driver.commit") continue;
    bound(r, manifest);
    const a = r.attributes;
    if (a?.stream !== "background" || a.outcome !== "committed") continue;
    if (
      r.start < minimumStart ||
      r.clock?.domain !== "linux-monotonic" ||
      r.clock.bootId !== bootId ||
      !/^[a-f0-9]{32}$/.test(r.traceId ?? "") ||
      seen.has(r.traceId) ||
      !Array.isArray(r.spans) ||
      !Number.isFinite(r.start) ||
      !Number.isFinite(r.end) ||
      !Number.isFinite(a.ackPublishedAt) ||
      r.start > a.ackPublishedAt ||
      a.ackPublishedAt > r.end ||
      a.expired !== false ||
      !Number.isSafeInteger(a.position) ||
      a.position < 1
    )
      throw Error("Invalid forensic acknowledgement marker");
    seen.add(r.traceId);
    result.push(r);
  }
  return result;
}
export async function forensicScale(directory, output) {
  const inputs = [],
    warnings = [];
  const bytes = (name) => {
    const b = fs.readFileSync(path.join(directory, name));
    inputs.push({ path: name, bytes: b.length, sha256: sha(b) });
    return b;
  };
  const json = (name) => JSON.parse(bytes(name));
  const manifest = json("trace-run.json"),
    bench = json("driver/ns-report.json"),
    summary = json("trace-summary.json"),
    terminal = json("driver-container-final.json")[0];
  if (
    path.basename(directory) !== manifest.tag ||
    manifest.slot !== manifest.tag ||
    !/^[a-f0-9]{40}$/.test(manifest.source) ||
    !["RUNNING", "DONE"].includes(bench.status) ||
    !bench.config.zeroReaders ||
    !bench.seed.complete ||
    bench.seed.seededSubjects !== bench.config.rungSubjects ||
    !bench.seed.assertionsMatchClosedForm ||
    terminal.State.Running ||
    !terminal.State.FinishedAt ||
    terminal.State.FinishedAt.startsWith("0001-") ||
    summary.tag !== manifest.tag ||
    summary.source !== manifest.source
  )
    throw Error("Not a terminal, source-bound incomplete population reading");
  inputs.push({
    path: "verified raw/terminal manifest",
    sha256: sha(await verifiedRawManifest(directory)),
  });
  const decode = async (name, accept = () => true) => {
    const full = path.join(directory, name),
      b = bytes(name),
      rows = [];
    void b;
    const source = fs.createReadStream(full),
      input = name.endsWith(".gz")
        ? source.pipe(createGunzip({ finishFlush: constants.Z_SYNC_FLUSH }))
        : source;
    if (input !== source) source.on("error", (e) => input.destroy(e));
    const decoder = new StringDecoder("utf8");
    let rest = "";
    try {
      for await (const chunk of input) {
        const lines = (rest + decoder.write(chunk)).split("\n");
        rest = lines.pop();
        if (rest.length > 16 * 1024 ** 2) throw Error("Oversized forensic line");
        for (const line of lines)
          if (line.trim()) {
            const r = JSON.parse(line);
            if (accept(r)) rows.push(r);
          }
      }
      rest += decoder.end();
      if (rest) warnings.push(name + ": trailing incomplete line excluded");
    } finally {
      source.destroy();
      input.destroy();
    }
    return rows;
  };
  const nodeNames = fs
    .readdirSync(path.join(directory, "trace/raw"))
    .filter((n) => /^node-.*\.jsonl\.gz$/.test(n));
  const roots = [],
    events = [],
    clientCaches = [];
  for (const name of nodeNames) {
    for (const r of await decode(
      "trace/raw/" + name,
      (r) =>
        (r.type === "request" && r.name === "driver.commit") ||
        r.type === "event" ||
        (r.type === "resource" && r.name === "client.caches"),
    )) {
      if (r.type === "request" && r.name === "driver.commit") roots.push(bound(r, manifest));
      else if (r.type === "event") events.push(bound(r, manifest));
      else if (r.type === "resource" && r.name === "client.caches")
        clientCaches.push(bound(r, manifest));
    }
  }
  const acknowledged = observedAcknowledgements(roots, manifest, {
      minimumStart: bench.traceStartAbsMs,
      bootId: summary.clockAlignment?.reference?.bootId,
    }),
    reference = acknowledged[0]?.clock;
  if (!reference) throw Error("No observed closed acknowledgement roots");
  const ids = new Set(acknowledged.map((r) => r.traceId));
  const gateways = [];
  for (const name of ["gw-w.jsonl.gz", "gw-r.jsonl.gz"])
    for (const r of await decode("trace/raw/" + name, (r) => r.type === "request"))
      gateways.push(bound(r, manifest));
  const native = await decode(
    "trace/raw/tx.jfr.jsonl.gz",
    (r) => r.nativeType === "triplex.NativeTransaction",
  );
  const counters = await decode("trace/raw/tx.jsonl.gz", (r) =>
    ["metrics", "index-adoption", "native-counter-state"].includes(r.type),
  );
  const nativeCounters = nativeCounterSummary(manifest, counters);
  const ws = acknowledged.map((r) => ({
    traceId: r.traceId,
    scheduledAt: r.start,
    ackPublishedAt: r.attributes.ackPublishedAt,
    root: r,
  }));
  const joined = nativeByCommit(
    manifest,
    ws,
    gateways.filter((g) => ids.has(g.traceId)),
    native,
  );
  const gatewayById = new Map();
  for (const g of gateways) {
    const a = gatewayById.get(g.traceId) ?? [];
    a.push(alignClockRecord(g, reference));
    gatewayById.set(g.traceId, a);
  }
  const first = Math.min(...acknowledged.map((r) => r.start)),
    last = Math.max(...acknowledged.map((r) => r.end));
  const pauses = events
    .map((r) => alignClockRecord(r, reference))
    .filter((r) => r.start < last && r.end > first);
  const attributions = new Map(
    acknowledged.map((r) => [
      r.traceId,
      attribute(
        { ...r, end: r.attributes.ackPublishedAt },
        gatewayById.get(r.traceId) ?? [],
        pauses,
      ),
    ]),
  );
  const phases = [
    ...bench.phases.map((p) => ({
      name: p.name,
      start: p.start,
      end: p.end,
      recordedWindow: true,
    })),
    { name: "outside-recorded-phase-windows", recordedWindow: false },
  ];
  const phaseOf = (w) =>
    bench.phases.find((p) => w.scheduledAt >= p.start && w.scheduledAt < p.end)?.name ??
    "outside-recorded-phase-windows";
  const timedCounters = counters.map((r) => alignClockRecord(r, reference));
  const phaseRows = phases.map((p) => {
    const rows = joined.filter((x) => phaseOf(x.write) === p.name),
      samples = rows.flatMap((x) => (x.native ? [x.native.nativeStats] : [])),
      reads = samples.flatMap((s) => (s["io-stats"]?.reads ? [s["io-stats"].reads] : [])),
      attrs = rows.map((x) => attributions.get(x.write.traceId));
    const adoptions = p.recordedWindow
      ? timedCounters.filter(
          (r) => r.type === "index-adoption" && r.start < p.end && r.end >= p.start,
        )
      : [];
    const after = rows.filter((x) =>
      adoptions.some(
        (a) =>
          a.databaseHash === x.gateway?.attributes?.databaseHash &&
          x.write.scheduledAt >= a.end &&
          x.write.scheduledAt < a.end + 2000,
      ),
    );
    return {
      name: p.name,
      recordedWindow: p.recordedWindow,
      offered: null,
      expired: null,
      observedClosedAcknowledgements: rows.length,
      ackMs: stats(rows.map((x) => x.write.ackPublishedAt - x.write.scheduledAt)),
      finishMs: stats(rows.map((x) => x.write.root.end - x.write.root.start)),
      nativeObserved: samples.length,
      readCounterCommits: reads.length,
      coldSqlCommits: reads.filter((r) => (r.sql ?? 0) > 0).length,
      sqlReads: stats(reads.map((r) => r.sql ?? 0)),
      datoms: stats(samples.map((s) => s["datom-count"]).filter(Number.isFinite)),
      applyMs: stats(samples.map((s) => s["apply-msec"])),
      peerMs: stats(attrs.map((a) => a.layers["peer-wait"])),
      layers: Object.fromEntries(
        LAYERS.map((k) => [
          k,
          stats(k === "gateway-gc" ? [] : attrs.map((a) => a.layers[k]).filter(Number.isFinite)),
        ]),
      ),
      typescriptShare: stats(attrs.map((a) => a.typescriptShare)),
      adoptions: adoptions.map((r) => ({
        databaseHash: r.databaseHash,
        durationMs: r.end - r.start,
        completed: r.completed,
      })),
      afterAdoption2s: {
        observedClosedAcknowledgements: after.length,
        ackMs: stats(after.map((x) => x.write.ackPublishedAt - x.write.scheduledAt)),
        coldSqlCommits: after.filter(
          (x) => (x.native?.nativeStats?.["io-stats"]?.reads?.sql ?? 0) > 0,
        ).length,
      },
      examples: rows.slice(0, 2).map((x) => x.write.traceId),
    };
  });
  const memory = {};
  let minAvailable = null;
  for (const name of fs.readdirSync(directory).filter((n) => /^scale-memory-\d+\.json$/.test(n))) {
    const r = json(name);
    bound(r, manifest);
    if (r.driverContainerId !== terminal.Id) throw Error("Foreign memory container");
    for (const [role, v] of Object.entries(r.memory)) {
      if (
        !Number.isSafeInteger(v.peakBytes) ||
        v.peakBytes < 1 ||
        !Number.isSafeInteger(v.limitBytes) ||
        v.limitBytes < 1 ||
        !/oom_kill \d+/.test(v.events ?? "")
      )
        throw Error("Missing kernel counter");
      const m = (memory[role] ??= { peakBytes: 0, limitBytes: v.limitBytes, oomKills: 0 });
      if (m.limitBytes !== v.limitBytes) throw Error("Changed memory limit");
      m.peakBytes = Math.max(m.peakBytes, v.peakBytes);
      m.oomKills = Math.max(m.oomKills, Number(/oom_kill (\d+)/.exec(v.events)?.[1] ?? 0));
    }
    const kb = Number(/MemAvailable:\s+(\d+)/.exec(r.meminfo)?.[1]);
    if (Number.isFinite(kb)) minAvailable = Math.min(minAvailable ?? Infinity, kb * 1024);
  }
  const storage = await decode("scale-storage.jsonl");
  const scan = await decode("driver/scan-stats.jsonl");
  const host = (await decode("trace/raw/system-darwin.jsonl.gz")).filter((r) => {
    bound(r, manifest);
    return r.type !== "metadata";
  });
  const swaps = host.flatMap((r) => {
    const m = /used\s*=\s*([\d.]+)M/.exec(r.swap ?? "");
    return m ? [Number(m[1]) / 1024] : [];
  });
  const result = {
    schema: "triplex.scale-forensics/1",
    classification:
      bench.status === "DONE"
        ? "BUSY HOST; CLOSED ACK SUBSET FROM COMPLETED DRIVER; NO VERDICT"
        : "BUSY HOST; INCOMPLETE CENSORED SUBSET; NO VERDICT",
    driverReportStatus: bench.status,
    traceCollectionComplete: summary.complete === true,
    tag: manifest.tag,
    source: manifest.source,
    analysisProgramSha256: sha(fs.readFileSync(new URL(import.meta.url))),
    analysisSources: Object.fromEntries(
      fs
        .readdirSync(import.meta.dirname)
        .filter((n) => n.endsWith(".mjs"))
        .map((n) => [n, sha(fs.readFileSync(path.join(import.meta.dirname, n)))]),
    ),
    observedWindow: {
      firstStart: first,
      lastClosedEnd: last,
      lastClosedSecondsFromTraceStart: (last - bench.traceStartAbsMs) / 1000,
    },
    inputs,
    seed: bench.seed,
    terminal: { ...terminal.State },
    observedClosedAcknowledgements: acknowledged.length,
    completeOfferDenominator: null,
    missingTail: bench.status !== "DONE" || summary.complete !== true,
    phaseRows,
    memory,
    minObservedGuestAvailableBytes: minAvailable,
    nativeCounters,
    clientCacheLast: Object.fromEntries(
      clientCaches.map((r) => [`${r.process}:${r.thread}:${r.client}`, r]),
    ),
    gatewayCacheLast: scan.at(-1),
    storageLast: storage.at(-1),
    host: {
      swapGiB: stats(swaps),
      otherCpuPercent: stats(host.map((r) => r.otherCpu).filter(Number.isFinite)),
      definition: "legacy process-lifetime gauge, not per-request host attribution",
    },
    warnings: [
      ...summary.errors,
      ...warnings,
      "Closed committed background ACK markers only. This tool does not assess offered/expired denominators; incomplete or truncated inputs retain an unknown tail. No reconstructed writer file or verdict.",
      "Layer quantiles are clipped to the observed ACK; native counters join by database/t. SQL timing has no per-transaction causal attribution. This tool does not attribute JVM pauses, so gateway GC is unknown, never a measured zero.",
    ],
  };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [directory, output] = process.argv.slice(2);
  if (!directory || !output) throw Error("scale-forensics.mjs TERMINAL_RUN NEW_JSON");
  await forensicScale(directory, output);
}
