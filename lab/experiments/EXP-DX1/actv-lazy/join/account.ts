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
import { Documents, type Row, type Op } from "../../notify1/store.ts";
import { Dispatcher } from "../../notify1/dispatcher.ts";
import { memberRange, width, type Census } from "../../notify1/census.ts";
import { CLOCK, RELEASE, Conflict, fact, millis, value, type Store } from "../store.ts";
import { calculate, worldsAt, type Proposal, type Point } from "../decision.ts";
import { deepImpact, rawDeep } from "./deep.ts";
import { LazyReader, rosterRoot, rosterSeal } from "../read.ts";
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
};
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
type Marker = {
  joined: string;
  seq: number;
  old: W0.ReleaseDoc | null;
  document: W0.ReleaseDoc;
  release: string;
  cut: number;
  at: string;
  from: string;
  kind: "activation";
  storage: Storage;
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
export class JoinedAccount {
  readonly s: Store;
  lastMaterial = emptyMaterial();
  private readonly calendarListeners = new Set<() => void>();
  onCalendar(listener: () => void) {
    this.calendarListeners.add(listener);
    return () => this.calendarListeners.delete(listener);
  }
  readonly notices: Notices;
  readonly stats = {
    indexPages: 0,
    worlds: 0,
    outputBytes: 0,
    noticeIndexBytes: 0,
    addressBytes: 0,
  };
  constructor(s: Store) {
    this.s = s;
    this.notices = new Notices(s.comp, "joined", {
      identity: selector,
      roster: async (c) => this.roster((await this.meta(c.position)).census, c.position),
      worlds: async (ids, c) =>
        worldsAt(s, s.profile, ids, { tx: c.position, validTime: c.validTime }),
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
            (t.actor === stageActor && stageChanges(this.db.prefix, t.changes)) ||
            (setup &&
              t.actor === "lazy/join-index" &&
              t.changes.every((v: any) => v.entityId.startsWith(this.db.prefix + "join-"))),
          "Unclassified native writer left the joined source open",
        );
      }
    }
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
    const init = new Notices(s.comp, "joined", {
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
        fact(CLOCK, "lazy/slot", { joined: c.generation, kind: "baseline", at }),
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
  private original(id: string, intent: string) {
    return this.s.lookup("joined:" + id).then((r) => {
      if (!r) return null;
      assert(
        r.commandId === "joined:" + id &&
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
  private async command(
    id: string,
    args: unknown,
    plan: (p: number) => Promise<{ ops: any[]; context: object; expected?: number }>,
    hook?: () => Promise<void>,
    through?: string,
  ) {
    assert(
      /^[a-zA-Z0-9_.:-]{1,145}$/.test(id) || (!through && /^deadline\/[a-f0-9]{64}$/.test(id)),
    );
    const intent = h([this.s.scope, id, args]);
    for (;;) {
      const old = await this.original(id, intent);
      if (old) return old;
      const p = await this.s.head();
      if (through) {
        const due = (await this.db.get<string[]>("join-calendar", p)).value[0];
        if (due && due <= through) {
          await this.advance(through);
          continue;
        }
      }
      try {
        const body = await plan(p);
        const r = await this.s.commit(
          "joined:" + id,
          "lazy/join",
          body.ops,
          body.expected ?? p,
          { ...body.context, intent },
          hook,
        );
        assert.equal(r.position, (body.expected ?? p) + 1);
        if (
          r.changes.some(
            (c: { entityId: string }) => c.entityId === this.db.prefix + "join-calendar",
          )
        )
          for (const wake of this.calendarListeners) wake();
        return r;
      } catch (e) {
        const won = await this.original(id, intent);
        if (won) return won;
        if (!(e instanceof Conflict)) throw e;
      }
    }
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
      mode = envelopes ? "all" : strategy(old, next, kind, valid, expanded);
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
    const xs = await this.s.rows([RELEASE], e.at),
      r = xs.find((x) => x.position === e.at);
    assert(r);
    const m = value(r) as Marker & { erasureSeq?: number };
    await recheckErasure(this.s.comp, m.erasureSeq);
    assert(
      m.notice === h(e.value) &&
        m.seq === e.value.sequence &&
        e.value.sourceBefore === e.at - 1 &&
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
    return m;
  }
  dispatcher(sink: Documents) {
    let key = "",
      selection: string[] = [];
    return new Dispatcher(this.notices, sink, async (e, start) => {
      if (key !== e.id) {
        const m = await this.marker(e),
          meta = await this.meta(m.cut);
        selection = await this.choose(
          meta,
          m.cut,
          m.at,
          m.old ? W0.compileRelease(m.old) : undefined,
          W0.compileRelease(m.document),
          "notice",
        );
        key = e.id;
      }
      assert(start >= 0 && start <= selection.length && start % width === 0);
      return { ids: selection.slice(start, start + width), size: selection.length };
    });
  }
  async publish(
    id: string,
    doc: W0.ReleaseDoc,
    at: string,
    storage: Storage = "stored",
    hook?: () => Promise<void>,
    options: PublishOptions = {},
  ) {
    doc = structuredClone(doc);
    const next = W0.compileRelease(doc);
    assert(["owed", "stored", "envelopes", "staged"].includes(storage) && W0.isInstant(at));
    const workers = options.workers ?? 1,
      small = storage === "staged" && options.codec !== "legacy";
    assert(Number.isInteger(workers) && workers >= 1 && workers <= 8);
    const priceStart = performance.now();
    const sequence = (await readErasure(this.s.comp))?.seq;
    this.lastMaterial = emptyMaterial();
    return withErasure(sequence, () =>
      this.command(
        id,
        ["publish", doc, at, storage, options.sources ?? "native", workers, small],
        async (p) => {
          const { meta, c, tail } = await this.state(p);
          assert(at >= c.at);
          const prev = c.releases.toSorted((a, b) => b.tx - a.tx)[0];
          const old = prev ? W0.compileRelease(prev.document) : undefined;
          const req: Request = {
            id,
            document: doc,
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
            old: old?.doc ?? null,
            document: doc,
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
          };
          if (sequence !== undefined) await recheckErasure(this.s.comp, sequence);
          return {
            ops: [fact(RELEASE, "lazy/activation", m), ...np.operations, ...ops],
            expected,
            context: {
              epoch: meta.epoch,
              notice: m.notice,
              output: m.output,
              stage: header?.attempt ?? null,
            },
          };
        },
        hook,
        at,
      ),
    );
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
  async advance(at: string) {
    assert(W0.isInstant(at));
    for (;;) {
      const p = await this.s.head(),
        calendar = await this.db.get<string[]>("join-calendar", p),
        due = calendar.value[0];
      if (!due || due > at) return;
      const id = "deadline/" + sha256(due);
      await this.command(id, ["deadline", due], async (k) => {
        const { meta, c, tail } = await this.state(k),
          cal = await this.db.get<string[]>("join-calendar", k);
        assert(cal.value[0] === due && c.at <= due);
        const ops: any[] = [
          ...this.db.change("join-calendar", cal, cal.value.slice(1)),
          ...(c.clock ? [{ op: "retract", id: c.clock.id }] : []),
          fact(CLOCK, "lazy/slot", { joined: meta.epoch, kind: "due", at: due }),
        ];
        // [DX-ACT1] Why: passage through an enrolled valid-time boundary may change posting inputs without a save. Rejected: treating the original page as authoritative beyond its first unprocessed boundary.
        if (!(await this.db.row("join-invalid", k)))
          ops.push(this.db.put("join-invalid", { source: k + 1, compiler: selector }));
        if (tail.value.release)
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
  async saveDeep(id: string, person: number, submitted: readonly Op[], at: string) {
    assert(
      this.s.profile === "act2-deep" &&
        W0.isInstant(at) &&
        Number.isSafeInteger(person) &&
        person >= 0,
    );
    const source = structuredClone(submitted),
      subject = W0.placementId(person);
    return this.command(
      id,
      ["deep-save", subject, source, at],
      async (p) => {
        const { meta, c, tail } = await this.state(p);
        assert(at >= c.at && source.length > 0);
        const [addr, raw] = await Promise.all([
          this.db.get<number>(address(subject), p),
          rawDeep(this.s, person, { tx: p, validTime: at }),
        ]);
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
          fact(CLOCK, "lazy/slot", { joined: meta.epoch, kind: "source", at }),
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
            ).operations,
          );
        return { ops, context: { epoch: meta.epoch, subject } };
      },
      undefined,
      at,
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
        const owner = classified.owner,
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
          fact(CLOCK, "lazy/slot", { joined: meta.epoch, kind: "source", at }),
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
