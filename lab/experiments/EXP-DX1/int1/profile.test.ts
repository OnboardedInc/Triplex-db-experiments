import assert from "node:assert/strict";
import test from "node:test";
import { deepShape } from "../../../bench/lib/deep-world.ts";
import { activePerson } from "./cohort.ts";
import { parseHistogram } from "./gateway-profile.ts";
import { mappedReaderPages } from "./reader.ts";

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
