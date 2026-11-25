import { readErasure, recheckErasure, withErasure } from "../../../../bench/lib/datomic-erasure.ts";
import { bytes as transport } from "../../import1/source.ts";
import assert from "node:assert/strict";
import {
  W0,
  canonical,
  sha256,
  isReference,
  many,
  triplexValue,
} from "../../../../bench/lib/w0-world.ts";
import {
  Evaluation,
  emptyMaterial,
  encode,
  decode,
  compact,
  encodedHash,
  type Stored,
} from "./material.ts";
import {
  stage,
  stageActor,
  stageChanges,
  stageKey,
  checkStage,
  collectStage,
  type Stage,
} from "./staging.ts";
import {
  Notices,
  type Tail,
  type Request,
  type Event as NoticeEvent,
} from "../../notify1/journal.ts";
import { Documents, type Op } from "../../notify1/store.ts";
import { Dispatcher } from "../../notify1/dispatcher.ts";
import { memberRange, width, type Census } from "../../notify1/census.ts";
import { Conflict, fact, millis, namesOf, value, type EntityGuard, type Store } from "../store.ts";
import { ledgerCapacity, ledgerPartChars, noticeItems, worstLedgerChars, type LedgerMode } from "./ledger-parts.ts";
import { ensureSettings } from "./account-settings.ts";
import { calculate, worldsAt, type Proposal } from "../decision.ts";
import { deepImpact, rawDeep, replaceDeep } from "./deep.ts";
import { subjectOf, type Fact } from "../../../../bench/lib/world.ts";
import { AccountAdmission, type PublishObservation, type WriteAttempt } from "./admission.ts";
import { LazyReader, rosterRoot, rosterSeal } from "../read.ts";
import {
  definitionsActor,
  definitionsOnly,
  docsMode,
  documentOf,
  loadRelease,
  rootStored,
  splitDocument,
  stageDocument,
  type DocRef,
  type DocsMode,
} from "./definitions.ts";
import {
  entry,
  hits,
  strategy,
  selector,
  address,
  loadLeaf,
  loadLeaves,
  leafChange,
  baseOp,
  indexInputs,
  noticeInputs,
  outputInputs,
} from "./index.ts";
export type Storage = "owed" | "stored" | "envelopes" | "staged";
export type PublishOptions = {
  workers?: number;
  sources?: "census" | "native" | "indexed";
  codec?: "legacy" | "compact";
  afterChunk?: (attempt: string) => Promise<void>;
  observation?: PublishObservation;
  /** [DX-ACT6] How the release document travels (default TX2_RELEASE_DOCS: unset = inline, as before). */
  docs?: DocsMode;
  /** [DX-ACT8] Diagnostic gates only, with TX2_PUBLISH_BESIDE=1: after the plan's last read (before the transaction);
   * inside the transaction (after its snapshot, before the guards are read); after the native acknowledgement. */
  afterRead?: (read: number) => Promise<void>;
  inside?: () => Promise<void>;
  onAck?: () => void;
};
/** [DX-ACT8] TX2_PUBLISH_BESIDE=1: a held account's (owed) Publish commits with the account guard (its notice tail, its
 * calendar, and the transactor's revision check on what the record writes) instead of the whole database's head.
 * PUBLISH-BESIDE-SAVES.md sections 3 and 4. Unset: the whole-head rule, as before. */
/** [DX-ACT8, second review] The command ID of joined command `id` in store `s`. With the account's stored setting
 * `accountKeys` (any held account, the single-account layout too), `joined:v2/<n>/<account>/<id>`, `n` the account
 * name's length, so no (account, ID) pair gives another's key and none equals a key without the setting (a Publish ID
 * has no `/`, a deadline's `deadline/<64 hex>`). Otherwise `joined:<id>`, as before. */
export const joinedCommandId = (s: Pick<Store, "held">, id: string, keys = false) =>
  keys && s.held ? scopedJoinedId(s.held.account, id) : "joined:" + id;
export const scopedJoinedId = (account: string, id: string) => "joined:v2/" + account.length + "/" + account + "/" + id;
export const publishBeside = () => process.env.TX2_PUBLISH_BESIDE === "1";
/** [DX-ACT6] A Publish whose record exceeds the 4 MiB request limit (full documents only), refused before any write. */
export class ReleaseTooLarge extends Error {}
/** [DX-ACT6] The store's limit on one fact value (`ValueDomains.datomic.string.maxUtf8Bytes`). */
const valueLimit = 1048576;
export type Edit = { e: string; a: string; values: W0.Fact["v"][]; from?: string };
type Meta = {
  epoch: string;
  census: Census;
  valid: string;
  source: number;
  compiler: string;
  scheduled: boolean;
  expanded?: boolean;
};
export type Marker = {
  joined: string;
  seq: number;
  old: W0.ReleaseDoc | null;
  document: W0.ReleaseDoc;
  // [DX-ACT6] With TX2_RELEASE_DOCS=ref the stored marker carries these instead of `old` and `document`; marker()
  // fills `old` and `document` from the stored definitions (checked against the release hashes) for its callers.
  documentRef?: DocRef;
  oldRef?: DocRef | null;
  release: string;
  /** The position the record holds at, minus one. [DX-ACT8] For a record with `precondition: "account"` the stored
   * value is where the Publish read its account's state; `marker()` returns that as `read` and the effective cut
   * (the record's own position minus one) as `cut`. */
  cut: number;
  /** [DX-ACT8] Set by `marker()` for a record written under the account guard. */
  read?: number;
  /** [DX-ACT8] Stored on a record written under the account guard (TX2_PUBLISH_BESIDE=1). */
  precondition?: "account";
  at: string;
  from: string;
  kind: "activation";
  storage: Storage;
  erasureSeq?: number;
  stage?: Stage;
  codec?: "compact";
  output: { count: number; chunks: number; hash: string; owners: number };
  notice: string;
  census: string;
  compiler: string;
};
const h = (v: unknown) => sha256(canonical(v));
const stamp = (t: number) =>
  new Date(Math.floor(t))
    .toISOString()
    .replace(
      /(\.\d{3})Z$/,
      (_, x) => x + String(Math.round((t - Math.floor(t)) * 1000)).padStart(3, "0") + "Z",
    );
const dataKey = (seq: number, i: number) => "join-output:" + seq + ":" + i;
/** A joined command's planned transaction. [DX-ACT8] `guards` replaces the whole-head fence (with `inside` and `onAck`
 * diagnostic hooks); absent, the commit requires the head it was planned at, as before. */
type Plan = {
  ops: any[];
  context: object;
  /** [DX-ACT8, second review] The account's `accountKeys` setting as the plan read it (undefined: read at the commit). */
  keys?: boolean;
  expected?: number;
  guards?: EntityGuard[];
  inside?: () => Promise<void>;
  onAck?: () => void;
};
export class JoinedAccount {
  readonly s: Store;
  lastMaterial = emptyMaterial();
  private readonly calendarListeners = new Set<() => void>();
  private readonly noticeListeners = new Set<() => void>();
  onCalendar(listener: () => void) {
    this.calendarListeners.add(listener);
    return () => this.calendarListeners.delete(listener);
  }
  onNotice(listener: () => void) {
    this.noticeListeners.add(listener);
    return () => this.noticeListeners.delete(listener);
  }
  readonly notices: Notices;
  readonly stats = {
    indexPages: 0,
    worlds: 0,
    outputBytes: 0,
    noticeIndexBytes: 0,
    addressBytes: 0,
  };
  /** [DX-ACT8] Guarded commits (Publish under TX2_PUBLISH_BESIDE, enrolment under TX2_ENROL_BESIDE_SAVES): tries sent,
   * tries refused (with the refusal's cause), tries recovered by command ID, and the last Publish's read and landing. */
  readonly beside = {
    publishes: 0,
    tries: 0,
    refused: 0,
    recovered: 0,
    enrolTries: 0,
    causes: [] as string[],
    last: undefined as { read: number; landed: number; tries: number } | undefined,
  };
  private readonly admission?: AccountAdmission;
  constructor(s: Store, admission?: AccountAdmission) {
    this.s = s;
    this.admission = admission;
    this.notices = new Notices(s.comp, "joined" + namesOf(s).documents, {
      identity: selector,
      roster: async (c) => this.roster((await this.meta(c.position)).census, c.position),
      worlds: async (ids, c) =>
        worldsAt(s, s.profile, ids, { tx: c.position, validTime: c.validTime }),
      release: (ref, at) => loadRelease(s, ref, at),
      ownedCommand: async (event, owner) => {
        const tx = (await s.comp.feedPage(event.at - 1, 1)).transactions[0];
        if (
          tx?.position !== event.at ||
          tx.actor !== "lazy/join" ||
          (tx.commandId !== joinedCommandId(s, event.value.request, true) && tx.commandId !== "joined:" + event.value.request) ||
          event.value.sourceBefore !== event.at - 1
        )
          return false;
        const rows = tx.changes.filter(
          (r: { entityId: string }) =>
            r.entityId !== namesOf(this.s).CLOCK && !r.entityId.startsWith(this.db.prefix),
        );
        // [DX-ACT1] Why: W0 owned entities and the deep root namespace cannot be policy dependencies of another enrollee. Rejected: deriving a durable covered set solely from a caller's owner label.
        return (
          rows.length > 0 &&
          rows.every((r: { entityId: string; value?: { type: string; value: string } }) =>
            s.profile === "w0"
              ? W0.classify(r.entityId)?.owner === owner
              : subjectOf(r.entityId) === Number(owner.slice(4)) &&
                (r.value?.type !== "ref" || subjectOf(r.value.value) === Number(owner.slice(4))),
          )
        );
      },
    });
  }
  get db() {
    return this.notices.db;
  }
  reader() {
    return new LazyReader(this.s, this.s.profile, 2 << 20, undefined, "shared-cut");
  }
  private async meta(p: number) {
    const m = (await this.db.get<Meta>("join-meta", p)).value;
    assert(m.compiler === selector && m.census && m.epoch && m.source > 0 && m.source < p);
    return m;
  }
  collect(attempt: string) {
    return collectStage(this.s, this.db, attempt);
  }

  private async roster(c: Census, p: number) {
    const ids: string[] = [];
    for (let i = 0; i < c.count; i += width * 16)
      ids.push(...(await memberRange(this.db, c, i, p, 16)));
    assert.equal(h(ids), c.members);
    return ids;
  }
  private async suffix(after: number, p: number, setup = false) {
    if (this.s.held && !setup) return this.s.held.verifyThrough(p);
    // [DX-SCALE2] Why: a namespaced account's enrolment checks every commit between its first and last enrolment
    // write and refused any commit that is not its own, so in one database it fails whenever any other account saves
    // or settles meanwhile (with many accounts, always). With TX2_ENROL_BESIDE_SAVES=1 (default off: as before) a
    // commit is also accepted when none of its changes touches what this enrolment owns: its own documents, its
    // account's data (`acct/<account>/`) and its metadata names. Rejected: dropping the check (a writer of this
    // account's enrolment documents must still stop it).
    const beside = process.env.TX2_ENROL_BESIDE_SAVES === "1" && Boolean(this.s.held?.namespace);
    const own = beside ? new Set<string>(Object.values(namesOf(this.s)).filter((v): v is string => typeof v === "string" && v.length > 0)) : undefined;
    // [DX-ACT8] The account's own subject saves (`acct/<account>/`) are accepted too: a held enrolment reads no subject
    // data (its census is the held source's subject IDs), so a save during it is a save before its first Publish.
    // A commit that writes the account's documents or metadata names still stops it. PUBLISH-BESIDE-SAVES.md section 6.
    const foreign = (changes: any[]) => Boolean(own) && changes.length > 0 && changes.every((v: any) =>
      !v.entityId.startsWith(this.db.prefix) && !own!.has(v.entityId));
    while (after < p) {
      const f = await this.s.comp.feedPage(after, 32);
      assert(f.transactions.length);
      for (const t of f.transactions) {
        if (t.position > p) break;
        assert.equal(t.position, ++after);
        const allowed =
          t.actor === "notice-v1" &&
          t.changes.every(
            (v: any) =>
              v.entityId.startsWith(this.db.prefix) &&
              (setup ||
                /^(?:claim:|cursor$|ledger:|packet:)/.test(
                  v.entityId.slice(this.db.prefix.length),
                )),
          );
        assert(
          allowed ||
            (setup && beside && foreign(t.changes)) ||
            // [DX-ACT8, review F6] A rival enrolment of this same account whose record lands inside this walk: its
            // command ID is this account's enrolment command, so this enrolment then recovers it (one record, not two).
            (setup && beside && t.actor === "lazy/join" && t.commandId === "join-held-enrolment:" + this.s.held!.account) ||
            (t.actor === stageActor && stageChanges(this.db.prefix, t.changes)) ||
            // [DX-ACT6] Content-addressed release definitions written ahead of a Publish (unreachable until it).
            (t.actor === definitionsActor && definitionsOnly(this.s, t.changes)) ||
            (setup &&
              t.actor === "lazy/join-index" &&
              t.changes.every((v: any) => v.entityId.startsWith(this.db.prefix + "join-"))),
          "Unclassified native writer left the joined source open",
        );
      }
    }
  }
  async installHeld(at: string) {
    const s = this.s, source = s.held;
    // [DX-ACT5] A namespaced account is enrolled after others have written to the database: its own enrolment writes
    // are checked from the head it starts at.
    const before = await s.head();
    assert(source && W0.isInstant(at) && (source.namespace || before === source.cut));
    const ids = Array.from({ length: source.people }, (_, i) => W0.placementId(i));
    const init = new Notices(s.comp, "joined" + namesOf(s).documents, {
      identity: selector,
      roster: async () => ids,
      worlds: async () => { throw Error("Unexpected held enrolment evaluation"); },
    });
    // [DX-ACT1] Why: the verified SCALE1 census already exists. Copy only notice enrolment pages into its joined epoch.
    // Rejected: replaying the loader or deriving policy for every member before a Publish.
    await init.create(source.seal, at);
    const { census } = (await init.observe()).value;
    assert.equal(census.members, h(ids));
    const now = await s.head();
    await this.suffix(source.namespace ? before : source.cut, now, true);
    const meta: Meta = { epoch: source.seal, census, valid: at, source: source.cut,
      compiler: selector, scheduled: false };
    const enrolment = "join-held-enrolment" + (source.namespace ? ":" + source.account : ""),
      record = [
        fact(namesOf(this.s).ORIGIN, "lazy/generation", { profile: s.profile, held: source.seal }),
        this.db.put("join-meta", meta),
        this.db.put("join-calendar", []),
        fact(namesOf(this.s).CLOCK, "lazy/slot", { joined: source.seal, kind: "baseline", at }),
      ];
    // [DX-ACT8] TX2_ENROL_BESIDE_SAVES=1 (a namespaced account): the enrolment record commits only if its four entities
    // still have no fact (only a rival enrolment of this account writes them, and its command ID is recovered), instead
    // of requiring the whole database's head. Up to three tries, each looking the command up first. Unset: as before.
    if (process.env.TX2_ENROL_BESIDE_SAVES === "1" && source.namespace) {
      const guards = [namesOf(this.s).ORIGIN, namesOf(this.s).CLOCK, this.db.prefix + "join-meta",
        this.db.prefix + "join-calendar"].map((entityId) => ({ entityId, tripleIds: [] as string[] }));
      for (let attempt = 0; ; attempt++) {
        this.beside.enrolTries++;
        try {
          await s.commit(enrolment, "lazy/join", record, now, { intent: h([source.seal, census, at]) },
            undefined, undefined, guards);
          break;
        } catch (e) {
          if (!(e instanceof Conflict) || attempt >= 2) throw e;
        }
      }
    } else await s.commit(enrolment, "lazy/join", record, now, { intent: h([source.seal, census, at]) });
    assert.deepEqual(await this.roster(census, now), ids);
    return meta;
  }
  async install(ids: string[], at: string, expanded = false) {
    ids = [...ids];
    const s = this.s,
      p = await s.head(),
      existing = await this.db.row<Meta>("join-meta", p);
    if (existing) {
      assert(
        existing.value.census.members === h(ids) &&
          existing.value.valid === at &&
          !!existing.value.expanded === expanded,
      );
      assert.deepEqual(await this.roster(existing.value.census, p), ids);
      await this.state(p);
      return existing.value;
    }
    const c = await s.controls(p);
    assert(
      p && c.releases.length === 0 && !c.masks.length && W0.isInstant(at) && at >= c.at,
      "Join needs a fresh enrolled recipient epoch",
    );
    const seal = await s.rows(["members/seal"], p);
    assert.equal(seal.length, 1);
    assert.deepEqual(value(seal[0]!), rosterSeal(ids));
    const days = new Set<string>();
    let scheduled = false;
    let atPos = 0,
      source = 0;
    while (atPos < p) {
      const pg = await s.comp.feedPage(atPos, 16);
      assert(pg.transactions.length);
      for (const t of pg.transactions) {
        if (t.position > p) break;
        assert.equal(t.position, ++atPos);
        if (t.actor === "notice-v1" || t.actor === "lazy/join-index") continue;
        assert.equal(t.actor, "lazy/input");
        source = t.position;
        for (const row of t.changes) {
          assert(
            !/(?:^|[/:_-])ssn$/i.test(row.attribute),
            "Protected input requires a retention ruling",
          );
          if (row.op !== "assert") continue;
          if (["expiresOn", ":file/expiresOn"].includes(row.attribute)) {
            const date = W0.parseDate(row.value.value);
            if (date >= 0) days.add(W0.endOfDay(date));
          }
          if (row.validFrom > millis(at)) {
            scheduled = true;
            days.add(stamp(row.validFrom));
          }
          if (row.validTo != null && row.validTo > millis(at)) days.add(stamp(row.validTo));
        }
      }
    }
    const init = new Notices(s.comp, "joined" + namesOf(s).documents, {
      identity: selector,
      roster: async () => ids,
      worlds: async () => {
        throw Error("Unexpected enrolment evaluation");
      },
    });
    await init.create(c.generation, at);
    const census = (await init.observe()).value.census;
    assert.equal(census.members, h(ids));
    for (let lo = 0; lo < ids.length; lo += width) {
      const group = ids.slice(lo, lo + width),
        i = lo / width,
        src = await s.rows([rosterRoot(i)], source);
      assert.equal(src.length, 1);
      assert.deepEqual(value(src[0]!), group);
      const b = { tx: source, validTime: at },
        ws = await worldsAt(s, s.profile, group, b);
      assert.deepEqual(
        ws.map((w) => w.subject),
        group,
      );
      const base = baseOp(
        this.db,
        i,
        ws.map((w) => entry(w, b, expanded)),
      );
      this.stats.noticeIndexBytes += Buffer.byteLength(base.value.value);
      const addresses = group.map((id) => this.db.put(address(id), i));
      this.stats.addressBytes += addresses.reduce(
        (n, r) => n + Buffer.byteLength(r.entityId) + Buffer.byteLength(r.value.value),
        0,
      );
      const ops = [base, ...addresses];
      const id = "join-index-" + i,
        original = await s.lookup(id);
      await s.commit(
        id,
        "lazy/join-index",
        ops,
        original ? original.position - 1 : await s.head(),
        {
          source,
          epoch: c.generation,
          ids: h(group),
        },
      );
    }
    const meta: Meta = {
        epoch: c.generation,
        census,
        valid: at,
        source,
        compiler: selector,
        scheduled,
        expanded,
      },
      now = await s.head();
    await this.suffix(source, now, true);
    await s.commit(
      "join-enrolment",
      "lazy/join",
      [
        this.db.put("join-meta", meta),
        this.db.put("join-calendar", [...days].filter((d) => d > at).sort()),
        ...(c.clock ? [{ op: "retract", id: c.clock.id }] : []),
        fact(namesOf(this.s).CLOCK, "lazy/slot", { joined: c.generation, kind: "baseline", at }),
      ],
      now,
      { intent: h([ids, at]), epoch: c.generation },
    );
    return meta;
  }
  private async state(p: number) {
    const [meta, c, tail] = await Promise.all([
      this.meta(p),
      this.s.controls(p),
      this.db.get<Tail>("tail", p),
    ]);
    assert(
      c.generation === meta.epoch &&
        tail.value.epoch === meta.epoch &&
        tail.value.census.members === meta.census.members &&
        tail.value.inputs === selector,
    );
    const tx = (await this.s.comp.feedPage(c.input - 1, 1)).transactions[0];
    assert(tx?.position === c.input && tx.actor === "lazy/join", "Foreign semantic source");
    await this.suffix(c.input, p);
    return { meta, c, tail };
  }
  /** [DX-ACT8, second review] The record of joined command `id`, under either form of its command ID, whatever the
   * account's settings (a record written under one form before or after a transition is found under the other). A record
   * is this account's only if it wrote this account's own joined documents (every joined command writes its notice
   * documents); any other record under the same key, another account's or a forged one, is not this command. */
  private async original(id: string, intents: { scoped: string; legacy: string }) {
    const own = (r: { changes: { entityId: string }[] } | null) =>
      Boolean(r?.changes.some((c) => c.entityId.startsWith(this.db.prefix)));
    if (this.s.held) {
      const key = joinedCommandId(this.s, id, true), found = await this.s.lookup(key);
      if (own(found)) return this.recorded(key, intents.scoped);
    }
    const legacy = await this.s.lookup("joined:" + id);
    return own(legacy) ? this.recorded("joined:" + id, intents.legacy) : null;
  }
  private recorded(key: string, intent: string) {
    return this.s.lookup(key).then((r) => {
      if (!r) return null;
      assert(
        r.commandId === key &&
          r.txId &&
          Number.isSafeInteger(r.position) &&
          r.position > 0,
      );
      assert.equal(r.actor, "lazy/join");
      const ops = r.changes.map((c: any) =>
        c.op === "retract"
          ? { op: "retract", id: c.tripleId }
          : {
              op: "assert",
              entityId: c.entityId,
              attribute: c.attribute,
              value: c.value,
              validFrom: c.validFrom,
              ...(c.validTo == null ? {} : { validTo: c.validTo }),
            },
      );
      assert.equal(
        JSON.parse(r.correlationId).hash,
        sha256(transport([this.s.scope, r.commandId, r.actor, ops])),
      );
      assert.equal(
        JSON.parse(r.correlationId).context.intent,
        intent,
        "Reused command ID has different input",
      );
      return r;
    });
  }
  // [DX-ACT1] Why: recovering a committed command can be the first time this host sees it. Rejected: waking only on a newly handed-back ACK.
  private observed(r: Awaited<ReturnType<Store["commit"]>>) {
    if (
      this.calendarListeners.size &&
      r.changes.some((c: { entityId: string }) => c.entityId === this.db.prefix + "join-calendar")
    )
      for (const wake of this.calendarListeners) wake();
    if (
      this.noticeListeners.size &&
      r.changes.some((c: { entityId: string }) => c.entityId.startsWith(this.db.prefix + "event:"))
    )
      for (const wake of this.noticeListeners) wake();
    return r;
  }
  private command(
    id: string,
    args: unknown,
    plan: (p: number) => Promise<Plan>,
    hook?: () => Promise<void>,
    through?: string,
    priority = false,
    observation?: PublishObservation,
  ) {
    const execute = () => this.execute(id, args, plan, hook, through, observation);
    if (!this.admission) return execute();
    return this.admission.run(priority ? "publish" : "save", (turn) => {
      if (observation) observation.turn = turn;
      return execute();
    });
  }
  private async execute(
    id: string,
    args: unknown,
    plan: (p: number) => Promise<Plan>,
    hook?: () => Promise<void>,
    through?: string,
    observation?: PublishObservation,
  ) {
    assert(
      /^[a-zA-Z0-9_.:-]{1,145}$/.test(id) || (!through && /^deadline\/[a-f0-9]{64}$/.test(id)),
    );
    // [DX-ACT8, second review] Under the account's `accountKeys` setting the intent names the account too (the scope is
    // the whole database's); the form a record carries is decided at its plan, by the settings it read.
    const intents = {
      scoped: this.s.held ? h([this.s.scope, this.s.held.account, id, args]) : h([this.s.scope, id, args]),
      legacy: h([this.s.scope, id, args]),
    };
    // [DX-ACT2] Why: only a different scope writer can beat an admitted turn. Bound that case and recover the original durable receipt by identity. Rejected: spinning against a moving source head.
    for (let retries = 0; retries < 3; ) {
      const attempt: WriteAttempt | undefined = observation
        ? { started: performance.now() }
        : undefined;
      if (attempt) observation!.attempts.push(attempt);
      const old = await this.original(id, intents);
      if (old) {
        if (attempt) {
          attempt.recovered = true;
          attempt.finished = performance.now();
        }
        return this.observed(old);
      }
      const p = await this.s.head();
      if (attempt) attempt.cut = p;
      if (through) {
        const due = (await this.db.get<string[]>("join-calendar", p)).value[0];
        if (due && due <= through) {
          await this.advanceWithinTurn(through);
          if (attempt) attempt.finished = performance.now();
          continue;
        }
      }
      let guarded = false;
      try {
        const body = await plan(p);
        if (attempt) attempt.prepared = performance.now();
        guarded = Boolean(body.guards);
        if (guarded) this.beside.tries++;
        const keys = body.keys ?? (this.s.held ? (await this.s.controls(p)).settings?.accountKeys === true : false);
        const r = await this.s.commit(
          joinedCommandId(this.s, id, keys),
          "lazy/join",
          body.ops,
          body.expected ?? p,
          { ...body.context, intent: keys ? intents.scoped : intents.legacy },
          body.guards ? undefined : hook,
          (at) => {
            if (attempt) attempt.nativeAck = at;
            body.onAck?.();
          },
          body.guards,
          body.inside,
        );
        if (attempt) attempt.finished = performance.now();
        // [DX-ACT8] Under the account guard the record lands at or after the next position; other accounts' commits
        // (and this account's saves) may come between its read and its landing.
        if (body.guards) {
          assert(r.position > (body.expected ?? p), "A guarded record lands after its read");
          this.beside.last = { read: body.expected ?? p, landed: r.position, tries: retries + 1 };
        } else assert.equal(r.position, (body.expected ?? p) + 1);
        return this.observed(r);
      } catch (e) {
        const won = await this.original(id, intents);
        if (attempt) attempt.finished = performance.now();
        if (won) {
          if (attempt) attempt.recovered = true;
          if (guarded) this.beside.recovered++;
          return this.observed(won);
        }
        if (!(e instanceof Conflict)) throw e;
        if (attempt) attempt.conflict = true;
        if (guarded) {
          this.beside.refused++;
          const cause = (e as { cause?: { _tag?: string; message?: string } }).cause;
          this.beside.causes.push(String(cause?._tag ?? "") + " " + String(cause?.message ?? e.message).slice(0, 160));
        }
        retries++;
      }
    }
    throw new Conflict("Joined command exhausted three serial predecessor attempts");
  }
  /** [DX-ACT8, review F3] Refuses a release when one subject could owe more notice items across this account's
   * releases (`releases`, plus `doc`) than its ledger can be written with (ledger-parts.ts). */
  private async ledgerCap(doc: W0.ReleaseDoc, releases: readonly { documentRef?: DocRef; document?: W0.ReleaseDoc }[], p: number,
    mode: LedgerMode) {
    const docs = [doc];
    for (const r of releases) docs.push(r.documentRef ? (await loadRelease(this.s, r.documentRef, p)).doc : r.document!);
    const { items, policies, base } = noticeItems(docs);
    const need = worstLedgerChars(items), cap = ledgerCapacity(mode);
    if (need <= cap) return;
    let fit = 0;
    while (fit < items.length && worstLedgerChars(items.slice(0, fit + 64)) <= cap) fit += 64;
    // [DX-ACT8, second review R10] A subject's ledger keeps one item for every notice policy it was ever owed (retired
    // items are never removed), so this is a limit over the account's lifetime: the distinct notice policies of all its
    // releases together. Releases that add no new notice policy keep publishing.
    const known = noticeItems(docs.slice(1)).policies;
    throw new ReleaseTooLarge(
      "Release refused: this account's releases would hold " + policies + " distinct notice policies (" +
        (policies - known) + " new in this one); with up to " + base + " items from the base rules one subject could owe " +
        items.length + " notice items, a packed ledger of about " + need + " characters, over the " + cap +
        " the settlement can write for one subject (" +
        (mode === "parts" ? cap / ledgerPartChars + " parts of " + ledgerPartChars + " characters" :
          "one value per frame") + "). A ledger keeps every notice policy a subject was ever owed, so this account can " +
        "use at most about " + Math.max(0, fit - base) + " distinct notice policies in its lifetime; publish one that " +
        "reuses its existing notice policy IDs or adds none.",
    );
  }
  private async choose(
    meta: Meta,
    p: number,
    at: string,
    old: W0.CompiledRelease | undefined,
    next: W0.CompiledRelease,
    kind: "notice" | "output",
    envelopes = false,
    fromIndex?: Map<string, W0.World>,
  ) {
    const valid = at >= meta.valid && !(await this.db.row("join-invalid", p)),
      expanded = kind === "output" && !!meta.expanded,
      mode = envelopes || this.s.held ? "all" : strategy(old, next, kind, valid, expanded);
    if (mode === "none") return [];
    if (mode === "all") return this.roster(meta.census, p);
    const out: string[] = [];
    const pages = Math.ceil(meta.census.count / width);
    // [DX-ACT1] Why: the source sweep accepts multiple roots at one cut. Rejected: two serial request round trips for each 64-person index leaf.
    for (let i = 0; i < pages; i += 16) {
      const count = Math.min(16, pages - i);
      const [batch, members] = await Promise.all([
        loadLeaves(this.db, i, count, p),
        memberRange(this.db, meta.census, i * width, p, count),
      ]);
      for (const [j, page] of batch.entries()) {
        this.stats.indexPages++;
        assert.deepEqual(page.sorted.ids, members.slice(j * width, (j + 1) * width));
        const ids = hits(page.sorted, old!, next, { tx: p, validTime: at }, expanded).ids;
        out.push(...ids);
        if (fromIndex && expanded) {
          const entries = new Map(page.entries.map((entry) => [entry.s, entry]));
          for (const id of ids) {
            const facts = entries.get(id)?.facts;
            assert(facts, "Missing input projection on indexed page");
            fromIndex.set(id, { subject: id, facts });
          }
        }
      }
    }
    assert.deepEqual(out, [...new Set(out)].sort());
    return out;
  }
  private async marker(e: NoticeEvent) {
    const xs = await this.s.rows([namesOf(this.s).RELEASE], e.at),
      r = xs.find((x) => x.position === e.at);
    assert(r);
    const m = value(r) as Marker;
    await recheckErasure(this.s.comp, m.erasureSeq);
    // [DX-ACT8] A record written under the account guard stores where it read its account's state (`cut`, and the
    // event's `sourceBefore`); the guard proves that state unchanged up to the record's own position, so the record holds
    // at its own position like every other: its effective cut is that position minus one, which every reader of a marker
    // (settlement, the receipt, the notice selection) takes from here. PUBLISH-BESIDE-SAVES.md section 4.
    const guarded = m.precondition === "account";
    assert(!guarded || (m.cut < e.at && e.value.sourceBefore === m.cut && !m.stage && m.read === undefined),
      "Invalid account-guarded release record");
    if (guarded) {
      m.read = m.cut;
      m.cut = e.at - 1;
    }
    assert(
      m.notice === h(e.value) &&
        m.seq === e.value.sequence &&
        (guarded || e.value.sourceBefore === e.at - 1) &&
        (m.stage ? m.cut < e.at - 1 : m.cut === e.at - 1) &&
        m.compiler === selector &&
        m.census === e.value.census.members &&
        m.joined === e.value.epoch &&
        m.release === e.value.nextHash,
    );
    if (m.stage) {
      assert(
        m.storage === "staged" &&
          m.stage.erasureSeq === m.erasureSeq &&
          m.stage.scope === this.s.scope &&
          m.stage.cut === m.cut &&
          m.stage.release === m.release &&
          m.stage.hash === m.output.hash &&
          m.stage.chunks === m.output.chunks &&
          m.stage.command === e.value.request,
      );
      await checkStage(this.db, m.stage, e.at);
    }
    // [DX-ACT6] A marker by reference: its documents from the stored definitions, each checked against its hash.
    if (m.documentRef) {
      assert(m.documentRef.release === m.release && m.document === undefined && m.old === undefined);
      m.document = (await loadRelease(this.s, m.documentRef, e.at)).doc;
      m.old = m.oldRef ? (await loadRelease(this.s, m.oldRef, e.at)).doc : null;
    }
    return m;
  }
  async receipt(sequence: number, at?: number) {
    const event = await this.notices.event(sequence, at ?? (await this.s.head())),
      marker = await this.marker(event);
    const meta = await this.meta(marker.cut);
    assert(marker.joined === meta.epoch && marker.census === meta.census.members);
    return { event, marker, census: meta.census };
  }

  async noticeSelection(e: NoticeEvent) {
    const m = await this.marker(e),
      meta = await this.meta(m.cut);
    return this.choose(
      meta,
      m.cut,
      m.at,
      m.old ? W0.compileRelease(m.old) : undefined,
      W0.compileRelease(m.document),
      "notice",
    );
  }
  dispatcher(sink: Documents) {
    let key = "",
      selection: string[] = [];
    return new Dispatcher(this.notices, sink, async (e, start) => {
      if (key !== e.id) {
        selection = await this.noticeSelection(e);
        key = e.id;
      }
      assert(start >= 0 && start <= selection.length && start % width === 0);
      return { ids: selection.slice(start, start + width), size: selection.length };
    });
  }
  async schedule(id: string, doc: W0.ReleaseDoc, offered: string, effective: string) {
    doc = structuredClone(doc);
    const release = W0.compileRelease(doc).hash;
    assert(W0.isInstant(offered) && W0.isInstant(effective) && offered < effective);
    // [DX-ACT1] Why: a future policy is visible to explicitly future-pinned reads without advancing the live notice tail early. Rejected: setting the live business clock to the effective date at ingress.
    return this.command(
      id,
      ["schedule", doc, offered, effective],
      async (p) => {
        const { meta, c } = await this.state(p);
        assert(c.at <= offered);
        const calendar = await this.db.get<string[]>("join-calendar", p);
        const dates = [...new Set([...calendar.value, effective])].sort();
        const ops = [
          fact(namesOf(this.s).RELEASE, "lazy/activation", {
            joined: meta.epoch,
            storage: "scheduled",
            kind: "activation",
            release,
            document: doc,
            at: offered,
            from: effective,
            cut: p,
            census: meta.census.members,
            compiler: selector,
          }),
        ];
        return {
          ops: [...ops, ...this.db.change("join-calendar", calendar, dates)],
          context: { release, offered, effective },
        };
      },
      undefined,
      offered,
    );
  }
  async publish(
    id: string,
    doc: W0.ReleaseDoc,
    at: string,
    storage: Storage = "stored",
    hook?: () => Promise<void>,
    options: PublishOptions = {},
  ) {
    assert(!this.s.held || storage === "owed", "Held campaign measures receipt-only Publish");
    doc = structuredClone(doc);
    const next = W0.compileRelease(doc);
    assert(["owed", "stored", "envelopes", "staged"].includes(storage) && W0.isInstant(at));
    const workers = options.workers ?? 1,
      small = storage === "staged" && options.codec !== "legacy";
    assert(Number.isInteger(workers) && workers >= 1 && workers <= 8);
    const priceStart = performance.now();
    const sequence = (await readErasure(this.s.comp))?.seq;
    this.lastMaterial = emptyMaterial();
    // [DX-ACT6] By reference: the definitions not stored yet are written first (content-addressed, unfenced, each write
    // within the writer's bound), and the predecessor's too if it was published with full documents.
    const byRef = (options.docs ?? docsMode()) === "ref";
    // [DX-ACT8, second review] A process allowed to turn a setting on does so first (one way, `account-settings.ts`);
    // then what this Publish does follows the account's stored settings only.
    await ensureSettings(this.s);
    const h0 = await this.s.head(), c0 = this.s.held ? await this.s.controls(h0) : undefined;
    // [DX-ACT8, review F3] Also before the definitions are written, so a refused release writes nothing.
    if (c0?.settings?.ledgerCap && storage === "owed") await this.ledgerCap(doc, c0.releases, h0, c0.settings.ledger!);
    const ref = byRef ? await this.writeDefinitions(doc, c0?.settings?.accountKeys === true) : undefined;
    // [DX-ACT8] The account guard applies to a held account's owed record only (its plan reads no subject data); every
    // other Publish keeps the whole-head rule.
    const beside = publishBeside() && Boolean(this.s.held) && storage === "owed";
    assert(!beside || !hook, "A Publish beside saves takes no fence hook");
    assert(beside || (!options.afterRead && !options.inside && !options.onAck), "Publish hooks need TX2_PUBLISH_BESIDE=1");
    if (beside) this.beside.publishes++;
    const run = () => withErasure(sequence, () =>
      this.command(
        id,
        ["publish", doc, at, storage, options.sources ?? "native", workers, small, ...(byRef ? ["ref"] : [])],
        async (p) => {
          const { meta, c, tail } = await this.state(p);
          assert(this.s.held ? at === meta.valid : at >= c.at);
          // [DX-THIN1] Why: the current erasure cut must use the effective predecessor release.
          // Rejected: letting a future scheduled release define today's prior answers.
          const prev = c.releases
            .filter((r) => r.storage !== "scheduled" && r.from <= at)
            .sort((a, b) => b.from.localeCompare(a.from) || b.tx - a.tx)[0];
          const old = prev
            ? prev.documentRef
              ? await loadRelease(this.s, prev.documentRef, p)
              : W0.compileRelease(prev.document)
            : undefined;
          // [DX-ACT8, review F3] Under the account's `ledgerCap` setting: checked again at the plan's own read position.
          if (c.settings?.ledgerCap) await this.ledgerCap(doc, c.releases, p, c.settings.ledger!);
          // [DX-ACT6] The record names stored definitions only: the root of this release and of its predecessor.
          const oldRef: DocRef | null = !byRef || !prev ? null : prev.documentRef ?? splitDocument(prev.document).ref;
          if (byRef) {
            assert(await rootStored(this.s, ref!, p), "Release definitions are not stored at the Publish's cut");
            assert(!oldRef || (await rootStored(this.s, oldRef, p)), "Predecessor definitions are not stored");
          }
          const req: Request = {
            id,
            document: doc,
            ...(byRef ? { documentRef: ref } : {}),
            kind: "activation",
            release: doc.name,
            validTime: at,
            from: at,
            selection: { kind: "census" },
          };
          const clock = emptyMaterial(),
            begin = performance.now();
          clock.prepMs = begin - priceStart;
          // [DX-ERASE1] Why: retained posting pages have no current protected assertion identities.
          // Rejected: handing their old facts to a Publish with a newly checked sequence.
          const indexed =
            options.sources === "indexed" && sequence === undefined
              ? new Map<string, W0.World>()
              : undefined;
          const ids =
            storage === "owed"
              ? []
              : options.sources === "census" || sequence !== undefined
                ? await this.roster(meta.census, p)
                : await this.choose(
                    meta,
                    p,
                    at,
                    old,
                    next,
                    "output",
                    storage === "envelopes",
                    indexed,
                  );
          clock.selectionMs = performance.now() - begin;
          const parts: string[] = [],
            body: Stored[] = [];
          let bytes = 0,
            count = 0,
            owners = 0;
          const flush = () => {
            if (!body.length) return;
            const start = performance.now();
            const packed = encode(body, small);
            parts.push(packed);
            this.stats.outputBytes += Buffer.byteLength(packed);
            clock.encodeMs += performance.now() - start;
            body.length = 0;
            bytes = 0;
          };
          const evaluation = new Evaluation(workers, old, next, storage === "envelopes");
          const materialStart = performance.now();
          try {
            for (let start = 0; start < ids.length; start += width * workers) {
              const work = Array.from(
                { length: Math.min(workers, Math.ceil((ids.length - start) / width)) },
                (_, j) => ids.slice(start + j * width, start + (j + 1) * width),
              );
              const results = await Promise.all(
                work.map(async (group, j) => {
                  const t = performance.now();
                  const snap = group.every((x) => indexed?.has(x))
                    ? group.map((x) => indexed!.get(x)!)
                    : await worldsAt(this.s, this.s.profile, group, { tx: p, validTime: at });
                  if (!group.every((x) => indexed?.has(x))) this.stats.worlds += snap.length;
                  clock.readMs += performance.now() - t;
                  return evaluation.page(j, { worlds: snap, basis: { tx: p + 1, validTime: at } });
                }),
              );
              for (const result of results) {
                clock.evaluateMs += result.evaluateMs;
                for (const row of result.rows) {
                  const t = performance.now();
                  const size = Buffer.byteLength(canonical(small ? compact(row) : row));
                  clock.encodeMs += performance.now() - t;
                  if (bytes + size > (storage === "staged" ? 90000 : 96000)) flush();
                  body.push(row);
                  bytes += size;
                  owners++;
                  count += row.rows.length;
                }
              }
            }
            flush();
          } finally {
            await evaluation.close();
          }
          clock.materialMs = performance.now() - materialStart;
          const ops: Op[] = [];
          let header: Stage | undefined,
            expected = p;
          if (storage === "staged" && parts.length) {
            const t = performance.now();
            const written = await stage(
              this.s,
              this.db,
              p,
              id,
              next.hash,
              parts,
              options.afterChunk,
              sequence,
            );
            header = written.header;
            expected = written.predecessor;
            clock.stages = written.writes;
            clock.stageWriteMs = performance.now() - t;
          }
          const np = this.notices.plan({ ...tail, at: expected }, req);
          assert(np.recipe.oldHash === (old?.hash ?? null));
          if (storage !== "staged")
            for (const [j, bytes] of parts.entries())
              ops.push(this.db.put(dataKey(np.recipe.sequence, j), bytes));
          this.lastMaterial = clock;
          const m: Marker & { erasureSeq?: number } = {
            joined: meta.epoch,
            ...(sequence === undefined ? {} : { erasureSeq: sequence }),
            seq: np.recipe.sequence,
            ...((byRef ? { documentRef: ref, oldRef } : { old: old?.doc ?? null, document: doc }) as Pick<Marker, "old" | "document">),
            release: next.hash,
            cut: p,
            at,
            from: at,
            kind: "activation",
            storage,
            output: { count, chunks: parts.length, hash: encodedHash(parts), owners },
            ...(header ? { stage: header } : {}),
            ...(small ? { codec: "compact" as const } : {}),
            notice: h(np.recipe),
            census: meta.census.members,
            compiler: selector,
            ...(beside ? { precondition: "account" as const } : {}),
          };
          if (sequence !== undefined) await recheckErasure(this.s.comp, sequence);
          const record = [fact(namesOf(this.s).RELEASE, "lazy/activation", m), ...np.operations, ...ops];
          // [DX-ACT6] The store takes one fact value of at most 1 MiB (the Datomic value domain, 1,048,576 UTF-8 bytes):
          // with full documents the marker holds the new and the old document in one value and the notice event the new
          // one. Refused here, before any write, with the sizes, instead of the store's "outside the exact storage
          // domain". Unchanged for every release that fits.
          for (const o of record)
            if (o.op === "assert" && Buffer.byteLength(o.value.value) > valueLimit)
              throw new ReleaseTooLarge(
                "Release refused: its " + (o.attribute === "lazy/activation" ? "release marker" : "notice event") +
                  " is one fact value of " + Buffer.byteLength(o.value.value) + " bytes, over the store's limit of " +
                  valueLimit + " bytes per value. With full documents the marker holds the new document (" +
                  Buffer.byteLength(canonical(doc)) + " bytes) and the old one (" +
                  (old ? Buffer.byteLength(canonical(old.doc)) : 0) + " bytes). TX2_RELEASE_DOCS=ref stores the " +
                  "definitions by reference.",
              );
          // [DX-ACT8] The account guard (PUBLISH-BESIDE-SAVES.md section 3): the tail's retraction already carries its
          // `TripleLive` check; the calendar gets an `EntityState` check (its one row as read here, or none); the release
          // entity, the tail and the event join the transactor's revision check because the record writes them.
          let guards: EntityGuard[] | undefined;
          if (beside) {
            const calendar = await this.db.row("join-calendar", p);
            guards = [{ entityId: this.db.prefix + "join-calendar", tripleIds: calendar ? [calendar.id] : [] },
              // [DX-ACT8, second review] The origin row, which holds the account's settings and changes only at
              // enrolment and at a settings transition: a Publish planned under the old settings never lands after it.
              { entityId: namesOf(this.s).ORIGIN, tripleIds: c.origin ? [c.origin.id] : [] }];
            await options.afterRead?.(p);
          }
          return {
            ops: record,
            keys: c.settings?.accountKeys === true,
            expected,
            context: {
              epoch: meta.epoch,
              notice: m.notice,
              output: m.output,
              stage: header?.attempt ?? null,
            },
            ...(guards ? { guards, inside: options.inside, onAck: options.onAck } : {}),
          };
        },
        hook,
        at,
        // [DX-THIN1] Why: the owed Publish gets the next admitted turn with its original erasure witness.
        // Rejected: an unfenced priority path or a priority turn for every staging write.
        storage === "owed",
        options.observation,
      ),
    );
    try {
      return await run();
    } catch (e) {
      // [DX-ACT6] The 4 MiB request limit, stated with the sizes that reached it (the client refuses before sending).
      for (let x: unknown = e; x instanceof Error; x = x.cause)
        if (/Request too large/.test(x.message))
          throw new ReleaseTooLarge(
            "Release refused: its Publish record (" +
              this.s.counters.lastOps.bytes +
              " bytes of operations) exceeds the 4 MiB request limit (4,194,304 bytes after encoding). With full " +
              "documents the record is about 3.0 KB + 1.2 x (2 x new + old document); this release's document is " +
              Buffer.byteLength(canonical(doc)) +
              " bytes. TX2_RELEASE_DOCS=ref carries the definitions by reference.",
            { cause: e },
          );
      throw e;
    }
  }
  /** [DX-ACT6] What the last Publish by reference wrote ahead of its record. */
  lastDefinitions = { writes: 0, rows: 0, bytes: 0, retries: 0 };
  /** [DX-ACT6] Writes the definitions a Publish by reference will name (and its predecessor's, if published with full
   * documents), unfenced and idempotent. Publish calls it; a caller that pauses saves around a Publish calls it first,
   * so the pause covers only the record. */
  async writeDefinitions(doc: W0.ReleaseDoc, unclaimable = false) {
    const staged = await stageDocument(this.s, structuredClone(doc), unclaimable);
    this.lastDefinitions = { writes: staged.writes, rows: staged.rows, bytes: staged.bytes, retries: staged.retries };
    const c0 = await this.s.controls(await this.s.head());
    for (const r of c0.releases) if (r.joined && r.document && !r.documentRef) await stageDocument(this.s, r.document, unclaimable);
    return staged.ref;
  }
  async physical(seq: number) {
    const p = await this.s.head(),
      e = await this.notices.event(seq, p),
      m = await this.marker(e),
      hashes: string[] = [],
      values: Stored[] = [];
    for (let i = 0; i < m.output.chunks; i += width) {
      const keys = Array.from({ length: Math.min(width, m.output.chunks - i) }, (_, j) =>
        m.stage ? stageKey(m.stage.attempt, i + j) : dataKey(seq, i + j),
      );
      const rows = await this.db.rows<string>(keys, e.at);
      for (const k of keys) {
        const r = rows.get(k);
        assert(r && (m.stage ? r.at > m.cut && r.at < e.at : r.at === e.at));
        hashes.push(sha256(r.value));
        values.push(...decode(r.value, m.codec === "compact"));
      }
    }
    assert(
      h(hashes) === m.output.hash &&
        values.length === m.output.owners &&
        values.reduce((n, v) => n + v.rows.length, 0) === m.output.count,
    );
    return { marker: m, values };
  }
  async admit(q: Proposal, before?: () => Promise<void>) {
    assert(q.scope === this.s.scope && q.format === this.s.profile);
    const p = await this.s.head();
    if (q.basis.tx !== p) return "stale";
    const { c } = await this.state(p);
    if (q.basis.validTime !== c.at) return "stale";
    assert(await this.db.row(address(q.subject), p), "Subject outside enrolment");
    const answer = await calculate(this.s, this.s.profile, q.subject, q.basis, c, c);
    assert.equal(answer.witness, q.witness);
    await before?.();
    return (await this.s.head()) === p ? "covered" : "stale";
  }
  advance(at: string) {
    return this.admission
      ? this.admission.run("save", () => this.advanceWithinTurn(at))
      : this.advanceWithinTurn(at);
  }
  private async advanceWithinTurn(at: string) {
    assert(W0.isInstant(at));
    for (;;) {
      const p = await this.s.head(),
        calendar = await this.db.get<string[]>("join-calendar", p),
        due = calendar.value[0];
      if (!due || due > at) return;
      const id = "deadline/" + sha256(due);
      await this.execute(id, ["deadline", due], async (k) => {
        const { meta, c, tail } = await this.state(k),
          cal = await this.db.get<string[]>("join-calendar", k);
        assert(cal.value[0] === due && c.at <= due);
        const ops: any[] = [
          ...this.db.change("join-calendar", cal, cal.value.slice(1)),
          ...(c.clock ? [{ op: "retract", id: c.clock.id }] : []),
          fact(namesOf(this.s).CLOCK, "lazy/slot", { joined: meta.epoch, kind: "due", at: due }),
        ];
        // [DX-ACT1] Why: passage through an enrolled valid-time boundary may change posting inputs without a save. Rejected: treating the original page as authoritative beyond its first unprocessed boundary.
        if (!(await this.db.row("join-invalid", k)))
          ops.push(this.db.put("join-invalid", { source: k + 1, compiler: selector }));
        const scheduled = c.releases
          .filter((r) => r.storage === "scheduled" && r.from === due)
          .toSorted((a, b) => b.tx - a.tx)[0];
        if (scheduled) {
          const doc = W0.compileRelease(scheduled.document);
          assert(scheduled.joined === meta.epoch && doc.hash === scheduled.release);
          const prior = tail.value.custom
            ? await documentOf(this.s, (await this.notices.event(tail.value.custom.definition, k)).value, k)
            : tail.value.release
              ? W0[tail.value.release].doc
              : null;
          const plan = this.notices.plan(
            { ...tail, at: k },
            {
              id: "future-" + sha256(due),
              kind: "activation",
              release: doc.doc.name,
              document: doc.doc,
              validTime: due,
              from: due,
              selection: { kind: "census" },
            },
          );
          const m: Marker = {
            joined: meta.epoch,
            seq: plan.recipe.sequence,
            old: prior,
            document: doc.doc,
            release: doc.hash,
            cut: k,
            at: due,
            from: due,
            kind: "activation",
            storage: "owed",
            output: { count: 0, chunks: 0, hash: encodedHash([]), owners: 0 },
            notice: h(plan.recipe),
            census: meta.census.members,
            compiler: selector,
          };
          ops.push(fact(namesOf(this.s).RELEASE, "lazy/activation", m), ...plan.operations);
        } else if (tail.value.release)
          ops.push(
            ...this.notices.plan(
              { ...tail, at: k },
              {
                id: "boundary-" + sha256(due),
                kind: "reconcile",
                release: tail.value.release,
                validTime: due,
                from: tail.value.from,
                selection: { kind: "census" },
              },
            ).operations,
          );
        return { ops, context: { epoch: meta.epoch, due } };
      });
    }
  }
  private async intervals(edit: Edit, p: number, from: string, scan: boolean) {
    const after = millis(from);
    if (!scan)
      return (await this.s.rows([edit.e], p, from)).filter(
        (r) => r.entityId === edit.e && r.attribute === edit.a,
      );
    // [DX-ACT1] Why: a dated replacement can intersect versions already closed at today's business time. Rejected: a current-only lookup (it can leave competing assertions in the corrected interval).
    const found = new Map<string, { id: string; value: unknown; validFrom: number }>();
    let afterTx = 0;
    while (afterTx < p) {
      const page = await this.s.comp.feedPage(afterTx, 24);
      assert(page.transactions.length);
      for (const tx of page.transactions) {
        if (tx.position > p) break;
        assert.equal(tx.position, ++afterTx);
        for (const r of tx.changes) {
          if (r.entityId !== edit.e || r.attribute !== edit.a) continue;
          if (r.op === "retract") found.delete(r.tripleId);
          else if (r.validTo == null || r.validTo > after)
            found.set(r.tripleId, { id: r.tripleId, value: r.value, validFrom: r.validFrom });
        }
      }
    }
    return [...found.values()];
  }
  // [DX-ACT1] Why: fold the live deep command into the same strict source transaction as its index and owed event. Rejected: dual-writing a compact mirror after the deep transaction (a release can land in the gap).
  async saveDeep(
    id: string,
    person: number,
    submitted: readonly Op[] | { fields: readonly Fact[]; from: number },
    at: string,
    observation?: PublishObservation,
  ) {
    assert(
      this.s.profile === "act2-deep" &&
        W0.isInstant(at) &&
        Number.isSafeInteger(person) &&
        person >= 0,
    );
    const request = structuredClone(submitted),
      subject = W0.placementId(person);
    return this.command(
      id,
      ["deep-save", subject, request, at],
      async (p) => {
        const { meta, c, tail } = await this.state(p);
        assert(at >= c.at);
        const [addr, raw] = await Promise.all([
          this.db.get<number>(address(subject), p),
          rawDeep(this.s, person, { tx: p, validTime: at }),
        ]);
        // [DX-ACT2] Why: a deferred field edit chooses its actual live replacement IDs after admission. Rejected: submitting stale retractions built while a different save held the turn.
        const source =
          "fields" in request ? replaceDeep(raw, request.fields, request.from) : request;
        assert(source.length > 0);
        const impact = deepImpact(person, raw, source, { tx: p, validTime: at });
        const anticipated = impact.prospective(),
          basis = { tx: p + 1, validTime: at };
        assert(
          typeof W0.indexWorld(anticipated, basis.tx) !== "string",
          "Invalid prospective deep policy world",
        );
        const ops: Op[] = [
          ...source,
          ...(c.clock ? [{ op: "retract" as const, id: c.clock.id }] : []),
          fact(namesOf(this.s).CLOCK, "lazy/slot", { joined: meta.epoch, kind: "source", at }),
        ];
        if (
          (impact.posting || (meta.expanded && impact.output)) &&
          !(await this.db.row("join-invalid", p))
        ) {
          const leaf = await loadLeaf(this.db, addr.value, p);
          assert(leaf.entries.some((x) => x.s === subject));
          const updated = entry(anticipated, basis, meta.expanded);
          ops.push(
            ...leafChange(
              this.db,
              addr.value,
              leaf,
              leaf.entries.map((x) => (x.s === subject ? updated : x)),
            ),
          );
        }
        if (impact.dates.length) {
          const calendar = await this.db.get<string[]>("join-calendar", p);
          const remainder = [
            ...new Set([...calendar.value, ...impact.dates.filter((d) => d > at)]),
          ].sort();
          if (canonical(remainder) !== canonical(calendar.value))
            ops.push(...this.db.change("join-calendar", calendar, remainder));
        }
        if (impact.notice && tail.value.release)
          ops.push(
            ...this.notices.plan(
              { ...tail, at: p },
              {
                id,
                kind: "reconcile",
                release: tail.value.release,
                from: tail.value.from,
                validTime: at,
                selection: { kind: "subjects", ids: [subject] },
              },
              subject,
            ).operations,
          );
        return { ops, context: { epoch: meta.epoch, subject } };
      },
      undefined,
      at,
      false,
      observation,
    );
  }
  async save(id: string, edit: Edit, at: string) {
    assert.equal(this.s.profile, "w0", "Use saveDeep for a deep native command");
    edit = structuredClone(edit);
    assert(W0.isInstant(at) && edit.a !== "ssn", "Protected input requires a retention ruling");
    const classified = W0.classify(edit.e);
    assert(classified && Array.isArray(edit.values), "Invalid W0 entity");
    const attr = W0.ATTRIBUTES[classified.kind].get(edit.a);
    assert(attr, "Unknown W0 attribute");
    const normalized = edit.values.map((v) => {
      const n = W0.checkValue(attr, v, classified.owner);
      assert(n !== W0.NOT_A_VALUE, "Invalid W0 value");
      return n;
    });
    assert.equal(new Set(normalized.map(canonical)).size, normalized.length);
    const from = edit.from ?? at;
    assert(W0.isInstant(from) && from <= at);
    assert(many.has(edit.a) || edit.values.length <= 1);
    const args = ["save", edit, at];
    return this.command(
      id,
      args,
      async (p) => {
        const { meta, c, tail } = await this.state(p);
        assert(at >= c.at);
        // [DX-ACT1] Why: W0 gives shared geography an empty owner, which means the whole census at this boundary. Rejected: passing the empty string as an owned-reconcile proof.
        const owner = classified.owner || undefined,
          direct = W0.isPlacementId(edit.e),
          addr = owner ? await this.db.get<number>(address(owner), p) : undefined;
        const active = await this.intervals(edit, p, from, !!meta.scheduled || from < at);
        // [DX-ACT1] Why: preserve the prior value before the authored change while retaining the original record-time snapshot. Rejected: retracting an unbounded assertion and losing its entire earlier valid interval.
        const ops: any[] = [
          ...active.map((r) => ({ op: "retract", id: r.id })),
          ...active
            .filter((r) => r.validFrom < millis(from))
            .map((r) => ({
              op: "assert",
              entityId: edit.e,
              attribute: edit.a,
              value: r.value,
              validFrom: r.validFrom,
              validTo: millis(from),
            })),
          ...normalized.map((v) => ({
            op: "assert",
            entityId: edit.e,
            attribute: edit.a,
            value: triplexValue(edit.a, v),
            validFrom: millis(from),
          })),
          ...(c.clock ? [{ op: "retract", id: c.clock.id }] : []),
          fact(namesOf(this.s).CLOCK, "lazy/slot", { joined: meta.epoch, kind: "source", at }),
        ];
        if (indexInputs.has(edit.a) || (meta.expanded && outputInputs.has(edit.a))) {
          const invalid = await this.db.row("join-invalid", p);
          if (!invalid) {
            if (!direct || !addr || isReference(edit.a) || at < meta.valid || from !== at)
              ops.push(this.db.put("join-invalid", { source: p + 1, compiler: selector }));
            else {
              const k = addr.value,
                leaf = await loadLeaf(this.db, k, p),
                world = (await worldsAt(this.s, "w0", [edit.e], { tx: p, validTime: at }))[0]!;
              const next = {
                subject: edit.e,
                facts: [
                  ...world.facts.filter((f) => f.e !== edit.e || f.a !== edit.a),
                  ...normalized.map((v): W0.Fact => ({ e: edit.e, a: edit.a, v, tx: p + 1 })),
                ],
              };
              const updated = entry(next, { tx: p + 1, validTime: at }, meta.expanded);
              assert(leaf.entries.some((x) => x.s === edit.e));
              ops.push(
                ...leafChange(
                  this.db,
                  k,
                  leaf,
                  leaf.entries.map((x) => (x.s === edit.e ? updated : x)),
                ),
              );
            }
          }
        }
        if (edit.a === "expiresOn") {
          const cal = await this.db.get<string[]>("join-calendar", p),
            newDates = edit.values.map((v) => {
              assert(typeof v === "string" && W0.parseDate(v) >= 0);
              return W0.endOfDay(W0.parseDate(v));
            });
          const dates = [...new Set([...cal.value, ...newDates.filter((d) => d > at)])].sort();
          if (canonical(dates) !== canonical(cal.value))
            ops.push(...this.db.change("join-calendar", cal, dates));
        }
        if (tail.value.release && noticeInputs.has(edit.a)) {
          const plan = this.notices.plan(
            { ...tail, at: p },
            {
              id,
              kind: "reconcile",
              release: tail.value.release,
              from: tail.value.from,
              validTime: at,
              selection: owner ? { kind: "subjects", ids: [owner] } : { kind: "census" },
            },
            owner,
          );
          ops.push(...plan.operations);
        }
        return { ops, context: { epoch: meta.epoch } };
      },
      undefined,
      at,
    );
  }
}
