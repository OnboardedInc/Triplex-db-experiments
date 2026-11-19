import assert from "node:assert/strict";
import { W0 } from "../../../bench/lib/w0-world.ts";
export const epoch = "2000-01-01T00:00:00.000000Z";
export type Edit = {
  e: string;
  a: string;
  values: W0.Fact["v"][];
  from: string;
  until?: string;
  append?: boolean;
};
export type Mutation = Edit & { tx: number };
export type Body = {
  subject: string;
  page: number;
  seed: W0.Fact[];
  changes: Mutation[];
  state: string;
  seen: number;
};
export type Activation = W0.Activation & { doc: W0.ReleaseDoc };
export type Epochs = {
  docs: Record<string, W0.ReleaseDoc>;
  names: string[];
  times: string[];
  epochs: number[][];
};
export type Head = {
  history?: string;
  seedTx?: number;
  seq: number;
  releaseSeq: number;
  basis: W0.Basis;
  activations: Activation[];
  root: string;
  census: string;
  size: number;
  certified: number;
  frontier: number;
  erasure: number;
  indexed: boolean;
  indexedAt: string;
  source: string;
  compiler: string;
};
export type Recipe = {
  history?: Epochs;
  kind: "release" | "clock" | "save" | "seed";
  seq: number;
  parent: number;
  parentHash: string;
  sourceCut: number;
  old: W0.ReleaseDoc;
  next: W0.ReleaseDoc;
  basis: W0.Basis;
  previousBasis: W0.Basis;
  root: string;
  census: string;
  shape: "packed" | "recipe" | "full" | "live";
  fullCheck?: { people: number; digest: string };
  packed?: string[];
  flags?: [string, boolean, boolean][];
  subjects?: string[];
};
export function resolve(doc: readonly Activation[], t: string) {
  const winner = doc
    .filter((e) => e.from <= t)
    .sort(
      (a, b) => b.from.localeCompare(a.from) || b.tx - a.tx || b.release.localeCompare(a.release),
    )[0];
  if (!winner) throw Error("W0.E_NO_RELEASE");
  const rel = W0.compileRelease(winner.doc);
  assert.equal(rel.hash, winner.release, "W0.E_NO_RELEASE");
  return rel;
}
export const stateText = (s: W0.OutboxState) =>
  JSON.stringify(s, (_, v) => (typeof v === "bigint" ? v.toString() : v));
export const stateOf = (s: string): W0.OutboxState =>
  JSON.parse(s, (k, v) => (k === "tx" || k === "seq" ? BigInt(v) : v));
export const encodeBig = (v: unknown) =>
  JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() : x));
export const decodeBig = <T>(v: string): T =>
  JSON.parse(v, (k, x) => (k === "tx" || k === "seq" || k === "done" ? BigInt(x) : x));
export function seedFacts(w: W0.World, b: W0.Basis) {
  const ix = W0.indexWorld(w, b.tx);
  if (typeof ix === "string") throw Error(ix);
  // [DX-ACT2] Why: validate every source assertion before omitting W0's answer-chain ballast from the policy projection. Rejected: dropping unknown facts before W0 validation.
  return w.facts.filter((f) => f.a !== "answers" && !f.e.includes("/ans:"));
}
export type Mask = { from: string; tx: number; published?: Record<string, string> };
export function worldOf(body: Body, b: W0.Basis, mask?: Mask): W0.World {
  const visible = body.changes.filter(
    (c) => c.tx <= b.tx && c.from <= b.validTime && (!c.until || b.validTime < c.until),
  );
  const active = new Map<string, W0.Fact[]>(),
    keep = new Set<string>();
  for (const c of visible) {
    const key = c.e + "\0" + c.a;
    let fs = active.get(key);
    if (!c.append) {
      fs = [];
      keep.delete(key);
    } else if (!fs) {
      fs = [];
      keep.add(key);
    }
    for (const v of c.values) fs.push({ e: c.e, a: c.a, v, tx: c.tx });
    active.set(key, fs);
  }
  let facts = body.seed.filter((f) => {
    const k = f.e + "\0" + f.a;
    return !active.has(k) || keep.has(k);
  });
  for (const fs of active.values()) facts.push(...fs);
  if (mask) facts = facts.map((f) => (f.a === "ssn" ? { ...f, v: { erasedAt: mask.from } } : f));
  return { subject: body.subject, facts };
}
export function evaluate(w: W0.World, r: W0.CompiledRelease, b: W0.Basis) {
  const o = W0.evaluateWorld(w, r, b);
  if (W0.isFailure(o)) throw Error(o.error);
  return o;
}
export function releaseEntry(rel: W0.CompiledRelease, from: string, tx: number) {
  assert(W0.isInstant(from));
  return { release: rel.hash, doc: rel.doc, from, tx };
}
