// C3 round 2: the kernel flock held by a perl child (log.ts KernelLock), across real processes.
// Each holder is scripts/lock-holder.ts (HostLog under test) in its own Node process.
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { describe, expect, it } from "vitest";
import { HostLog } from "../../../../packages/qlever/src/broker/log.js";
import { REPO, freshDir, readSegment, sleep, writeJson } from "./harness.js";

const TSX = path.join(REPO, "node_modules/.bin/tsx");
const SCRIPT = path.join(REPO, "lab/verify/P2Q/scripts/lock-holder.ts");
const alive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
const perlChildOf = (pid: number): number | undefined => {
  try {
    const out = execFileSync("pgrep", ["-P", String(pid), "perl"], { encoding: "utf8" }).trim();
    return out ? Number(out.split("\n")[0]) : undefined;
  } catch {
    return undefined;
  }
};
const holder = (dir: string, mode: string, tag: string, detached = false) => {
  const child = spawn(TSX, [SCRIPT, dir, mode, tag], { stdio: ["ignore", "pipe", "pipe"], detached });
  const events: any[] = [];
  let buf = "";
  child.stdout!.on("data", (d: Buffer) => {
    buf += d.toString();
    for (let i = buf.indexOf("\n"); i >= 0; i = buf.indexOf("\n")) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 1);
      try {
        events.push(JSON.parse(line));
      } catch {
        /* not ours */
      }
    }
  });
  const until = async (pred: (e: any) => boolean, ms = 15_000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const e = events.find(pred);
      if (e) return e;
      await sleep(20);
    }
    return undefined;
  };
  return { child, events, until, acked: () => events.filter((e) => e.event === "acked") };
};
const killQuiet = (pid: number) => {
  try {
    process.kill(pid, "SIGKILL");
  } catch {
    /* author adaptation: the holder already exited (fail-stopped or refused) */
  }
};
const waitGone = async (pid: number, ms = 5_000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (!alive(pid)) return Date.now() - t0;
    await sleep(10);
  }
  return -1;
};
/** Recover the stream in this process and report which ACKed frames (tag, lsn) survived intact. */
const recover = async (dir: string, acked: { tag: string; lsn: number }[]) => {
  let outcome: string;
  try {
    const opened = await HostLog.open(dir, { minFreeBytes: 0 });
    outcome = `opened:${opened.recovery.status}`;
    await opened.log.close();
  } catch (error) {
    outcome = `refused:${String(error).slice(0, 160)}`;
  }
  const frames = readSegment(path.join(dir, "segment-000001.log"));
  const present = new Set(frames.filter((f) => f.kind === 1).map((f) => `${JSON.parse(f.payload.toString()).s}:${f.lsn}`));
  const lost = acked.filter((a) => !present.has(`${a.tag}:${a.lsn}`));
  return { outcome, lost: lost.length, lostSample: lost.slice(0, 5), broken: fs.readdirSync(dir).filter((f) => f.startsWith("broken-")) };
};

describe("kernel flock across processes", () => {
  it("SIGKILL of the holder: the perl child exits and the stream can be reopened", async () => {
    const dir = freshDir("lock-kill");
    const a = holder(dir, "hold", "A");
    const opened = await a.until((e) => e.event === "opened");
    expect(opened).toBeDefined();
    await a.until((e) => e.event === "acked");
    const perl = perlChildOf(opened.pid)!;
    const contender = holder(dir, "hold", "X");
    const refusedWhileAlive = await contender.until((e) => e.event === "refused" || e.event === "opened");
    killQuiet(opened.pid);
    const perlGoneMs = await waitGone(perl);
    const b = holder(dir, "hold", "B");
    const reopened = await b.until((e) => e.event === "opened" || e.event === "refused");
    killQuiet(reopened?.pid ?? b.child.pid!);
    writeJson("check1-lock-sigkill.json", { contenderWhileHolderAlive: refusedWhileAlive?.event, perlGoneMs, reopenedAfterKill: reopened?.event });
    expect(refusedWhileAlive?.event).toBe("refused");
    expect(perlGoneMs).toBeGreaterThanOrEqual(0);
    expect(reopened?.event).toBe("opened");
  }, 60_000);

  it("a holder that exits without close(): the perl child does not outlive it", async () => {
    const dir = freshDir("lock-exit");
    const a = holder(dir, "exit", "A");
    const opened = await a.until((e) => e.event === "opened");
    const perl = perlChildOf(opened.pid)!;
    const nodeGone = await waitGone(opened.pid);
    const perlGoneMs = await waitGone(perl);
    writeJson("check1-lock-exit.json", { nodeGone, perlGoneMs, perlPid: perl });
    expect(perlGoneMs).toBeGreaterThanOrEqual(0);
  }, 60_000);

  it("the perl helper dies while the holder lives: does the holder notice, and does a second process get in?", async () => {
    const dir = freshDir("lock-perl-dies");
    const a = holder(dir, "hold", "A");
    const opened = await a.until((e) => e.event === "opened");
    await a.until((e) => e.event === "acked");
    const perl = perlChildOf(opened.pid)!;
    process.kill(perl, "SIGKILL");
    await waitGone(perl);
    await sleep(100);
    const b = holder(dir, "hold", "B");
    const second = await b.until((e) => e.event === "opened" || e.event === "refused");
    await sleep(800); // both append if both hold the stream
    const aAppendFailed = a.events.some((e) => e.event === "append-failed");
    killQuiet(opened.pid);
    if (second?.pid) killQuiet(second.pid);
    await waitGone(opened.pid);
    if (second?.pid) await waitGone(second.pid);
    await sleep(200);
    const acked = [...a.acked(), ...b.acked()];
    const rec = await recover(dir, acked);
    const record = { secondProcess: second?.event, holderNoticed: aAppendFailed, ackedA: a.acked().length, ackedB: b.acked().length, recovery: rec };
    writeJson("check1-lock-perl-dies.json", record);
    expect(record).toBeDefined(); // recorded; the verdict reads the record
  }, 60_000);

  it("Ctrl-C to the process group of a holder that drains on SIGINT: the lock goes before the writes stop", async () => {
    const dir = freshDir("lock-sigint");
    const a = holder(dir, "graceful", "A", true);
    const opened = await a.until((e) => e.event === "opened");
    await a.until((e) => e.event === "acked");
    const perl = perlChildOf(opened.pid)!;
    process.kill(-a.child.pid!, "SIGINT"); // the terminal's Ctrl-C: the whole foreground process group
    const perlGoneMs = await waitGone(perl, 1_500);
    const b = holder(dir, "hold", "B");
    const second = await b.until((e) => e.event === "opened" || e.event === "refused", 1_800);
    await sleep(1_000);
    const ackedAfterSigint = a.acked().filter((e) => true).length;
    await waitGone(opened.pid, 6_000);
    if (second?.pid) killQuiet(second.pid);
    if (second?.pid) await waitGone(second.pid);
    await sleep(200);
    const rec = await recover(dir, [...a.acked(), ...b.acked()]);
    const record = { perlGoneMs, secondProcess: second?.event, ackedA: ackedAfterSigint, ackedB: b.acked().length, recovery: rec };
    writeJson("check1-lock-sigint.json", record);
    expect(record).toBeDefined();
  }, 60_000);
});
