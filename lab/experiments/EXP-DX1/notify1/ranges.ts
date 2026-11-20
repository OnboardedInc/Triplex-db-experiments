import assert from "node:assert/strict";
import { W0, canonical, factValue } from "../../../bench/lib/w0-world.ts";
import type { Event, Notices } from "./journal.ts";
import { hash, transportHash, unpack } from "./store.ts";

type Change = {
  op: "assert" | "retract";
  tripleId: string;
  entityId: string;
  attribute: string;
  value: unknown;
  validFrom: number;
  validTo?: number | null;
};
type Native = { position: number; txId: string; changes: Change[] };
export type Coverage = {
  parent: string;
  txId: string;
  edits: string;
  ids: string[];
  evaluated: number;
};
const wage = new Set([
  "location",
  "payRateCents",
  "jurisdiction",
  "localMinWageCents",
  "stateMinWageCents",
]);
const ms = (v: string) => Date.parse(v.slice(0, 19) + "Z") + Number(v.slice(20, 26)) / 1000;
const add = (sets: Map<string, Set<string>>, k: string, v: string) => {
  if (!k) return;
  const set = sets.get(k) ?? new Set<string>();
  set.add(v);
  sets.set(k, set);
};
const key = (x: Change) => canonical([x.entityId, x.attribute]);

type Posting = { value: number; subject: string };
// [DX-STG1] Why: use the same exclusive upper pay bound as DELTA's MINWAGE
// ranges, retaining people who stay below a different floor (payload changes).
// Rejected: taking only the threshold crossing or using an inclusive upper bound.
function below(rows: readonly Posting[], limit: number) {
  let low = 0,
    high = rows.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (rows[middle]!.value < limit) low = middle + 1;
    else high = middle;
  }
  return rows.slice(0, low).map((r) => r.subject);
}

class WageEdges {
  readonly fields = new Map<string, Map<string, Change>>();
  readonly subjects = new Map<string, Set<string>>();
  readonly locations = new Map<string, Set<string>>();
  readonly sorted = new Map<string, Posting[]>();
  valid: number;
  constructor(valid: number) {
    this.valid = valid;
  }
  value(e: string, a: string) {
    const slot = this.fields.get(canonical([e, a]));
    const live = [...(slot?.values() ?? [])].filter(
      (x) => x.validFrom <= this.valid && (x.validTo == null || x.validTo > this.valid),
    );
    assert(live.length <= 1, "Ambiguous ordered input");
    return live.length ? (factValue(live[0]!.value) as number | string) : undefined;
  }
  link(e: string, a: string) {
    const v = this.value(e, a);
    assert(v === undefined || typeof v === "string");
    return v ?? "";
  }
  apply(changes: readonly Change[]) {
    const edited = changes.filter((x) => wage.has(x.attribute));
    const places = new Set(
      edited
        .filter(
          (c) =>
            c.entityId.startsWith("pl:") &&
            (c.attribute === "location" || c.attribute === "payRateCents"),
        )
        .map((x) => x.entityId),
    );
    const links = new Set(
      edited.filter((c) => c.attribute === "jurisdiction").map((x) => x.entityId),
    );
    for (const s of places) {
      const location = this.link(s, "location");
      this.subjects.get(location)?.delete(s);
      this.sorted.delete(location);
    }
    for (const l of links) this.locations.get(this.link(l, "jurisdiction"))?.delete(l);
    for (const c of edited) {
      const k = key(c);
      const slot = this.fields.get(k) ?? new Map<string, Change>();
      if (c.op === "assert") slot.set(c.tripleId, c);
      else assert(slot.delete(c.tripleId), "Unbound retraction in ordered inputs");
      if (slot.size) this.fields.set(k, slot);
      else this.fields.delete(k);
    }
    for (const l of links) add(this.locations, this.link(l, "jurisdiction"), l);
    for (const s of places) {
      const location = this.link(s, "location");
      add(this.subjects, location, s);
      this.sorted.delete(location);
    }
  }
  shift(at: number) {
    if (at === this.valid) return;
    this.valid = at;
    this.subjects.clear();
    this.locations.clear();
    this.sorted.clear();
    for (const rows of this.fields.values()) {
      const x = rows.values().next().value!;
      if (x.attribute === "location")
        add(this.subjects, this.link(x.entityId, "location"), x.entityId);
      if (x.attribute === "jurisdiction")
        add(this.locations, this.link(x.entityId, "jurisdiction"), x.entityId);
    }
  }
  postings(location: string) {
    let sorted = this.sorted.get(location);
    if (!sorted) {
      sorted = [];
      for (const subject of this.subjects.get(location) ?? []) {
        const value = this.value(subject, "payRateCents");
        if (typeof value === "number") sorted.push({ subject, value });
      }
      sorted.sort((a, b) => a.value - b.value || W0.cmpCodePoints(a.subject, b.subject));
      this.sorted.set(location, sorted);
    }
    return sorted;
  }
  floor(policy: W0.CompiledRelease, l: string) {
    const j = this.link(l, "jurisdiction"),
      entry = policy.entries.MINWAGE;
    const p = j && entry.scope?.jurisdictions.has(j) ? entry.scope.params : entry.params;
    return Math.max(
      -1,
      ...p.floorSources.map((s) =>
        Number(
          s === "jurisdiction.stateMinWageCents"
            ? (this.value(j, "stateMinWageCents") ?? -1)
            : (this.value(l, "localMinWageCents") ?? -1),
        ),
      ),
    );
  }
}

export class CommittedRanges {
  private offset = 0;
  private edges: WageEdges | undefined;
  private declared: string | undefined;
  private readonly enrolled: Set<string>;
  private readonly boundaries = new Set<number>();
  private ready = Promise.resolve();
  readonly censusHash: string;
  readonly rawW0: boolean;
  constructor(roster: readonly string[], rawW0: boolean) {
    assert.deepEqual([...new Set(roster)].sort(), roster);
    this.censusHash = hash(roster);
    this.rawW0 = rawW0;
    this.enrolled = new Set(roster);
  }
  private facts(tx: Native) {
    return tx.changes.filter((c) => {
      const e = W0.classify(c.entityId);
      return (
        e && W0.ATTRIBUTES[e.kind].has(c.attribute) && (!e.owner || this.enrolled.has(e.owner))
      );
    });
  }
  async suggest(a: Notices, e: Event, sourceAt: number): Promise<Coverage | undefined> {
    const before = this.ready;
    const gate = Promise.withResolvers<void>();
    this.ready = gate.promise;
    await before;
    try {
      return await this.select(a, e, sourceAt);
    } catch (error) {
      this.edges = undefined;
      if (!(error instanceof assert.AssertionError)) throw error;
    } finally {
      gate.resolve();
    }
  }

  private async select(a: Notices, e: Event, sourceAt: number): Promise<Coverage | undefined> {
    if (
      e.value.kind !== "reconcile" ||
      !a.db.store.feedPage ||
      e.value.census.members !== this.censusHash
    )
      return;
    const previous = await a.event(e.value.sequence - 1, e.at - 1);
    // [DX-STG1] Why: moving the business clock can reveal a scheduled fact
    // or expiry outside any touched edge. Rejected: assuming a same-day save
    // cannot cross a validity boundary.
    if (
      (!this.rawW0 && previous.value.validTime !== e.value.validTime) ||
      previous.value.nextHash !== e.value.nextHash ||
      previous.value.nextHash !== e.value.oldHash ||
      e.value.parent !== hash(previous.value)
    )
      return;
    const feed = a.db.store.feedPage.bind(a.db.store);
    const committed = await feed(e.at - 1, 1);
    const actual = committed.transactions[0] as Native | undefined;
    if (
      actual?.position !== e.at ||
      !actual.txId ||
      !actual.changes.some(
        (c) =>
          c.op === "assert" &&
          c.tripleId === e.id &&
          c.entityId === a.db.prefix + "event:" + e.value.sequence &&
          (c.value as { value?: string })?.value === canonical(e.value),
      )
    )
      return;

    let candidates: Set<string>;
    if (!this.rawW0) {
      // The compact fixture stores one complete isolated world per subject.
      // Rejected: extrapolating this property to a native world with shared edges.
      const get = (c: Change) =>
        c.entityId.startsWith("notice-fixture:") && c.attribute === "world"
          ? c.entityId.slice("notice-fixture:".length)
          : undefined;
      candidates = new Set();
      for (const c of actual.changes) {
        if (c.entityId.startsWith(a.db.prefix)) continue;
        const s = get(c);
        if (!s || !this.enrolled.has(s)) return;
        const body = unpack<W0.World>((c.value as { value: string }).value);
        if (body.subject !== s) return;
        candidates.add(s);
      }
      for (let p = previous.at; p < actual.position - 1; ) {
        const { transactions } = await feed(p, Math.min(32, actual.position - p - 1));
        assert(transactions.length && transactions.every((t) => t.position === ++p));
        if (
          transactions.some((t: Native) =>
            t.changes.some((c) => !c.entityId.startsWith(a.db.prefix)),
          )
        )
          return;
      }
    } else {
      const found = await this.shared(a, previous, actual, ms(e.value.validTime));
      if (!found) return;
      candidates = found;
    }
    const ids = [...candidates].sort();
    const changed = [];
    const describe = (items: readonly W0.RecordWorkItem[]) =>
      items.map(({ id, payload }) => [id, payload]);
    for (let n = 0; n < ids.length; n += 64) {
      const group = ids.slice(n, n + 64);
      const [before, after] = await Promise.all([
        a.work(previous, group, sourceAt),
        a.work(e, group, sourceAt),
      ]);
      for (const [j, subject] of group.entries())
        if (canonical(describe(before[j]!)) !== canonical(describe(after[j]!)))
          changed.push(subject);
    }
    return {
      parent: previous.id,
      txId: actual.txId,
      edits: transportHash(actual.changes),
      ids: changed,
      evaluated: ids.length * 2,
    };
  }

  private async shared(a: Notices, previous: Event, actual: Native, nextValid: number) {
    // [DX-STG1] Why: derive ordered edges from the contiguous source journal,
    // including retracted identities and backdated bounds, at both record cuts.
    // Rejected: the request's owner hint or a current-only reverse map.
    const valid = ms(previous.value.validTime);
    if (!this.edges || this.offset > previous.at || this.declared !== a.db.prefix) {
      this.offset = 0;
      this.edges = new WageEdges(valid);
      this.declared = a.db.prefix;
      this.boundaries.clear();
    }
    const view = this.edges;
    view.shift(valid);
    let otherEdits = false;
    while (this.offset < actual.position - 1) {
      const { transactions } = await a.db.store.feedPage!(
        this.offset,
        Math.min(32, actual.position - 1 - this.offset),
      );
      assert(transactions.length, "Gap in ordered source inputs");
      for (const t of transactions as readonly Native[]) {
        assert(t.position === this.offset + 1 && t.position < actual.position);
        const changes = this.facts(t);
        if (t.position > previous.at && changes.length) otherEdits = true;
        view.apply(changes);
        this.rememberBoundaries(changes);
        this.offset = t.position;
      }
    }
    const facts = this.facts(actual);
    if (
      otherEdits ||
      actual.changes.some(
        (c) =>
          !c.entityId.startsWith(a.db.prefix) &&
          !facts.includes(c) &&
          !(c.entityId === "lazy/account/clock" && c.attribute === "lazy/slot"),
      )
    )
      return;
    // [DX-STG1] Why: all visibility endpoints and the DOCEXP notice boundary
    // are tracked even for events with no current posting. Rejected: assuming
    // changed owners cover the passage of business time.
    if (nextValid < valid || [...this.boundaries].some((at) => valid < at && at <= nextValid))
      return;
    const direct = new Set(facts.map((c) => W0.classify(c.entityId)!.owner).filter(Boolean));
    const reparent = new Set(
      facts.filter((c) => c.attribute === "jurisdiction").map((c) => c.entityId),
    );
    const jurisdictions = new Set(
      facts.filter((c) => c.attribute === "stateMinWageCents").map((c) => c.entityId),
    );
    const local = new Set(
      facts.filter((c) => c.attribute === "localMinWageCents").map((c) => c.entityId),
    );
    if (
      facts.some(
        (c) =>
          !W0.classify(c.entityId)!.owner &&
          !["jurisdiction", "localMinWageCents", "stateMinWageCents"].includes(c.attribute),
      )
    )
      return;
    const places = new Set([
      ...local,
      ...reparent,
      ...[...jurisdictions].flatMap((j) => [...(view.locations.get(j) ?? [])]),
    ]);
    let policy = W0.RELEASES_BY_HASH.get(previous.value.nextHash);
    if (!policy && previous.value.definition) {
      const def = await a.event(previous.value.definition, previous.at);
      if (def.value.document) policy = W0.compileRelease(def.value.document);
    }
    if (!policy || policy.hash !== previous.value.nextHash) return;
    const old = new Map(
      [...places].map((l) => [l, { floor: view.floor(policy!, l), rows: view.postings(l) }]),
    );
    for (const l of reparent) for (const s of view.subjects.get(l) ?? []) direct.add(s);
    view.valid = nextValid;
    view.apply(facts);
    this.rememberBoundaries(facts);
    this.offset = actual.position;
    for (const l of reparent) for (const s of view.subjects.get(l) ?? []) direct.add(s);
    for (const l of places) {
      const before = old.get(l)!;
      const after = view.floor(policy, l);
      if (before.floor === after) continue;
      const limit = Math.max(before.floor, after);
      for (const s of below(before.rows, limit)) direct.add(s);
      for (const s of below(view.postings(l), limit)) direct.add(s);
    }
    return direct;
  }
  private rememberBoundaries(changes: Change[]) {
    for (const c of changes) {
      if (c.op !== "assert") continue;
      this.boundaries.add(c.validFrom);
      if (c.validTo != null) this.boundaries.add(c.validTo);
      if (c.attribute === "expiresOn") {
        const date = factValue(c.value);
        assert(typeof date === "string" && W0.parseDate(date) >= 0);
        this.boundaries.add(ms(W0.endOfDay(W0.parseDate(date))));
      }
    }
  }
}
