import { originalObject, MissingOriginal } from "./recovery.ts";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { checkCensus, ordered } from "./lookup.ts";
import { compilerVersion, differences } from "./rules.ts";
import {
  buildPage,
  width,
  onlyJurisdictions,
  coversDocuments,
  selectPage,
  type Page,
} from "./pages.ts";
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
  owedRecord,
  type DurabilityMode,
  type Body,
  type Head,
  type Epochs,
  type Mask,
  type Recipe,
} from "./model.ts";
import { IndexOverlay } from "./index-overlay.ts";
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
  durability?: DurabilityMode;
  clock?: true;
  helpAfter?: number;
};
const intentRequest = (i: Pick<Intent, "doc" | "from" | "valid" | "durability" | "clock">) =>
  hash([
    "seal",
    i.doc,
    i.from,
    i.valid,
    ...(i.durability ? [i.durability] : []),
    ...(i.clock ? ["clock"] : []),
  ]);
const observedEvent = (c: Cell<Recipe>) =>
  c.value.nativeBasis ? { ...c.value, basis: { ...c.value.basis, tx: c.position } } : c.value;
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
const recipeFormat = hash(["actv-delta/fenced-recipe/2", compilerVersion]);
export const sourceFormats = hash(["actv-delta/fenced-recipe/3", compilerVersion]);
const firstFenceFormat = hash(["actv-delta/fenced-head/1", compilerVersion]);
const legacyFormat = "85f74b77efaf2fb4e7e5d9d019049bcfc109cff98454f202ec2c1726c867d323";
// [DX-ACT2] Why: a rollback reuses immutable rule bytes but still has a distinct epoch. Rejected: copying the entire rule book into every subsequent save.
function packEpochs(h: Head): Epochs {
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
    return a.clock ? [r, t, a.tx, a.seq ?? 0, 1] : [r, t, a.tx, a.seq ?? 0];
  });
  return { docs, names, times, epochs };
}
function unpackHead(
  h: Head & {
    docs?: Record<string, W0.ReleaseDoc>;
    names?: string[];
    times?: string[];
    epochs?: number[][];
  },
): Head {
  if (h.seedTx !== undefined && !h.activations) {
    assert(h.releaseSeq === 0 && Number.isSafeInteger(h.seedTx));
    const { seedTx, ...rest } = h;
    return { ...rest, activations: [releaseEntry(W0.R1, epoch, seedTx)] };
  }
  if (!h.docs) return h;
  const { docs, names, times, epochs, ...fixed } = h;
  if (epochs) {
    assert(names && times);
    return {
      ...fixed,
      activations: epochs.map(([r, t, tx, seq, clock]) => ({
        doc: docs[names[r!]!]!,
        release: names[r!]!,
        from: times[t!]!,
        tx: tx!,
        ...(seq ? { seq } : {}),
        ...(clock ? { clock: true as const } : {}),
      })),
    };
  }
  return { ...fixed, activations: h.activations.map((a) => ({ ...a, doc: docs[a.release]! })) };
}
export class Account {
  readonly keys: SourceKeys;
  readonly overlay: IndexOverlay;
  readonly db: Objects;
  readonly binding: string;
  readonly settleSource?: (debtId: string) => Promise<unknown>;
  private readonly settlingDebt?: Cell<{ command: string }>;
  constructor(
    db: Objects,
    binding: string,
    keyDir?: string,
    settleSource?: (debtId: string) => Promise<unknown>,
    settlingDebt?: Cell<{ command: string }>,
  ) {
    this.settleSource = settleSource;
    this.settlingDebt = settlingDebt;
    this.db = db;
    this.binding = binding;
    this.overlay = new IndexOverlay(db, binding);
    this.keys = new SourceKeys(keyDir, db.account);
  }
  async bootstrap(
    census: readonly string[],
    worlds: readonly W0.World[],
    basis: W0.Basis,
    indexed = true,
    ordinal?: "native",
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
      ...(ordinal ? { ordinal } : {}),
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
  private readonly histories = new Map<string, { bytes: string; position: number }>();
  private async checkedHead(c: Cell<Head>) {
    let stored = c.value;
    let nativeRelease: number | undefined;
    if (stored.history && !stored.activations) {
      const key = "event:" + stored.releaseSeq,
        digest = stored.history;
      let encoded = this.histories.get(digest);
      if (!encoded || encoded.position > c.position) {
        let rec = (await this.db.many<Recipe>([key], c.position)).get(key);
        if (!rec || rec.hash !== digest)
          rec = await originalObject<Recipe>(
            this.db,
            key,
            c.position,
            (v) => hash([this.db.account, key, v]) === digest,
          );
        assert(
          rec.hash === digest &&
            rec.value.kind === "release" &&
            rec.value.seq === stored.releaseSeq &&
            rec.value.history,
          "missing original release history",
        );
        encoded = { bytes: JSON.stringify(rec.value.history), position: rec.position };
        if (this.histories.size >= 32) this.histories.delete(this.histories.keys().next().value!);
        this.histories.set(digest, encoded);
      }
      stored = { ...stored, ...JSON.parse(encoded.bytes) };
      if (stored.ordinal === "native") nativeRelease = encoded.position;
    }
    const checked = unpackHead(stored);
    if (nativeRelease !== undefined) {
      checked.activations = checked.activations.map((a) =>
        a.seq === checked.releaseSeq ? { ...a, tx: nativeRelease! } : a,
      );
      if (checked.seq === checked.releaseSeq)
        checked.basis = { ...checked.basis, tx: nativeRelease };
    }
    c = { ...c, value: checked };
    assert(
      c.value.source === this.binding &&
        [sourceFormats, recipeFormat, legacyFormat, firstFenceFormat].includes(c.value.compiler) &&
        c.value.frontier === c.value.certified,
      "uncertified source/index/publication frontier",
    );
    return c;
  }
  async head(position: number) {
    return this.checkedHead(await this.db.get<Head>("head", position));
  }
  private treeProof(h: Head, value: unknown) {
    const base = hash(value);
    assert.equal(base, h.baseRoot ?? h.root, "index root mismatch");
    assert.equal(h.root, h.index ? hash([base, h.index]) : base, "incorrect overlay commitment");
  }
  async tree(h: Head, position: number) {
    const t = await this.db.get<Tree>("tree", position);
    this.treeProof(h, t.value);
    return t;
  }
  async refs(h: Head, p: number, keys: string[]) {
    if (!keys.length) return new Map<string, Cell<RefMap>>();
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
  async pages(h: Head, position: number, nums: number[], certified?: Cell<Tree>) {
    if (certified) {
      assert(certified.position <= position, "index certificate is newer than the requested cut");
      this.treeProof(h, certified.value);
    }
    const root = certified ?? (await this.tree(h, position)),
      rows = await this.db.many<Page>(
        nums.map((i) => "page:" + i),
        position,
      ),
      out = new Map<number, Cell<Page> & { physical: Cell<Page> }>();
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
      const value = await this.overlay.page(h.index, position, i, cell);
      assert.equal(hash(value.roster), root.value.members[i]);
      out.set(i, { ...cell, value, physical: cell });
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
  async decisionsAt(ids: string[], position: number, valid?: string) {
    // [DX-ACT2] Why: an answer read needs the current release and the source at one cut. Notification history is available through views. Rejected: replaying every earlier dispatch to answer a current policy question.
    const cells = await this.db.many(["head", ...ids.map(keyOf)], position),
      head = (await this.checkedHead(cells.get("head") as Cell<Head>)).value,
      basis = {
        tx: head.ordinal === "native" ? position : head.basis.tx,
        validTime: valid ?? head.basis.validTime,
      },
      release = resolve(head.activations, basis.validTime),
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
      out.set(id, evaluate(worldOf(body, basis, mask), release, basis));
    }
    return { head, out };
  }
  async views(
    ids: string[],
    position: number,
    valid?: string,
    known?: Head,
    inputs?: { rows: Map<string, Cell<Body>>; masks: Map<string, Cell<Mask>> },
  ): Promise<Map<string, View>> {
    const h = known ?? (await this.head(position)).value,
      t = valid ?? h.basis.validTime;
    const rows = inputs?.rows ?? (await this.db.many<Body>(ids.map(keyOf), position)),
      masks = inputs?.masks ?? (await this.masks(ids)),
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
        let event = ev.has(key) ? observedEvent(ev.get(key)!) : undefined;
        if (!event || event.seq !== n || event.basis.tx !== activation.tx) {
          const source = await originalObject<Recipe>(
            this.db,
            key,
            position,
            (x) =>
              x.seq === n &&
              x.kind === "release" &&
              (x.nativeBasis || x.basis.tx === activation.tx),
          );
          event = observedEvent(source);
          ev.set(key, source);
        }

        assert(
          event && event.seq === n && event.basis.tx === activation.tx,
          "missing recipe ancestor",
        );
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
      const basis = { tx: h.ordinal === "native" ? position : h.basis.tx, validTime: t },
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
  private async replay(c: Cell<Claim>, id: string, request: string) {
    assert(c.value.id === id && c.value.request === request, "command identity reused");
    if (c.value.error) throw Error(c.value.error);
    const native = await this.db.comp.transactionByCommand(this.db.entity("cmd:event:" + id));
    assert(native.ok && native.value && native.value.position === c.position);
    return {
      position: c.position,
      txId: String(native.value.txId),
      seq: c.value.seq,
      retry: true,
      bytes: 0,
      operations: 0,
      sourceDebtMs: 0,
    };
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
    const { activations, ...fields } = v.head;
    let head: unknown;
    if (release) {
      assert(v.event);
      // [DX-ACT2] Why: the immutable release event owns the epoch dictionary. Every later source save references its authenticated bytes once. Rejected: logging hundreds of already published epochs in each ordinary save.
      v.event.history = packEpochs(v.head);
      head = {
        ...fields,
        compiler: sourceFormats,
        history: hash([this.db.account, "event:" + v.head.seq, v.event]),
      };
    } else if (fields.history) head = { ...fields, compiler: sourceFormats };
    else if (
      !fields.releaseSeq &&
      activations.length === 1 &&
      activations[0]!.release === W0.R1.hash &&
      activations[0]!.from === epoch
    )
      head = { ...fields, compiler: sourceFormats, seedTx: activations[0]!.tx };
    else head = { ...fields, compiler: sourceFormats, ...packEpochs(v.head) };
    const patches: Patch[] = [...v.patches, { key: "head", value: head, prior: h }];
    if (v.event) patches.push({ key: "event:" + v.head.seq, value: v.event });
    if (fence?.value.durability && release) {
      // [DX-ACT2] Why: the owed debt has its own immutable assertion in the terminal transaction and names the exact replay inputs. Rejected: timing a release marker that leaves no ordered debt record.
      const event = v.event!;
      patches.push({
        key: "owed:" + event.seq,
        value: owedRecord(event, hash([this.db.account, "event:" + event.seq, event])),
      });
    }
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
    return { ...r, seq: v.head.seq, retry: false, sourceDebtMs: 0 };
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
        cells = await this.db.many(
          [key, "fence", "head", ...(this.settlingDebt ? ["deep-debt"] : [])],
          p,
        ),
        prev = cells.get(key) as Cell<Claim> | undefined,
        fence = cells.get("fence") as Cell<Intent> | undefined;
      if (prev) return this.replay(prev, id, request);
      const debt = this.settlingDebt;
      if (debt) {
        const live = cells.get("deep-debt") as Cell<{ command: string }> | undefined;
        assert(
          live &&
            live.id === debt.id &&
            live.hash === debt.hash &&
            live.position === debt.position &&
            id === "repair-" + live.value.command &&
            (!fence || live.position < fence.position),
          "source repair identity does not match the fenced debt",
        );
      }
      if (fence && !this.settlingDebt) {
        await this.help(fence);
        continue;
      }
      const h = await this.checkedHead(cells.get("head") as Cell<Head>),
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
          debt ? [{ op: "retract", id: debt.id }, ...nativeOps] : nativeOps,
          debt
            ? [
                {
                  _tag: "EntityState",
                  entityId: this.db.entity("deep-debt"),
                  tripleIds: [debt.id],
                },
                ...nativePreconditions,
              ]
            : nativePreconditions,
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
  async currentCut(now?: string) {
    for (;;) {
      const p = await this.db.comp.currentPosition(),
        rows = await this.db.many(["fence", ...(now ? ["head"] : [])], p),
        fence = rows.get("fence") as Cell<Intent> | undefined;
      // [DX-ACT2] Why: the issuer normally finishes its own fence. Independent routes only compete after a bounded grace for recovery. Rejected: dispatching duplicate terminal writes on every read of a live fence.
      if (fence && Date.now() >= (fence.value.helpAfter ?? 0)) {
        await this.help(fence);
        continue;
      }
      if (!now) return p;
      const h = (await this.checkedHead(rows.get("head") as Cell<Head>)).value;
      const at = h.basis.validTime;
      assert(W0.isInstant(now) && now >= at, "authoritative clock precedes admitted valid time");
      const day =
        new Date(Date.parse(at.slice(0, 10)) + 86400000).toISOString().slice(0, 10) +
        "T00:00:00.000000Z";
      const due = [
        day,
        ...h.activations.filter((a) => !a.clock).map((a) => a.from),
        ...(h.validBoundaries ?? []),
      ]
        .filter((t) => t > at && t <= now)
        .sort()[0];
      if (!due) return p;
      // A due valid-time boundary still has to be durably recorded before this read returns.
      if (fence) {
        await this.help(fence);
        continue;
      }
      // [DX-ACT2] Why: recover each effective-time boundary in order from persisted inputs, even if all writers went away. Rejected: changing valid time only on a subsequent save.
      await this.seal("clock-" + due, W0.R1, { valid: due, clock: true, durability: "record" });
    }
  }
  async seal(
    id: string,
    rel: W0.CompiledRelease,
    options: {
      from?: string;
      valid?: string;
      durability?: DurabilityMode;
      clock?: true;
      beforeCas?: () => Promise<void>;
      afterFence?: () => Promise<void>;
    } = {},
  ) {
    assert(id.length > 0);
    const input = {
      doc: rel.doc,
      from: options.from ?? null,
      valid: options.valid ?? null,
      ...(options.durability ? { durability: options.durability } : {}),
      ...(options.clock ? { clock: true as const } : {}),
    };
    const request = intentRequest(input),
      value: Intent = {
        id,
        request,
        ...input,
        source: this.binding,
        helpAfter: Date.now() + 250,
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
    assert(i.source === this.binding && i.request === intentRequest(i));
    let p = fresh ? f.position : await this.db.comp.currentPosition(),
      sourceDebtMs = 0;
    const inputs = [key, "fence", "head", "tree", ...(this.settleSource ? ["deep-debt"] : [])];
    let rows = await this.db.many(inputs, p);
    const pending = rows.get("deep-debt");
    // [DX-ACT2] Why: the admission cut already tells us whether a source save won the serial race. Only reconcile that exact debt. Rejected: making every release chase a newer source position before reading the same empty debt.
    if (pending && !rows.has(key)) {
      assert(this.settleSource);
      const started = performance.now(),
        repaired = await this.settleSource(pending.id);
      if (repaired) sourceDebtMs = performance.now() - started;
      p = await this.db.comp.currentPosition();
      rows = await this.db.many(inputs, p);
      assert(rows.has(key) || !rows.has("deep-debt"), "fence still has unresolved source input");
    }
    const done = rows.get(key) as Cell<Claim> | undefined;
    if (done) return this.replay(done, i.id, i.request);
    assert.equal(rows.get("fence")?.id, f.id, "admitted release lost its fence");
    const h = await this.checkedHead(rows.get("head") as Cell<Head>);
    let plan: Awaited<ReturnType<Build>>;
    try {
      this.treeProof(h.value, rows.get("tree")?.value);
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
      return {
        ...(await this.writeEvent(i.id, i.request, h, plan, f, true, [], [])),
        sourceDebtMs,
      };
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
      valid =
        options.clock && options.valid! < h.basis.validTime
          ? h.basis.validTime
          : (options.valid ?? h.basis.validTime),
      from = options.from ?? valid;
    assert(W0.isInstant(valid) && valid >= h.basis.validTime, "retrospective reads cannot publish");
    // [DX-ACT2] Why: the event's own native position supplies the actual ordinal after commit. The fixed source cut is enough to validate the fenced inputs before admission. Rejected: guessing the next global position while neighbors can commit.
    const basis = { tx: h.ordinal === "native" ? p : h.basis.tx + 1, validTime: valid },
      activations = [
        ...h.activations,
        {
          ...releaseEntry(rel, from, basis.tx),
          seq,
          ...(options.clock ? { clock: true as const } : {}),
        },
      ];
    const old = resolve(h.activations, h.basis.validTime),
      next = resolve(activations, valid),
      diff = W0.diff(old, next);
    const full =
      !h.indexed ||
      !coversDocuments(old, next) ||
      valid !== h.indexedAt ||
      valid !== h.basis.validTime ||
      diff.includes("EVSUB");
    const event: Recipe = {
      kind: "release",
      seq,
      parent: h.seq,
      parentHash: c.hash,
      sourceCut: c.position,
      old: old.doc,
      next: next.doc,
      basis,
      ...(h.ordinal === "native" ? { nativeBasis: true as const } : {}),
      previousBasis: h.basis,
      root: h.root,
      census: h.census,
      shape: full ? "full" : "recipe",
    };
    if (event.shape === "full") event.fullCheck = await this.checkFull(event);
    const validBoundaries = h.validBoundaries?.filter((time) => time > valid);
    return {
      head: {
        ...h,
        seq,
        releaseSeq: seq,
        basis,
        activations,
        ...(validBoundaries ? { validBoundaries } : {}),
      },
      event,
      patches: [],
    };
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
