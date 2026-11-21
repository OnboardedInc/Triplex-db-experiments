import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type Span = { id: string; parent: string; name: string; start: number; end: number };
type NumberRecord = Record<string, number>;
const [mode, dir, nativeLog] = process.argv.slice(2);
assert(dir && (mode === "archive" || mode === "joined"));
const json = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));
const sha = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const rounded = (value: number) => Math.round(1000 * value) / 1000;

if (mode === "archive") {
  const custody = json(path.join(dir, "custody.json"));
  const read = (file: string) => {
    const bytes = fs.readFileSync(path.join(dir, file));
    assert.deepEqual({ bytes: bytes.length, sha256: sha(bytes) }, custody.files[file]);
    return bytes.toString();
  };
  const arm = JSON.parse(read("campaign/loaded/arm.json"));
  const root = `campaign/loaded/engines/${arm.slot}/trace/raw`;
  const native = JSON.parse(read(`${root}/gw-r-native-settings.json`));
  const gc = read(`${root}/prep1-gc-gw-r.log`);
  assert.equal(arm.source, custody.source);
  assert.deepEqual([native.slot, native.source, native.process], [arm.slot, arm.source, "gw-r"]);
  const inputs = JSON.parse(read("campaign/input.json"));
  const operations = JSON.parse(read("campaign/loaded/operations.json"));
  assert.equal(sha(Buffer.from(JSON.stringify(operations.tape))), arm.tapeSha256);
  const phases = arm.p1.map((phase: { seats: number; goodput: number; errors: number; read: NumberRecord }, i: number) => {
    const start = arm.start + i * 60000, stop = start + 60000;
    const stops: NumberRecord[] = [], pauses: NumberRecord[] = [];
    for (const line of gc.split("\n")) {
      const wall = Date.parse(line.slice(1, line.indexOf("]")));
      if (!(wall >= start && wall < stop)) continue;
      const park = line.match(/\[safepoint\s*\] Safepoint .*Reaching safepoint: (\d+) ns, .*At safepoint: (\d+) ns, .*Total: (\d+) ns/);
      if (park) stops.push({ wall, reach: Number(park[1]) / 1e6, at: Number(park[2]) / 1e6, duration: Number(park[3]) / 1e6 });
      const pause = line.match(/\[gc\s*\] GC\((\d+)\) Pause .* (\d+(?:\.\d+)?)ms$/);
      if (pause) pauses.push({ wall, id: Number(pause[1]), duration: Number(pause[2]) });
    }
    const summarize = (rows: NumberRecord[]) => ({ count: rows.length,
      wallMs: rounded(rows.reduce((sum, row) => sum + row.duration!, 0)),
      longest: rows.reduce((largest, row) => row.duration! > (largest?.duration ?? 0) ? row : largest, undefined as NumberRecord | undefined) });
    const safe = summarize(stops);
    return { ...phase, start, stop, meanOccupiedSeats: rounded(phase.goodput * phase.read.meanMs! / 1000),
      safepoint: safe, gcPause: summarize(pauses), withoutSafepointsPerSecond: rounded(phase.goodput / (1 - safe.wallMs / 60000)) };
  });
  console.log(JSON.stringify({ source: arm.source, slot: arm.slot, image: inputs.imagePin, offers: operations.tape.length,
    jvm: native.jvm, peerReadConcurrency: native.datomic["datomic.readConcurrency"],
    peerObjectCache: native.datomic["datomic.objectCacheMax"], phases, p4: arm.p4 }, null, 2));
} else {
  assert(nativeLog);
  const arm = json(path.join(dir, "arm.json"));
  const wire = json(path.join(dir, "read-wire.json"));
  assert.deepEqual([wire.source, wire.slot, wire.attempt], [arm.source, arm.slot, arm.attempt]);
  const wanted = new Set<string>(wire.samples.map((row: { id: string }) => row.id));
  assert.equal(wanted.size, wire.samples.length);
  const requests = new Map<string, any>();
  for (const line of fs.readFileSync(nativeLog, "utf8").trimEnd().split("\n")) {
    const row = JSON.parse(line);
    if (!wanted.has(row.readProfileId)) continue;
    assert.deepEqual([row.source, row.slot, row.run, row.process], [arm.source, arm.slot, arm.slot, "gw-r"]);
    assert(!requests.has(row.readProfileId));
    requests.set(row.readProfileId, row);
  }
  const matching: unknown[] = [], missing: string[] = [];
  for (const sample of wire.samples) {
    const row = requests.get(sample.id);
    if (!row) { missing.push(sample.id); continue; }
    assert.equal(sample.echo, sample.id);
    assert.equal(sample.responseBytes, row.attributes.responseBytes);
    assert.equal(sample.status, row.attributes.status);
    assert.equal(row.truncated, 0);
    const route = row.spans.find((span: Span) => span.name === "gateway.route");
    const sameClock = row.clock?.bootId && row.clock.bootId === wire.clock.bootId;
    const beforeGateway = sameClock && route ? rounded(route.start - row.clock.offsetMs - (sample.sent - wire.clock.offsetMs)) : null;
    const spans: NumberRecord = {};
    for (const span of row.spans as Span[]) spans[span.name] = (spans[span.name] ?? 0) + (span.end - span.start);
    matching.push({ id: sample.id, route: sample.route, issuedAt: sample.issue, gatewayStart: row.start, gatewayEnd: row.end,
      seats: arm.p1.find((phase: { diagnostic: { startedAt: number; deadline: number } }) =>
        phase.diagnostic.startedAt <= sample.issue && sample.issue < phase.diagnostic.deadline)?.seats ?? null,
      reusedSocket: sample.reusedSocket, responseBytes: sample.responseBytes,
      client: { encode: rounded(sample.encoded - sample.issue), socketPool: rounded(sample.socket - sample.encoded),
        socketWrite: rounded(sample.sent - sample.socket), beforeGateway, firstByte: rounded(sample.headers - sample.sent),
        responseBody: rounded(sample.bodyEnd - sample.headers), jsonParse: rounded(sample.parsed - sample.bodyEnd),
        sdkAfterParse: rounded(sample.sdkDone - sample.parsed) },
      gateway: Object.fromEntries(Object.entries(spans).map(([name, ms]) => [name, rounded(ms)])),
      handlerCpuNs: row.attributes.handlerCpuNs, io: row.attributes.peerIoStats, counters: row.counters });
  }
  console.log(JSON.stringify({ source: arm.source, slot: arm.slot, attempt: arm.attempt, matching, missing }, null, 2));
}
