// @ts-nocheck -- [EXP-CHECKJS-R2] unannotated local values; unannotated dynamic parameters; unannotated destructured parameters; initially empty collections; dynamic record keys; runtime-validated optional values. Binding errors remain checked by lab/bin/checkjs.mjs.
// EXP-X05 shared pieces: the client, the basis-token codec, the deterministic data model, the frozen
// trace segment and the oracle. Imported by driver.mjs (main thread) and reader-worker.mjs.
//
// [EXP-X05] Why a minimal driver instead of EXP-N01's: N01 reads through Triplex's public composition,
// which has one engine endpoint; routing its reads to a follower would need a read-routing seam in
// packages/xtdb/src/XtdbStorageAdapter.ts, which EXP-P2X owns. This driver follows TARGETS 1.1 P1
// items 1, 2, 4 and 5 on raw pgwire with R16's command and pull shapes, so the numbers compare with R16.
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { MAIN } from '../../bin/lib.mjs';

// postgres.js comes from the main checkout's packages/xtdb (lab worktrees have no node_modules); the
// receipt records its version and resolved file.
const requireFromXtdb = createRequire(path.join(MAIN, 'packages/xtdb/package.json'));
export const postgres = requireFromXtdb('postgres');
export const POSTGRES_ENTRY = requireFromXtdb.resolve('postgres');

/**
 * One connection. Timestamps stay raw text: XTDB system times have microsecond precision and a JS Date
 * would truncate them to milliseconds, which would make the driver-built basis token wrong.
 * fetch_types off: 256 follower connections should not each query pg_catalog at startup.
 */
export const connect = (url, extra = {}) => postgres(url, {
  max: 1, prepare: false, fetch_types: false, onnotice: () => {}, idle_timeout: 0, connect_timeout: 30,
  types: { rawTime: { to: 1184, from: [1184, 1114], serialize: value => value, parse: value => value } },
  ...extra,
});
export const txt = (sql, v) => sql.typed(String(v), 25);
export const i8 = (sql, v) => sql.typed(Number(v), 20);

// ---------------------------------------------------------------- time and the basis token

/** Parse an ISO-ish timestamp with optional fraction and offset into epoch microseconds (BigInt), exactly. */
export function parseMicros(text) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}(?::?\d{2})?)?(?:\[[^\]]+\])?$/.exec(String(text).trim());
  if (!m) throw new Error(`unparsable timestamp ${JSON.stringify(text)}`);
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6]));
  const frac = (m[7] ?? '').padEnd(9, '0');
  if (!/^0{3}$/.test(frac.slice(6))) throw new Error(`sub-microsecond timestamp ${text}`);
  let offsetMin = 0;
  if (m[8] && m[8] !== 'Z') {
    const sign = m[8][0] === '-' ? -1 : 1;
    const digits = m[8].slice(1).replace(':', '');
    offsetMin = sign * (Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2) || 0));
  }
  return BigInt(ms) * 1000n + BigInt(frac.slice(0, 6)) - BigInt(offsetMin) * 60_000_000n;
}
/** Epoch microseconds to the literal used in CLOCK_TIME = TIMESTAMP '...'. */
export function microsIso(micros) {
  const ms = micros / 1000n, us = micros % 1000n;
  return new Date(Number(ms)).toISOString().replace('Z', `${String(us).padStart(3, '0')}Z`);
}

const varint = n => { const out = []; let v = BigInt(n); do { let b = Number(v & 0x7fn); v >>= 7n; if (v) b |= 0x80; out.push(b); } while (v); return out; };
const field = (number, bytes) => [...varint((number << 3) | 2), ...varint(bytes.length), ...bytes];
const fieldVarint = (number, n) => (BigInt(n) === 0n ? [] : [...varint(number << 3), ...varint(n)]);

/**
 * Encode XTDB's time-basis token (api/src/main/kotlin/xtdb/database/Basis.kt encodeTimeBasisToken,
 * proto TimeBasis{map<string,SystemTimes> databases=1}, SystemTimes{repeated Timestamp system_times=1})
 * for one database and one partition: the snapshot at system time `micros`.
 * [EXP-X05] Why build it: TARGETS 1.1 P1 item 4 wants the basis the driver requested, from the receipts
 * it observed. A token minted by SHOW SNAPSHOT_TOKEN names the node's latest completed tx, which can be
 * a later commit than the one the driver saw; this one names exactly commit k's system time. The smoke
 * check compares it byte for byte with SHOW SNAPSHOT_TOKEN on a quiet node (R19 open question 5).
 */
export function encodeSnapshotToken(micros, db = 'xtdb') {
  const seconds = micros / 1_000_000n, nanos = (micros % 1_000_000n) * 1000n;
  const timestamp = [...fieldVarint(1, seconds), ...fieldVarint(2, nanos)];
  const systemTimes = field(1, timestamp);
  const entry = [...field(1, [...Buffer.from(db)]), ...field(2, systemTimes)];
  return Buffer.from(field(1, entry)).toString('base64');
}
/** Decode a time-basis token into { db: [micros|null, ...] } (used by tests and the smoke check). */
export function decodeSnapshotToken(token) {
  const bytes = Buffer.from(token, 'base64');
  const read = (buf, start, end) => {
    const fields = [];
    let i = start;
    const rv = () => { let shift = 0n, v = 0n, b; do { b = buf[i++]; v |= BigInt(b & 0x7f) << shift; shift += 7n; } while (b & 0x80); return v; };
    while (i < end) {
      const tag = Number(rv()), num = tag >> 3, wire = tag & 7;
      if (wire === 0) fields.push({ num, value: rv() });
      else if (wire === 2) { const len = Number(rv()); fields.push({ num, start: i, end: i + len }); i += len; }
      else throw new Error(`unexpected wire type ${wire}`);
    }
    return fields;
  };
  const out = {};
  for (const entry of read(bytes, 0, bytes.length).filter(f => f.num === 1)) {
    const parts = read(bytes, entry.start, entry.end);
    const key = parts.find(p => p.num === 1), val = parts.find(p => p.num === 2);
    const db = bytes.subarray(key.start, key.end).toString();
    out[db] = read(bytes, val.start, val.end).filter(p => p.num === 1).map(ts => {
      const f = read(bytes, ts.start, ts.end);
      const s = f.find(p => p.num === 1)?.value ?? 0n, n = f.find(p => p.num === 2)?.value ?? 0n;
      return s === 0n && n === 0n ? null : s * 1_000_000n + n / 1000n;
    });
  }
  return out;
}

/**
 * R19 1.4 and 0.1 item 2: the follower read protocol is "await, then snapshot". AWAIT_TOKEN makes a
 * lagging follower wait for the commit; SNAPSHOT_TOKEN pins the system-time cut; CLOCK_TIME pins valid
 * time. A snapshot token alone fails fast with 0B000 on a lagging follower, and no token reads whatever
 * the follower has. Per transaction, never SET AWAIT_TOKEN (R19 2.3: session state a pooler cannot track).
 */
export const beginAt = basis => `BEGIN READ ONLY WITH (AWAIT_TOKEN = '${basis.awaitToken}', SNAPSHOT_TOKEN = '${basis.snapshotToken}', CLOCK_TIME = TIMESTAMP '${basis.clock}')`;

// ---------------------------------------------------------------- data model (R16 shapes, renamed x5_)

export const N_DEFAULT = 100_000;
export const pad = (n, w = 6) => String(n).padStart(w, '0');
export const sid = i => `s${pad(i)}`;
export const sidx = id => Number(id.slice(1));
export const REFS = 4;
export const FAN = 3;
export const HOPS = 3; // 1 + 3 + 9 + 27 = 40 entities in 4 queries: R16's bounded pull
export const ref = (i, k, n) => (i * 7919 + (k + 1) * 104729 + 1) % n;
export const INT_COLS = 8, STR_COLS = 8;
/** Entity columns are a pure function of (subject, pos), so a row whose columns disagree with its pos is a torn read. */
export const intVal = (i, pos, c) => (pos === 0 ? (i * (c + 3)) % 1000003 : (pos * 31 + c + i * 7) % 1000003);
export const strVal = (i, pos, c) => (pos === 0 ? `v${c}-${(i * (c + 1)) % 9973}` : `w${pos}-${c}-${i % 997}`);
/** Check the four sampled columns of a returned row against its pos; true when consistent. */
export const rowConsistent = (row, i, pos) => Number(row.a0) === intVal(i, pos, 0) && Number(row.a7) === intVal(i, pos, 7)
  && row.a8 === strVal(i, pos, 8) && row.a15 === strVal(i, pos, 15);

// ---------------------------------------------------------------- seeded randomness and the trace

export class Rng {
  constructor(seed) { const h = createHash('sha256').update(String(seed)).digest(); this.s = [h.readUInt32LE(0), h.readUInt32LE(4), h.readUInt32LE(8), h.readUInt32LE(12)]; }
  next() { // xoshiro128**
    const s = this.s, r = Math.imul(rotl(Math.imul(s[1], 5), 7), 9) >>> 0, t = s[1] << 9;
    s[2] ^= s[0]; s[3] ^= s[1]; s[1] ^= s[2]; s[0] ^= s[3]; s[2] ^= t; s[3] = rotl(s[3], 11);
    return r / 4294967296;
  }
  int(n) { return Math.floor(this.next() * n); }
}
const rotl = (x, k) => ((x << k) | (x >>> (32 - k))) >>> 0;

/**
 * One frozen trace segment (TARGETS 2 and 2.1, adapted): Poisson offers at `rate` commands/s for
 * `seconds`; 95% of commands pick from a seeded active set with Zipf s = 1.1, 5% uniformly; sizes from the
 * 60/30/10 band mix (5-10, 11-25, 26-50 facts). Every window replays the same segment, so writer latency
 * at each reader level is compared with the zero-reader run on the same commands at the same offsets
 * (TARGETS 1.1 P1 item 5, the matched-phase comparison). Rate is R19 E1's 40/s, not the fixed trace's
 * steady 1.1/s: at 1.1/s a 60 s window has 66 commits and no usable p99.
 */
export function traceSegment({ seed, rate, seconds, subjects, active, burst = false }) {
  const rng = new Rng(`${seed}|trace`);
  const order = new Rng(`${seed}|active`);
  const pool = Array.from({ length: subjects }, (_, i) => i);
  for (let i = 0; i < active; i++) { const j = i + order.int(subjects - i); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const activeSet = pool.slice(0, active);
  const weights = activeSet.map((_, rank) => 1 / (rank + 1) ** 1.1);
  const total = weights.reduce((a, b) => a + b, 0);
  const cdf = []; let acc = 0; for (const w of weights) cdf.push((acc += w) / total);
  const zipf = u => { let lo = 0, hi = cdf.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (cdf[mid] < u) lo = mid + 1; else hi = mid; } return activeSet[lo]; };
  const out = [];
  let at = 0;
  for (let seq = 0; ; seq++) {
    at += -Math.log(1 - rng.next()) / rate * 1000;
    if (at >= seconds * 1000) break;
    const subj = rng.next() < 0.95 ? zipf(rng.next()) : rng.int(subjects);
    const band = rng.next();
    const facts = burst ? 50 : band < 0.6 ? 5 + rng.int(6) : band < 0.9 ? 11 + rng.int(15) : 26 + rng.int(25);
    // Burst commands pad each ledger value so the transaction is 20 to 60 KB (R19 E1, 1.1 half-written record).
    const padBytes = burst ? 400 + rng.int(800) : 0;
    out.push({ seq, at: Math.round(at * 1000) / 1000, subj, facts, padBytes });
  }
  return out;
}
export const traceDigest = trace => createHash('sha256').update(JSON.stringify(trace)).digest('hex');

// ---------------------------------------------------------------- oracle

/**
 * Expected state at a basis, from the driver's own receipts only (TARGETS 1.1 P1 item 4): subject i at
 * system time T has the pos of its last commit with system time <= T, else 0 (the seed). Commits per
 * subject are serial (CAS), so a subject's receipts are in pos and time order.
 */
export class Oracle {
  constructor() { this.bySubject = new Map(); this.uncertain = new Map(); }
  add(i, pos, micros) {
    let list = this.bySubject.get(i);
    if (!list) this.bySubject.set(i, (list = []));
    if (list.length && list.at(-1).t >= micros) throw new Error(`oracle: subject ${i} commit times not increasing`);
    list.push({ t: micros, pos });
  }
  /** A commit whose outcome or system time is unknown makes the subject unverifiable from `afterMicros` on. */
  markUncertain(i, afterMicros) { if (!this.uncertain.has(i) || this.uncertain.get(i) > afterMicros) this.uncertain.set(i, afterMicros); }
  expected(i, micros) {
    const u = this.uncertain.get(i);
    if (u !== undefined && micros >= u) return null;
    const list = this.bySubject.get(i);
    if (!list) return 0;
    let lo = 0, hi = list.length - 1, found = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (list[mid].t <= micros) { found = mid; lo = mid + 1; } else hi = mid - 1; }
    return found < 0 ? 0 : list[found].pos;
  }
}

// ---------------------------------------------------------------- stats

export const quantile = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] : null);
export function summary(values) {
  if (!values.length) return { n: 0 };
  const s = Float64Array.from(values).sort();
  const r = v => (v == null ? null : Math.round(v * 100) / 100);
  return { n: s.length, p50: r(quantile(s, 0.5)), p90: r(quantile(s, 0.9)), p99: r(quantile(s, 0.99)), max: r(s[s.length - 1]), mean: r(s.reduce((a, b) => a + b, 0) / s.length) };
}
export const absNow = () => performance.timeOrigin + performance.now();
export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
