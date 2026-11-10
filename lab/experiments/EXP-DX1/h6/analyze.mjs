import fs from "node:fs";
import path from "node:path";
// [DX-H6] Why: report observed ACK wall and post-ACK verification separately, with no gate promotion.
// Rejected: counting oracle CPU in activation or summing overlapping cgroup intervals per page.
const root = "/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H6";
const records = [];
for (const dir of fs.readdirSync(root).sort()) {
  const receipt = path.join(root, dir, "driver/receipt.json");
  if (!fs.existsSync(receipt)) continue;
  const r = JSON.parse(fs.readFileSync(receipt)),
    s = r.sweep;
  const raw = path.join(root, dir, "driver/cgroups.ndjson");
  let peak = null,
    activationCurrentPeak = null;
  const samples = fs.existsSync(raw)
    ? fs
        .readFileSync(raw, "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l))
    : [];
  for (const sample of samples) {
    const v = sample.resources?.["driver-with-oracle"];
    if (v?.memoryPeak) peak = Math.max(peak ?? 0, Number(v.memoryPeak));
    if (
      s &&
      sample.atMs >= s.activationStartedAtEpochMs &&
      sample.atMs <= s.lastPublicationAckAtEpochMs &&
      v?.memoryCurrent
    )
      activationCurrentPeak = Math.max(activationCurrentPeak ?? 0, Number(v.memoryCurrent));
  }
  const cpu = {};
  for (const m of s?.metrics ?? [])
    for (const [key, value] of Object.entries(m.cpu ?? {})) cpu[key] = (cpu[key] ?? 0) + value;
  const metrics = s?.metrics ?? [];
  records.push({
    attempt: dir,
    N: r.N,
    status: r.status,
    error: r.error ?? null,
    gates: r.gates,
    seedCommandRate: r.seed?.commandCommandsPerS ?? null,
    sweep: s
      ? {
          ackWallS: s.activationToLastAckMs / 1000,
          verificationWallS: s.activationToVerificationEndMs / 1000,
          subjectsPerAckS: r.N / (s.activationToLastAckMs / 1000),
          workersWarm: s.workersReadyBeforeTimedWindow,
          workerStartupMs: s.workerStartupMs,
          cpuSeconds: cpu,
          controllerDecodeCpuS:
            metrics.reduce((a, m) => a + (m.timing?.controllerDecodeCpuMs ?? 0), 0) / 1000,
          readBytes: metrics.reduce((a, m) => a + (m.timing?.responseBytes ?? 0), 0),
          readRequests: metrics.reduce((a, m) => a + (m.timing?.readRequests ?? 0), 0),
          outboxMainThreadOverlappingIntervalCpuS:
            metrics.reduce((a, m) => a + (m.timing?.buildOutboxMainThreadIntervalCpuMs ?? 0), 0) /
            1000,
          publishMainThreadOverlappingIntervalCpuS:
            metrics.reduce((a, m) => a + (m.timing?.publishCommitMainThreadIntervalCpuMs ?? 0), 0) /
            1000,
        }
      : null,
    live: r.live?.matched ?? null,
    driverLifetimePeakBytes: peak,
    activationSampledCurrentPeakBytes: activationCurrentPeak,
  });
}
const result = { classification: "DERIVED-OBSERVATIONS-NOT-ACCEPTANCE", records };
fs.writeFileSync(root + "/analysis.json", JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
