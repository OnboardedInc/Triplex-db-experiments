// [DX-ACT8, fifth review Y9] The account's deadline calendar in bounded rows.
//
// The calendar holds the account's distinct future due instants (each `:file/expiresOn` day's end and each fact's end of
// validity after the cut, at its own microsecond). It was one row (`join-calendar`, a sorted list) rewritten whole by
// every write that changed it, so at 34,952 instants it reached the store's 1 MiB value and every later save on the
// account that added an instant was refused, whatever its subject.
//
// Now it is a B+ tree of rows, each bounded:
// - While it holds at most `calendarListMax` (256) instants the root row is today's sorted list, byte for byte.
// - Past that the root row is `{ parts: 1, level, min, next, kids }`: the first instant (`min`), a counter (`next`) and at
//   most `calendarFanout` (256) children `[low, tag]`, each the row `join-calendar-node:<tag>`. Inner nodes are
//   `{ level, next, kids }`; leaves (level 0) are sorted lists of at most `calendarLeafMax` (64) instants.
// - Child i > 0 holds instants at least its low and below child i + 1's low; child 0 holds everything below child 1's
//   low (its own low is not compared). An insert goes to the last child whose low is at most the instant, else child 0.
// - A new node is named by the node that adds it as a child: its tag is that node's tag (the root's is `r`), a dot and
//   that node's counter, which only grows while the node lives; the root's starts again only when the calendar is
//   empty, with no node row live. So no two live rows share a key, and a split rewrites only the rows it changes anyway.
//   (A key taken from an instant is not unique: a new first instant inserted below the first child's low can move that
//   low into a new right half; the random test Y9-1 found it.)
// - Instants leave only at the front (each due instant's tick removes the first one).
// - The root changes whenever the first instant changes (`min`), so a guard on the root row alone still sees every change
//   to the first due instant (the Publish's `EntityState` check, R5 of PUBLISH-BESIDE-SAVES.md section 3) and the
//   settings transition still fences by rewriting the root with its own value.
// - A save that adds an instant rewrites one leaf (at most 64 instants, 1.9 KB), and on a split the leaf's parent; it
//   reads the root, the inner nodes on the way and the leaf (three reads to about 4 million instants, four to about a
//   billion with half-full rows).
// Rejected: one row per month (a month of instants at their own microseconds is not bounded); a bound on distinct
// instants per account (a save would then be refused because of other subjects' instants).
import assert from "node:assert/strict";
import { canonical } from "../../../../bench/lib/w0-world.ts";
import type { Documents, Op, Row } from "../../notify1/store.ts";

export const calendarListMax = 256;
export const calendarLeafMax = 64;
export const calendarFanout = 256;
/** The row bounds; tests pass small ones to reach deep trees with few instants. */
export type CalendarShape = { listMax: number; leafMax: number; fanout: number };
export const calendarShape: CalendarShape = { listMax: calendarListMax, leafMax: calendarLeafMax, fanout: calendarFanout };
export const calendarRoot = "join-calendar";
export const calendarNode = (tag: string) => "join-calendar-node:" + tag;
type Kid = [low: string, tag: string];
export type CalendarParts = { parts: 1; level: number; min: string; next: number; kids: Kid[] };
export type CalendarRoot = string[] | CalendarParts;
type Inner = { level: number; next: number; kids: Kid[] };

/** The first due instant at `p` (one read: the root holds it in either form). */
export async function calendarMin(db: Documents, p: number): Promise<string | undefined> {
  const v = (await db.get<CalendarRoot>(calendarRoot, p)).value;
  return Array.isArray(v) ? v[0] : v.min;
}

/** The first index whose item is not below `x`. */
function lowerBound(xs: readonly string[], x: string) {
  let lo = 0,
    hi = xs.length;
  while (lo < hi) {
    const m = (lo + hi) >>> 1;
    if (xs[m]! < x) lo = m + 1;
    else hi = m;
  }
  return lo;
}
/** The child an instant belongs to: the last i > 0 whose low is at most `x`, else 0. */
function route(kids: readonly Kid[], x: string) {
  let lo = 1,
    hi = kids.length;
  while (lo < hi) {
    const m = (lo + hi) >>> 1;
    if (kids[m]![0] <= x) lo = m + 1;
    else hi = m;
  }
  return lo - 1;
}
/** `xs` in `ceil(n / max)` runs of near-equal length, each at most `max`. */
function chunk<T>(xs: readonly T[], max: number) {
  const k = Math.ceil(xs.length / max),
    out: T[][] = [];
  for (let i = 0; i < k; i++) out.push(xs.slice(Math.floor((i * xs.length) / k), Math.floor(((i + 1) * xs.length) / k)));
  return out;
}
const halves = <T>(xs: readonly T[]): [T[], T[]] => [xs.slice(0, Math.ceil(xs.length / 2)), xs.slice(Math.ceil(xs.length / 2))];
const insertAt = <T>(xs: readonly T[], i: number, x: T) => [...xs.slice(0, i), x, ...xs.slice(i)];

/** The rows for a sorted list of distinct instants: today's one list while it fits, else leaves, inner nodes and a
 * root, every node named by the root (`r.0`, `r.1`, ...). */
export function calendarLayout(sorted: readonly string[], shape = calendarShape): { root: CalendarRoot; nodes: [string, unknown][] } {
  for (let i = 1; i < sorted.length; i++) assert(sorted[i - 1]! < sorted[i]!, "Calendar instants must be sorted and distinct");
  if (sorted.length <= shape.listMax) return { root: [...sorted], nodes: [] };
  const nodes: [string, unknown][] = [];
  let next = 0;
  let kids: Kid[] = chunk(sorted, shape.leafMax).map((l) => {
    const tag = "r." + next++;
    nodes.push([calendarNode(tag), l]);
    return [l[0]!, tag];
  });
  let level = 0;
  while (kids.length > shape.fanout) {
    level++;
    kids = chunk(kids, shape.fanout).map((g) => {
      const tag = "r." + next++;
      nodes.push([calendarNode(tag), { level, next: 0, kids: g }]);
      return [g[0]![0], tag];
    });
  }
  return { root: { parts: 1, level: level + 1, min: sorted[0]!, next, kids }, nodes };
}
/** The enrolment's calendar rows (one `put` per row; a single list as before while it fits). */
export function calendarPuts(db: Documents, sorted: readonly string[]): Op[] {
  const { root, nodes } = calendarLayout(sorted);
  return [db.put(calendarRoot, root), ...nodes.map(([k, v]) => db.put(k, v))];
}

/**
 * One plan's calendar changes at position `p`: rows are read once (at `p`), changed in memory, and `ops()` gives the
 * retractions and assertions of the rows that changed, the root first. Inside a whole-head save or tick every row read
 * is the same at the commit; a guarded Publish reads only the root (`calendarMin`).
 */
export class CalendarWork {
  private readonly read = new Map<string, Row<unknown> | undefined>();
  private readonly now = new Map<string, unknown>();
  private touched = false;
  readonly stats = { reads: 0, inserted: 0, removed: 0, splits: 0 };
  readonly db: Documents;
  readonly p: number;
  readonly shape: CalendarShape;
  constructor(db: Documents, p: number, shape = calendarShape) {
    this.db = db;
    this.p = p;
    this.shape = shape;
  }
  private async load<T>(k: string): Promise<T> {
    if (!this.now.has(k)) {
      const r = await this.db.row<T>(k, this.p);
      this.stats.reads++;
      this.read.set(k, r);
      this.now.set(k, r ? r.value : null);
    }
    const v = this.now.get(k);
    assert(v !== null && v !== undefined, "Missing durable " + k);
    return v as T;
  }
  private set(k: string, v: unknown) {
    if (!this.read.has(k)) this.read.set(k, undefined);
    this.now.set(k, v);
  }
  async root() {
    return this.load<CalendarRoot>(calendarRoot);
  }
  async min() {
    const r = await this.root();
    return Array.isArray(r) ? r[0] : r.min;
  }
  /** Rewrite the root with its own value even when nothing changed (`schedule` writes the calendar as before: the
   * release list's writers each write the tail or the calendar, R2 of PUBLISH-BESIDE-SAVES.md section 3). */
  async touchRoot() {
    await this.root();
    this.touched = true;
  }
  /** Add one instant; false when it is already there. */
  async insert(x: string) {
    const root = await this.root();
    if (Array.isArray(root)) {
      const i = lowerBound(root, x);
      if (root[i] === x) return false;
      const next = insertAt(root, i, x);
      this.stats.inserted++;
      if (next.length <= this.shape.listMax) {
        this.set(calendarRoot, next);
        return true;
      }
      const laid = calendarLayout(next, this.shape);
      for (const [k, v] of laid.nodes) this.set(k, v);
      this.set(calendarRoot, laid.root);
      this.stats.splits++;
      return true;
    }
    // Down to the leaf, keeping each node on the way with its key, tag and the child taken.
    const path: { key: string; tag: string; value: Inner | CalendarParts; i: number }[] = [];
    let key = calendarRoot,
      tag = "r",
      value: Inner | CalendarParts = root;
    for (;;) {
      const i = route(value.kids, x);
      path.push({ key, tag, value, i });
      if (value.level === 1) break;
      const level = value.level;
      tag = value.kids[i]![1];
      key = calendarNode(tag);
      value = await this.load<Inner>(key);
      assert(!Array.isArray(value) && value.level === level - 1, "Calendar node out of place");
    }
    const last = path.length - 1,
      leafKey = calendarNode(path[last]!.value.kids[path[last]!.i]![1]),
      leaf = await this.load<string[]>(leafKey);
    assert(Array.isArray(leaf), "Calendar leaf out of place");
    const j = lowerBound(leaf, x);
    if (leaf[j] === x) return false;
    this.stats.inserted++;
    const items = insertAt(leaf, j, x);
    // Each node on the path as it will be written: its children and its counter.
    const kids = path.map((n) => n.value.kids),
      counters = path.map((n) => n.value.next);
    const name = (d: number) => path[d]!.tag + "." + counters[d]!++;
    if (items.length > this.shape.leafMax) {
      const [a, b] = halves(items),
        t = name(last);
      this.set(leafKey, a);
      this.set(calendarNode(t), b);
      kids[last] = insertAt(kids[last]!, path[last]!.i + 1, [b[0]!, t]);
      this.stats.splits++;
    } else this.set(leafKey, items);
    for (let d = last; d > 0; d--) {
      const { key: k, value: v } = path[d]!;
      if (kids[d]!.length > this.shape.fanout) {
        const [a, b] = halves(kids[d]!),
          t = name(d - 1);
        this.set(k, { level: v.level, next: counters[d], kids: a });
        this.set(calendarNode(t), { level: v.level, next: 0, kids: b });
        kids[d - 1] = insertAt(kids[d - 1]!, path[d - 1]!.i + 1, [b[0]![0], t]);
        this.stats.splits++;
      } else if (kids[d] !== v.kids || counters[d] !== v.next) this.set(k, { level: v.level, next: counters[d], kids: kids[d] });
    }
    const min = x < root.min ? x : root.min;
    let top: CalendarParts;
    if (kids[0]!.length > this.shape.fanout) {
      const [a, b] = halves(kids[0]!),
        ta = name(0),
        tb = name(0);
      this.set(calendarNode(ta), { level: root.level, next: 0, kids: a });
      this.set(calendarNode(tb), { level: root.level, next: 0, kids: b });
      top = { parts: 1, level: root.level + 1, min, next: counters[0]!, kids: [[a[0]![0], ta], [b[0]![0], tb]] };
      this.stats.splits++;
    } else top = { parts: 1, level: root.level, min, next: counters[0]!, kids: kids[0]! };
    if (kids[0] !== root.kids || min !== root.min || counters[0] !== root.next) this.set(calendarRoot, top);
    return true;
  }
  /** Remove and return the first instant (a due instant's tick). */
  async removeMin() {
    const root = await this.root();
    this.stats.removed++;
    if (Array.isArray(root)) {
      assert(root.length > 0, "Empty calendar");
      this.set(calendarRoot, root.slice(1));
      return root[0]!;
    }
    const path: { key: string; value: Inner | CalendarParts }[] = [];
    let key = calendarRoot,
      value: Inner | CalendarParts = root;
    for (;;) {
      path.push({ key, value });
      if (value.level === 1) break;
      key = calendarNode(value.kids[0]![1]);
      value = await this.load<Inner>(key);
    }
    const leafKey = calendarNode(value.kids[0]![1]),
      leaf = await this.load<string[]>(leafKey),
      due = leaf[0]!;
    assert(due === root.min, "Calendar minimum out of step");
    let emptied = leaf.length === 1;
    this.set(leafKey, emptied ? null : leaf.slice(1));
    let next: CalendarParts | null = root;
    for (let d = path.length - 1; d >= 0 && emptied; d--) {
      const { key: k, value: v } = path[d]!,
        kids = v.kids.slice(1);
      if (d > 0) {
        emptied = kids.length === 0;
        this.set(k, emptied ? null : { level: v.level, next: v.next, kids });
      } else {
        emptied = false;
        next = kids.length ? { ...root, kids } : null;
      }
    }
    if (!next) {
      this.set(calendarRoot, []);
      return due;
    }
    // The new first instant: down the first children of what is left.
    let v: Inner | CalendarParts = next;
    while (v.level > 1) v = await this.load<Inner>(calendarNode(v.kids[0]![1]));
    const first = await this.load<string[]>(calendarNode(v.kids[0]![1]));
    this.set(calendarRoot, { ...next, min: first[0]! });
    return due;
  }
  /** The plan's operations: for each row that changed, its retraction (if it was stored) and new assertion, or its
   * retraction alone when it emptied. The root comes first, as the one row did before. */
  ops(): Op[] {
    const out: Op[] = [];
    for (const [k, v] of this.now) {
      const r = this.read.get(k);
      if (v === null) {
        if (r) out.push({ op: "retract", id: r.id });
      } else if (!r || canonical(v) !== canonical(r.value) || (k === calendarRoot && this.touched))
        out.push(...this.db.change(k, r, v));
    }
    return out;
  }
  /** Every instant in order, with the rows walked (a test and diagnostic read; reads the whole calendar). */
  async all() {
    const root = await this.root();
    if (Array.isArray(root)) return { instants: [...root], rows: 1, depth: 0 };
    const out: string[] = [];
    const tags = new Set<string>();
    const walk = async (n: Inner | CalendarParts, below: string | undefined): Promise<void> => {
      for (let i = 0; i < n.kids.length; i++) {
        const [low, tag] = n.kids[i]!,
          upper = i + 1 < n.kids.length ? n.kids[i + 1]![0] : below;
        assert(!tags.has(tag), "A node listed twice");
        tags.add(tag);
        const start = out.length;
        if (n.level === 1) {
          const leaf = await this.load<string[]>(calendarNode(tag));
          assert(Array.isArray(leaf) && leaf.length > 0 && leaf.length <= this.shape.leafMax, "Calendar leaf out of bounds");
          out.push(...leaf);
        } else {
          const c = await this.load<Inner>(calendarNode(tag));
          assert(c.level === n.level - 1 && c.kids.length > 0 && c.kids.length <= this.shape.fanout, "Calendar node out of bounds");
          await walk(c, upper);
        }
        // Child i > 0 starts at its low; every child ends below the next low.
        if (i > 0) assert(out[start]! >= low, "Calendar child below its low");
        if (upper !== undefined) assert(out.at(-1)! < upper, "Calendar child past the next low");
      }
    };
    await walk(root, undefined);
    return { instants: out, rows: 1 + tags.size, depth: root.level };
  }
}
