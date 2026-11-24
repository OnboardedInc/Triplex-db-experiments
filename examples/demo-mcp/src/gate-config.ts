// [DX-CON1] Gates of build step 5 (functions), on the toy:
//   1. Triplex's stock load() with its by-type reads bounded to IDs found from the refs equals the stock load() with
//      no bound (which scans; the toy is small enough), object for object, revision for revision, release for release.
//   2. A restart loses nothing: a fresh process discovers from the refs and loads the same store.
//   3. Two processes committing in turn both succeed, each release's parent being the other's.
//   4. The five tools: define_entity_type (Review, as in the demo script), list_entity_types, describe_entity_type,
//      list_releases with a comparison, move_live back and forward; the guard refused nothing and every read named IDs.
// Usage: node src/gate-config.ts [--json PATH]      (child mode: --child load | --child commit LABEL)
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { ConfigStore, InMemoryConfigStore } from "@triplex-build/triplex/config";
import { Capabilities, QueryExecutor, Runtime, StorageAdapter } from "@triplex-build/triplex/runtime";
import { DatomicClient, makeDatomicQueryExecutor, makeDatomicStorageAdapter } from "@triplex-build/triplex-datomic";
import { Effect, Layer, ManagedRuntime } from "effect";
import { Config } from "./config.ts";
import { guardCounts } from "./guard.ts";
import { Demo, loadConnection } from "./store.ts";
import { runTool } from "./tools.ts";

type Store = InMemoryConfigStore.InMemoryConfigStore;
const conn = loadConnection();
const demo = new Demo(conn);
const fresh = () => new Config(demo.writer, demo.scope, demo.db);
const digest = (s: Store) => ({
  objects: [...s.objects.keys()].sort(),
  validUnder: [...s.objects.values()].map((o) => o.cid + ":" + o.validUnder.join(",")).sort(),
  schemas: [...s.schemas.keys()].sort(),
  revisions: s.revisions.map((r) => r.id).sort(),
  snapshots: s.snapshots.map((x) => `${x.seq} ${x.id} ${x.label} ${x.parentId}`),
  refs: ["test", "live"].map((r) => `${r}=${s.refs.get(r) ?? ""}`),
});

const mode = process.argv.indexOf("--child");
if (mode >= 0) {
  const what = process.argv[mode + 1];
  const c = fresh();
  if (what === "load") {
    const { store, discovery } = await c.load();
    console.log("CHILD " + JSON.stringify({ digest: digest(store), reads: discovery.reads }));
  } else {
    const label = process.argv[mode + 2]!;
    const { store } = await c.load();
    const newest = store.snapshots[store.snapshots.length - 1]!;
    const r = await c.commit(label, newest.root.children.map((x) => x.node));
    console.log("CHILD " + JSON.stringify({ id: r.snapshot.id, parent: r.snapshot.parentId, position: r.transaction.position }));
  }
  c.close();
  demo.close();
  process.exit(0);
}
assert.equal(conn.kind, "toy", "This gate runs the unbounded stock loader as its reference; toy only");

const checks: { check: string; ok: boolean; detail?: string }[] = [];
const check = (name: string, ok: boolean, detail?: string) => {
  checks.push({ check: name, ok, ...(detail ? { detail } : {}) });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " -- " + detail : ""}`);
};
const child = (...args: string[]) => {
  const out = execFileSync(process.execPath, [import.meta.filename, "--child", ...args], { encoding: "utf8", env: process.env });
  return JSON.parse(out.split("\n").find((l) => l.startsWith("CHILD "))!.slice(6));
};

// The reference: Triplex's stock layer over a plain client (no guard), which reads every entity five times.
const plain = new DatomicClient(conn.writeUrl, 60_000);
const def = Runtime.define({
  name: "datomic",
  storage: Layer.succeed(StorageAdapter, makeDatomicStorageAdapter(plain, demo.scope, { layout: "lean", serverRecordTime: true })),
  queries: Layer.succeed(QueryExecutor, makeDatomicQueryExecutor(plain, demo.scope)),
});
const triplex = def.layer({ scope: demo.scope, capabilities: Capabilities.none });
const stock = ManagedRuntime.make(Layer.merge(triplex, ConfigStore.layer.pipe(Layer.provide(triplex))));
/**
 * The stock store restricted to what the console can reach: the releases test and live point to and their parents,
 * their revisions and revision parents, the objects under their roots and revisions, those objects' types, and the
 * two refs. A release committed under any other ref (a stray G12 run did that once on the toy) is not reachable, by
 * the console's rule that every commit moves test.
 */
function reachable(s: Store): Store {
  const snaps = new Map(s.snapshots.map((x) => [x.id, x]));
  const keepSnaps = new Set<string>();
  for (const r of ["test", "live"]) for (let id = s.refs.get(r) as string | null | undefined; id && !keepSnaps.has(id); id = snaps.get(id as never)?.parentId) keepSnaps.add(id);
  const revs = new Map(s.revisions.map((r) => [r.id, r]));
  const keepRevs = new Set<string>();
  for (const id of keepSnaps) for (let r = snaps.get(id as never)!.revisionIds as readonly string[], i = 0; i < r.length; i++) for (let x: string | null | undefined = r[i]; x && !keepRevs.has(x); x = revs.get(x as never)?.parentId) keepRevs.add(x);
  const keepObjects = new Set<string>();
  const visit = (cid: string) => {
    if (keepObjects.has(cid)) return;
    keepObjects.add(cid);
    for (const c of ((s.objects.get(cid as never)?.body as { children?: { cid: string }[] } | undefined)?.children ?? [])) visit(c.cid);
  };
  for (const id of keepSnaps) visit(snaps.get(id as never)!.rootCid);
  for (const id of keepRevs) visit(revs.get(id as never)!.cid);
  const objects = new Map([...s.objects].filter(([cid]) => keepObjects.has(cid)));
  const types = new Set([...objects.values()].flatMap((o) => o.validUnder as readonly string[]));
  return {
    ...s,
    objects,
    schemas: new Map([...s.schemas].filter(([cid]) => types.has(cid))),
    revisions: s.revisions.filter((r) => keepRevs.has(r.id)),
    snapshots: s.snapshots.filter((x) => keepSnaps.has(x.id)),
    refs: new Map([...s.refs].filter(([r]) => r === "test" || r === "live")),
  };
}
const stockLoad = async () => digest(reachable(await stock.runPromise(Effect.flatMap(ConfigStore.ConfigStore, (s) => s.load()))));

// 1. bounded equals stock
const c1 = fresh();
const before = { ...guardCounts };
const bounded = await c1.load();
const reference = await stockLoad();
check("bounded load equals stock load, restricted to what test and live reach (objects, types, revisions, releases, refs)", JSON.stringify(digest(bounded.store)) === JSON.stringify(reference),
  `${reference.objects.length} objects, ${reference.schemas.length} types, ${reference.revisions.length} revisions, ${reference.snapshots.length} releases; walk ${bounded.discovery.reads} batched reads`);
check("the stock loader's five by-type reads were rewritten to IDs, none refused", guardCounts.configRewrites - before.configRewrites === 5 && guardCounts.refused === before.refused,
  `rewrites ${guardCounts.configRewrites - before.configRewrites}, refused ${guardCounts.refused - before.refused}`);

// 2. restart
const restarted = child("load");
check("a fresh process discovers and loads the same store", JSON.stringify(restarted.digest) === JSON.stringify(digest(bounded.store)), `walk ${restarted.reads} reads`);

// 3. two processes committing in turn
const stamp = Date.now();
const newest = bounded.store.snapshots[bounded.store.snapshots.length - 1]!;
const a = child("commit", `gate-a-${stamp}`);
let b: { id: string; parent: string | null } | undefined;
try {
  const r = await c1.commit(`gate-b-${stamp}`, newest.root.children.map((x) => x.node)); // c1's cache is stale now
  b = { id: r.snapshot.id, parent: r.snapshot.parentId };
} catch (error) {
  check("second process commits after the first", false, String(error));
}
const a2 = child("commit", `gate-c-${stamp}`);
check("two processes committing in turn all succeed, parents chained", !!b && b.parent === a.id && a2.parent === b.id,
  `a ${a.id.slice(0, 15)} <- b ${b?.parent?.slice(0, 15)}; b ${b?.id.slice(0, 15)} <- c ${String(a2.parent).slice(0, 15)}`);
const afterCommits = await fresh().load();
check("after the commits, bounded load still equals stock load", JSON.stringify(digest(afterCommits.store)) === JSON.stringify(await stockLoad()));

// 4. the tools, as the assistant calls them. GateCheck flips whether its one attribute is required on every run, so
// each run commits a real change without adding a new type to the toy each time.
const call = (name: string, input: object) => runTool(name, input, "proof", demo) as Promise<Record<string, any>>;
const refusedBefore = guardCounts.refused;
const prior = await call("describe_entity_type", { name: "GateCheck" }).catch(() => undefined);
const wasRequired = prior?.["type"]?.attributes?.[0]?.required === true;
const defined = await call("define_entity_type", { name: "GateCheck", attributes: [{ key: ":gate-check/note", valueType: "text", required: !wasRequired }], label: `gate-check-${stamp}` });
check("define_entity_type commits a release and moves test and live", typeof defined["release"]?.id === "string" && defined["refs"].test.id === defined["release"].id && defined["refs"].live.id === defined["release"].id,
  `release ${defined["release"]?.label}, objects ${JSON.stringify(defined["objects"])}, position ${defined["receipt"]?.position}`);
const types = await call("list_entity_types", {});
const names = types["types"].map((t: { name: string }) => t.name);
check("list_entity_types lists Subject first and GateCheck, from live", names[0] === "Subject" && names.includes("GateCheck"), names.join(", "));
const described = await call("describe_entity_type", { name: "GateCheck" });
check("describe_entity_type shows the new requiredness and the generated constraints", described["type"].attributes[0].required === !wasRequired &&
  described["type"].constraints.some((x: any) => x.kind === "Cardinality") && described["type"].constraints.some((x: any) => x.kind === "Required") === !wasRequired,
  `${described["type"].constraints.length} constraints, ${described["type"].revisions.length} revisions`);
const releases = await call("list_releases", { limit: 5, compare: [defined["basedOn"].id, defined["release"].id] });
check("list_releases compares two releases at object level", releases["difference"].some((d: any) => d.key === "GateCheck"),
  JSON.stringify(releases["difference"].map((d: any) => `${d.change} ${d.kind} ${d.key}`)));
const back = await call("move_live", { snapshotId: defined["basedOn"].id });
const describedBack: Record<string, any> = await call("describe_entity_type", { name: "GateCheck" }).catch((e) => ({ error: e }));
check("move_live back: live's GateCheck is the earlier definition again", back["after"].id === defined["basedOn"].id &&
  (prior ? describedBack["type"]?.attributes[0].required === wasRequired : describedBack["error"] !== undefined));
const forward = await call("move_live", { snapshotId: defined["release"].id });
check("move_live forward again", forward["after"].id === defined["release"].id);
let refusedRepeat = "";
try { await call("move_live", { snapshotId: defined["release"].id }); } catch (e) { refusedRepeat = (e as { code?: string }).code ?? ""; }
check("move_live to the release live already points to is refused", refusedRepeat === "AlreadyLive");
const hasReview = names.includes("Review");
if (!hasReview) await call("define_entity_type", { name: "Review", attributes: [
  { key: ":review/outcome", valueType: "enumOf", enumValues: ["approved", "rejected", "pending"], required: true },
  { key: ":review/note", valueType: "text" }, { key: ":review/of", valueType: "ref", refTarget: "Subject", required: true }, { key: ":review/decided-on", valueType: "date" }], label: "reviews-1" });
let typeFixed = "";
try { await call("define_entity_type", { name: "Other", attributes: [{ key: ":review/note", valueType: "integer" }] }); } catch (e) { typeFixed = (e as { code?: string }).code ?? ""; }
check("an existing attribute keeps its value type", typeFixed === "AttributeTypeFixed");
// Edit type sends every attribute again: unchanged text, date and ref attributes must re-commit (DX-CON1 fault).
const reviewNow = await call("describe_entity_type", { name: "Review" });
const recommit = await call("define_entity_type", { name: "Review", attributes: reviewNow["type"].attributes.map((a: any) => ({
  key: a.key, valueType: a.valueType, required: a.required, cardinality: a.cardinality, unique: a.unique,
  ...(a.refTarget ? { refTarget: a.refTarget } : {}), ...(a.enumValues ? { enumValues: a.enumValues } : {}) })) }).catch((e) => ({ error: e })) as Record<string, any>;
check("re-committing Review with its unchanged text, date, ref and enum attributes succeeds", !recommit["error"] && recommit["type"] === "Review",
  recommit["error"] ? `${recommit["error"].code}: ${recommit["error"].message}` : `release ${recommit["release"]?.label}`);
let changedType = "";
try { await call("define_entity_type", { name: "Review", attributes: [{ key: ":review/decided-on", valueType: "text" }] }); } catch (e) { changedType = (e as { code?: string }).code ?? ""; }
check("changing an existing attribute's value type (date to text) is still refused", changedType === "AttributeTypeFixed");
check("the guard refused no read during the tools (every read named its entities)", guardCounts.refused === refusedBefore);

await stock.dispose();
plain.close();
c1.close();
const failed = checks.filter((x) => !x.ok);
const out = process.argv.includes("--json") ? process.argv[process.argv.indexOf("--json") + 1] : undefined;
if (out) writeFileSync(out, JSON.stringify({ gate: "config", at: new Date().toISOString(), checks, failed: failed.length }, null, 2) + "\n");
console.log(`CONFIG GATE ${failed.length ? "FAILED" : "PASSED"}: ${checks.length - failed.length} of ${checks.length} checks`);
demo.close();
process.exit(failed.length ? 1 : 0);
