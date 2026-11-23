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
const stockLoad = async () => digest(await stock.runPromise(Effect.flatMap(ConfigStore.ConfigStore, (s) => s.load())));

// 1. bounded equals stock
const c1 = fresh();
const before = { ...guardCounts };
const bounded = await c1.load();
const reference = await stockLoad();
check("bounded load equals stock load (objects, types, revisions, releases, refs)", JSON.stringify(digest(bounded.store)) === JSON.stringify(reference),
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

// 4. the tools, as the assistant calls them
const call = (name: string, input: object) => runTool(name, input, "proof", demo) as Promise<Record<string, any>>;
const refusedBefore = guardCounts.refused;
const review = await call("define_entity_type", {
  name: "Review",
  attributes: [
    { key: ":review/outcome", valueType: "enumOf", enumValues: ["approved", "rejected", "pending"], required: true },
    { key: ":review/note", valueType: "text" },
    { key: ":review/of", valueType: "ref", refTarget: "Subject", required: true },
    { key: ":review/decided-on", valueType: "date" },
  ],
  label: `reviews-${stamp}`,
});
check("define_entity_type commits a release and moves test and live", review["refs"].test.id === review["release"].id && review["refs"].live.id === review["release"].id,
  `release ${review["release"].label}, added ${review["objects"].added.length}, position ${review["receipt"].position}`);
const types = await call("list_entity_types", {});
check("list_entity_types lists Subject and Review from live", JSON.stringify(types["types"].map((t: { name: string }) => t.name)) === '["Subject","Review"]');
const described = await call("describe_entity_type", { name: "Review" });
const t = described["type"];
check("describe_entity_type: four attributes, the enum, the reference target, generated constraints",
  t.attributes.length === 4 && t.attributes.find((x: any) => x.key === ":review/outcome").enumValues.join() === "approved,pending,rejected" &&
  t.attributes.find((x: any) => x.key === ":review/of").refTarget === "Subject" && t.constraints.some((x: any) => x.kind === "ReferenceTarget" && /Not checked/.test(x.status)),
  `${t.constraints.length} constraints`);
const releases = await call("list_releases", { limit: 5, compare: [review["basedOn"].id, review["release"].id] });
check("list_releases compares two releases at object level", releases["difference"].some((d: any) => d.change === "added" && d.key === "Review"),
  JSON.stringify(releases["difference"].map((d: any) => `${d.change} ${d.kind} ${d.key}`)));
const back = await call("move_live", { snapshotId: review["basedOn"].id });
const typesBack = await call("list_entity_types", {});
check("move_live back: Review leaves the type list", !typesBack["types"].some((x: any) => x.name === "Review") && back["after"].id === review["basedOn"].id);
const forward = await call("move_live", { snapshotId: review["release"].id });
check("move_live forward again", forward["after"].id === review["release"].id);
let refusedRepeat = "";
try { await call("move_live", { snapshotId: review["release"].id }); } catch (e) { refusedRepeat = (e as { code?: string }).code ?? ""; }
check("move_live to the release live already points to is refused", refusedRepeat === "AlreadyLive");
let typeFixed = "";
try { await call("define_entity_type", { name: "Other", attributes: [{ key: ":review/note", valueType: "integer" }] }); } catch (e) { typeFixed = (e as { code?: string }).code ?? ""; }
check("an existing attribute keeps its value type", typeFixed === "AttributeTypeFixed");
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
