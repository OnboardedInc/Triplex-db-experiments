import fs from "node:fs";
const file = process.argv[2];
const rows = fs
  .readFileSync(file, "utf8")
  .split("\n")
  .filter((l) => l.startsWith("{"))
  .flatMap((l) => {
    try {
      return [JSON.parse(l)];
    } catch {
      return [];
    }
  });
for (const row of rows.filter((r) => r.type === "profile")) {
  const p = row.profile,
    nodes = new Map(p.nodes.map((n) => [n.id, n])),
    parent = new Map();
  for (const n of p.nodes) for (const id of n.children ?? []) parent.set(id, n.id);
  const frames = new Map();
  const key = (id) => {
    const f = nodes.get(id).callFrame;
    const k = JSON.stringify([f.functionName, f.url, f.lineNumber]);
    frames.set(k, f);
    return k;
  };
  const self = new Map(), total = new Map();
  for (let i = 0; i < (p.samples ?? []).length; i++) {
    const id = p.samples[i], dt = p.timeDeltas[i], k = key(id);
    self.set(k, (self.get(k) ?? 0) + dt);
    const seen = new Set();
    for (let a = id; a !== undefined; a = parent.get(a)) {
      const ancestor = key(a);
      if (!seen.has(ancestor)) total.set(ancestor, (total.get(ancestor) ?? 0) + dt);
      seen.add(ancestor);
    }
  }
  const table = (m, n) => [...m].sort((a, b) => b[1]-a[1]).slice(0,n).map(([k,us]) => ({
    ms:us/1000, name:frames.get(k).functionName, file:frames.get(k).url, line:frames.get(k).lineNumber+1,
  }));
  console.log(JSON.stringify({ stage: row.stage, self: table(self, 20), total: table(total, 10) }));
}
for (const r of rows.filter((r) => r.level)) {
  const telemetry = r.workerTelemetry;
  const metrics = Array.from({ length: 3 }, (_, w) => {
    const s = telemetry.filter(([id]) => id === w).map(([, m]) => m),
      a = s[0],
      b = s.at(-1);
    if (!a || !b) return {};
    const delta = {};
    for (const [k, v] of Object.entries(b.diagnostics[0]?.reach ?? {}))
      if (typeof v === "number") delta[k] = v - (a.diagnostics[0].reach[k] ?? 0);
    return {
      worker: w,
      seconds: (b.t - a.t) / 1000,
      cpuMs: b.threadCpuMs - a.threadCpuMs,
      pulls: b.httpCounts.pull.operations - a.httpCounts.pull.operations,
      requests: b.httpCounts.pull.requests - a.httpCounts.pull.requests,
      elu: s.reduce((n, x) => n + x.elu, 0) / s.length,
      reach: delta,
      evictions: b.diagnostics[0].entities.evictions - a.diagnostics[0].entities.evictions,
      entityPeak: b.diagnostics[0].entities.peakBytes,
      rowPeak: b.diagnostics[0].rows.peakBytes,
      heapUsed: b.memory.heapUsed,
      rss: b.memory.rss,
    };
  });
  console.log(
    JSON.stringify({
      ...r,
      workerTelemetry: undefined,
      metrics,
      cpuMsPerPull: metrics.reduce((n, m) => n + (m.cpuMs ?? 0), 0) / metrics.reduce((n, m) => n + (m.pulls ?? 0), 0),
    }),
  );
}
