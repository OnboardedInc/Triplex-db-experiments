import assert from "node:assert/strict";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
import { expand } from "./dispatch.ts";
import { Account, type View } from "./account.ts";
import { hash, type Patch } from "./store.ts";
import { updatePage } from "./pages.ts";
import {
  evaluate,
  resolve,
  stateText,
  worldOf,
  type Body,
  type Edit,
  type Mask,
  type Recipe,
} from "./model.ts";
type Shared = Pick<Body, "seed" | "changes">;
const refKey = (s: string) => "ref:" + hash(s).slice(0, 2);
const subjectOf = (e: string) => (e.startsWith("pl:") ? e.split("/")[0]! : undefined);
const references = (w: W0.World) => [
  ...new Set(
    w.facts.filter((f) => f.a === "location" || f.a === "jurisdiction").map((f) => String(f.v)),
  ),
];
export type SaveOptions = {
  beforeCas?: () => Promise<void>;
  erase?: string;
  nativeOps?: readonly unknown[];
  nativePreconditions?: readonly unknown[];
  originTx?: number;
};
export async function save(
  account: Account,
  id: string,
  edits: readonly Edit[],
  options: SaveOptions = {},
) {
  assert(edits.length > 0 || options.erase);
  for (const e of edits) {
    assert(W0.isInstant(e.from) && (!e.until || (W0.isInstant(e.until) && e.from < e.until)));
    assert(e.e.startsWith("loc:") || e.e.startsWith("jur:") || subjectOf(e.e));
  }
  if (options.erase) assert(W0.isPlacementId(options.erase));
  const db = account.db,
    sig = hash([
      edits,
      options.erase ?? null,
      options.nativeOps ?? [],
      options.nativePreconditions ?? [],
      options.originTx ?? null,
    ]);
  const result = await account.command(
    id,
    sig,
    async (p, head) => {
      const h = head.value,
        seq = h.seq + 1,
        tx = options.originTx ?? h.basis.tx + 1;
      assert(Number.isSafeInteger(tx) && tx > h.basis.tx);
      const basis = { ...h.basis, tx },
        release = resolve(h.activations, basis.validTime),
        patches: Patch[] = [];
      if (options.erase) {
        for (let n = 0; n <= h.seq; n++) await expand(account, n);
      }
      const direct = new Set<string>(
        edits.map((e) => subjectOf(e.e)).filter((s): s is string => !!s),
      );
      if (options.erase) direct.add(options.erase);
      const sharedIds = [...new Set(edits.filter((e) => !subjectOf(e.e)).map((e) => e.e))];
      const refs = await account.refs(h, p, [...new Set(sharedIds.map(refKey))]);
      const shared = await db.many<Shared>(
        sharedIds.map((e) => "shared:" + e),
        p,
      );
      const sharedUpdates = new Map<string, Shared>();
      for (const e of sharedIds) {
        const prior = shared.get("shared:" + e),
          v = prior?.value ?? { seed: [], changes: [] };
        const next = {
          seed: v.seed,
          changes: [...v.changes, ...edits.filter((x) => x.e === e).map((x) => ({ ...x, tx }))],
        };
        sharedUpdates.set(e, next);
        patches.push({ key: "shared:" + e, value: next, prior });
      }
      const directBodies = await db.many<Body>(
        [...direct].map((s) => "point:" + s),
        p,
      );
      assert.equal(directBodies.size, direct.size, "subject outside account census");
      const numbers = [
        ...new Set(
          [...directBodies.values()]
            .map((c) => c.value.page)
            .concat(sharedIds.flatMap((e) => refs.get(refKey(e))?.value[e] ?? [])),
        ),
      ];
      const tree = await account.tree(h, p),
        newTree = structuredClone(tree.value),
        pages = await account.pages(h, p, numbers);
      const touched = new Set<string>(),
        refAdds = new Map<string, Set<number>>();
      for (const [n, page] of pages) {
        const ids = sharedIds.length
            ? page.value.roster
            : page.value.roster.filter((s) => direct.has(s)),
          cells = await db.many<Body>(
            ids.map((s) => "point:" + s),
            p,
          ),
          masks = await account.masks(ids),
          worlds: W0.World[] = [];
        const prepared = new Map<string, { old: Body; next: Body; mask: Mask | undefined }>();
        for (const s of ids) {
          const cell = cells.get("point:" + s);
          assert(cell);
          const mask = masks.get("mask:" + s)?.value,
            old = account.keys.convert(cell.value, "read", mask);
          const pastRefs = new Set([
            ...old.seed
              .filter((f) => f.a === "location" || f.a === "jurisdiction")
              .map((f) => String(f.v)),
            ...old.changes
              .filter((f) => f.a === "location" || f.a === "jurisdiction")
              .flatMap((f) => f.values.map(String)),
          ]);
          if (!direct.has(s) && !sharedIds.some((e) => pastRefs.has(e))) continue;
          const changes = edits
            .filter((e) => subjectOf(e.e) === s || pastRefs.has(e.e))
            .map((e) => ({ ...e, tx }));
          const next = { ...old, seen: h.releaseSeq, changes: [...old.changes, ...changes] };
          for (const edit of changes.filter((e) => e.a === "location" || e.a === "jurisdiction")) {
            for (const target of edit.values.map(String)) {
              // [DX-ACT2] Why: a reparent can expose a previously unread second-hop floor. Rejected: carrying the old worker's location facts into its new jurisdiction.
              const queue = [target],
                visited = new Set<string>();
              for (const ent of queue) {
                if (visited.has(ent)) continue;
                visited.add(ent);
                const object =
                  sharedUpdates.get(ent) ??
                  (await db.many<Shared>(["shared:" + ent], p)).get("shared:" + ent)?.value;
                if (!object) continue;
                next.seed = [...next.seed.filter((f) => f.e !== ent), ...object.seed];
                next.changes = [...next.changes.filter((f) => f.e !== ent), ...object.changes];
                for (const f of worldOf(next, basis).facts)
                  if (f.e === ent && f.a === "jurisdiction") queue.push(String(f.v));
              }
            }
          }
          prepared.set(s, { old, next, mask });
          touched.add(s);
        }
        const previous = await account.views([...prepared.keys()], p, undefined, h);
        for (const s of ids) {
          const key = "point:" + s,
            cell = cells.get(key)!,
            x = prepared.get(s);
          if (!x) continue;
          const m = options.erase === s ? { from: basis.validTime, tx } : x.mask;
          if (options.erase === s) {
            assert(!x.mask, "already erased");
            patches.push({ key: "mask:" + s, value: m });
          }
          const w = worldOf(x.next, basis, m),
            o = evaluate(w, release, basis),
            applied = W0.publish(previous.get(s)!.state, [W0.recordOf(o)]);
          x.next.state = stateText(applied.state);
          patches.push({ key, prior: cell, value: account.keys.convert(x.next, "write", m) });
          for (const ref of references(w)) {
            const v = refAdds.get(ref) ?? new Set<number>();
            v.add(n);
            refAdds.set(ref, v);
          }
          worlds.push(w);
        }
        const refreshed = updatePage(page.value, worlds, basis, h.indexed),
          digest = hash(refreshed);
        if (digest !== newTree.pages[n]) {
          newTree.pages[n] = digest;
          patches.push({ key: "page:" + n, prior: page, value: refreshed });
        }
      }
      const refCells = await db.many<Record<string, number[]>>(
          [...new Set([...refAdds.keys()].map(refKey))],
          p,
        ),
        updated = new Map<string, Record<string, number[]>>();
      for (const [e, ns] of refAdds) {
        const k = refKey(e),
          m = updated.get(k) ?? structuredClone(refCells.get(k)?.value ?? {}),
          prior = m[e] ?? [],
          next = [...new Set([...prior, ...ns])].sort((a, b) => a - b);
        if (next.length !== prior.length) {
          m[e] = next;
          updated.set(k, m);
        }
      }
      for (const [key, value] of updated) {
        newTree.refs[key] = hash(value);
        patches.push({ key, value, prior: refCells.get(key) });
      }
      const root = hash(newTree);
      if (root !== h.root) patches.push({ key: "tree", value: newTree, prior: tree });
      const event: Recipe = {
        kind: "save",
        seq,
        parent: h.seq,
        parentHash: head.hash,
        sourceCut: p,
        old: release.doc,
        next: release.doc,
        basis,
        previousBasis: h.basis,
        root: h.root,
        census: h.census,
        shape: "live",
        subjects: [...touched].sort(),
      };
      return {
        head: {
          ...h,
          basis,
          root,
          seq,
          frontier: seq,
          certified: seq,
          erasure: options.erase ? seq : h.erasure,
        },
        patches,
        event,
      };
    },
    options.beforeCas,
    options.nativeOps,
    options.nativePreconditions,
  );
  if (options.erase) account.keys.forget(options.erase);
  return result;
}
