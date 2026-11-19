import assert from "node:assert/strict";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { Documents, hash } from "./store.ts";
export const width = 64;
export interface Census {
  id: string;
  count: number;
  members: string;
}
interface Page {
  members: string[];
  ordinal: number;
  census: string;
}
export async function installCensus(db: Documents, subjects: string[]) {
  assert(
    subjects.every((s, i) => W0.isPlacementId(s) && (!i || s > subjects[i - 1]!)),
    "Invalid source census",
  );
  const members = hash(subjects),
    id = hash([db.prefix, width, members]),
    census = { id, count: subjects.length, members };
  const pages: Page[] = [];
  for (let i = 0; i < subjects.length; i += width)
    pages.push({ ordinal: i, members: subjects.slice(i, i + width), census: id });
  const key = (p: Page) => "members:" + id + ":" + p.ordinal;
  for (let i = 0; i < pages.length; i += 32) {
    const part = pages.slice(i, i + 32);
    const ack = await db.commit(
      "census:" + id + ":" + i,
      part.map((p) => hash(p)),
      part.map((p) => db.put(key(p), p)),
      part.map((p) => db.guard(key(p), undefined)),
    );
    const saved = await db.rows<Page>(part.map(key), ack.position);
    for (const p of part) assert.deepEqual(saved.get(key(p))?.value, p);
  }
  const k = "census:" + id;
  await db.commit(k, census, [db.put(k, census)], [db.guard(k, undefined)]);
  return census;
}
export async function memberPage(db: Documents, c: Census, start: number, at: number) {
  assert(Number.isInteger(start) && start >= 0 && start <= c.count && start % width === 0);
  if (start === c.count) return [];
  const row = await db.get<Page>("members:" + c.id + ":" + start, at),
    p = row.value;
  assert(
    p.census === c.id &&
      p.ordinal === start &&
      p.members.length === Math.min(width, c.count - start),
  );
  return p.members;
}
