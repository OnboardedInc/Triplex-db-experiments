import { originalObject, MissingOriginal } from "./recovery.ts";
import { readFileSync } from "node:fs";
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
type RefMap = Record<string, number[]>;
export type View = {
  head: Head;
  body: Body;
  output: W0.Output;
  state: W0.OutboxState;
  token: string;
};
const keyOf = (s: string) => "point:" + s;
export const sourceFormats = hash([
  "actv-delta/1",
  compilerVersion,
  ...["rules", "pages", "model", "save", "account", "store", "dispatch", "secrets", "recovery"].map(
    (n) => hash(readFileSync(new URL(n + ".ts", import.meta.url), "utf8")),
  ),
]);
export class Account {
  readonly keys: SourceKeys;
  readonly db: Objects;
  readonly binding: string;
  constructor(db: Objects, binding: string, keyDir?: string) {
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
  async head(position: number) {
    const c = await this.db.get<Head>("head", position);
    assert(
      c.value.source === this.binding &&
        c.value.compiler === sourceFormats &&
        c.value.frontier === c.value.certified,
      "uncertified source/index/publication frontier",
    );
    return c;
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
    const seqs = h.activations
      .map((a) => (a as typeof a & { seq?: number }).seq ?? 0)
      .filter((n) => n > 0);
    const ev = await this.db.many<Recipe>(
      seqs.map((n) => "event:" + n),
      position,
    );
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
        const old = resolve(
          h.activations.filter((a) => a.tx <= event.basis.tx),
          event.basis.validTime,
        );
        state = W0.publish(state, [
          W0.recordOf(evaluate(worldOf(body, event.basis, mask), old, event.basis)),
        ]).state;
      }
      const basis = { ...h.basis, validTime: t },
        output = evaluate(worldOf(body, basis, mask), resolve(h.activations, t), basis);
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
  async command(
    id: string,
    request: string,
    run: (p: number, h: Cell<Head>) => Promise<{ patches: Patch[]; head: Head; event?: Recipe }>,
    beforeCas?: () => Promise<void>,
    nativeOps: readonly unknown[] = [],
    nativePreconditions: readonly unknown[] = [],
  ) {
    assert(id.length > 0);
    const key = "claim:" + hash(id);
    for (let attempt = 0; attempt < 32; attempt++) {
      const p = await this.db.comp.currentPosition(),
        prev = (await this.db.many<{ id: string; request: string; seq: number }>([key], p)).get(
          key,
        );
      if (prev) {
        assert(prev.value.id === id && prev.value.request === request, "command identity reused");
        return {
          position: prev.position,
          seq: prev.value.seq,
          retry: true,
          bytes: 0,
          operations: 0,
        };
      }
      const h = await this.head(p),
        v = await run(p, h);
      const patches = [...v.patches, { key: "head", value: v.head, prior: h }];
      if (v.event) patches.push({ key: "event:" + v.head.seq, value: v.event });
      patches.push({ key, value: { id, request, seq: v.head.seq } });
      if (attempt === 0) await beforeCas?.();
      try {
        const r = await this.db.commit(
          "event:" + id,
          patches,
          [
            { key: "head", cell: h },
            { key, cell: undefined },
          ],
          nativeOps,
          nativePreconditions,
        );
        return { ...r, seq: v.head.seq, retry: false };
      } catch (error) {
        if (!(error instanceof Conflict)) throw error;
      }
    }
    throw Error("account CAS retry limit");
  }
  async seal(
    id: string,
    rel: W0.CompiledRelease,
    options: { from?: string; valid?: string; beforeCas?: () => Promise<void> } = {},
  ) {
    return this.command(
      id,
      hash(["seal", rel.doc, options.from ?? null, options.valid ?? null]),
      async (p, c) => {
        const h = c.value,
          seq = h.seq + 1,
          valid = options.valid ?? h.basis.validTime,
          from = options.from ?? valid;
        assert(
          W0.isInstant(valid) && valid >= h.basis.validTime,
          "retrospective reads cannot publish",
        );
        const basis = { tx: h.basis.tx + 1, validTime: valid },
          activations = [...h.activations, { ...releaseEntry(rel, from, basis.tx), seq }];
        const old = resolve(h.activations, h.basis.validTime),
          next = resolve(activations, valid),
          diff = W0.diff(old, next);
        const full =
          !h.indexed ||
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
          previousBasis: h.basis,
          root: h.root,
          census: h.census,
          shape: full ? "full" : diff.every((r) => r === "OT") ? "packed" : "recipe",
        };
        await this.tree(h, p);
        if (event.shape === "packed") {
          const match = await this.selected(event);
          if (match.full) event.shape = "full";
          else {
            event.packed = match.subjects;
            event.flags = match.flags;
            assert.equal(event.packed.length, event.flags.length);
          }
        }
        return { head: { ...h, seq, releaseSeq: seq, basis, activations }, event, patches: [] };
      },
      options.beforeCas,
    );
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
