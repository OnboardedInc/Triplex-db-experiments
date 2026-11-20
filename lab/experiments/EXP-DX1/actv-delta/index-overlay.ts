import assert from "node:assert/strict";
import { Objects, hash, type Cell } from "./store.ts";
import { originalObject } from "./recovery.ts";
import type { Page } from "./pages.ts";
import type { Recipe } from "./model.ts";
import { packIndex, unpackIndex } from "./index-patch.ts";

export type IndexLink = [seq: number, digest: string];
type Directory = Record<string, IndexLink>;
type Leaf = { base: string; after: string; patch: string };
export type IndexDelta = {
  top: Directory;
  shards: Record<string, Directory>;
  leaves: Record<string, Leaf>;
};
export type PageEdit = { number: number; base: Cell<Page>; next: Page };
const shardOf = (n: number) => Math.floor(n / 32);
export class IndexOverlay {
  readonly db: Objects;
  readonly source: string;
  private readonly cache = new Map<string, { bytes: string; position: number }>();
  constructor(db: Objects, source: string) {
    this.db = db;
    this.source = source;
  }
  private digest(seq: number, part: string, n: number, v: unknown) {
    return hash([this.db.account, this.source, seq, part, n, v]);
  }
  private async part<T>(
    link: IndexLink,
    part: "top" | "shards" | "leaves",
    n: number,
    cut: number,
  ): Promise<T> {
    const [seq, digest] = link,
      cached = this.cache.get(digest);
    if (cached && cached.position <= cut) return JSON.parse(cached.bytes);
    const key = "event:" + seq,
      get = (e: Recipe) => (part === "top" ? e.indexDelta?.top : e.indexDelta?.[part][n]),
      matches = (e: Recipe) =>
        e.seq === seq &&
        e.kind === "save" &&
        get(e) !== undefined &&
        this.digest(seq, part, n, get(e)) === digest;
    let c = (await this.db.many<Recipe>([key], cut)).get(key);
    if (!c || !matches(c.value)) c = await originalObject<Recipe>(this.db, key, cut, matches);
    const value = get(c.value);
    assert(matches(c.value) && c.position <= cut);
    // [DX-ACT2] Why: only cache immutable authenticated bytes from a demanded read. Rejected: a mutable latest-page cache that can outlive a source correction.
    const remember = (part: string, id: number, v: unknown) => {
      const bytes = JSON.stringify(v);
      if (bytes.length > 32768) return;
      if (this.cache.size >= 128) this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(this.digest(seq, part, id, v), { bytes, position: c.position });
    };
    const delta = c.value.indexDelta!;
    remember("top", 0, delta.top);
    for (const [key, value] of Object.entries(delta.shards)) remember("shards", Number(key), value);
    for (const [key, value] of Object.entries(delta.leaves)) remember("leaves", Number(key), value);
    return value as T;
  }
  async page(root: IndexLink | undefined, cut: number, n: number, base: Cell<Page>) {
    if (!root) return base.value;
    const top = await this.part<Directory>(root, "top", 0, cut),
      shard = shardOf(n),
      at = top[shard];
    if (!at) return base.value;
    const members = await this.part<Directory>(at, "shards", shard, cut),
      leaf = members[n];
    if (!leaf) return base.value;
    const patch = await this.part<Leaf>(leaf, "leaves", n, cut);
    assert.equal(base.hash, patch.base, "index patch names a different base");
    const value = unpackIndex(base.value, patch.patch) as Page;
    assert.equal(hash(value), patch.after, "reopened index differs from the saved logical leaf");
    return value;
  }
  async extend(root: IndexLink | undefined, cut: number, seq: number, edits: PageEdit[]) {
    if (!edits.length) return { root, delta: undefined };
    const top: Directory = root ? await this.part<Directory>(root, "top", 0, cut) : {},
      shards: IndexDelta["shards"] = {},
      leaves: IndexDelta["leaves"] = {};
    // [DX-ACT2] Why: the save already writes its immutable event. Embed only its touched leaf and radix-directory paths there; later saves carry one root reference. Rejected: two more asserted and retracted Datomic objects per minute edit.
    for (const e of edits) {
      const n = e.number,
        shard = shardOf(n),
        old = top[shard],
        members =
          shards[shard] ?? (old ? await this.part<Directory>(old, "shards", shard, cut) : {});
      shards[shard] = members;
      if (hash(e.next) === hash(e.base.value)) delete members[n];
      else {
        const patch = {
          base: e.base.hash,
          after: hash(e.next),
          patch: packIndex(e.base.value, e.next),
        };
        leaves[n] = patch;
        members[n] = [seq, this.digest(seq, "leaves", n, patch)];
      }
    }
    for (const [id, members] of Object.entries(shards)) {
      if (Object.keys(members).length)
        top[id] = [seq, this.digest(seq, "shards", Number(id), members)];
      else {
        delete top[id];
        delete shards[id];
      }
    }
    if (!Object.keys(top).length) return { root: undefined, delta: undefined };
    return {
      root: [seq, this.digest(seq, "top", 0, top)] as IndexLink,
      delta: { top, shards, leaves },
    };
  }
}
