import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { monitorEventLoopDelay } from "node:perf_hooks";
import { now } from "../scale1/decision/observer.ts";
import type { adoptedArm as AdoptedArm } from "./adopted.ts";
import { ladderSizes, type AgedCut } from "./production-card.ts";
import type * as Ladder from "../rd1/pinned-ladder.ts";

// [DX-RD3] The window driver of the pinned arm with saves (study-server.ts DX_RD3_PINNED_SAVES=1). Every call it makes
// outside this file comes in through `calls`, so rd1/saves-gate/harness.ts runs this exact code on the Mac with stubs.
// Rejected: keeping it in study-server.ts, whose top level needs the server's lock, cgroups and stack (the 01:27 UTC
// fault, a module constant read before its line ran, could not be caught on the Mac there).
//
// The four S windows are the published arm; every later window is isolated. It runs only if its time (plus two minutes
// for cleanup) remains, a fault in it is recorded and skips the rest without failing the arm or its seal, and its wrong
// values are recorded, not thrown. The random windows read subjects drawn uniformly from all ten accounts, the product's
// cache-cold case, and sample every n-th exchange's io-stats and handler CPU from the reader.
// Rejected: placing the random windows first (a fault in new code would cost the published windows).
export type SavesWindow = { name: string; tape: "production-S" | "saturday"; pin?: Ladder.PinKind;
  isolated: boolean; minutes: number; profileEvery?: number;
  /** [DX-S1] The save-size ladder: every neighbour save has exactly this many facts, at the 50-row cell's times. */
  facts?: number; rate?: 50 | 235 | 394 | 620 };
export const savesWindows: readonly SavesWindow[] = [
  { name: "s-alone", tape: "production-S", isolated: false, minutes: 3.5 },
  { name: "s-near-head", tape: "production-S", pin: "near-head", isolated: false, minutes: 3.5 },
  { name: "s-seed-cut", tape: "production-S", pin: "seed-cut", isolated: false, minutes: 3.5 },
  { name: "s-tape", tape: "production-S", pin: "tape", isolated: false, minutes: 3.5 },
  { name: "ref-random-near-head", tape: "saturday", pin: "random-near-head", isolated: true, minutes: 4.5, profileEvery: 16 },
  { name: "s-random-near-head", tape: "production-S", pin: "random-near-head", isolated: true, minutes: 5.5, profileEvery: 16 },
  { name: "ref-random-seed-cut", tape: "saturday", pin: "random-seed-cut", isolated: true, minutes: 4.5, profileEvery: 16 },
  { name: "ref-near-head", tape: "saturday", pin: "near-head", isolated: true, minutes: 4.5, profileEvery: 128 },
  { name: "ref-seed-cut", tape: "saturday", pin: "seed-cut", isolated: true, minutes: 4.5, profileEvery: 128 },
  { name: "ref-tape", tape: "saturday", pin: "tape", isolated: true, minutes: 4.5 },
];
// [DX-S1] The save-size ladder (DX_RD3_WINDOWS=ladder): one isolated window per size with 256 pinned readers near the
// head, every neighbour save of exactly N facts at the 50 rows/s cell's save times (about 2.9 saves/s), so the serial
// point stays below a third busy even at 1,000 facts. Rejected: the 394 cell (23 saves/s of 1,000 facts would fill the
// serial point and measure a queue, not a save).
export const ladderWindows: readonly SavesWindow[] = ladderSizes.map((facts) =>
  ({ name: "ladder-" + facts, tape: "production-S", pin: "near-head", isolated: true, minutes: 3.5, facts, rate: 50 }));
const pinKinds: readonly string[] = ["seed-cut", "near-head", "tape", "random-near-head", "random-seed-cut"];

type Counters = Record<string, () => Record<string, string | null>>;
export type SavesContext = {
  /** "random": only the three random windows (the random arm), each isolated, in list order. "ladder": the save-size
   * ladder windows (DX-S1). */
  selection?: "all" | "random" | "ladder";
  out: string; base: Parameters<typeof AdoptedArm>[2]; agedHead: number; raw: string; source: string;
  seed: Parameters<typeof AdoptedArm>[3]; writer: Parameters<typeof AdoptedArm>[4]; deadline: number; stopping: () => boolean;
  agedCut: () => AgedCut; counters: Counters;
  calls: { adoptedArm: typeof AdoptedArm; pinnedWindow: typeof Ladder.pinnedWindow; tapeCandidates: typeof Ladder.tapeCandidates;
    readerRecords: typeof Ladder.readerRecords; savesSeats: number; firstOffer: (launcher: string) => void };
};
const jsonFile = (file: string, data: unknown) =>
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", { flag: "wx", flush: true, mode: 0o600 });

export async function savesArm(ctx: SavesContext) {
  const { out, base, agedHead, raw, source, seed, writer, deadline, counters, calls } = ctx;
  const roles = ["gw-r", "gw-w", "tx", "pg"] as const;
  assert.deepEqual(Object.keys(counters).sort(), [...roles].sort(), "the saves arm needs counters for gw-r, gw-w, tx and pg");
  const usage = () => Object.fromEntries(roles.map((role) => [role,
    Number(/^usage_usec (\d+)$/m.exec(String(counters[role]!()["cpu.stat"]))?.[1])]));
  const memory = () => Object.fromEntries(roles.map((role) => [role, Math.round(Number(String(counters[role]!()["memory.current"]).trim()) / 2 ** 20)]));
  const peer = { ...base, windowSeconds: 90 as const, aged: { cut: ctx.agedCut(), head: agedHead } };
  const traceFile = path.join(raw, "gw-r.jsonl");
  // Resolve every window's settings before the first save, so a dry run (DX_DRY_RUN_FIRST_OFFER=1) covers them.
  const chosen = ctx.selection === "ladder" ? ladderWindows
    : ctx.selection === "random" ? savesWindows.filter((w) => w.pin?.startsWith("random")) : savesWindows;
  assert(chosen.length === (ctx.selection === "random" ? 3 : ctx.selection === "ladder" ? ladderSizes.length : 10));
  const settings = chosen.map((w) => {
    assert(w.pin === undefined || pinKinds.includes(w.pin), `${w.name}: unknown pin kind`);
    assert(w.minutes > 0 && (w.profileEvery === undefined || (Number.isInteger(w.profileEvery) && w.profileEvery > 0)));
    assert(w.facts === undefined || (w.tape === "production-S" && Number.isInteger(w.facts) && w.facts > 0));
    return { ...w, cell: { rate: w.rate ?? 394 as const, loaded: w.tape !== "saturday" }, label: "rd3/" + w.name, folder: path.join(out, w.name) };
  });
  assert.equal(new Set(settings.map((w) => w.name)).size, settings.length);
  if (ctx.selection === undefined || ctx.selection === "all") assert(settings.slice(0, 4).every((w) => !w.isolated) && settings.slice(4).every((w) => w.isolated));
  else assert(settings.every((w) => w.isolated));
  const probe = { cpu: usage(), memoryMiB: memory(), traceFile: fs.existsSync(traceFile), peerAged: peer.aged.head };
  assert(Object.values(probe.cpu).every((v) => Number.isFinite(v)) && Object.values(probe.memoryMiB).every((v) => Number.isFinite(v)),
    "cgroup counters unreadable: " + JSON.stringify(probe));
  console.log("[DX-RD3] windows resolved " + JSON.stringify({ windows: settings.map((w) => [w.name, w.tape, w.pin ?? null, w.minutes]),
    minutesLeft: Number(((deadline - Date.now()) / 60_000).toFixed(1)), probe }));
  calls.firstOffer("pinned " + path.basename(out));
  const windows: any[] = [];
  let terminal = agedHead, halted: string | undefined;
  for (const w of settings) {
    if (halted) { windows.push({ name: w.name, skipped: halted }); continue; }
    if (ctx.stopping() || Date.now() + w.minutes * 60_000 > deadline) {
      assert(w.isolated, `No time left for window ${w.name}`);
      windows.push({ name: w.name, skipped: `fewer than ${w.minutes} minutes left before the deadline` });
      continue;
    }
    try {
      process.env.DX_V01_TAPE = w.tape;
      if (w.facts === undefined) delete process.env.DX_S1_LADDER_FACTS;
      else process.env.DX_S1_LADDER_FACTS = String(w.facts);
      fs.mkdirSync(w.folder);
      const arm: any = await calls.adoptedArm(w.folder, source, peer, seed, writer, true, false, terminal, w.cell, false, undefined, undefined, {
        label: w.label, run: async ({ start, seconds, startHead, tape, senders }) => {
          const offset = fs.existsSync(traceFile) ? fs.statSync(traceFile).size : 0;
          await new Promise((resolve) => setTimeout(resolve, Math.max(0, start - now())));
          // The driver runs the saves' sender and the 256 reader seats in one event loop on cores 9 and 10: its CPU and
          // event-loop delay say how much of a save's or a read's time is the driver's own.
          const before = usage(), at = now(), driverCpu = process.cpuUsage(), loop = monitorEventLoopDelay({ resolution: 10 });
          loop.enable();
          const step = w.pin ? await calls.pinnedWindow(base.read, seed as never, w.pin, { start, seconds, startHead,
            candidates: calls.tapeCandidates(tape, start, senders) }, { seats: calls.savesSeats, profileEvery: w.profileEvery })
            : await new Promise((resolve) => setTimeout(() => resolve(undefined), Math.max(0, start + seconds * 1000 - now())));
          const after = usage(), wall = (now() - at) / 1000, driverUsed = process.cpuUsage(driverCpu);
          loop.disable();
          const driver = { cores: Number(((driverUsed.user + driverUsed.system) / 1e6 / wall).toFixed(3)),
            eventLoopDelayMs: { p50: loop.percentile(50) / 1e6, p99: loop.percentile(99) / 1e6, max: loop.max / 1e6 } };
          // Each role's cgroup memory at the window's end, for the memory caps of a scorecard setting.
          const memoryMiB = memory();
          // Wait for the reader's buffered trace, then take this window's io-stats samples and metrics minutes.
          let reader: unknown;
          if (w.profileEvery && fs.existsSync(traceFile)) {
            await new Promise((resolve) => setTimeout(resolve, 3000));
            try { reader = calls.readerRecords(traceFile, offset, start, start + seconds * 1000, (step as any)?.profiled?.ids ?? []); }
            catch (error) { reader = { error: String(error) }; }
          }
          return { step, memoryMiB, driver, reader,
            cpuCores: Object.fromEntries(roles.map((role) => [role, Number(((after[role]! - before[role]!) / 1e6 / wall).toFixed(3))])) };
        } });
      terminal = arm.terminal!;
      const along = arm.alongside.result;
      const production = arm.production;
      // [DX-CARD2] The first window measured after the stack started finds the saved subjects cold (on 2026-11-23 the
      // quiet account's 52 and 59 ms p99 were that); it is labelled so, whatever its name.
      const firstAfterStart = !windows.some((x: any) => x.firstCut !== undefined);
      windows.push({ name: w.name, firstAfterStart, tape: w.tape, pin: w.pin ?? null, ...(w.facts ? { facts: w.facts, rate: w.rate } : {}), firstCut: arm.firstCut, terminal,
        reads: along.step ?? null, reader: along.reader ?? null, cpuCores: along.cpuCores, memoryMiB: along.memoryMiB, driver: along.driver,
        saves: { offered: arm.p2.offered, receipts: arm.p2.receipts, latency: arm.p2.latency,
          production: production ? { metrics: production.metrics, readback: production.readback, predecessors: production.predecessors } : null,
          quiet: arm.p6 ? { offers: arm.p6.quietOffers, commit: arm.p6.commit, expired: arm.p6.expired, read: arm.p6.read } : null } });
    } catch (error) {
      if (!w.isolated) throw error;
      // A fault in an isolated window is its own: record it and skip the rest (the stack's state after it is unknown).
      console.error(`[DX-RD3] window ${w.name} failed: ${error instanceof Error ? error.stack : String(error)}`);
      windows.push({ name: w.name, failed: error instanceof Error ? error.message : String(error) });
      halted = `window ${w.name} failed before it`;
    }
  }
  delete process.env.DX_S1_LADDER_FACTS;
  jsonFile(path.join(out, "pinned-saves.json"), { source, selection: ctx.selection ?? "all", head: agedHead, seats: calls.savesSeats, windowSeconds: 90, windows });
  console.log("[DX-RD3] " + JSON.stringify(windows.map((w: any) => ({ name: w.name, ...(w.firstAfterStart ? { firstAfterStart: true } : {}), skipped: w.skipped, failed: w.failed,
    reads: w.reads && { goodput: w.reads.goodput, p50: w.reads.read?.p50Ms, p99: w.reads.read?.p99Ms, wrong: w.reads.wrong, errors: w.reads.errors },
    saves: w.saves && { p50: w.saves.latency?.p50Ms, p99: w.saves.latency?.p99Ms, receipts: w.saves.receipts, offered: w.saves.offered }, cpu: w.cpuCores, driver: w.driver }))));
  for (const w of windows) if (w.reads && (w.reads.wrong || w.reads.errors))
    console.error(`[DX-RD3] WINDOW ${w.name}: ${w.reads.wrong} WRONG VALUES, ${w.reads.errors} READ ERRORS`);
  const published = new Set(savesWindows.filter((w) => !w.isolated).map((w) => w.name));
  for (const w of windows) if (published.has(w.name) && w.reads) assert(w.reads.wrong === 0 && w.reads.errors === 0, `${w.name}: wrong values or read errors`);
  return windows;
}
