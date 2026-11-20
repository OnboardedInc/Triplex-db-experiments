import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { deepOwnFacts, deepPopulation, taskId } from "../../../../bench/lib/deep-world.ts";
import { ids, SEED_VALID_FROM, type Fact } from "../../../../bench/lib/world.ts";
import { seedOps } from "../../../../bench/lib/commands.ts";
import { Rng, seedOf } from "../../../../bench/lib/rng.ts";
import type { SnapshotData, Frame } from "../../load1/source.ts";

export const profile = "deep-field-decision/1";
export const density = [10000, 100000] as const;
export type Density = (typeof density)[number];
export type Layout = "pooled" | "split5";
export const rates = [35, 50, 235, 394] as const;
export const accounts = Array.from({ length: 10 }, (_, i) => i);
export const quiet = 0;
export const quietRate = 3.5;
export const seconds = 90;
export const readers = 64;
export const readFromMs = 15000;
export const readForMs = 60000;
export const maxInflight = 12;
export const expiryMs = 30000;
export const width = 2000;
export const loaderDepth = 2;
export const sampleEvery = 100;
export const cells = ["alone", ...rates] as const;
export type Cell = (typeof cells)[number];
export const field = (i: number) => ":task/field-" + i;
export const sha = (x: unknown) => createHash("sha256").update(JSON.stringify(x)).digest("hex");
export const keyFor = (a: number) => "account-" + String(a + 1).padStart(3, "0");
const namespace = (a: number) => "acct/" + keyFor(a) + "/";
export const root = (a: number, i: number) => namespace(a) + ids.placement(i);
export const task = (a: number, i: number) => namespace(a) + taskId(i, 0);
export const layoutOf = (layout: Layout) =>
  layout === "pooled" ? [accounts] : [accounts.slice(0, 5), accounts.slice(5)];
export const factsFor = (people: Density) =>
  deepPopulation(people).facts + 2 * people + Math.ceil(people / 256) + 1;

export function person(a: number, local: number): Fact[] {
  const ns = namespace(a);
  const rows = deepOwnFacts(local).map(
    (f): Fact => ({
      e: ns + f.e,
      a: f.a,
      v: f.v.type === "ref" ? { type: "ref", value: ns + f.v.value } : f.v,
    }),
  );
  rows.push(
    { e: root(a, local), a: ":subject/account", v: { type: "string", value: keyFor(a) } },
    { e: root(a, local), a: ":subject/member", v: { type: "string", value: String(local) } },
  );
  if (!(local % 256))
    rows.push({
      e: ns + "page/" + local,
      a: ":tenant/shard",
      v: { type: "string", value: keyFor(a) },
    });
  if (!local)
    rows.push({
      e: ns + "directory",
      a: ":tenant/account",
      v: { type: "string", value: keyFor(a) },
    });
  return rows;
}

// [DX-SCALE1] Why: tenant-qualified deep rows and references have identical bytes in pooled and split destinations. Rejected: renumbering split accounts or making a smaller cache footprint by changing the fixture.
export function source(people: Density, roster: readonly number[], seedPin: string): SnapshotData {
  assert(
    roster.length > 0 &&
      roster.every((a) => accounts.includes(a)) &&
      new Set(roster).size === roster.length,
  );
  const groups = people * roster.length;
  return {
    groups,
    namespace: "acct/",
    validAt: SEED_VALID_FROM,
    seal: sha([profile, seedPin, people, roster, width]),
    *batches(first = 0): Generator<Frame, void> {
      assert(Number.isSafeInteger(first) && first >= 0 && first <= groups);
      let start = first;
      let rows: Fact[] = [];
      for (let i = first; i < groups; i++) {
        const next = person(roster[Math.floor(i / people)]!, i % people);
        assert(next.length <= width);
        if (rows.length && rows.length + next.length > width) {
          yield { first: start, end: i, operations: seedOps(rows) };
          rows = [];
          start = i;
        }
        rows.push(...next);
      }
      if (rows.length) yield { first: start, end: groups, operations: seedOps(rows) };
    },
  };
}

export function populationPins(people: Density) {
  const hashes = accounts.map((a) => {
    const h = createHash("sha256");
    let facts = 0;
    for (let i = 0; i < people; i++) {
      const rows = person(a, i);
      facts += rows.length;
      h.update(JSON.stringify(rows) + "\n");
    }
    assert.equal(facts, factsFor(people));
    return h.digest("hex");
  });
  return { people, factsPerAccount: factsFor(people), hashes, digest: sha(hashes) };
}

function roster(people: Density, a: number) {
  const rng = new Rng(seedOf(profile + "/roster/" + a + "/" + people));
  const selected = new Set<number>();
  while (selected.size < people / 50) selected.add(Math.floor(rng.next() * people));
  return [...selected];
}

function zipf(size: number) {
  const bounds: number[] = [];
  let total = 0;
  for (let k = 1; k <= size; k++) {
    total += 1 / k ** 1.1;
    bounds.push(total);
  }
  return (from: number) => {
    const needle = from * total;
    let low = 0;
    let high = bounds.length - 1;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (bounds[middle]! < needle) low = middle + 1;
      else high = middle;
    }
    return low;
  };
}

export type Write = {
  account: number;
  ordinal: number;
  subject: number;
  ms: number;
  width: number;
  version: string;
};
const preferred = new Map<Density, number[][]>();
export function activeSubjects(people: Density) {
  if (!preferred.has(people))
    preferred.set(
      people,
      accounts.map((a) => roster(people, a)),
    );
  return preferred.get(people)!;
}

function count(cell: Cell, account: number) {
  if (account === quiet) return quietRate * seconds;
  if (cell === "alone") return 0;
  const others = (cell - quietRate) * seconds;
  return Math.floor((others + 9 - account) / 9);
}

// [DX-SCALE1] Why: fixed per-account offers and jitter are independent of completions. The quiet account replays identical offsets, subjects and widths in each repeat. Rejected: changing its dose when the queue grows.
export function writeTape(people: Density, cell: Cell, repeat: number): Write[] {
  const subjects = activeSubjects(people),
    choose = zipf(people / 50);
  return accounts
    .flatMap((account) => {
      const n = count(cell, account);
      const rng = new Rng(seedOf(profile + "/offers/" + repeat + "/" + account));
      return Array.from({ length: n }, (_, ordinal) => {
        const r = rng.next(),
          w = rng.next();
        const index = rng.next() < 0.95 ? choose(r) : Math.floor(r * subjects[account]!.length);
        return {
          account,
          ordinal,
          subject: subjects[account]![index]!,
          ms: (1000 * seconds * (ordinal + rng.next())) / n,
          width: w < 0.8 ? 1 : w < 0.95 ? 2 : 3,
          version: repeat + "/" + cell + "/" + account + "/" + ordinal,
        };
      });
    })
    .sort((a, b) => a.ms - b.ms);
}

export type Read = { seat: number; ordinal: number; subject: number; ms: number };
export function readTape(people: Density, repeat: number): Read[] {
  const rng = new Rng(seedOf(profile + "/reads/" + repeat + "/" + people));
  return Array.from({ length: (readers * readForMs) / 1000 }, (_, ordinal) => ({
    seat: ordinal % readers,
    ordinal,
    subject: Math.floor(rng.next() * people),
    ms: readFromMs + (ordinal * 1000) / readers,
  }));
}

export const cellOrder = (repeat: number): Cell[] =>
  repeat === 0 ? [...cells] : ["alone", ...[...rates].reverse()];
export const cellKey = (cell: Cell, repeat: number) => "r" + repeat + "-" + cell;
export const workloadPins = (people: Density) =>
  Object.fromEntries(
    [0, 1].flatMap((r) => [
      ["read/" + r, sha(readTape(people, r))] as const,
      ...cells.map((c) => [cellKey(c, r), sha(writeTape(people, c, r))] as const),
    ]),
  );
