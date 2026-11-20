import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  RecentReads,
  packEntity,
  type PackedEntity,
} from "../../../../packages/datomic/dist/index.js";
import { EntityId } from "../../../../packages/core/dist/index.js";
import { generateTrace, traceDigest } from "../../../bench/lib/trace.ts";
import { V3_OFFER_SECONDS } from "../../../bench/lib/phases.ts";

const [mibArg, kibArg = "24"] = process.argv.slice(2);
const mib = Number(mibArg),
  kib = Number(kibArg),
  subjects = 10_000;
assert([64, 192, 512].includes(mib) && Number.isSafeInteger(kib) && kib >= 1 && kib <= 64);
const inputs = generateTrace({ seed: "ns-v2", subjects, durationS: V3_OFFER_SECONDS }).filter(
  (e) => !e.resend && e.atMs < V3_OFFER_SECONDS * 1000,
);
const ids = Array.from({ length: subjects }, (_, i) => EntityId.make(`rd1-${i}`));
const index = new RecentReads(20_000, mib * 1024 ** 2, true, "closure");
const tail = "x".repeat(kib * 1024);
const touched = new Set<number>();
const current = new Map<string, PackedEntity>();
const expectedPositions: number[][] = Array.from({ length: subjects }, () => [1]);
const times = [0, 1];
const t0 = 100_000_000;

// [DX-RD1] Why: preserve the trace's actual subjects and arrival order while varying only real packed retention bytes.
// Rejected: scaling replica budget counters with fake lengths, or interpreting a small native scope as the 10k working set.
const make = (id: string, position: number) =>
  packEntity(position, [
    {
      id: `${id}-${position}`,
      entityId: id,
      position,
      attribute: ":rd1/payload",
      value: { type: "string", value: position === 1 ? "initial" : `${position}|${tail}` },
      validFrom: 0,
      publicMetadata: {
        recordedAt: t0 + (times[position] ?? 1),
        createdBy: null,
        entityType: null,
        schemaVersion: null,
        txId: null,
      },
    },
  ]);
const initial = ids.map((id) => {
  const entity = make(id, 1);
  current.set(id, entity);
  return [id, undefined, entity] as const;
});
const basePackedBytes = initial.reduce((s, [, , entry]) => s + entry.byteLength, 0);
index.apply({
  position: 1,
  recordTime: t0 + 1,
  clockEnd: 1,
  valid: true,
  reset: true,
  changes: initial,
});
let highBytes = 0;
for (const [i, e] of inputs.entries()) {
  const position = i + 2,
    id = ids[e.subject]!;
  // Preserve strict ordering even if two input clock values occur in the same sub-millisecond band.
  const at = Math.max(e.atMs + 2, times[position - 1]! + 0.0001);
  times.push(at);
  const next = make(id, position);
  index.apply({
    position,
    recordTime: t0 + at,
    clockEnd: position,
    valid: true,
    changes: [[id, current.get(id), next]],
  });
  current.set(id, next);
  expectedPositions[e.subject]!.push(position);
  touched.add(e.subject);
  highBytes = Math.max(highBytes, index.historyBytes);
}
const head = index.position,
  last = times[head]!;
const atOrBefore = (ordered: readonly number[], value: number) => {
  let lo = 0,
    hi = ordered.length;
  while (lo < hi) {
    const m = (lo + hi) >>> 1;
    if (ordered[m]! <= value) lo = m + 1;
    else hi = m;
  }
  return lo - 1;
};
const routes = (positions: readonly number[]) => {
  let local = 0,
    noClock = 0,
    missingVersion = 0;
  for (const [i, p] of positions.entries()) {
    const n = (i * 541 + 63) % subjects,
      id = ids[n]!,
      history = expectedPositions[n]!;
    const basis = { recordedAt: t0 + times[p]!, validAt: 100 };
    if (index.resolve(basis) === undefined) {
      noClock++;
      continue;
    }
    const outcome = index.pull(id, basis);
    if (!outcome) {
      missingVersion++;
      continue;
    }
    const want = history[atOrBefore(history, p)]!;
    assert.equal(outcome.rows.length, 1);
    assert.equal(outcome.rows[0]!.id, `${id}-${want}`);
    assert.equal(outcome.rows[0]!.value.value, want === 1 ? "initial" : `${want}|${tail}`);
    local++;
  }
  return {
    requested: positions.length,
    local,
    noClock,
    missingVersion,
    fallbackShare: (noClock + missingVersion) / positions.length,
  };
};
const byAge = Object.fromEntries(
  [0, 1, 10, 60, 180, 300, 480, 600, 1200, 2400, 3600].map((age) => {
    const position = Math.max(1, atOrBefore(times, last - age * 1000));
    return [
      age,
      {
        position,
        ageSeconds: (last - times[position]!) / 1000,
        ...routes(Array.from({ length: subjects }, () => position)),
      },
    ];
  }),
);
const recent = Array.from({ length: subjects }, (_, i) => head - ((i * 619) % 2_000));
const last2000Mix = routes(recent);
console.log(
  JSON.stringify(
    {
      diagnostic: "frozen thin offer times and subjects, synthetic packed replacements",
      source: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
      driverSha256: createHash("sha256")
        .update(await import("node:fs").then((fs) => fs.readFileSync(import.meta.filename)))
        .digest("hex"),
      offerDigest: traceDigest(inputs),
      subjects,
      touched: touched.size,
      untouched: subjects - touched.size,
      primaries: inputs.length,
      mib,
      kib,
      head,
      floor: index.floor,
      retainedBytes: index.historyBytes,
      highBytes,
      basePackedBytes,
      historyBytesPerTouched: index.historyBytes / touched.size,
      historyBytesPerUntouched: 0,
      estimatedFrozenMixFallbackShare: 0.15 * last2000Mix.fallbackShare,
      last2000Mix,
      byAge,
    },
    null,
    2,
  ),
);
