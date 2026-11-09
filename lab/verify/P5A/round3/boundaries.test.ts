import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import { performance } from "node:perf_hooks";
import { randomUUID } from "node:crypto";
import { test, after } from "node:test";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { fields } from "../../../bench/lib/g0.ts";
import { W0, V_W0, triplexValue, sha256 } from "../../../bench/lib/w0-world.ts";
import { fingerprintSweep, readW0Fingerprint, freezeMemoryG0, FingerprintRefusal } from "../../../bench/lib/w0-fingerprint.ts";

const scope = randomUUID(), base = memoryComposition("xtdb", scope, 0, () => V_W0);
const seedOps = Array.from({ length: 50 }, (_, i) => ({ op: "assert", entityId: W0.placementId(i), attribute: "weeklyMinutes", value: triplexValue("weeklyMinutes", 2400), validFrom: V_W0 }));
const seed = await base.transact(seedOps, { commandId: "boundary-fixture" }); assert.ok(seed.ok);
const basis = { position: seed.value.position, validAt: V_W0 };
const expected = { ...await readW0Fingerprint(base, 50, basis, new AbortController().signal), N: 50 };
const input: any = { scope, endpoint: base.backend.url, basis, expected, counts: await base.storeCounts() };
input.pin = await freezeMemoryG0(base, input);
const record: any = { classification: "OFFLINE-LIFECYCLE-FIXTURE", acceptance: false,
  limit: "Sparse real memory state and a self-derived known-content pin isolate timing. This is not O-DOMAIN population qualification or a native engine run.",
  testSha256: sha256(fs.readFileSync(new URL(import.meta.url))), D: input.pin.D, results: [] };
const file = "lab/verify/P5A/round3/boundaries.json";
const save = () => fs.writeFileSync(file, JSON.stringify(record, null, 2));
let current: any;
const nativePhases = new Set(["import-composition", "open-public", "import-native", "open-native", "close-native"]);
const empty = Object.keys(fields).find(t => !["tx_assertions", "tx_claims", "tx_attempts", "tx_meta"].includes(t))!;
const phases = ["open-external", "import-memory", "import-composition", "open-public", "import-native", "open-native",
  "store-start", "store-end", "scope-start", "scope-end",
  "count-before:tx_assertions", "count-after:tx_assertions", "scan-open:tx_assertions", "scan-row:tx_assertions", "scan-done:tx_assertions",
  `count-before:${empty}`, `count-after:${empty}`, `scan-open:${empty}`, `scan-done:${empty}`,
  "import-pins", "pins-file-read", "w0-page", "w0-yield", "observer", "close-outer", "close-native"];

const makeContext = (phase: string, mode: string, native = nativePhases.has(phase)) => {
  let release!: () => void;
  const latch = new Promise<void>(r => { release = r; });
  return { id: randomUUID(), phase, mode, native, controller: new AbortController(), latch, release,
    deadlineMs: mode === "deadline" ? 1500 : 10000, triggered: false, events: [] as string[], signals: [] as any[],
    outerCreated: 0, nativeCreated: 0, outerClosed: 0, nativeClosed: 0, scopes: 0, counts: new Map(), stores: 0, w0: false };
};
const hitSync = (c: any, phase: string) => {
  c.events.push(phase);
  if (c.phase !== phase || c.triggered) return false;
  c.triggered = true;
  if (c.mode === "abort") c.controller.abort(new Error("planted cancellation at " + phase));
  if (c.mode === "deadline") {
    const until = performance.now() + c.deadlineMs + 20;
    while (performance.now() < until) {}
  }
  return true;
};
const gate = async (c: any, phase: string, signal?: AbortSignal) => {
  c.events.push(phase);
  if (signal) c.signals.push({ phase, signal });
  if (c.phase !== phase || c.triggered) return;
  c.triggered = true;
  if (c.mode === "abort") queueMicrotask(() => c.controller.abort(new Error("planted cancellation at " + phase)));
  await c.latch;
};
const readerFor = (c: any) => {
  const r = base.g0Reader!(scope);
  return { ...r, endpoint: c.endpoint,
    scopes: async (signal: AbortSignal) => { await gate(c, ++c.scopes === 1 ? "scope-start" : "scope-end", signal); return r.scopes(signal); },
    count: async (t: any, s: string, signal: AbortSignal) => {
      const n = (c.counts.get(t) ?? 0) + 1; c.counts.set(t, n);
      await gate(c, `${n === 1 ? "count-before" : "count-after"}:${t}`, signal); return r.count(t, s, signal);
    },
    async *scan(t: any, s: string, signal: AbortSignal) {
      await gate(c, "scan-open:" + t, signal);
      for await (const row of r.scan(t, s, signal)) { await gate(c, "scan-row:" + t, signal); yield row; }
      await gate(c, "scan-done:" + t, signal);
    } };
};
const compFor = (c: any) => ({ ...base, backend: { ...base.backend, url: c.endpoint },
  g0Reader: c.native ? undefined : () => readerFor(c),
  storeCounts: async (signal?: AbortSignal) => { await gate(c, ++c.stores === 1 ? "store-start" : "store-end", signal); return base.storeCounts(); },
  sweepPage: async (...args: any[]) => { await gate(c, "w0-page"); c.w0 = true; return (base.sweepPage as any)(...args); },
  close: async () => {
    c.outerClosed++; await gate(c, "close-outer");
    if (c.mode === "close-error-outer") throw Error("planted outer close failure");
  } });
const outer = (c: any) => { c.outerCreated++; return { endpoint: c.endpoint, scope, comp: compFor(c), close: async () => {
  c.outerClosed++; await gate(c, "close-outer"); if (c.mode === "close-error-outer") throw Error("planted outer close failure");
}, observePage: () => hitSync(c, "observer") }; };

// [CX-VP5A-R3] Why: exercise the unmodified wrapper's lazy-import awaits without opening native clients. Rejected: editing the admission source or making a real engine connection.
const wrapperUrl = new URL("../../../bench/lib/w0-fingerprint.ts", import.meta.url).href;
const evaluateUrl = new URL("../../../bench/lib/evaluate.ts", import.meta.url).href;
(globalThis as any).__vp5 = {
  importGate: async (kind: string) => gate(current, "import-" + kind),
  memory: () => { const c = current; c.outerCreated++; return compFor(c); },
  public: async () => { const c = current; await gate(c, "open-public"); c.outerCreated++; return compFor(c); },
  native: async () => { const c = current; await gate(c, "open-native"); c.nativeCreated++;
    return { reader: readerFor(c), scopeKey: (s: string) => s, close: async () => { c.nativeClosed++; await gate(c, "close-native"); if (c.mode === "close-error-native") throw Error("planted native close failure"); } }; },
  readFile: (...args: any[]) => { hitSync(current, "pins-file-read"); return (fs.readFileSync as any)(...args); },
};
const hooks = registerHooks({
  resolve(specifier, context, next) {
    const kinds: any = { "./memory.ts": "memory", "./composition.ts": "composition", "./g0-xtdb.ts": "native" };
    let kind: string | undefined;
    if (current && context.parentURL === wrapperUrl) kind = kinds[specifier];
    if (current && context.parentURL === evaluateUrl && specifier === "node:fs") kind = "pins";
    return kind ? { url: "vp5-fixture:" + kind + "?" + current.id, shortCircuit: true } : next(specifier, context);
  },
  load(url, context, next) {
    if (!url.startsWith("vp5-fixture:")) return next(url, context);
    const kind = url.slice("vp5-fixture:".length).split("?")[0];
    return { format: "module", shortCircuit: true, source: `await globalThis.__vp5.importGate(${JSON.stringify(kind)});
export const memoryComposition=(...a)=>globalThis.__vp5.memory(...a);
export const openComposition=(...a)=>globalThis.__vp5.public(...a);
export const openG0=(...a)=>globalThis.__vp5.native(...a);
export const readFileSync=(...a)=>globalThis.__vp5.readFile(...a);` };
  },
});
const originalImmediate = globalThis.setImmediate;
(globalThis as any).setImmediate = (callback: any, ...args: any[]) => {
  const c = current;
  if (c?.w0) { c.w0 = false; return originalImmediate(async () => { await gate(c, "w0-yield"); callback(...args); }); }
  return originalImmediate(callback, ...args);
};
after(() => { hooks.deregister(); (globalThis as any).setImmediate = originalImmediate; delete (globalThis as any).__vp5; });

async function runCase(phase: string, mode: string, native?: boolean) {
  const c = makeContext(phase, mode, native); current = c;
  c.endpoint = c.native ? "offline-native://" + scope : base.backend.url;
  const args = { ...input, endpoint: c.endpoint, deadlineMs: c.deadlineMs, signal: c.controller.signal };
  const useDefault = ["import-memory", "import-composition", "open-public"].includes(phase);
  const open = async (_e: string, _s: string, signal?: AbortSignal) => { await gate(c, "open-external", signal); return outer(c); };
  let result: any, error: any; const start = performance.now();
  try { result = await fingerprintSweep(args, useDefault ? undefined : open); }
  catch (e) { error = e; }
  const elapsedMs = performance.now() - start;
  const beforeRelease = { outerCreated: c.outerCreated, outerClosed: c.outerClosed, nativeCreated: c.nativeCreated, nativeClosed: c.nativeClosed };
  c.release();
  await new Promise(r => originalImmediate(r)); await new Promise(r => originalImmediate(r));
  await new Promise(r => setTimeout(r, 5));
  const observation = { phase, mode, native: c.native, deadlineMs: c.deadlineMs, elapsedMs, triggered: c.triggered,
    result, refusal: error ? { tag: error._tag, message: String(error) } : null,
    beforeRelease, afterRelease: { outerCreated: c.outerCreated, outerClosed: c.outerClosed, nativeCreated: c.nativeCreated, nativeClosed: c.nativeClosed },
    signals: c.signals.map((s: any) => ({ phase: s.phase, aborted: s.signal.aborted })), events: c.events };
  record.results.push(observation); save();
  if (mode === "positive") { assert.equal(result?.status, "complete-and-matching"); assert.equal(result.admission.D, input.pin.D); }
  else { assert.equal(result, undefined); assert.ok(error instanceof FingerprintRefusal, String(error));
    if (mode === "deadline" || mode === "abort") assert.equal(c.triggered, true, "fault site must actually be reached"); }
  assert.equal(c.outerClosed, c.outerCreated, "every acquired outer resource closes exactly once");
  assert.equal(c.nativeClosed, c.nativeCreated, "every acquired native resource closes exactly once");
  current = undefined;
}

test("known matching content grants in memory and mocked native paths", async () => { await runCase("positive", "positive", false); await runCase("positive", "positive", true); });
for (const phase of phases) for (const mode of ["deadline", "abort"])
  test(`no stale grant at ${phase} / ${mode}`, () => runCase(phase, mode));
for (const phase of ["scope-start", "scope-end"])
  test(`native scope mapping refuses cancellation at ${phase}`, () => runCase(phase, "abort", true));
for (const mode of ["close-error-outer", "close-error-native"])
  test(`both resources close when ${mode}`, () => runCase("no-injected-delay", mode, true));
