import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";
import { sourceId } from "./source.ts";

type Result = {
  type: "done";
  nonce: string;
  source: string;
  slot: string;
  scope: string;
  start: number;
  duration: number;
  width: number;
  peak: number;
  facts: number;
  sourceSeal: string;
  proof: { cut: number; observed: number; facts: number; cursor: number };
};
export async function isolatedImport(
  url: string,
  scope: string,
  dir: string,
  arm: string,
  subjects: number,
  width: number,
) {
  const child = fork(
    fileURLToPath(new URL("./split-import.ts", import.meta.url)),
    [scope, dir, arm, String(subjects), String(width)],
    {
      execArgv: ["--import", "tsx"],
      env: { ...process.env, DATOMIC_URL: url },
      stdio: ["ignore", "ignore", "inherit", "ipc"],
    },
  );
  const binding = [
    process.env.TRIPLEX_TRACE_RUN,
    process.env.TRIPLEX_TRACE_SOURCE,
    process.env.TRIPLEX_TRACE_SLOT,
    scope,
  ];
  let phase: "booting" | "ready" | "released" | "done" = "booting";
  let resolveReady!: () => void, resolveDone!: (r: Result) => void;
  let fail!: (err: Error) => void;
  const failed = new Promise<never>((_, reject) => {
    fail = reject;
  });
  void failed.catch(() => {});
  const ready = new Promise<void>((r) => {
    resolveReady = r;
  });
  const done = new Promise<Result>((r) => {
    resolveDone = r;
  });
  const exit = new Promise<void>((resolve) => {
    child.once("close", (code, signal) => {
      if (code !== 0 || phase !== "done") fail(Error("Isolated import exited " + (code ?? signal)));
      resolve();
    });
  });
  child.once("error", fail);
  child.on("message", (msg) => {
    try {
      const m = msg as Result | (Omit<Result, "type"> & { type: "ready" });
      assert.deepEqual([m.nonce, m.source, m.slot, m.scope], binding);
      if (phase === "booting" && m.type === "ready") {
        phase = "ready";
        resolveReady();
      } else {
        assert(phase === "released" && m.type === "done");
        assert.equal(m.sourceSeal, sourceId("thin", subjects));
        phase = "done";
        resolveDone(m);
      }
    } catch (err) {
      fail(err as Error);
    }
  });
  try {
    await Promise.race([ready, failed]);
  } catch (err) {
    child.kill("SIGTERM");
    throw err;
  }
  return {
    async run(start: number, duration: number) {
      assert(phase === "ready");
      phase = "released";
      child.send({ start, duration, nonce: binding[0] });
      const m = await Promise.race([done, failed]);
      await exit;
      assert.equal(child.exitCode, 0);
      assert.deepEqual([m.start, m.duration, m.width], [start, duration, width]);
      const raw = JSON.parse(fs.readFileSync(path.join(dir, arm + "-split.offers.json"), "utf8"));
      assert.deepEqual(
        [
          raw.nonce,
          raw.source,
          raw.slot,
          raw.scope,
          raw.arm,
          raw.start,
          raw.duration,
          raw.width,
          raw.peak,
          raw.facts,
        ],
        [...binding, arm, start, duration, width, m.peak, m.facts],
      );
      assert(
        m.peak === 2 &&
          raw.issued.length === m.proof.observed &&
          m.proof.cut === raw.issued.length + 1,
      );
      assert.equal(
        m.facts,
        raw.issued
          .filter((r: any) => r.settled <= duration)
          .reduce((n: number, r: any) => n + r.facts, 0),
      );
      return m;
    },
    async close() {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
      await exit;
    },
  };
}
