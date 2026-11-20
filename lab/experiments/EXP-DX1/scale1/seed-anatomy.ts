import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import type { DeepIdentity } from "../../../bench/lib/deep-profile.ts";
async function scan(file: string, visit: (row: any) => void, needle?: string) {
  if (!fs.existsSync(file)) return;
  for await (const line of createInterface({
    input: fs.createReadStream(file),
    crlfDelay: Infinity,
  }))
    if (line && (!needle || line.includes(needle))) visit(JSON.parse(line));
}
// [DX-SCALE1] Why: growth curves count consecutive acknowledged seed receipts, and serial storage reads come from Datomic's per-transaction tx-with context on the actual write gateway. Rejected: dividing background PostgreSQL or object-cache counters by an offered rate.
export async function seedAnatomy(dir: string, raw: string, id: DeepIdentity) {
  const rates: {
    at: number;
    subjects: number;
    position: number;
    facts: number;
    factsPerS?: number;
  }[] = [];
  await scan(path.join(raw, "seed-rate.jsonl"), (r) => {
    assert.deepEqual(r.identity, id);
    const prior = rates.at(-1);
    assert(!prior || (r.position > prior.position && r.facts > prior.facts && r.at >= prior.at));
    rates.push({
      at: r.at,
      position: r.position,
      subjects: r.subjects,
      facts: r.facts,
      ...(prior && r.at > prior.at
        ? { factsPerS: ((r.facts - prior.facts) * 1000) / (r.at - prior.at) }
        : {}),
    });
  });
  const acks: { position: number; at: number; facts: number }[] = [];
  await scan(path.join(raw, "seed-acks.jsonl"), (r) => {
    assert.deepEqual(r.identity, id);
    assert(r.position === acks.length + 1 && r.txId && r.facts > 0);
    acks.push({ position: r.position, at: r.at, facts: r.facts });
  });
  if (!acks.length) return { identity: id, observedSeedReceipts: 0, rates };
  const first = acks[0]!.at,
    last = acks.at(-1)!.at;
  const peak = { tx: 0, pg: 0 },
    io = { transactions: 0, sqlReadCount: 0, explicitSqlCounts: 0, missingIoMaps: 0 },
    seen = new Set<string>();
  const bins = new Map<
    number,
    {
      from: number;
      to: number;
      facts: number;
      acks: number;
      longestAckGapMs: number;
      sqlReadCount: number;
      ioMaps: number;
    }
  >();
  const bin = (at: number) => {
    const k = Math.floor((at - first) / 300000),
      r = bins.get(k) ?? {
        from: first + k * 300000,
        to: Math.min(last, first + (k + 1) * 300000),
        facts: 0,
        acks: 0,
        longestAckGapMs: 0,
        sqlReadCount: 0,
        ioMaps: 0,
      };
    bins.set(k, r);
    return r;
  };
  acks.forEach((a, i) => {
    const b = bin(a.at);
    b.acks++;
    b.facts += a.facts;
    if (i) b.longestAckGapMs = Math.max(b.longestAckGapMs, a.at - acks[i - 1]!.at);
  });
  await scan(path.join(dir, "resources.jsonl"), (r) => {
    assert.equal(r.prefix, id.slot);
    if (r.at >= first && r.at <= last) {
      peak.tx = Math.max(peak.tx, r.members.tx.current);
      peak.pg = Math.max(peak.pg, r.members.pg.current);
    }
  });
  const trace = path.join(dir, "engines", id.slot, "trace/raw"),
    adoptions: { start: number; end: number; wallMs: number }[] = [],
    indexJobs: unknown[] = [];
  await scan(path.join(trace, "tx.jsonl"), (r) => {
    assert(r.run === id.slot && r.slot === id.slot && r.source === id.source);
    if (r.type === "index-adoption" && r.start >= first && r.start <= last)
      adoptions.push({ start: r.start, end: r.end, wallMs: r.end - r.start });
    if (
      r.type === "metrics" &&
      r.at >= first &&
      r.at <= last &&
      r.counters?.indexJobMsec?.count > 0
    )
      indexJobs.push({ at: r.at, ...r.counters.indexJobMsec });
  });
  await scan(
    path.join(trace, "gw-w.jsonl"),
    (r) => {
      assert(r.run === id.slot && r.slot === id.slot && r.source === id.source);
      if (
        r.end < first ||
        r.end > last ||
        r.name !== "gateway /v1/db/{db}/transact" ||
        r.attributes?.status !== 200 ||
        !r.attributes?.datomicT
      )
        return;
      const t = String(r.attributes.datomicT);
      assert(!seen.has(t));
      seen.add(t);
      io.transactions++;
      const info = r.attributes.transactionIoStats;
      if (info?.api !== "tx-with" || !info.reads) {
        io.missingIoMaps++;
        return;
      }
      const reads = info.reads.sql ?? 0;
      assert(Number.isSafeInteger(reads) && reads >= 0);
      io.explicitSqlCounts += Number(Object.hasOwn(info.reads, "sql"));
      io.sqlReadCount += reads;
      const b = bin(r.end);
      b.sqlReadCount += reads;
      b.ioMaps++;
    },
    '"datomicT"',
  );
  const pauses = adoptions.map((a) => {
    let lo = 0,
      hi = acks.length;
    while (lo < hi) {
      const m = (lo + hi) >>> 1;
      if (acks[m]!.at < a.end) lo = m + 1;
      else hi = m;
    }
    return { ...a, previousAck: acks[lo - 1] ?? null, nextAck: acks[lo] ?? null };
  });
  const maps = io.transactions - io.missingIoMaps;
  return {
    identity: id,
    observedSeedReceipts: acks.length,
    firstAck: first,
    lastAck: last,
    peakCgroupBytes: peak,
    serialPoint: {
      ...io,
      sqlReadsPerCoveredCommit: maps ? io.sqlReadCount / maps : null,
      coveredCommits: maps,
    },
    indexJobs,
    indexAdoptions: pauses,
    windowMs: 300000,
    windows: [...bins.values()],
    rates,
  };
}
