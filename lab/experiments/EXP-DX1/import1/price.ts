import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { measureHttp } from "../../../bench/lib/http-counts.ts";
import { openNative } from "./native.ts";
import { ImportRun, pace } from "./lane.ts";
import { fileSource, bytes, type Group, type Assertion } from "./source.ts";
const root = process.argv[2]!,
  n = Number(process.argv[3] ?? 40);
assert(Number.isSafeInteger(n) && n > 0);
mkdirSync(root);
const id = randomUUID(),
  out = [];
for (const mode of ["snapshot", "history"] as const) {
  const groups: Group[] = [],
    start = performance.now();
  const row = (i: number, j: number, version: number, from: number): Assertion => ({
    op: "assert",
    ref: [i, j, version].join("/"),
    entityId: "p-" + i,
    attribute: ":f" + j,
    value: { type: "integer", value: String(10 * i + j + version) },
    validFrom: from,
  });
  for (let i = 0; i < n; i++) {
    if (mode === "history") {
      groups.push({
        ordinal: groups.length,
        id: "birth-" + i,
        instant: 1000 + i,
        ops: Array.from({ length: 4 }, (_, j) => row(i, j, 0, 0)),
      });
      groups.push({
        ordinal: groups.length,
        id: "edit-" + i,
        instant: 2000 + i,
        ops: [0, 1].flatMap((j) => [
          { op: "retract" as const, target: row(i, j, 0, 0).ref },
          row(i, j, 1, 100),
        ]),
      });
    } else
      groups.push({
        ordinal: i,
        id: "snapshot-" + i,
        ops: Array.from({ length: 4 }, (_, j) => row(i, j, Number(j < 2), 250)),
      });
  }
  const file = join(root, mode + ".export"),
    meta = {
      source: "paired-population",
      generation: id,
      mode,
      groups: groups.length,
      validAt: 250,
    };
  const source = fileSource(file, meta, groups),
    prepMs = performance.now() - start;
  const scope = "import-" + (mode === "history" ? "history" : "live") + "-" + id,
    t = await openNative(scope, mode);
  let sentBytes = 0;
  const proxy = {
    ...t,
    write: (ops: any[], m: Record<string, unknown>, time?: number) => {
      sentBytes += Buffer.byteLength(bytes([ops, m]));
      return t.write(ops, m, time);
    },
  };
  const cursor = join(root, mode + ".cursor"),
    r = await ImportRun.open(proxy, source, pace(128, 1), cursor);
  let entries;
  let wallMs;
  let cpuMs;
  let requests;
  try {
    sentBytes = 0;
    const u = process.cpuUsage(),
      timed = await measureHttp(async () => {
        while (await r.step()) {}
      });
    wallMs = timed.wallMs;
    requests = timed.requests;
    const v = process.cpuUsage(u);
    cpuMs = (v.user + v.system) / 1000;
    entries = [...r.entries()];
  } finally {
    r.close();
    await t.close();
  }
  const reopened = await openNative(scope, mode);
  let feedCount = 0,
    feedFacts = 0;
  try {
    let pos = entries[0]!.position - 1;
    for (const e of entries) {
      const p = await reopened.feedPage(pos, 1),
        rec = p.transactions[0];
      assert(
        rec &&
          rec.position === e.position &&
          rec.txId === e.txId &&
          rec.correlationId === e.digest &&
          rec.changes.length === e.facts,
      );
      feedFacts += rec.changes.length;
      feedCount++;
      pos = rec.position;
    }
    for (let i = 0; i < n; i++) {
      const p = await reopened.pull("p-" + i, { validAt: 250, recordedAt: 1e15 });
      assert.deepEqual(
        p.triples.map((a) => [a.attribute, a.value.value]).sort(),
        Array.from({ length: 4 }, (_, j) => [":f" + j, String(10 * i + j + Number(j < 2))]),
      );
    }
  } finally {
    await reopened.close();
    source.close();
  }
  out.push({
    mode,
    scope,
    source: source.header,
    sourceBytes: statSync(file).size,
    cursorBytes: statSync(cursor).size,
    currentFacts: 4 * n,
    sourceChanges: feedFacts,
    sourceGroups: groups.length,
    frames: feedCount,
    sentBytes,
    cpuMs,
    commitMs: entries.reduce((a, b) => a + b.serviceMs, 0),
    wallMs,
    prepMs,
    requests,
  });
}
writeFileSync(join(root, "price.json"), bytes({ id, n, arms: out }), { flag: "wx" });
console.log(bytes(out));
