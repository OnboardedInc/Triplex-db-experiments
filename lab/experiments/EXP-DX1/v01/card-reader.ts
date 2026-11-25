import assert from "node:assert/strict";
import fs from "node:fs";
import { StringDecoder } from "node:string_decoder";
import { Histogram, type HistogramSummary } from "../../../bench/lib/hist.ts";

// [DX-CARD2] Why: the tuned pinned reader measured at 1 billion on 2026-11-23 (rd1/PINNED-1B.md: three reader cores,
// 6 GiB heap, 3 GiB read cache, both pinned read options with the early filter, client batches of up to eight, the
// request trace off for /read) becomes a setting of the version 0.1 card, `--reader tuned` with `--read-permits N`.
// The default card (`--reader default`) is unchanged: none of these values reaches its plan, launch, input or card.
// Rejected: a free-form reader (only the measured treatment is offered), and turning the setting on by default.
export const cardReaders = ["default", "tuned"] as const;
export type CardReader = { reader: "tuned"; readPermits?: number };

/** `undefined` is the default reader: nothing is recorded for it, so the default card's files stay byte for byte. */
export function parseReader(reader: string | undefined, permits: string | undefined): CardReader | undefined {
  assert(reader === undefined || (cardReaders as readonly string[]).includes(reader), "Choose --reader default or tuned");
  assert(permits === undefined || reader === "tuned", "--read-permits applies only with --reader tuned");
  assert(permits === undefined || /^[1-9][0-9]?$/.test(permits), "--read-permits is 1 to 99");
  if (reader !== "tuned") return undefined;
  return permits === undefined ? { reader: "tuned" } : { reader: "tuned", readPermits: Number(permits) };
}

/** The process environment that carries the setting from run.ts to adopted-server.ts, as the profile and tape are. */
export function readerEnvironment(reader: CardReader | undefined): [string, string][] {
  if (!reader) return [];
  return [["DX_V01_READER", "tuned"], ...(reader.readPermits ? [["DX_V01_READ_PERMITS", String(reader.readPermits)] as [string, string]] : [])];
}
export const readerFromEnvironment = (env: NodeJS.ProcessEnv) => parseReader(env.DX_V01_READER, env.DX_V01_READ_PERMITS);

/**
 * The launch options of jvm1/launch.mjs launchProfile for the reader: cores 5, 6, 11, a 3 GiB cache in a 9 GiB heap (a
 * third, so the collector has room; three parallel collector threads), an 11 GiB container. The reader arms ran the same
 * cache in a 6 GiB heap; the card's reader differs from them in heap size only.
 */
export const readerLaunch = (reader: CardReader | undefined) =>
  reader ? { readTuned: true, readCacheMiB: 3072 as const, readHeapThird: true } : {};

/**
 * The stack options (stack/up.sh) of the tuned reader as the tuned arms ran it (v01/study-server.ts): both pinned
 * options, the early filter, and the read profile, which switches the ordinary request trace off for /read (a read is
 * traced only when it carries a sample header) and writes the reader's GC log and Datomic metrics minutes.
 */
export function readerStackOptions(reader: CardReader | undefined): Record<string, string> {
  if (!reader) return {};
  return { DX_PINNED_SHORTCUT: "1", DX_PINNED_CUT_LOOKUP: "1", DX_RD1_READ_FILTER: "1", DX_RD1_READ_PROFILE: "1",
    ...(reader.readPermits ? { DX_READ_PERMITS: String(reader.readPermits) } : {}) };
}

// [DX-CARD2] The card's P1 ladder with the tuned reader: the same seats and pin, the client batching of the tuned arm
// (calls queued in one turn share a /read exchange, up to eight subjects), then the random-subject line: 256 seats for
// one 60 s step, each read an account and a subject drawn uniformly from all ten accounts × the seed's subjects, at the
// seed cut, so every value is checked against the seed's. Every 16th exchange carries a read-profile header, so the
// reader traces its Datomic io-stats, from which the card reports storage loads per subject and the cache share.
// Rejected: the random line inside the re-read ladder (it would change the re-read steps the earlier cards measured),
// a deterministic generator (the measured random windows drew with Math.random), and the near-head pin (the card's
// ladder pins at the seed cut, where the seed gives a value for every subject).
export const randomLine = { seats: 256, toySeats: 4, profileEvery: 16, pin: "random-seed-cut" } as const;
export const tunedBatch = 8;
export type P1Reader = { batch: number; random?: { seats: number; profileEvery: number; trace?: string };
  /** [DX-SRV2] Per-read classification (DX_V01_SAMPLE_EVERY): every n-th exchange of both P1 lines carries a read-profile
   * header and each read is classed "in memory" or "not in memory" from the reader's io-stats for its exchange. */
  classify?: { every: number; trace?: string } };
export function p1Reader(reader: CardReader | undefined, toy: boolean, trace?: string, sampleEvery?: number): P1Reader | undefined {
  if (!reader) return undefined;
  return { batch: tunedBatch, random: { seats: toy ? randomLine.toySeats : randomLine.seats, profileEvery: sampleEvery ?? randomLine.profileEvery,
    ...(trace ? { trace } : {}) }, ...(sampleEvery ? { classify: { every: sampleEvery, ...(trace ? { trace } : {}) } } : {}) };
}

// [DX-SRV2] Why: the read bar of 2026-11-25 is two bars, p99 at most 100 ms for a subject in memory and at most 300 ms
// for one not in memory (lab/TARGETS.md "Read bar by where the subject is"), so the card must say which reads were
// which. The reader can observe it per exchange: Datomic's io-stats bound to the request thread (trace.clj `handler`,
// the prefetch pool's touches included) count the segments fetched from storage for that request. Rule
// (srv1/SESSION-PLAN.md section B): an exchange is "in memory" when it fetched nothing from storage (no `sql`, `dev`,
// `mem`, `ddb` or `cass` reads; only object-cache hits), otherwise "not in memory"; every subject of an exchange takes
// its exchange's class. Exact for the in-memory bar, conservative for the other. Datomic's own read-ahead threads'
// loads are not in a request's io-stats; the card states the difference against the reader's StorageGet count.
// Rejected: classing by line (re-read = in memory, random = not), which was the fallback, and a response header from
// the gateway (a gateway change before commit.clj moves generated names in stored functions; READINESS step 0).
export const sampleEveryValues = [1, 2, 4, 8, 16] as const;
export function parseSampleEvery(value: string | undefined, reader: CardReader | undefined): number | undefined {
  if (value === undefined || value === "") return undefined;
  assert(reader, "DX_V01_SAMPLE_EVERY needs --reader tuned (only the tuned reader writes the read profile)");
  assert((sampleEveryValues as readonly number[]).includes(Number(value)) && /^[0-9]+$/.test(value), "DX_V01_SAMPLE_EVERY is 1, 2, 4, 8 or 16");
  return Number(value);
}
// [DX-SRV2] The card's read options beyond the tuned reader, carried by run.ts to the stack (stack/up.sh reads the first
// two) and to the arm, recorded in the campaign input and checked on the reader's container before the first offer.
// Before this run.ts dropped them, so a card started with DX_READ_PREFETCH=1 ran without the prefetch, unrecorded.
export const cardReadOptionNames = ["DX_READ_PREFETCH", "DX_READ_AHEAD_OFF", "DX_V01_SAMPLE_EVERY"] as const;
export function cardReadOptionsSet(env: NodeJS.ProcessEnv, reader: CardReader | undefined): Record<string, string> {
  for (const name of ["DX_READ_PREFETCH", "DX_READ_AHEAD_OFF"] as const)
    assert(env[name] === undefined || env[name] === "" || /^[01]$/.test(env[name]!), name + " is 0 or 1");
  const set = Object.fromEntries(cardReadOptionNames.flatMap((name) => env[name] && env[name] !== "0" ? [[name, env[name]!]] : []));
  assert(!Object.keys(set).length || reader, "the card's read options need --reader tuned");
  parseSampleEvery(env.DX_V01_SAMPLE_EVERY, reader);
  return set;
}
/** What the reader's container must carry for the card's read options (checked with the tuned reader's switches). */
export function readOptionsExpected(options: Record<string, string>) {
  return { env: options.DX_READ_PREFETCH === "1" ? ["TX2_READ_PREFETCH=1"] : [],
    java: options.DX_READ_AHEAD_OFF === "1" ? ["-Ddatomic.readAheadPool=0"] : [] };
}

/** The reader container's settings that the card's read options set, as seen by `docker inspect` (for reader-check.json). */
export function readerOptionsSummary(env: readonly string[]) {
  const java = env.find((e) => e.startsWith("DATOMIC_JAVA_OPTS=")) ?? "";
  return { prefetch: env.includes("TX2_READ_PREFETCH=1"), readAheadOff: /(^|[ =])-Ddatomic\.readAheadPool=0( |$)/.test(java),
    readProfile: env.includes("TX2_READ_PROFILE=1") };
}

export type Exchange = { storage: number; sql: number; sqlMs: number; waitMs: number | null; workMs: number | null; cpuMs: number | null };
const storageKeys = ["sql", "dev", "mem", "ddb", "cass"] as const;
/** One sampled exchange from a reader trace record (trace.clj `handler`: peerIoStats, spans, handlerCpuNs). */
export function exchangeOf(row: any): Exchange {
  const io = row.attributes?.peerIoStats?.reads ?? {};
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const span = (name: string) => {
    const xs = (row.spans ?? []).filter((s: any) => s.name === name && Number.isFinite(s.start) && Number.isFinite(s.end));
    return xs.length ? xs.reduce((t: number, s: any) => t + (s.end - s.start), 0) : null;
  };
  return { storage: storageKeys.reduce((t, k) => t + n(io[k]), 0), sql: n(io.sql), sqlMs: n(io["sql-ms"]),
    waitMs: span("gateway.admission-wait"), workMs: span("gateway.admitted-work"),
    cpuMs: typeof row.attributes?.handlerCpuNs === "number" ? row.attributes.handlerCpuNs / 1e6 : null };
}
/** The sampled exchanges named by `ids`, read from the reader's trace after `offset` line by line (a 256-seat card's
 * trace with every exchange sampled is hundreds of MB, over one string's limit), plus the reader's metrics minutes. */
export function traceExchanges(file: string, offset: number, ids: ReadonlySet<string>, window?: { start: number; end: number }) {
  const found = new Map<string, Exchange>(), minutes: { at: number; overlapSeconds: number; storageGets: number | null }[] = [];
  const fd = fs.openSync(file, "r"), chunk = Buffer.alloc(8 * 1024 * 1024);
  let position = offset, rest = "", previousAt: number | undefined;
  const decoder = new StringDecoder("utf8");
  const line = (text: string) => {
    if (!text.startsWith("{")) return;
    const request = text.includes("readProfileId"), metrics = window && text.includes('"metrics"');
    if (!request && !metrics) return;
    let row: any;
    try { row = JSON.parse(text); } catch { return; }
    if (request && row.type === "request" && ids.has(row.readProfileId)) found.set(row.readProfileId, exchangeOf(row));
    else if (window && row.type === "metrics" && row.process === "gw-r") {
      const at = Number(row.at), from = previousAt ?? at - 60_000;
      previousAt = at;
      const overlap = Math.max(0, Math.min(at, window.end) - Math.max(from, window.start)) / 1000;
      if (overlap > 0) minutes.push({ at, overlapSeconds: Number(overlap.toFixed(1)), storageGets: row.metrics?.StorageGetMsec?.count ?? null });
    }
  };
  try {
    for (;;) {
      const n = fs.readSync(fd, chunk, 0, chunk.length, position);
      if (!n) break;
      position += n;
      const lines = (rest + decoder.write(chunk.subarray(0, n))).split("\n");
      rest = lines.pop()!;
      for (const l of lines) line(l);
    }
    line(rest);
  } finally { fs.closeSync(fd); }
  return { found, minutes };
}
type Quantiles = { p50Ms: number | null; p99Ms: number | null };
const quantiles = (xs: number[]): Quantiles => {
  xs.sort((a, b) => a - b);
  const at = (q: number) => xs.length ? Number(xs[Math.min(xs.length - 1, Math.ceil(q * xs.length) - 1)]!.toFixed(3)) : null;
  return { p50Ms: at(0.5), p99Ms: at(0.99) };
};
export type Population = { reads: number; exchanges: number; share: number | null; read: HistogramSummary;
  admissionWait: Quantiles; admittedWork: Quantiles; storageReadsPerSubject: number | null; sqlMsPerRead: number | null; handlerCpuMsPerExchange: number | null };
export type Classified = { every: number; sampledReads: number; stepReads: number; unmatched: number;
  inMemory: Population; notInMemory: Population; storageReadsSampled: number };
/** Each sampled read (its exchange's profile id and its latency from the client) classed by its exchange. */
export function classifyReads(reads: readonly (readonly [string, number])[], exchanges: ReadonlyMap<string, Exchange>, stepReads: number, every: number): Classified {
  const make = () => ({ h: new Histogram(), ids: new Map<string, number>() });
  const sides = { inMemory: make(), notInMemory: make() };
  let unmatched = 0;
  for (const [id, ms] of reads) {
    const x = exchanges.get(id);
    if (!x) { unmatched++; continue; }
    const side = x.storage === 0 ? sides.inMemory : sides.notInMemory;
    side.h.recordMs(ms);
    side.ids.set(id, (side.ids.get(id) ?? 0) + 1);
  }
  const classed = reads.length - unmatched, round = (x: number, d = 3) => Number(x.toFixed(d));
  const population = (s: ReturnType<typeof make>): Population => {
    const xs = [...s.ids.keys()].map((id) => exchanges.get(id)!), reads = s.h.count;
    const sum = (f: (x: Exchange) => number) => xs.reduce((t, x) => t + f(x), 0);
    const cpu = xs.filter((x) => x.cpuMs !== null);
    return { reads, exchanges: xs.length, share: classed ? round(reads / classed, 4) : null, read: s.h.summary(),
      admissionWait: quantiles(xs.flatMap((x) => x.waitMs === null ? [] : [x.waitMs])),
      admittedWork: quantiles(xs.flatMap((x) => x.workMs === null ? [] : [x.workMs])),
      storageReadsPerSubject: reads ? round(sum((x) => x.storage) / reads) : null,
      sqlMsPerRead: reads ? round(sum((x) => x.sqlMs) / reads) : null,
      handlerCpuMsPerExchange: cpu.length ? round(cpu.reduce((t, x) => t + x.cpuMs!, 0) / cpu.length) : null };
  };
  const storageReadsSampled = [...new Set(reads.map(([id]) => id))].reduce((t, id) => t + (exchanges.get(id)?.storage ?? 0), 0);
  return { every, sampledReads: reads.length, stepReads, unmatched, inMemory: population(sides.inMemory),
    notInMemory: population(sides.notInMemory), storageReadsSampled };
}
/** Minutes the random line adds to the P1-P4 pair: one 60 s step in the zero-reader arm and one in the reader arm. */
export const randomLineMinutes = (reader: CardReader | undefined) => reader ? 2 : 0;

export function readerTitle(reader: CardReader | undefined) {
  if (!reader) return "";
  return ` Reader: tuned (cores 5, 6 and 11, 9 GiB heap with a 3 GiB read cache and three collector threads, ${reader.readPermits ?? 3} read permits` +
    `${reader.readPermits ? "" : " (one per core)"}, both pinned read options with the early filter, request trace off for /read;` +
    ` P1 ladder in client batches of up to ${tunedBatch} subjects, then a random-subject line of ${randomLine.seats} seats for 60 s` +
    ` at the seed cut; the driver on cores 9 and 10 while offers run).`;
}

type Io = Record<string, number>;
type Minute = { overlapSeconds: number; storageGets: number | null; cacheRequests: number | null; cacheHits: number | null };
export type ReaderRecords = { sampled: number; found: number; ioStatsSums: Io; handlerCpuMs: { mean: number } | null; metricsMinutes: Minute[] };

/**
 * Storage loads per subject and the object-cache share for the random line, the two ways the 2026-11-23 arms gave
 * them: the sampled exchanges' storage reads (`reads.sql`) over subjects per exchange, and the reader's metrics minutes
 * (StorageGet count and ObjectCache hits over requests, each minute weighted by its seconds inside the line) over the
 * reads in those seconds. The metrics minutes count every read the reader served in them (P6 reads, the journal feed).
 */
export function randomLineLoads(records: ReaderRecords | undefined, goodput: number, meanBatch: number) {
  if (!records || !records.found || !(meanBatch > 0)) return undefined;
  const sql = records.ioStatsSums["reads.sql"] ?? 0, cache = records.ioStatsSums["reads.ocache"];
  let gets = 0, requests = 0, hits = 0, seconds = 0;
  for (const m of records.metricsMinutes) {
    const share = Math.min(1, m.overlapSeconds / 60);
    if (m.storageGets === null || m.cacheRequests === null || m.cacheHits === null) continue;
    gets += m.storageGets * share; requests += m.cacheRequests * share; hits += m.cacheHits * share; seconds += m.overlapSeconds;
  }
  const round = (x: number, d = 3) => Number(x.toFixed(d));
  return {
    sampledExchanges: records.found,
    storageReadsPerExchange: round(sql / records.found),
    loadsPerSubjectSampled: round(sql / records.found / meanBatch),
    loadsPerSubjectMetrics: seconds && goodput > 0 ? round(gets / (goodput * seconds)) : null,
    cacheShare: requests ? round(hits / requests, 4) : null,
    sampledCacheHitsPerExchange: cache === undefined ? null : round(cache / records.found),
    handlerCpuMsPerExchange: records.handlerCpuMs ? round(records.handlerCpuMs.mean) : null,
    metricsSeconds: round(seconds, 1),
  };
}

/**
 * [DX-CARD2] Each profiled request's gateway time (the request record's start to end, `trace.clj` `handler`) for the
 * given read-profile ids, read from the reader's trace after `offset`. With the read profile on (the tuned reader)
 * every request carrying the header is recorded, not only those over 50 ms.
 */
export function gatewayTimes(file: string, offset: number, ids: readonly string[]) {
  const wanted = new Set(ids), size = fs.statSync(file).size, ms: number[] = [];
  const fd = fs.openSync(file, "r"), text = Buffer.alloc(Math.max(0, size - offset));
  try { fs.readSync(fd, text, 0, text.length, offset); } finally { fs.closeSync(fd); }
  for (const line of text.toString("utf8").split("\n")) {
    if (!line.startsWith("{") || !line.includes("readProfileId")) continue;
    let row: any;
    try { row = JSON.parse(line); } catch { continue; }
    if (row.type === "request" && wanted.has(row.readProfileId) && Number.isFinite(row.start) && Number.isFinite(row.end)) ms.push(row.end - row.start);
  }
  ms.sort((a, b) => a - b);
  const at = (q: number) => ms.length ? Number(ms[Math.min(ms.length - 1, Math.ceil(q * ms.length) - 1)]!.toFixed(3)) : null;
  return { requested: ids.length, found: ms.length, p50Ms: at(0.5), p90Ms: at(0.9), p99Ms: at(0.99), maxMs: ms.length ? Number(ms.at(-1)!.toFixed(3)) : null };
}

// [DX-SRV2] The card's two rows for the split read bar and the per-step table behind them. "P1 in memory" judges the
// re-read line's in-memory reads at its 256-seat step (the toy's largest step), bar p99 ≤ 100 ms; "P1 not in memory"
// judges the random line's not-in-memory reads, bar p99 ≤ 300 ms with 100 ms the aim. The other two cells (misses in
// the re-read line, hits in the random line) are printed and not judged. A step whose sampled reads were not all found
// in the reader's trace is not judged.
export const splitBars = {
  inMemory: "Re-read subjects at 256 readers, each read classed by its exchange's io-stats: exchanges that fetched nothing from storage. Read p99 ≤ 100 ms and zero wrong reads (the read bar of 2026-11-25 for a subject in memory).",
  notInMemory: "Random subjects at 256 readers, each read classed by its exchange's io-stats: exchanges that fetched at least one segment from storage. Read p99 ≤ 300 ms (aim 100 ms) and zero wrong reads (the read bar of 2026-11-25 for a subject not in memory).",
};
type Step = { seats: number; errors: number; read: { count: number }; classified?: Classified | { error: string } };
type Line = { seats: number; wrong: number; errors: number; read: { count: number }; classified?: (Classified & { readerStorageGets?: number | null }) | { error: string } };
const ms = (x: number | null | undefined) => x === null || x === undefined ? "—" : String(Number(x.toFixed(2)));
const cell = (p: Population) => `${p.reads} reads in ${p.exchanges} exchanges (${p.share === null ? "—" : (p.share * 100).toFixed(1) + "%"}), p50 ${ms(p.read.p50Ms)} ms, p99 ${ms(p.read.p99Ms)} ms; permit wait p50/p99 ${ms(p.admissionWait.p50Ms)}/${ms(p.admissionWait.p99Ms)} ms, admitted work ${ms(p.admittedWork.p50Ms)}/${ms(p.admittedWork.p99Ms)} ms; storage reads per subject ${ms(p.storageReadsPerSubject)}, SQL ${ms(p.sqlMsPerRead)} ms per read`;
export function splitReadRows(toy: boolean, steps: readonly Step[], line: Line | undefined) {
  const classed = (x: Step["classified"] | Line["classified"]): x is Classified => !!x && !("error" in x);
  if (!steps.some((s) => s.classified) && !line?.classified) return undefined;
  const judgedStep = toy ? [...steps].sort((a, b) => b.seats - a.seats)[0] : steps.find((s) => s.seats === 256);
  const verdict = (complete: boolean, wrong: number, p: Population | undefined, bar: number) =>
    toy ? "PARTIAL" : !complete || !p || !p.reads || p.read.p99Ms === null ? "NOT JUDGED" : wrong || p.read.p99Ms > bar ? "MISSED" : "MET";
  let inMemory: string[] | undefined, notInMemory: string[] | undefined;
  if (judgedStep?.classified) {
    const c = judgedStep.classified;
    inMemory = classed(c)
      ? [`L${judgedStep.seats} re-read: in memory ${cell(c.inMemory)}. Not in memory (not judged here): ${cell(c.notInMemory)}. Sampled ${c.sampledReads} of ${c.stepReads} reads (every ${c.every === 1 ? "exchange" : c.every + "th exchange"}), ${c.unmatched} not found in the reader's trace; ${judgedStep.errors} errors.`,
        verdict(c.unmatched === 0 && c.sampledReads > 0, judgedStep.errors, c.inMemory, 100), String(c.inMemory.reads)]
      : [`Not classified: ${c.error}.`, toy ? "PARTIAL" : "NOT JUDGED", "0"];
  }
  if (line?.classified) {
    const c = line.classified;
    notInMemory = classed(c)
      ? [`L${line.seats} random: not in memory ${cell(c.notInMemory)}. In memory (not judged here): ${cell(c.inMemory)}. Sampled ${c.sampledReads} of ${c.stepReads} reads, ${c.unmatched} not found in the trace; ${line.wrong} wrong, ${line.errors} errors. Storage reads in sampled exchanges ${c.storageReadsSampled}, reader StorageGet count over the line ${c.readerStorageGets ?? "not recorded"}${c.readerStorageGets ? ` (difference ${((1 - c.storageReadsSampled / c.readerStorageGets) * 100).toFixed(1)}%: Datomic's read-ahead and other requests)` : ""}.`,
        verdict(c.unmatched === 0 && c.sampledReads > 0, line.wrong + line.errors, c.notInMemory, 300), String(c.notInMemory.reads)]
      : [`Not classified: ${c.error}.`, toy ? "PARTIAL" : "NOT JUDGED", "0"];
  }
  const table = ["## Reads by where the subject is", "",
    "Each sampled read takes the class of the exchange that answered it: **in memory** when the exchange's io-stats on the reader show no storage read (prefetch included), otherwise **not in memory**. Latency is from the client, per read; permit wait and admitted work are the reader's spans per exchange.", "",
    "| Step | Sampled / step reads | In memory: reads, p50 / p99 ms | Not in memory: reads, p50 / p99 ms | Storage reads per subject (not in memory) | Unmatched |",
    "| --- | ---: | --- | --- | ---: | ---: |",
    ...[...steps.map((s) => ["L" + s.seats + (s.seats === 1024 ? " (stress)" : ""), s.classified] as const),
      ...(line ? [["random L" + line.seats, line.classified] as const] : [])].map(([label, c]) =>
      classed(c) ? `| ${label} | ${c.sampledReads} / ${c.stepReads} | ${c.inMemory.reads}, ${ms(c.inMemory.read.p50Ms)} / ${ms(c.inMemory.read.p99Ms)} | ${c.notInMemory.reads}, ${ms(c.notInMemory.read.p50Ms)} / ${ms(c.notInMemory.read.p99Ms)} | ${ms(c.notInMemory.storageReadsPerSubject)} | ${c.unmatched} |`
        : `| ${label} | ${c ? "not classified: " + c.error : "not sampled"} | — | — | — | — |`), ""];
  return { inMemory, notInMemory, table };
}
