import assert from "node:assert/strict";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
import { sha256 } from "../../../bench/lib/w0-world.ts";
export const epoch = "2000-01-01T00:00:00.000000Z";
export type Edit = { e: string; a: string; values: W0.Fact["v"][]; from: string; until?: string };
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
export type Head = {
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
export type Mask = { from: string; tx: number };
export function worldOf(body: Body, b: W0.Basis, mask?: Mask): W0.World {
  const visible = body.changes.filter(
    (c) => c.tx <= b.tx && c.from <= b.validTime && (!c.until || b.validTime < c.until),
  );
  const active = new Map<string, Mutation>();
  for (const c of visible) active.set(c.e + "\0" + c.a, c);
  let facts = body.seed.filter((f) => !active.has(f.e + "\0" + f.a));
  for (const c of active.values())
    for (const v of c.values) facts.push({ e: c.e, a: c.a, v, tx: c.tx });
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
