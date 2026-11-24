// [DX-RD3] Mac harness for the saves arm's window driver (v01/saves-arm.ts), the code the server reaches after its
// stack starts. It runs savesArm itself with stubbed calls: adoptedArm (which invokes the window's alongside run as the
// card does), pinnedWindow (which writes the sampled exchanges' records into a reader trace file), cgroup counters and
// firstOffer; readerRecords, the window loop, isolation, deadlines, the result file and sealedArm run for real.
//   node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/rd1/saves-gate/harness.ts NEW_DIR
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { savesArm, savesWindows } from "../../v01/saves-arm.ts";
import { readerRecords, tapeCandidates } from "../pinned-ladder.ts";
import { sealedArm } from "../prepared.ts";
import { firstOffer, FirstOfferReached } from "../../ha1/first-offer.ts";

const root = process.argv[2]!;
assert(root && !fs.existsSync(root), "give a new directory");
fs.mkdirSync(root, { recursive: true });
let cpu = 0;
const counters = Object.fromEntries(["gw-r", "gw-w", "tx", "pg"].map((role) => [role, () =>
  ({ "cpu.stat": `usage_usec ${(cpu += 500_000)}\nuser_usec 1\n`, "memory.current": String(2 ** 30) + "\n" })]));
type Faults = { adopted?: string; pinned?: string; wrong?: string };
function context(name: string, faults: Faults = {}, minutes = 60, offer: (l: string) => void = () => {}): any {
  const out = path.join(root, name), raw = path.join(out, "raw");
  fs.mkdirSync(raw, { recursive: true });
  const trace = path.join(raw, "gw-r.jsonl");
  fs.writeFileSync(trace, JSON.stringify({ type: "metrics", process: "gw-r", at: Date.now() - 60_000, metrics: {} }) + "\n");
  const log: string[] = [];
  let head = 1000;
  return { out, raw, log, base: { read: "http://stub" } as any, agedHead: head, source: "harness", seed: {} as any, writer: "per-person-ordered",
    deadline: Date.now() + minutes * 60_000, stopping: () => false, agedCut: () => ({}) as any, counters,
    calls: {
      savesSeats: 256, readerRecords, tapeCandidates, firstOffer: offer,
      adoptedArm: async (folder: string, _s: string, peer: any, _seed: any, _w: any, loaded: boolean, toy: boolean, startHead: number,
        cell: any, comparison: boolean, study: any, retirement: any, alongside: any) => {
        const name = path.basename(folder);
        log.push("adopted " + name);
        assert(fs.existsSync(folder) && loaded && !toy && !comparison && study === undefined && retirement === undefined);
        assert.equal(startHead, head);
        assert.equal(peer.windowSeconds, 90);
        assert.equal(process.env.DX_V01_TAPE, cell.loaded ? "production-S" : "saturday");
        assert.equal(alongside.label, "rd3/" + name);
        if (faults.adopted === name) throw new Error("planted adoptedArm fault in " + name);
        const result = await alongside.run({ start: Date.now() + 50, seconds: 0.3, startHead, tape: [], senders: [] });
        head += 10;
        return { terminal: head, firstCut: startHead, p2: { offered: 5, receipts: 5, latency: { p50Ms: 1, p99Ms: 2 } },
          p6: { quietOffers: 1, commit: {}, expired: 0, read: {} }, production: cell.loaded ? { metrics: {}, readback: {}, predecessors: {} } : undefined,
          alongside: { label: alongside.label, result } };
      },
      pinnedWindow: async (_read: string, _seed: any, kind: string, window: any, opts: any) => {
        log.push("pinned " + kind);
        assert.equal(opts.seats, 256);
        assert(Array.isArray(window.candidates));
        const name = log.filter((l) => l.startsWith("adopted")).at(-1)!.slice(8);
        if (faults.pinned === name) throw new Error("planted pinnedWindow fault in " + name);
        const ids = opts.profileEvery ? ["a", "b", "c"].map((c) => c.repeat(32)) : [];
        await new Promise((resolve) => setTimeout(resolve, Math.max(0, window.start + window.seconds * 1000 - Date.now())));
        // The reader's trace: two of the three sampled exchanges arrive, plus one metrics minute over the window.
        fs.appendFileSync(trace, ids.slice(0, 2).map((id) => JSON.stringify({ type: "request", readProfileId: id,
          attributes: { handlerCpuNs: 1e6, peerIoStats: { reads: { sql: 2, ocache: 6 } } } }) + "\n").join("") +
          JSON.stringify({ type: "metrics", process: "gw-r", at: window.start + 1000, metrics: { StorageGetMsec: { count: 7 } } }) + "\n");
        return { pin: kind, goodput: 100, wrong: faults.wrong === name ? 3 : 0, errors: 0, read: { p50Ms: 1, p99Ms: 2 },
          ...(opts.profileEvery ? { profiled: { every: opts.profileEvery, ids } } : {}) };
      },
    } };
}
const summary = (ctx: { out: string }) => JSON.parse(fs.readFileSync(path.join(ctx.out, "pinned-saves.json"), "utf8")).windows;
const results: Record<string, unknown> = {};

// 1. Every window, inside sealedArm with a stub prepared ladder whose seal must be called.
{
  const ctx = context("all");
  let sealed = false;
  await sealedArm({ complete: () => { sealed = true; } } as any, "slot", "attempt", async () => { await savesArm(ctx); return "sys"; }, () => {});
  const w = summary(ctx);
  assert(sealed, "the seal was not called");
  assert.deepEqual(w.map((x: any) => x.name), savesWindows.map((x) => x.name));
  assert(w.every((x: any) => !x.skipped && !x.failed));
  for (const x of w) {
    const def = savesWindows.find((d) => d.name === x.name)!;
    assert.equal(x.reads === null, def.pin === undefined, x.name);
    if (def.profileEvery) assert.deepEqual([x.reader.sampled, x.reader.found, x.reader.ioStatsSums["reads.sql"], x.reader.metricsMinutes.length], [3, 2, 4, 1], x.name);
    else assert.equal(x.reader, null);
    assert(Object.values(x.cpuCores).every((v: any) => Number.isFinite(v) && v > 0) && x.memoryMiB["gw-r"] === 1024 && Number.isFinite(x.driver.cores));
    assert(x.saves.offered === 5 && (x.tape === "production-S") === (x.saves.production !== null));
  }
  assert.deepEqual(w.map((x: any) => x.firstCut), w.map((_: unknown, i: number) => 1000 + 10 * i), "each window starts at the previous terminal");
  // [DX-CARD2] Only the first window measured after the stack started is labelled so.
  assert.deepEqual(w.map((x: any) => x.firstAfterStart), w.map((_: unknown, i: number) => i === 0));
  results.all = { windows: w.length, sealed };
}
// 2. An isolated window's pinnedWindow fails: recorded, the rest skipped, the arm returns.
{
  const ctx = context("isolated-fault", { pinned: "s-random-near-head" });
  await savesArm(ctx);
  const w = summary(ctx), i = w.findIndex((x: any) => x.name === "s-random-near-head");
  assert.match(w[i].failed, /planted pinnedWindow fault/);
  assert(w.slice(0, i).every((x: any) => x.reads !== undefined && !x.failed) && w.slice(i + 1).every((x: any) => /failed before it/.test(x.skipped)));
  results.isolatedFault = w.map((x: any) => [x.name, x.failed ? "failed" : x.skipped ? "skipped" : "ran"]);
}
// 3. An isolated window's adoptedArm fails: the same.
{
  const ctx = context("isolated-adopted", { adopted: "ref-random-near-head" });
  await savesArm(ctx);
  assert.match(summary(ctx)[4].failed, /planted adoptedArm fault/);
}
// 4. A published window fails: the arm fails (no seal), no result file.
{
  const ctx = context("published-fault", { adopted: "s-tape" });
  let sealed = false;
  await assert.rejects(sealedArm({ complete: () => { sealed = true; } } as any, "s", "a", async () => { await savesArm(ctx); return ""; }, () => {}), /planted adoptedArm fault in s-tape/);
  assert(!sealed && !fs.existsSync(path.join(ctx.out, "pinned-saves.json")));
}
// 5. Wrong values: in an isolated window recorded, not thrown; in a published one thrown after the result file.
{
  const ctx = context("isolated-wrong", { wrong: "ref-random-seed-cut" });
  await savesArm(ctx);
  assert.equal(summary(ctx).find((x: any) => x.name === "ref-random-seed-cut").reads.wrong, 3);
  const pub = context("published-wrong", { wrong: "s-seed-cut" });
  await assert.rejects(savesArm(pub), /s-seed-cut: wrong values/);
  assert.equal(summary(pub).length, 10);
}
// 6. Deadlines: 3.6 minutes left runs the four S windows and skips the isolated ones; 3 minutes refuses the first S window.
{
  const ctx = context("deadline", {}, 3.6);
  await savesArm(ctx);
  const w = summary(ctx);
  assert(w.slice(0, 4).every((x: any) => !x.skipped) && w.slice(4).every((x: any) => /fewer than/.test(x.skipped)));
  await assert.rejects(savesArm(context("deadline-short", {}, 3)), /No time left for window s-alone/);
  results.deadline = w.map((x: any) => [x.name, x.skipped ? "skipped" : "ran"]);
}
// 7. The dry run: with DX_DRY_RUN_FIRST_OFFER=1 the real firstOffer stops after every window is resolved, before any save.
{
  process.env.DX_DRY_RUN_FIRST_OFFER = "1";
  const ctx = context("dry-run", {}, 60, firstOffer);
  await assert.rejects(savesArm(ctx), FirstOfferReached);
  delete process.env.DX_DRY_RUN_FIRST_OFFER;
  assert.deepEqual(ctx.log, [], "the dry run reached a window");
  assert(!fs.existsSync(path.join(ctx.out, "s-alone")));
}
// 8. The random arm (DX_RD3_WINDOWS=random): only the three random windows, each isolated, in order; a fault in the
// first is recorded and skips the other two without failing the arm; the dry run still stops after resolution.
{
  const ctx = { ...context("random"), selection: "random" };
  await sealedArm({ complete: () => {} } as any, "s", "a", async () => { await savesArm(ctx); return ""; }, () => {});
  const w = summary(ctx);
  assert.deepEqual(w.map((x: any) => x.name), ["ref-random-near-head", "s-random-near-head", "ref-random-seed-cut"]);
  assert(w.every((x: any) => x.reads && x.reader.found === 2 && x.firstCut >= 1000));
  assert.deepEqual(ctx.log.filter((l: string) => l.startsWith("adopted")), w.map((x: any) => "adopted " + x.name));
  const fault = { ...context("random-fault", { pinned: "ref-random-near-head" }), selection: "random" };
  await savesArm(fault);
  assert.deepEqual(summary(fault).map((x: any) => x.failed ? "failed" : x.skipped ? "skipped" : "ran"), ["failed", "skipped", "skipped"]);
  process.env.DX_DRY_RUN_FIRST_OFFER = "1";
  const dry = { ...context("random-dry", {}, 60, firstOffer), selection: "random" };
  await assert.rejects(savesArm(dry), FirstOfferReached);
  delete process.env.DX_DRY_RUN_FIRST_OFFER;
  assert.deepEqual(dry.log, []);
  results.random = w.map((x: any) => x.name);
}
fs.writeFileSync(path.join(root, "harness.json"), JSON.stringify(results, null, 2) + "\n");
console.log("RD3_SAVES_HARNESS passed " + JSON.stringify(results));
