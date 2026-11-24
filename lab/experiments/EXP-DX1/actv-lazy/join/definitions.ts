import assert from "node:assert/strict";
import { W0, canonical, sha256 } from "../../../../bench/lib/w0-world.ts";
import { RELEASE, fact } from "../store.ts";
import { frameEstimate } from "./frames.ts";

// [DX-ACT6] Why: every Publish carried the whole definition set in force three times (the new document twice, in the
// release marker and in the notice event, and the old one once in the marker), so its one transaction grew by about
// 3.6 bytes per byte of definitions, the 4 MiB request limit capped the set at about 1.3 MiB (about 1.1 MiB for a
// release that follows one of the same size), and near it one Publish held the single writer for about 280 ms while
// every account's saves were fenced. Every read also swept every marker ever published in the account (each with two
// full documents) and compiled the winning document again.
// `TX2_RELEASE_DOCS=ref` stores each definition once, by content: the forms and the policies are cut into parts of at
// most 8 KiB at boundaries chosen by the content of the entries (so an edit changes only the parts around it), the
// parts are listed on index pages, and a small root names the pages, the base rules and the release hash. Parts, pages
// and the root are written before the Publish, by key = SHA-256 of their content, each write within the writer's own
// 8 ms bound; a part already stored is not written again (a release that adds 20 forms to 5,000 writes the few parts
// around them). The Publish stays one atomic permanent record: its marker and notice event carry the reference (root
// key and release hash) instead of the documents, and it commits only if the root is stored at its cut. A reader joins
// the parts, checks the SHA-256 of the canonical document against the release hash, and keeps the compiled release by
// that hash (content-addressed, so the cache is exact). Unset, Publish and every reader are unchanged.
// Rejected: a document that carries only the change against its predecessor (a chain to replay on every cold read and a
// periodic full document to bound it, which itself must fit one request: content-addressed parts give the same writes
// for an edit without either), and one row per definition (225 us of estimated service per row: about 1.1 s of writer
// time for 5,000 forms against about 0.3 s in parts).
export type DocsMode = "inline" | "ref";
export function docsMode(value = process.env.TX2_RELEASE_DOCS): DocsMode {
  assert(value === undefined || value === "" || value === "ref", "TX2_RELEASE_DOCS is unset or ref");
  return value === "ref" ? "ref" : "inline";
}
/** What the marker and the notice event carry in place of a document. */
export type DocRef = { release: string; root: string; bytes: number };
export const definitionsActor = "lazy/definitions";
const definitionPrefix = RELEASE + "/definitions/";
export const definitionAttribute = "lazy/definition";
export const definitionEntity = (h: string) => definitionPrefix + h;
/** A transaction that only stores definitions (the joined source's suffix check accepts it between Publishes). */
export const definitionsOnly = (changes: readonly { entityId: string; attribute?: string }[]) =>
  changes.length > 0 &&
  changes.every((c) => /^[a-f0-9]{64}$/.test(c.entityId.slice(definitionPrefix.length)) && c.entityId.startsWith(definitionPrefix));
type Head = Pick<W0.ReleaseDoc, "name" | "rules" | "world">;
type Part = { kind: "forms" | "policies"; entries: unknown[] };
type Page = { kind: "page"; parts: string[] };
type Root = { kind: "root"; release: string; bytes: number; head: Head; forms: string[] | null; policies: string[] | null };
type Node = Part | Page | Root;

const partBytes = 8192,
  pageParts = 96;
/** Groups in order; a group ends after an item whose hash starts with a byte below `cut` (content-defined) or when the
 * next item would take it past `max` bytes. Deterministic, and an edit moves at most the boundaries around it. */
function chunk(items: readonly string[], max: number, cut: number, count = Infinity) {
  const out: number[][] = [];
  let cur: number[] = [],
    bytes = 0;
  for (const [i, s] of items.entries()) {
    const size = Buffer.byteLength(s);
    assert(size <= max, "One definition is larger than a part");
    if (cur.length && (bytes + size > max || cur.length >= count)) {
      out.push(cur);
      cur = [];
      bytes = 0;
    }
    cur.push(i);
    bytes += size;
    if (parseInt(sha256(s).slice(0, 2), 16) < cut) {
      out.push(cur);
      cur = [];
      bytes = 0;
    }
  }
  if (cur.length) out.push(cur);
  return out;
}
const keyOf = (n: Node) => sha256(canonical(n));

/** The document as content-addressed nodes: parts, index pages and the root (the root last). */
export function splitDocument(doc: W0.ReleaseDoc) {
  const compiled = W0.compileRelease(doc);
  const nodes = new Map<string, Node>();
  const list = (kind: Part["kind"], entries: readonly unknown[] | undefined) => {
    if (!entries) return null;
    const texts = entries.map((e) => canonical(e));
    const parts = chunk(texts, partBytes, 16).map((g) => {
      const p: Part = { kind, entries: g.map((i) => entries[i]) };
      const k = keyOf(p);
      nodes.set(k, p);
      return k;
    });
    return chunk(parts, Infinity, 8, pageParts).map((g) => {
      const page: Page = { kind: "page", parts: g.map((i) => parts[i]!) };
      const k = keyOf(page);
      nodes.set(k, page);
      return k;
    });
  };
  const forms = list("forms", doc.forms),
    policies = list("policies", doc.policies);
  const root: Root = {
    kind: "root",
    release: compiled.hash,
    bytes: Buffer.byteLength(canonical(doc)),
    head: { name: doc.name, rules: doc.rules, world: doc.world },
    forms,
    policies,
  };
  const rootKey = keyOf(root);
  nodes.set(rootKey, root);
  const ref: DocRef = { release: compiled.hash, root: rootKey, bytes: root.bytes };
  return { ref, nodes, compiled };
}

/** Joins and checks a document from its nodes (`get` returns a node's value by key, or undefined). */
export async function joinDocument(ref: DocRef, get: (keys: string[]) => Promise<Map<string, Node>>) {
  const root = (await get([ref.root])).get(ref.root) as Root | undefined;
  assert(root && root.kind === "root" && keyOf(root) === ref.root, "Release definitions missing: " + ref.root);
  assert(root.release === ref.release && root.bytes === ref.bytes, "Release reference differs from its root");
  const list = async (pages: string[] | null, kind: Part["kind"]) => {
    if (pages === null) return undefined;
    const ps = await get(pages);
    const partKeys = pages.flatMap((k) => {
      const p = ps.get(k) as Page | undefined;
      assert(p && p.kind === "page" && keyOf(p) === k, "Definitions page missing: " + k);
      return p.parts;
    });
    const parts = new Map<string, Node>();
    for (let i = 0; i < partKeys.length; i += 64) for (const [k, v] of await get(partKeys.slice(i, i + 64))) parts.set(k, v);
    return partKeys.flatMap((k) => {
      const p = parts.get(k) as Part | undefined;
      assert(p && p.kind === kind && keyOf(p) === k, "Definitions part missing: " + k);
      return p.entries;
    });
  };
  const forms = await list(root.forms, "forms"),
    policies = await list(root.policies, "policies");
  const doc = {
    ...root.head,
    ...(forms === undefined ? {} : { forms }),
    ...(policies === undefined ? {} : { policies }),
  } as W0.ReleaseDoc;
  const compiled = W0.compileRelease(doc);
  assert.equal(compiled.hash, ref.release, "Joined definitions differ from the release hash");
  return compiled;
}

/** Compiled releases by hash (content-addressed and checked on entry, so a hit is exact). */
const compiledByHash = new Map<string, W0.CompiledRelease>();
export const cachedRelease = (hash: string) => compiledByHash.get(hash);
export function rememberRelease(compiled: W0.CompiledRelease, claimed: string) {
  assert.equal(compiled.hash, claimed, "Unbound release document");
  if (!compiledByHash.has(claimed)) {
    if (compiledByHash.size >= 64) compiledByHash.delete(compiledByHash.keys().next().value!);
    compiledByHash.set(claimed, compiled);
  }
  return compiled;
}
/** Reads of definitions this process made (roots joined, rows and bytes read): bounded evidence for the cost table. */
export const loaded = { roots: 0, rows: 0, bytes: 0 };
type Rows = { rows: (ids: string[], position: number) => Promise<{ entityId: string; value: { value: string } }[]> };
async function nodesAt(s: Rows, keys: string[], at: number) {
  const out = new Map<string, Node>();
  for (let i = 0; i < keys.length; i += 64) {
    const rows = await s.rows(keys.slice(i, i + 64).map(definitionEntity), at);
    for (const r of rows) {
      const k = r.entityId.slice(definitionPrefix.length);
      assert(!out.has(k), "Two rows for one definitions node");
      loaded.rows++;
      loaded.bytes += Buffer.byteLength(r.value.value);
      out.set(k, JSON.parse(r.value.value));
    }
  }
  return out;
}
/** The compiled release a reference names, read at a position where its root is stored. */
export async function loadRelease(s: Rows, ref: DocRef, at: number) {
  const hit = compiledByHash.get(ref.release);
  if (hit) return hit;
  loaded.roots++;
  return rememberRelease(await joinDocument(ref, (keys) => nodesAt(s, keys, at)), ref.release);
}
/** Either form of a marker's or event's document: inline (unchanged) or by reference. */
export async function documentOf(s: Rows, x: { document?: W0.ReleaseDoc | null; documentRef?: DocRef }, at: number) {
  if (x.documentRef) return (await loadRelease(s, x.documentRef, at)).doc;
  assert(x.document, "Release has no document");
  return x.document;
}
export async function rootStored(s: Rows, ref: DocRef, at: number) {
  return (await nodesAt(s, [ref.root], at)).has(ref.root);
}

type Committer = {
  rows: Rows["rows"];
  head: () => Promise<number>;
  commit: (
    id: string,
    actor: string,
    ops: readonly unknown[],
    expected: number,
    context?: unknown,
    afterFence?: undefined,
    onAck?: undefined,
    absent?: readonly string[],
  ) => Promise<unknown>;
};
/**
 * Stores the document's nodes that are not stored yet (the root last, alone), each write within the writer's bound and
 * without the head fence: each node is keyed by its content and committed only if its entity has no fact yet, and none
 * is reachable until a Publish names the root. A write refused because another writer stored the same node first is
 * re-read and skipped.
 */
export async function stageDocument(s: Committer, doc: W0.ReleaseDoc) {
  const { ref, nodes, compiled } = splitDocument(doc);
  const stats = { writes: 0, rows: 0, bytes: 0, retries: 0 };
  if (await rootStored(s, ref, await s.head())) return { ref, compiled, ...stats };
  const keys = [...nodes.keys()].filter((k) => k !== ref.root);
  const batches: string[][] = [];
  let cur: string[] = [];
  const op = (k: string) => fact(definitionEntity(k), definitionAttribute, nodes.get(k));
  for (const k of keys) {
    assert(frameEstimate([op(k)]).fits, "One definitions node exceeds the writer's bound");
    if (cur.length && !frameEstimate([...cur, k].map(op)).fits) {
      batches.push(cur);
      cur = [];
    }
    cur.push(k);
  }
  if (cur.length) batches.push(cur);
  batches.push([ref.root]);
  for (const batch of batches) {
    for (let attempt = 0; ; attempt++) {
      const have = await nodesAt(s, batch, await s.head());
      const todo = batch.filter((k) => !have.has(k));
      if (!todo.length) break;
      const ops = todo.map(op);
      try {
        await s.commit("definitions:" + sha256(canonical(todo)), definitionsActor, ops, -1, { nodes: todo.length }, undefined, undefined, todo.map(definitionEntity));
        stats.writes++;
        stats.rows += ops.length;
        stats.bytes += Buffer.byteLength(canonical(ops));
        break;
      } catch (e) {
        if (attempt >= 4) throw e;
        stats.retries++;
      }
    }
  }
  return { ref, compiled, ...stats };
}
