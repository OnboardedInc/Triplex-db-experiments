import {
  DatomicClient,
  Replica,
  datomicReplicaSource,
} from "../../../../packages/datomic/dist/index.js";
import { runtimeApi } from "../../../bench/lib/triplex.ts";
import assert from "node:assert/strict";
import { canonical, sha256, W0, worldOf } from "../../../bench/lib/w0-world.ts";
import {
  render,
  evaluate,
  worldsAt,
  kernel,
  maskVersion,
  winner,
  type Format,
} from "./decision.ts";
import { millis, value, type Store } from "./store.ts";

export type Pin =
  | { position: number; validTime: string }
  | { recordedAt: number; validTime: string }
  | { validTime?: string };
export const rosterSeal = (ids: readonly string[]) => ({
  n: ids.length,
  hash: sha256(canonical(ids)),
});
export const rosterRoot = (page: number) => "members/page/" + page;
export async function resolvePin(s: Store, pin: Pin, head: number) {
  if ("position" in pin) {
    assert(
      Number.isSafeInteger(pin.position) && pin.position >= 0 && pin.position <= head,
      "Unavailable source position",
    );
    return pin.position;
  }
  if (!("recordedAt" in pin)) return head;
  assert(Number.isFinite(pin.recordedAt));
  let lo = 0,
    hi = head;
  while (lo < hi) {
    const m = Math.ceil((lo + hi) / 2),
      page = await s.comp.feedPage(m - 1, 1),
      r = page.transactions[0];
    assert(r && r.position === m);
    if (r.instant <= pin.recordedAt) lo = m;
    else hi = m - 1;
  }
  return lo;
}
export async function captureDemand(s: Store, subject: string, p: number, v: string) {
  const c = await s.controls(p);
  assert.equal(s.profile, "w0");
  const client = new DatomicClient(process.env.DATOMIC_URL!),
    db = "s2-" + Buffer.from(String(runtimeApi.DatabaseScope.test(s.scope))).toString("base64url");
  try {
    const replica = new Replica(datomicReplicaSource(client, db, s.head), millis(v), "touched");
    await replica.bootstrap([], p);
    assert(await replica.admit(subject, p, millis(v)));
    const snapshot = await replica.capture();
    assert.equal(snapshot.position, p);
    return {
      scope: s.scope,
      generation: c.generation,
      erasure: maskVersion(c),
      subject,
      validTime: v,
      snapshot,
    };
  } finally {
    client.close();
  }
}
export type ReadStage =
  | "head"
  | "pin"
  | "controls"
  | "erasure-before"
  | "memo"
  | "world"
  | "kernel"
  | "erasure-after"
  | "return";
export class LazyReader {
  readonly store: Store;
  readonly format: Format;
  readonly limit: number;
  private cache = new Map<string, string>();
  private used = 0;
  private erased = -1;
  private replica?: Awaited<ReturnType<typeof captureDemand>>;
  attach(view: Awaited<ReturnType<typeof captureDemand>>) {
    assert(view.scope === this.store.scope && this.format === "w0");
    this.replica = view;
  }
  private readonly now: () => string;
  private readonly path: "legacy" | "shared-cut";
  constructor(
    store: Store,
    format: Format = "w0",
    byteLimit = 2 << 20,
    now = () => new Date().toISOString().replace("Z", "000Z"),
    path: "legacy" | "shared-cut" = "legacy",
  ) {
    this.now = now;
    this.path = path;
    this.store = store;
    this.format = format;
    this.limit = byteLimit;
    assert(Number.isSafeInteger(byteLimit) && byteLimit >= 0);
  }
  get bytes() {
    return this.used;
  }
  async readAt(
    subject: string,
    pin: Pin = {},
    afterPull?: () => Promise<void>,
    stage?: (name: ReadStage) => void,
  ) {
    stage?.("head");
    const offered = this.now();
    const s = this.store,
      head = await s.head();
    stage?.("pin");
    const p = await resolvePin(s, pin, head);
    stage?.("controls");
    const c = await s.controls(p),
      b = { tx: p, validTime: pin.validTime ?? offered };
    assert(W0.isInstant(b.validTime));
    const shared = this.path === "shared-cut";
    let frontier = head;
    for (;;) {
      stage?.("erasure-before");
      const latest = shared
          ? frontier === p
            ? c
            : await s.controls(frontier)
          : await s.controls(await s.head()),
        barrier = maskVersion(latest);
      assert(!p || latest.generation === c.generation, "Read generation changed");
      const stable = async () => {
        const end = await s.head();
        if (shared && end === frontier) return true;
        frontier = end;
        const after = await s.controls(end);
        return barrier === maskVersion(after) && (!p || after.generation === c.generation);
      };
      stage?.("memo");
      if (barrier !== this.erased) {
        this.cache.clear();
        if (this.replica && this.replica.erasure !== barrier) this.replica = undefined;
        this.used = 0;
        this.erased = barrier;
      }
      const key = canonical([
        s.scope,
        c.generation,
        this.format,
        kernel,
        subject,
        b,
        winner(c, b),
        barrier,
      ]);
      const saved = this.cache.get(key);
      if (saved !== undefined) {
        if (shared) {
          stage?.("erasure-after");
          if (!(await stable())) continue;
        }
        this.cache.delete(key);
        this.cache.set(key, saved);
        stage?.("return");
        return { json: saved, basis: b, route: "exact-cache", subject };
      }
      const r = this.replica,
        eligible =
          r &&
          r.generation === c.generation &&
          r.erasure === barrier &&
          r.validTime === b.validTime &&
          r.subject === subject &&
          r.snapshot.position === b.tx;
      stage?.("world");
      const world = eligible
        ? worldOf(subject, r.snapshot.world(subject))
        : (await worldsAt(s, this.format, [subject], b))[0]!;
      stage?.("kernel");
      const { json } = (shared ? render : evaluate)(s, this.format, world, b, c, latest);
      const route = eligible ? "pinned-replica" : "authoritative-source";
      if (afterPull) {
        await afterPull();
        afterPull = undefined;
      }
      // [DX-ACT1] Why: erasure also changes old pins, including cache fills already in flight. Rejected: keying only by historical source position (a later request could reuse protected bytes).
      stage?.("erasure-after");
      if (!(await stable())) continue;
      const size = Buffer.byteLength(json) + Buffer.byteLength(key);
      if (size <= this.limit && !this.cache.has(key)) {
        while (this.used + size > this.limit) {
          const [k, v] = this.cache.entries().next().value!;
          this.used -= Buffer.byteLength(k) + Buffer.byteLength(v);
          this.cache.delete(k);
        }
        this.cache.set(key, json);
        this.used += size;
      }
      stage?.("return");
      return { json, basis: b, route, subject };
    }
  }
  async readMany(subjects: string[], position: number, validTime: string) {
    const s = this.store,
      p = await s.head();
    assert(position <= p);
    const b = { tx: position, validTime },
      c = await s.controls(position);
    for (;;) {
      const current = await s.controls(await s.head()),
        worlds = await worldsAt(s, this.format, subjects, b);
      const rows = worlds.map((w) => evaluate(s, this.format, w, b, c, current).json);
      if (maskVersion(current) === maskVersion(await s.controls(await s.head()))) return rows;
    }
  }
  async list(
    pin: Pin,
    token?: {
      scope: string;
      position: number;
      validTime: string;
      page: number;
      previous: string;
      generation: string;
    },
  ) {
    const offered = this.now();
    const s = this.store,
      head = await s.head(),
      p = token?.position ?? (await resolvePin(s, pin, head));
    const c = await s.controls(p),
      v = token?.validTime ?? pin.validTime ?? offered;
    if (token) {
      assert.equal(token.scope, s.scope);
      assert.equal(token.generation, c.generation);
      if ("position" in pin || "recordedAt" in pin)
        assert.equal(await resolvePin(s, pin, head), token.position);
      if (pin.validTime !== undefined) assert.equal(pin.validTime, token.validTime);

      assert(Number.isSafeInteger(token.page) && token.page > 0);
      const prior = await s.rows([rosterRoot(token.page - 1)], p);
      assert.equal(token.previous, sha256(canonical(prior)));
    }
    const page = token?.page ?? 0,
      rows = await s.rows([rosterRoot(page)], p);
    if (!rows.length) return { values: [], next: null };
    assert.equal(rows.length, 1);
    const ids: string[] = value(rows[0]!);
    assert.deepEqual(ids, [...new Set(ids)].sort());
    const values = [];
    for (const id of ids) values.push(await this.readAt(id, { position: p, validTime: v }));
    return {
      values,
      next: {
        scope: s.scope,
        position: p,
        validTime: v,
        page: page + 1,
        previous: sha256(canonical(rows)),
        generation: c.generation,
      },
    };
  }
}
