import assert from "node:assert/strict";
import fs from "node:fs";

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
export type P1Reader = { batch: number; random?: { seats: number; profileEvery: number; trace?: string } };
export function p1Reader(reader: CardReader | undefined, toy: boolean, trace?: string): P1Reader | undefined {
  if (!reader) return undefined;
  return { batch: tunedBatch, random: { seats: toy ? randomLine.toySeats : randomLine.seats, profileEvery: randomLine.profileEvery,
    ...(trace ? { trace } : {}) } };
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
