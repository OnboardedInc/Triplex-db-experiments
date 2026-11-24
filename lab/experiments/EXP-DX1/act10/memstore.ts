// [DX-ACT10] Review harness (diagnostic only, never a measured lane). An in-process stand-in for `openStore` (actv-lazy/
// store.ts) over the in-memory composition, so the REAL JoinedAccount, Archive, RecordedNotices and Settlement code runs
// without a stack, under seeded random interleavings. It reproduces the commit rules the code under review relies on:
//   - no guards: the whole-head fence (the commit lands only if the head is still `expected`);
//   - guards (TX2_PUBLISH_BESIDE / TX2_SETTLE_PRECONDITION=progress): each EntityState guard is compared with the
//     entity's live facts at the transaction's begin (`sourceK`, taken before the `inside` hook), each retraction must
//     be live at the serial cut, and every entity the transaction reads or writes (guards, retracted rows' entities,
//     asserted entities) must be unchanged after `sourceK` (the transactor's revision check, DatomicStorageAdapter
//     `state.entities` -> commit.clj).
// Commits are serialized through one queue (the transactor), reads are not. Every store call first yields a seeded random
// number of event-loop turns, so concurrent actors interleave at every await. A "process" is a view of one database with
// its own kill switch: once killed, its next store call throws `Killed`; a transaction it already sent may still apply
// (a lost reply).
import assert from "node:assert/strict";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { canonical, sha256, W0 } from "../../../bench/lib/w0-world.ts";
import { bytes as wireBytes } from "../import1/source.ts";
import { ids, SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { deepOwnFacts } from "../../../bench/lib/deep-world.ts";
import { Conflict, defaultNames, fact, millis, value, type EntityGuard, type HeldSource } from "../actv-lazy/store.ts";

export class Killed extends Error {}

/** A small seeded generator (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { next, int: (n: number) => Math.floor(next() * n), pick: <T>(xs: readonly T[]) => xs[Math.floor(next() * xs.length)]! };
}
export type Rng = ReturnType<typeof rng>;
const turn = () => new Promise<void>((r) => setImmediate(r));

type Live = { id: string; position: number; retracted?: number };
/** One database: the memory composition, a serial commit queue, an entity index for guards, and correlation ids. */
export class MemDb {
  readonly scope: string;
  readonly comp: ReturnType<typeof memoryComposition>;
  private queue: Promise<unknown> = Promise.resolve();
  private readonly byEntity = new Map<string, Live[]>();
  private readonly lastChange = new Map<string, number>();
  readonly correlation = new Map<string, string>();
  readonly random: Rng;
  /** Commits refused by each rule (diagnostic counts). */
  readonly refusals = { head: 0, entityState: 0, revision: 0, live: 0, command: 0 };
  /** Optional hook run by `memStore.commit` after the commit's reads and guards, before it reaches the transactor. */
  beforeCommit?: (commandId: string) => Promise<void>;
  /** Optional hook run inside the transactor before a commit's checks (a schedule may stall a commit here). */
  stall?: () => Promise<void>;
  maxYield = 3;
  constructor(scope: string, seed: number) {
    this.scope = scope;
    this.comp = memoryComposition("datomic", scope);
    this.random = rng(seed);
  }
  async yieldSome() {
    for (let i = this.random.int(this.maxYield + 1); i > 0; i--) await turn();
  }
  head() {
    return this.comp.currentPosition();
  }
  /** Live fact ids of an entity at position k. */
  liveAt(entity: string, k: number) {
    return (this.byEntity.get(entity) ?? [])
      .filter((f) => f.position <= k && !(f.retracted !== undefined && f.retracted <= k))
      .map((f) => f.id)
      .sort();
  }
  private index(record: { position: number; changes: any[] }) {
    for (const c of record.changes) {
      const list = this.byEntity.get(c.entityId) ?? [];
      if (c.op === "assert") list.push({ id: c.tripleId, position: record.position });
      else {
        const f = list.find((x) => x.id === c.tripleId);
        assert(f, "retraction of an unindexed fact");
        f.retracted = record.position;
      }
      this.byEntity.set(c.entityId, list);
      this.lastChange.set(c.entityId, record.position);
    }
  }
  /**
   * The transactor. `rule`: `{ head: expected }` (whole-head fence) or `{ sourceK, entities }` (revision check), or
   * nothing (a plain commit: only TripleLive and EntityState preconditions, checked at the cut).
   */
  transact(ops: readonly any[], meta: any, rule?: { head?: number; sourceK?: number; entities?: readonly string[] }) {
    const run = async () => {
      await this.stall?.();
      const h = await this.comp.currentPosition();
      if (rule?.head !== undefined && h !== rule.head) {
        this.refusals.head++;
        return { ok: false as const, tag: "TransactionConflictError", error: { message: "head moved" } };
      }
      if (rule?.sourceK !== undefined)
        for (const e of rule.entities ?? [])
          if ((this.lastChange.get(e) ?? 0) > rule.sourceK) {
            this.refusals.revision++;
            return { ok: false as const, tag: "TransactionConflictError", error: { message: "revision " + e } };
          }
      const r = await this.comp.transact(ops, meta);
      if (!r.ok) {
        if (r.tag === "CommandAlreadyCommittedError") this.refusals.command++;
        else this.refusals.live++;
        return r;
      }
      const record = (await this.comp.feedPage(r.value.position - 1, 1)).transactions[0];
      assert(record && record.position === r.value.position);
      this.index(record);
      return r;
    };
    const next = this.queue.then(run, run);
    this.queue = next.catch(() => undefined);
    return next;
  }
  /** A commit record as the real `lookup` returns it (changes with assertion ids, the correlation id). */
  async lookup(commandId: string) {
    const r = (await this.comp.transactionByCommand(commandId)).value as any;
    if (!r) return null;
    return {
      ...r,
      correlationId: this.correlation.get(commandId),
      changes: r.changes.map((c: any) => (c.op === "assert" ? { ...c, assertionTxId: r.txId } : c)),
    };
  }
}

/** A process: a view of the database with its own kill switch. */
export class Proc {
  readonly db: MemDb;
  readonly name: string;
  killed = false;
  /** Kill after this many more store calls (undefined: never). */
  killAfter?: number;
  /** When killed at a commit, whether the commit still applies (a lost reply). */
  lostReply = false;
  calls = 0;
  constructor(db: MemDb, name: string) {
    this.db = db;
    this.name = name;
  }
  async gate() {
    await this.db.yieldSome();
    this.calls++;
    if (this.killed) throw new Killed(this.name);
    if (this.killAfter !== undefined && this.killAfter-- <= 0) {
      this.killed = true;
      throw new Killed(this.name);
    }
  }
  /** The composition handle this process sees (every call gated). */
  comp() {
    const db = this.db,
      inner = db.comp,
      self = this;
    return {
      scopeName: inner.scopeName,
      backend: inner.backend,
      async currentPosition() {
        await self.gate();
        return inner.currentPosition();
      },
      async sweepPage(subjects: readonly string[], basis: any, between?: any) {
        await self.gate();
        return inner.sweepPage(subjects as string[], basis, between);
      },
      async feedPage(after: number, limit: number) {
        await self.gate();
        return inner.feedPage(after, limit);
      },
      async transactionByCommand(id: string) {
        await self.gate();
        const r = await db.lookup(id);
        return { ok: true as const, value: r };
      },
      async transact(ops: readonly any[], meta: any) {
        await self.gate();
        return db.transact(ops, meta);
      },
      close: async () => {},
    };
  }
}

export type MemStore = ReturnType<typeof memStore>;
/**
 * The `openStore` result for a held account, over a process's view. `label` is this store's own `scope` property (the
 * bulk claim registry in bulk.ts is per Node process; two "processes" in one Node process need distinct labels). The
 * account's metadata names follow `openStore` exactly.
 */
export function memStore(proc: Proc, held: HeldSource, label = proc.db.scope) {
  const db = proc.db,
    comp = proc.comp() as any;
  const ns = held.namespace ? "/" + held.account : "";
  const names = {
    RELEASE: defaultNames.RELEASE + ns,
    ORIGIN: defaultNames.ORIGIN + ns,
    CLOCK: defaultNames.CLOCK + ns,
    MASK: defaultNames.MASK + ns,
    CURSOR: defaultNames.CURSOR + ns,
    documents: held.namespace ? "-" + held.account : "",
  };
  const counters = {
    writes: 0,
    accountReads: 0,
    subjectRoots: 0,
    rosterRoots: 0,
    ackObserved: 0,
    lastOps: { id: "", changes: 0, bytes: 0 },
    lastReceipt: undefined as any,
  };
  const rows = async (idsIn: string[], position: number, validTime = "2000-01-01T00:00:00.000000Z") => {
    const basis = { position, validAt: millis(validTime) };
    const page = await comp.sweepPage(idsIn, basis);
    return page.rows;
  };
  const lookup = async (id: string) => (await comp.transactionByCommand(id)).value;
  async function commit(
    id: string,
    actor: string,
    ops: readonly any[],
    expected: number,
    context: unknown = null,
    afterFence?: () => Promise<void>,
    onAck?: (t: number) => void,
    guards?: readonly EntityGuard[],
    inside?: () => Promise<void>,
  ) {
    assert(!guards || (guards.length > 0 && !afterFence));
    assert(!inside || guards);
    // The correlation is over the database scope (every held account of one database has the same `openStore` scope).
    const correlationId = canonical({ context, hash: sha256(wireBytes([db.scope, id, actor, ops])) });
    const check = (r: any) => {
      assert(
        r && r.commandId === id && r.actor === actor && r.correlationId === correlationId && r.txId &&
          Number.isSafeInteger(r.position),
        "commit receipt differs from the request (command " + id + ")",
      );
      assert.equal(r.changes.length, ops.length);
      return r;
    };
    const old = await lookup(id);
    if (old) return check(old);
    counters.lastOps = { id, changes: ops.length, bytes: Buffer.byteLength(canonical(ops)) };
    // The transaction's begin: its snapshot position.
    const sourceK = await comp.currentPosition();
    if (afterFence) await afterFence();
    if (inside) await inside();
    let rule: { head?: number; sourceK?: number; entities?: string[] };
    const preconditions: any[] = ops.filter((o) => o.op === "retract").map((o) => ({ _tag: "TripleLive", id: o.id }));
    if (!guards) rule = { head: expected };
    else {
      // EntityState guards read at the begin snapshot. ACT10_WEAKEN=entity (negative control only) skips them and the
      // revision check, so the fuzzer must find what they protect.
      const weak = process.env.ACT10_WEAKEN === "entity";
      for (const g of weak ? [] : guards) {
        const live = db.liveAt(g.entityId, sourceK);
        if (canonical(live) !== canonical([...g.tripleIds].sort())) {
          db.refusals.entityState++;
          if ((await db.head()) !== expected) throw new Conflict("Source changed at admission");
          throw new Error("guard differs with the head unchanged");
        }
      }
      const entities = new Set<string>(guards.map((g) => g.entityId));
      for (const o of ops) {
        if (o.op === "assert") entities.add(o.entityId);
        else {
          const rec = await findFact(o.id);
          if (rec) entities.add(rec);
        }
      }
      rule = weak ? {} : { sourceK, entities: [...entities] };
    }
    await proc.gate();
    // A schedule may land another write here: after this commit's read and guards, before the transactor.
    await db.beforeCommit?.(id);
    db.correlation.set(id, correlationId);
    const r = await db.transact(ops, { commandId: id, actor, preconditions }, rule);
    if (r.ok) {
      counters.writes++;
      onAck?.(performance.now());
    }
    // A process killed after sending: the commit may have applied, the reply is lost.
    if (proc.killAfter !== undefined && proc.killAfter <= 0 && proc.lostReply) {
      proc.killed = true;
      throw new Killed(proc.name + " (lost reply)");
    }
    const stored = await lookup(id);
    if (stored) {
      const receipt = check(stored);
      held.committed(receipt);
      counters.lastReceipt = { commandId: id, position: receipt.position, txId: receipt.txId, time: performance.now(), clock: "native-ack" };
      return receipt;
    }
    if ((await comp.currentPosition()) !== expected) throw new Conflict("Source changed at admission");
    throw new Error("Native write had no receipt: " + (r as any).tag);
  }
  async function findFact(id: string) {
    for (const [e, list] of (db as any).byEntity as Map<string, Live[]>) if (list.some((f) => f.id === id)) return e;
    return undefined;
  }
  async function controls(p: number, inputOnly = false) {
    const all = await rows(
      inputOnly ? [names.RELEASE, names.CLOCK, names.ORIGIN] : [names.RELEASE, names.CLOCK, names.MASK, names.CURSOR, names.ORIGIN],
      p,
    );
    const birth = all.find((r: any) => r.entityId === names.ORIGIN && r.position > held.cut);
    if (p > held.cut && birth) assert.deepEqual(value(birth), { profile: "act2-deep", held: held.seal });
    const releases = all.filter((r: any) => r.entityId === names.RELEASE).map((r: any) => ({ ...value(r), tx: r.position, id: r.id }));
    const clocks = all.filter((r: any) => r.entityId === names.CLOCK);
    assert(clocks.length <= 1);
    const at = ["2000-01-01T00:00:00.000000Z", ...releases.map((r: any) => r.at), ...clocks.map((r: any) => value(r).at)].sort().at(-1)!;
    const cursors = all.filter((r: any) => r.entityId === names.CURSOR);
    const masks = all.filter((r: any) => r.entityId === names.MASK);
    const input = Math.max(0, ...releases.map((r: any) => r.tx), ...clocks.map((r: any) => r.position), ...masks.map((r: any) => r.position));
    return { generation: birth ? held.seal : "uninitialized", releases, at, clock: clocks[0], cursor: cursors[0], masks, input };
  }
  return {
    scope: label,
    profile: "act2-deep" as const,
    held,
    names,
    counters,
    effectsClear: async () => true,
    cursorReceipt: async () => true,
    comp,
    rows,
    lookup,
    commit,
    controls,
    input: async () => {
      throw new Error("held stores have no input");
    },
    head: () => comp.currentPosition(),
    close: async () => {},
  };
}

/** A held account's descriptor (namespaced unless `namespace` is false). */
export function heldAccount(account: string, people: number, cut: number, namespace = true): HeldSource {
  return {
    namespace,
    account,
    prefix: "acct/" + account + "/",
    people,
    cut,
    seal: sha256(canonical(["act10", account, people, cut])),
    verifyThrough: async () => {},
    committed: () => {},
  };
}

/** Seeds `people` deep subjects of an account in one commit (the loader's frame). Returns its position. */
export async function seedAccount(db: MemDb, account: string, people: number) {
  const prefix = "acct/" + account + "/";
  const ops: any[] = [];
  for (let i = 0; i < people; i++) {
    const facts = [
      ...deepOwnFacts(i),
      { e: ids.placement(i), a: ":subject/account", v: { type: "string", value: account } },
      { e: ids.placement(i), a: ":subject/member", v: { type: "string", value: String(i) } },
    ];
    for (const f of facts)
      ops.push({
        op: "assert",
        entityId: prefix + f.e,
        attribute: f.a,
        value: f.v.type === "ref" ? { ...f.v, value: prefix + f.v.value } : f.v,
        validFrom: SEED_VALID_FROM,
      });
  }
  const r = await db.transact(ops, { commandId: "seed:" + account, actor: "seed" });
  assert(r.ok, "seed failed");
  return r.value.position;
}
export { fact, W0 };
