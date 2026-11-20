import assert from "node:assert/strict";
import test from "node:test";
import { deepShape } from "../../../bench/lib/deep-world.ts";
import { activePerson } from "./cohort.ts";
import { nativePools, parseHistogram } from "./gateway-profile.ts";
import { mappedReaderPages } from "./reader.ts";
import { heapResidency, readResidentMappings } from "../thin1/heap-residency.ts";

test("JVM residency separates the heap from native anonymous and file pages", () => {
  const raw = [
    "1000-2000 rw-p 0000 00:00 0\nRss: 4 kB\nAnonymous: 4 kB",
    "2000-4000 rw-p 0000 00:00 0\nRss: 8 kB\nAnonymous: 8 kB",
    "4000-5000 rw-p 0000 00:00 0\nRss: 4 kB\nAnonymous: 4 kB",
    "6000-7000 r-xp 0000 00:00 0 /fixture\nRss: 4 kB\nAnonymous: 0 kB",
  ].join("\n");
  const rows = readResidentMappings(raw);
  const wanted = { javaHeap: 12 * 1024, otherAnonymous: 4096, otherNonAnonymous: 4096, mixed: 0 };
  const g1 = " garbage-first heap total 12K, used 10K [0x1000, 0x4000)";
  const serial = " def new generation total 4K [0x1000, 0x2000, 0x2000)\n tenured generation total 8K [0x2000, 0x4000, 0x4000)";
  assert.deepEqual(heapResidency(g1, rows), wanted);
  assert.deepEqual(heapResidency(serial, rows), wanted);
  assert.equal(heapResidency(g1.replace("0x4000", "0x3000"), rows).mixed, 8192);
  assert.throws(() => readResidentMappings(raw.replace("Rss: 8 kB", "")));
  assert.throws(() => heapResidency(g1, [...rows].reverse()));
});

test("resident page attribution counts every mapping once without retaining its name", () => {
  const section = (range: string, mode: string, name: string, kb: number) =>
    `${range} ${mode} 0000 00:00 0 ${name}\nRss: ${kb} kB\nPss: 1 kB\nPrivate_Dirty: 0 kB\nAnonymous: 0 kB`;
  const sample = [section("a0-b0", "rw-p", "", 4), section("b0-c0", "r-xp", "/lib/fixture", 2), section("c0-d0", "rw-p", "[heap]", 1)].join("\n");
  const p = mappedReaderPages(sample);
  assert.deepEqual([p.mappings, p.rss.anonymousData, p.rss.fileCode, p.rss.heap, p.Pss], [3, 4096, 2048, 1024, 3072]);
  assert(!JSON.stringify(p).includes("fixture"));
  assert.throws(() => mappedReaderPages(sample.replace("Rss: 2 kB", "")));
  assert.throws(() => mappedReaderPages(sample.replace("Pss: 1 kB", "Pss: 1 kB\nPss: 0 kB")));
});

test("the two-percent cold sample includes every deep task class and exact membership", () => {
  const census = (people: number) =>
    Array.from({ length: Math.ceil(people / 50) }, (_, n) => activePerson(n, people, true));
  const people = census(10_000);
  assert.equal(new Set(people).size, 200);
  assert.deepEqual(
    [...new Set(people.map((i) => deepShape(i).tasks))].sort((a, b) => a - b),
    [4, 5, 10, 11, 34],
  );
  assert.equal(people.filter((i) => deepShape(i).tasks === 34).length, 2);
  assert(census(103).every((id, n) => id < 103 && Math.floor(id / 50) === n));
});

test("a live histogram requires every ordinal and both totals", () => {
  const raw = "9:\n 1:  4 64 [B\n 2: 1 8 xyz\nTotal 5 72\n";
  assert.equal(parseHistogram(raw).bytes, 72);
  for (const bad of [
    raw.replace("2:", "3:"),
    raw.replace("Total 5", "Total 4"),
    raw.replace(" 72", " 64"),
    raw.replace("Total", "Partial"),
  ])
    assert.throws(() => parseHistogram(bad));
});

test("native tracking binds its pool counters to the sampled JVM", () => {
  const raw = [
    "9:",
    "Total: reserved=2048KB, committed=768KB",
    "- Java Heap (reserved=1024KB, committed=512KB)",
    "- GC (reserved=128KB, committed=96KB)",
    "- Thread (reserved=128KB, committed=80KB)",
    "- Metaspace (reserved=128KB, committed=64KB)",
  ].join("\n");
  assert.equal(nativePools(raw, 9).pools["Java Heap"]?.committed, 512 * 1024);
  assert.throws(() => nativePools(raw, 10));
  assert.throws(() => nativePools(raw.replace("GC (", "missing ("), 9));
});
