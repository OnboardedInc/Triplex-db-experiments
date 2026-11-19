import { originalObject, MissingOriginal } from "./recovery.ts";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { checkCensus, ordered } from "./lookup.ts";
import { compilerVersion, differences } from "./rules.ts";
import { buildPage, width, onlyJurisdictions, selectPage, type Page } from "./pages.ts";
import { Objects, hash, Conflict, type Cell, type Patch } from "./store.ts";
import {
  epoch,
  evaluate,
  resolve,
  seedFacts,
  worldOf,
  stateOf,
  stateText,
  releaseEntry,
  type Body,
  type Head,
  type Mask,
  type Recipe,
} from "./model.ts";
import { SourceKeys } from "./secrets.ts";

type Tree = { pages: string[]; members: string[]; refs: Record<string, string> };
const refsOf = (w: W0.World) => [
  ...new Set(
    w.facts.flatMap((f) => (f.a === "location" || f.a === "jurisdiction" ? [String(f.v)] : [])),
  ),
];
const refKey = (s: string) => "ref:" + hash(s).slice(0, 2);
type Intent = {
  id: string;
  request: string;
  doc: W0.ReleaseDoc;
  from: string | null;
  valid: string | null;
  source: string;
};
type Claim = { id: string; request: string; seq: number; error?: string };
type Build = (
  p: number,
  h: Cell<Head>,
) => Promise<{ patches: Patch[]; head: Head; event?: Recipe }>;
type RefMap = Record<string, number[]>;
export type View = {
  head: Head;
  body: Body;
  output: W0.Output;
  state: W0.OutboxState;
  token: string;
};
const keyOf = (s: string) => "point:" + s;
// [DX-ACT2] Why: stored recipes bind the rule and encoding version; each measured binary is bound separately in the attempt. Rejected: rejecting a valid old recipe after a performance-only change to source text.
export const sourceFormats = hash(["actv-delta/fenced-head/1", compilerVersion]);
const legacyFormat = "85f74b77efaf2fb4e7e5d9d019049bcfc109cff98454f202ec2c1726c867d323";
// [DX-ACT2] Why: a rollback reuses immutable rule bytes but still has a distinct epoch. Rejected: copying the entire rule book into every subsequent save.
function packHead(h: Head): unknown {
  const docs: Record<string, W0.ReleaseDoc> = {},
    names: string[] = [],
    times: string[] = [];
  const epochs = h.activations.map((a) => {
    let r = names.indexOf(a.release);
    if (r < 0) {
      r = names.length;
      names.push(a.release);
      docs[a.release] = a.doc;
    }
    let t = times.indexOf(a.from);
    if (t < 0) {
      t = times.length;
      times.push(a.from);
    }
    return [r, t, a.tx, (a as typeof a & { seq?: number }).seq ?? 0];
  });
  const { activations, ...fixed } = h;
  return { ...fixed, compiler: sourceFormats, docs, names, times, epochs };
}
function unpackHead(
  h: Head & {
    docs?: Record<string, W0.ReleaseDoc>;
    names?: string[];
    times?: string[];
    epochs?: number[][];
  },
): Head {
  if (!h.docs) return h;
  const { docs, names, times, epochs, ...fixed } = h;
  if (epochs) {
    assert(names && times);
    return {
      ...fixed,
      activations: epochs.map(([r, t, tx, seq]) => ({
        doc: docs[names[r!]!]!,
        release: names[r!]!,
        from: times[t!]!,
        tx: tx!,
        ...(seq ? { seq } : {}),
      })),
    };
  }
  return { ...fixed, activations: h.activations.map((a) => ({ ...a, doc: docs[a.release]! })) };
}
export class Account {
  readonly keys: SourceKeys;
  readonly db: Objects;
  readonly binding: string;
  readonly settleSource?: () => Promise<unknown>;
  readonly settlingDebt: boolean;
  constructor(
    db: Objects,
    binding: string,
    keyDir?: string,
    settleSource?: () => Promise<unknown>,
    settlingDebt = false,
  ) {
    this.settleSource = settleSource;
    this.settlingDebt = settlingDebt;
    this.db = db;
    this.binding = binding;
    this.keys = new SourceKeys(keyDir, db.account);
  }
  async bootstrap(
    census: readonly string[],
    worlds: readonly W0.World[],
    basis: W0.Basis,
    indexed = true,
  ) {
    assert(census.length > 0 && !W0.checkBasis(basis));
    const censusHash = checkCensus(
      census,
      worlds.map((w) => w.subject),
    );
    const start = await this.db.comp.currentPosition();
    assert(!(await this.db.many(["head", "bootstrap"], start)).size, "account already exists");
    // [DX-ACT2] Why: a unique bootstrap claim prevents abandoned partial seeds from contributing to another baseline. Rejected: accepting existing page keys after a crash.
    await this.db.commit(
      "bootstrap",
      [{ key: "bootstrap", value: { censusHash, basis, binding: this.binding } }],
      [{ key: "bootstrap", cell: undefined }],
    );
    const byId = new Map(worlds.map((w) => [w.subject, w])),
      tree: Tree = { pages: [], members: [], refs: {} },
      refs = new Map<string, RefMap>(),
      shared = new Map<string, W0.Fact[]>();
    let facts = 0,
      bytes = 0;
    for (let from = 0; from < census.length; from += width) {
      const number = from / width,
        ids = census.slice(from, from + width),
        patches: Patch[] = [];
      const batch = ids.map((id) => {
        const raw = byId.get(id)!;
        facts += raw.facts.length;
        const world = { subject: id, facts: seedFacts(raw, basis) };
        const grouped = new Map<string, W0.Fact[]>();
        for (const f of world.facts)
          if (f.e.startsWith("loc:") || f.e.startsWith("jur:")) {
            const a = grouped.get(f.e) ?? [];
            a.push(f);
            grouped.set(f.e, a);
          }
        for (const [e, fs] of grouped) {
          const prior = shared.get(e);
          fs.sort((a, b) => ordered(a.a, b.a));
          if (prior) assert.deepEqual(prior, fs);
          else shared.set(e, fs);
        }
        const output = evaluate(world, W0.R1, basis),
          state = W0.publish(W0.EMPTY_OUTBOX, [W0.recordOf(output)]).state;
        const body: Body = {
          subject: id,
          page: number,
          seed: world.facts,
          changes: [],
          seen: 0,
          state: stateText(state),
        };
        patches.push({ key: keyOf(id), value: this.keys.convert(body, "write") });
        for (const e of refsOf(world)) {
          const slot = refKey(e),
            m = refs.get(slot) ?? {};
          const list = (m[e] ??= []);
          if (list.at(-1) !== number) list.push(number);
          refs.set(slot, m);
        }
        return world;
      });
      const page = buildPage(batch, basis, indexed);
      tree.pages.push(hash(page));
      tree.members.push(hash(ids));
      patches.push({ key: "page:" + number, value: page }, { key: "roster:" + number, value: ids });
      bytes += (await this.db.commit("seed:" + number, patches)).bytes;
    }
    tree.refs = Object.fromEntries([...refs].map(([k, v]) => [k, hash(v)]));
    const extras: Patch[] = [...refs].map(([key, value]) => ({ key, value }));
    for (const [e, seed] of shared)
      extras.push({ key: "shared:" + e, value: { seed, changes: [] } });
    for (let at = 0; at < extras.length; at += 128)
      bytes += (await this.db.commit("catalog:" + at, extras.slice(at, at + 128))).bytes;
    const h: Head = {
      seq: 0,
      releaseSeq: 0,
      basis,
      activations: [releaseEntry(W0.R1, epoch, basis.tx)],
      root: hash(tree),
      census: censusHash,
      size: census.length,
      certified: 0,
      frontier: 0,
      erasure: 0,
      indexed,
      indexedAt: basis.validTime,
      source: this.binding,
      compiler: sourceFormats,
    };
    const init = await this.db.commit(
      "initialize",
      [
        { key: "tree", value: tree },
        { key: "head", value: h },
      ],
      [{ key: "head", cell: undefined }],
    );
    return {
      position: init.position,
      facts,
      bytes: bytes + init.bytes,
      census: censusHash,
      root: h.root,
    };
  }
  private checkedHead(c: Cell<Head>) {
    c = { ...c, value: unpackHead(c.value) };
    assert(
      c.value.source === this.binding &&
        (c.value.compiler === sourceFormats || c.value.compiler === legacyFormat) &&
        c.value.frontier === c.value.certified,
      "uncertified source/index/publication frontier",
    );
    return c;
  }
  async head(position: number) {
    return this.checkedHead(await this.db.get<Head>("head", position));
  }
  async tree(h: Head, position: number) {
    const t = await this.db.get<Tree>("tree", position);
    assert.equal(hash(t.value), h.root, "index root mismatch");
    return t;
  }
  async refs(h: Head, p: number, keys: string[]) {
    const root = await this.tree(h, p),
      cs = await this.db.many<RefMap>(keys, p);
    for (const k of keys) {
      let c = cs.get(k);
      const wanted = root.value.refs[k];
      if (wanted && (!c || hash(c.value) !== wanted)) {
        c = await originalObject<RefMap>(this.db, k, p, (v) => hash(v) === wanted);
        cs.set(k, c);
      }
      assert.equal(
        c ? hash(c.value) : undefined,
        root.value.refs[k],
        "missing or stale reverse index",
      );
    }
    return cs;
  }
  async pages(h: Head, position: number, nums: number[]) {
    const root = await this.tree(h, position),
      rows = await this.db.many<Page>(
        nums.map((i) => "page:" + i),
        position,
      ),
      out = new Map<number, Cell<Page>>();
    for (const i of nums) {
      const key = "page:" + i;
      let cell = rows.get(key);
      if (!cell || hash(cell.value) !== root.value.pages[i])
        cell = await originalObject<Page>(
          this.db,
          key,
          position,
          (p) => hash(p) === root.value.pages[i],
        );

      assert(
        cell &&
          hash(cell.value) === root.value.pages[i] &&
          hash(cell.value.roster) === root.value.members[i],
        "index or roster page mismatch",
      );
      out.set(i, cell);
    }
    return out;
  }
  async censusAt(h: Head, p: number) {
    const t = await this.tree(h, p),
      keys = t.value.members.map((_, i) => "roster:" + i),
      cells = await this.db.many<string[]>(keys, p);
    const ids = keys.flatMap((k, i) => {
      const v = cells.get(k)?.value;
      assert(v && hash(v) === t.value.members[i], "missing certified census partition");
      return v;
    });
    assert.equal(hash(ids), h.census, "census digest mismatch");
    assert.equal(ids.length, h.size);
    return ids;
  }
  async masks(ids: string[]) {
    const latest = await this.db.comp.currentPosition();
    return this.db.many<Mask>(
      ids.map((s) => "mask:" + s),
      latest,
    );
  }
  async decisionsAt(ids: string[], position: number) {
    // [DX-ACT2] Why: an answer read needs the current release and the source at one cut. Notification history is available through views. Rejected: replaying every earlier dispatch to answer a current policy question.
    const cells = await this.db.many(["head", ...ids.map(keyOf)], position),
      head = this.checkedHead(cells.get("head") as Cell<Head>).value,
      release = resolve(head.activations, head.basis.validTime),
      masks = await this.masks(ids),
      out = new Map<string, W0.Output>();
    for (const id of ids) {
      const raw = cells.get(keyOf(id)) as Cell<Body> | undefined;
      assert(raw && raw.value.subject === id, "subject outside account census");
      let mask = masks.get("mask:" + id)?.value,
        body: Body;
      try {
        body = this.keys.convert(raw.value, "read", mask);
      } catch (e) {
        mask = (await this.masks([id])).get("mask:" + id)?.value;
        if (!mask) throw e;
        body = this.keys.convert(raw.value, "read", mask);
      }
      out.set(id, evaluate(worldOf(body, head.basis, mask), release, head.basis));
    }
    return { head, out };
  }
  async views(
    ids: string[],
    position: number,
    valid?: string,
    known?: Head,
  ): Promise<Map<string, View>> {
    const h = known ?? (await this.head(position)).value,
      t = valid ?? h.basis.validTime;
    const rows = await this.db.many<Body>(ids.map(keyOf), position),
      masks = await this.masks(ids),
      result = new Map<string, View>();
    const earliest = Math.min(...[...rows.values()].map((c) => c.value.seen));
    const seqs = h.activations
      .map((a) => (a as typeof a & { seq?: number }).seq ?? 0)
      .filter((n) => n > earliest);
    const ev = await this.db.many<Recipe>(
      seqs.map((n) => "event:" + n),
      position,
    );
    const releases = new Map<string, W0.CompiledRelease>();
    const compiled = (doc: W0.ReleaseDoc) => {
      const k = JSON.stringify(doc);
      let r = releases.get(k);
      if (!r) {
        r = W0.compileRelease(doc);
        releases.set(k, r);
      }
      return r;
    };
    const current = resolve(h.activations, t);
    for (const id of ids) {
      const cell = rows.get(keyOf(id));
      assert(cell && cell.value.subject === id, "subject outside account census");
      let mask = masks.get("mask:" + id)?.value,
        body: Body;
      try {
        body = this.keys.convert(cell.value, "read", mask);
      } catch (e) {
        const fresh = (await this.masks([id])).get("mask:" + id)?.value;
        if (!fresh) throw e;
        mask = fresh;
        body = this.keys.convert(cell.value, "read", mask);
      }

      let state = stateOf(body.state);
      for (const n of seqs) {
        if (n <= body.seen) continue;
        const key = "event:" + n,
          activation = h.activations.find((a) => (a as typeof a & { seq?: number }).seq === n)!;
        let event = ev.get(key)?.value;
        if (!event || event.seq !== n || event.basis.tx !== activation.tx) {
          const source = await originalObject<Recipe>(
            this.db,
            key,
            position,
            (x) => x.seq === n && x.kind === "release" && x.basis.tx === activation.tx,
          );
          event = source.value;
          ev.set(key, source);
        }

        assert(event && event.seq === n, "missing recipe ancestor");
        if (mask && event.basis.tx < mask.tx) {
          const retained = mask.published?.[n];
          assert(retained, "erasure restore lacks original publication state");
          state = stateOf(retained);
          continue;
        }
        const old = compiled(event.next);
        state = W0.publish(state, [
          W0.recordOf(evaluate(worldOf(body, event.basis, mask), old, event.basis)),
        ]).state;
      }
      const basis = { ...h.basis, validTime: t },
        output = evaluate(worldOf(body, basis, mask), current, basis);
      const token = hash([
        this.db.account,
        h.source,
        h.releaseSeq,
        cell.hash,
        h.frontier,
        h.erasure,
        basis,
        output.release,
        hash(output.workItems),
      ]);
      result.set(id, { head: h, body, output, state, token });
    }
    return result;
  }
  async readAt(subject: string, position: number, valid?: string) {
    return (await this.views([subject], position, valid)).get(subject)!;
  }
  async selected(e: Recipe) {
    const h = (await this.head(e.sourceCut)).value;
    assert.equal(h.root, e.root);
    assert.equal(h.census, e.census);
    const old = W0.compileRelease(e.old),
      next = W0.compileRelease(e.next),
      js = onlyJurisdictions(old, next);
    const subjects: string[] = [],
      flags: [string, boolean, boolean][] = [];
    let numbers = Array.from({ length: Math.ceil(h.size / width) }, (_, i) => i);
    if (e.shape === "full")
      return {
        subjects: await this.censusAt(h, e.sourceCut),
        flags,
        yielded: 0,
        seeks: 0,
        pages: 0,
        full: true,
      };
    let pages: Map<number, Cell<Page>>;
    try {
      if (js !== null) {
        const refs = await this.refs(h, e.sourceCut, js.map(refKey));
        numbers = [...new Set(js.flatMap((j) => refs.get(refKey(j))?.value[j] ?? []))].sort(
          (a, b) => a - b,
        );
      }
      pages = await this.pages(h, e.sourceCut, numbers);
    } catch (err) {
      if (!(err instanceof MissingOriginal)) throw err;
      const ids = await this.censusAt(h, e.sourceCut);
      for (let i = 0; i < ids.length; i += width) {
        const batch = await this.views(ids.slice(i, i + width), e.sourceCut, undefined, h);
        for (const [id, v] of batch)
          if (differences(worldOf(v.body, e.basis), e.basis, old, next).length) subjects.push(id);
      }
      return { subjects, flags, yielded: 0, seeks: 0, pages: 0, full: true };
    }
    let yielded = 0,
      seeks = 0;
    for (const cell of pages.values()) {
      const p = selectPage(cell.value, old, next, e.basis, false);
      subjects.push(...p.subjects);
      flags.push(...p.flags);
      yielded += p.yielded;
      seeks += p.seeks;
    }
    return {
      subjects: subjects.sort(),
      yielded,
      seeks,
      pages: pages.size,
      full: false,
      flags: flags.sort((a, b) => ordered(a[0], b[0])),
    };
  }
  private async checkFull(event: Recipe) {
    const prior = (await this.head(event.sourceCut)).value,
      census = await this.censusAt(prior, event.sourceCut),
      next = W0.compileRelease(event.next),
      digest = createHash("sha256");
    // [DX-ACT2] Why: an unindexed rule or clock crossing must validate the full input and actual publication predecessor before acknowledging coverage. Rejected: deferring this first validation to the dispatcher (a bad subject would surface after ACK).
    for (let i = 0; i < census.length; i += width) {
      const views = await this.views(census.slice(i, i + width), event.sourceCut, undefined, prior);
      for (const [s, view] of views) {
        const output = evaluate(worldOf(view.body, event.basis), next, event.basis),
          published = W0.publish(view.state, [W0.recordOf(output)]);
        digest.update(hash([s, W0.outputJson(output), W0.publishJson(published)]) + "\n");
      }
    }
    return { people: census.length, digest: digest.digest("hex") };
  }
  private replay(c: Cell<Claim>, id: string, request: string) {
    assert(c.value.id === id && c.value.request === request, "command identity reused");
    if (c.value.error) throw Error(c.value.error);
    return { position: c.position, seq: c.value.seq, retry: true, bytes: 0, operations: 0 };
  }
  private async writeEvent(
    id: string,
    request: string,
    h: Cell<Head>,
    v: Awaited<ReturnType<Build>>,
    fence: Cell<Intent> | undefined,
    release: boolean,
    nativeOps: readonly unknown[],
    conditions: readonly unknown[],
  ) {
    const key = "claim:" + hash(id);
    const patches: Patch[] = [...v.patches, { key: "head", value: packHead(v.head), prior: h }];
    if (v.event) patches.push({ key: "event:" + v.head.seq, value: v.event });
    patches.push({ key, value: { id, request, seq: v.head.seq } });
    const r = await this.db.commit(
      "event:" + id,
      patches,
      [
        { key: "head", cell: h },
        { key, cell: undefined },
        { key: "fence", cell: fence },
      ],
      release ? [...nativeOps, { op: "retract", id: fence!.id }] : nativeOps,
      conditions,
    );
    return { ...r, seq: v.head.seq, retry: false };
  }
  async command(
    id: string,
    request: string,
    run: Build,
    beforeCas?: () => Promise<void>,
    nativeOps: readonly unknown[] = [],
    nativePreconditions: readonly unknown[] = [],
  ) {
    assert(id.length > 0);
    const key = "claim:" + hash(id);
    for (let attempt = 0; attempt < 32; attempt++) {
      const p = await this.db.comp.currentPosition(),
        cells = await this.db.many([key, "fence", "head"], p),
        prev = cells.get(key) as Cell<Claim> | undefined,
        fence = cells.get("fence") as Cell<Intent> | undefined;
      if (prev) return this.replay(prev, id, request);
      if (fence && !this.settlingDebt) {
        await this.help(fence);
        continue;
      }
      const h = this.checkedHead(cells.get("head") as Cell<Head>),
        v = await run(p, h);
      if (attempt === 0) await beforeCas?.();
      try {
        return await this.writeEvent(
          id,
          request,
          h,
          v,
          fence,
          false,
          nativeOps,
          nativePreconditions,
        );
      } catch (e) {
        if (!(e instanceof Conflict)) throw e;
      }
    }
    throw Error("account CAS retry limit");
  }
  private async help(f: Cell<Intent>) {
    try {
      await this.finish(f);
    } catch (e) {
      const k = "claim:" + hash(f.value.id),
        p = await this.db.comp.currentPosition(),
        terminal = (await this.db.many<Claim>([k], p)).get(k);
      if (!terminal?.value.error || terminal.value.request !== f.value.request) throw e;
    }
  }
  async settleFence(p: number) {
    const f = (await this.db.many<Intent>(["fence"], p)).get("fence");
    if (f) await this.help(f);
    return !!f;
  }
  async seal(
    id: string,
    rel: W0.CompiledRelease,
    options: {
      from?: string;
      valid?: string;
      beforeCas?: () => Promise<void>;
      afterFence?: () => Promise<void>;
    } = {},
  ) {
    assert(id.length > 0);
    const request = hash(["seal", rel.doc, options.from ?? null, options.valid ?? null]),
      value: Intent = {
        id,
        request,
        doc: rel.doc,
        from: options.from ?? null,
        valid: options.valid ?? null,
        source: this.binding,
      },
      key = "claim:" + hash(id);
    await options.beforeCas?.();
    for (;;) {
      // [DX-ACT2] Why: only publishers contend for admission. A save already at the serial point is included, and every later save checks this fence in its native transaction. Rejected: reserving the mutable source head (a burst can keep invalidating the seal).
      let admission;
      try {
        admission = await this.db.commit(
          "fence:" + id,
          [{ key: "fence", value }],
          [
            { key: "fence", cell: undefined },
            { key, cell: undefined },
          ],
        );
      } catch (e) {
        if (!(e instanceof Conflict)) throw e;
        const p = await this.db.comp.currentPosition(),
          rows = await this.db.many([key, "fence"], p),
          claim = rows.get(key) as Cell<Claim> | undefined,
          f = rows.get("fence") as Cell<Intent> | undefined;
        if (claim) return this.replay(claim, id, request);
        if (f) {
          if (f.value.id === id) assert.equal(f.value.request, request, "command identity reused");
          await this.help(f);
          continue;
        }
        continue;
      }
      await options.afterFence?.();
      const sealed = await this.finish(
        {
          value,
          hash: hash([this.db.account, "fence", value]),
          position: admission.position,
          id: admission.ids.get(this.db.entity("fence"))!,
        },
        true,
      );
      return {
        ...sealed,
        retry: false,
        operations: sealed.operations + admission.operations,
        bytes: sealed.bytes + admission.bytes,
      };
    }
  }
  private readonly completing = new Map<string, ReturnType<Account["completeFence"]>>();
  private finish(f: Cell<Intent>, fresh = false) {
    const pending = this.completing.get(f.id);
    if (pending) return pending;
    const work = this.completeFence(f, fresh).finally(() => this.completing.delete(f.id));
    this.completing.set(f.id, work);
    return work;
  }
  private async completeFence(f: Cell<Intent>, fresh: boolean) {
    const i = f.value,
      key = "claim:" + hash(i.id);
    assert(i.source === this.binding && i.request === hash(["seal", i.doc, i.from, i.valid]));
    await this.settleSource?.();
    const p = fresh && !this.settleSource ? f.position : await this.db.comp.currentPosition(),
      rows = await this.db.many([key, "head", "fence", "tree"], p),
      done = rows.get(key) as Cell<Claim> | undefined;
    if (done) return this.replay(done, i.id, i.request);
    assert.equal(rows.get("fence")?.id, f.id, "admitted release lost its fence");
    const h = this.checkedHead(rows.get("head") as Cell<Head>);
    let plan: Awaited<ReturnType<Build>>;
    try {
      assert.equal(hash(rows.get("tree")?.value), h.value.root, "index root mismatch");
      plan = await this.releasePlan(p, h, i);
    } catch (e) {
      // [DX-ACT2] Why: malformed input cannot strand ordinary writers. Only reject the same fenced predecessor. Rejected: expiring a live owner's lease by wall clock.
      if (
        !(e instanceof assert.AssertionError || (e instanceof Error && /^W0[.]E_/.test(e.message)))
      )
        throw e;
      try {
        await this.db.commit(
          "reject:" + i.id,
          [{ key, value: { id: i.id, request: i.request, seq: h.value.seq, error: e.message } }],
          [
            { key: "fence", cell: f },
            { key: "head", cell: h },
            { key, cell: undefined },
          ],
          [{ op: "retract", id: f.id }],
        );
      } catch (other) {
        if (!(other instanceof Conflict)) throw other;
      }
      throw e;
    }
    try {
      return await this.writeEvent(i.id, i.request, h, plan, f, true, [], []);
    } catch (e) {
      if (!(e instanceof Conflict)) throw e;
      // [DX-ACT2] Why: a concurrent helper can only have committed these identical bytes. Rejected: retrying release evaluation on ordinary save contention.
      return this.replay(
        await this.db.get<Claim>(key, await this.db.comp.currentPosition()),
        i.id,
        i.request,
      );
    }
  }
  private async releasePlan(p: number, c: Cell<Head>, options: Intent) {
    const rel = W0.compileRelease(options.doc);
    const h = c.value,
      seq = h.seq + 1,
      valid = options.valid ?? h.basis.validTime,
      from = options.from ?? valid;
    assert(W0.isInstant(valid) && valid >= h.basis.validTime, "retrospective reads cannot publish");
    const basis = { tx: h.basis.tx + 1, validTime: valid },
      activations = [...h.activations, { ...releaseEntry(rel, from, basis.tx), seq }];
    const old = resolve(h.activations, h.basis.validTime),
      next = resolve(activations, valid),
      diff = W0.diff(old, next);
    const full =
      !h.indexed || valid !== h.indexedAt || valid !== h.basis.validTime || diff.includes("EVSUB");
    const event: Recipe = {
      kind: "release",
      seq,
      parent: h.seq,
      parentHash: c.hash,
      sourceCut: c.position,
      old: old.doc,
      next: next.doc,
      basis,
      previousBasis: h.basis,
      root: h.root,
      census: h.census,
      shape: full ? "full" : "recipe",
    };
    if (event.shape === "full") event.fullCheck = await this.checkFull(event);
    return { head: { ...h, seq, releaseSeq: seq, basis, activations }, event, patches: [] };
  }
  async admit(id: string, v: View, beforeCas?: () => Promise<void>) {
    return this.command(
      id,
      hash(["admit", v.token, W0.outputJson(v.output)]),
      async (p, c) => {
        const now = await this.readAt(v.output.subject, p);
        assert(
          v.token === now.token &&
            W0.outputJson(v.output) === W0.outputJson(now.output) &&
            v.output.basis.validTime === c.value.basis.validTime,
          "stale live result",
        );
        const cell = await this.db.get<Body>(keyOf(v.output.subject), p),
          seq = c.value.seq + 1;
        const applied = W0.publish(now.state, [W0.recordOf(now.output)]).state;
        return {
          head: { ...c.value, seq },
          patches: [
            {
              key: keyOf(v.output.subject),
              prior: cell,
              value: { ...cell.value, state: stateText(applied), seen: c.value.releaseSeq },
            },
          ],
          event: {
            kind: "save",
            seq,
            parent: c.value.seq,
            parentHash: c.hash,
            sourceCut: p,
            old: resolve(c.value.activations, c.value.basis.validTime).doc,
            next: resolve(c.value.activations, c.value.basis.validTime).doc,
            basis: c.value.basis,
            previousBasis: c.value.basis,
            root: c.value.root,
            census: c.value.census,
            shape: "live",
            subjects: [v.output.subject],
          },
        };
      },
      beforeCas,
    );
  }
}
