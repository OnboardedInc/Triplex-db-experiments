// @ts-nocheck -- [EXP-CHECKJS-R2] runtime-populated records, option bags, or branch-specific union members. Binding errors remain checked by lab/bin/checkjs.mjs.
// Sample and stop only a newly launched, owned process group. Sampling does not
// establish a physical RSS bound, and V8 heap settings are not an RSS limit.
import { execFileSync, spawn } from "node:child_process";

export const runBoundedChild = async (command, args, options = {}) => {
  const memoryBytes = options.memoryBytes ?? 2 * 1024 ** 3;
  const sampleEveryMs = options.sampleEveryMs ?? 250;
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: options.stdio ?? "inherit",
    detached: true,
  });
  const samples = [];
  let peakBytes = 0;
  let childPeakBytes = 0;
  let controllerPeakBytes = 0;
  let termination = null;
  let escalation;
  const stopOwned = (reason) => {
    if (termination || !child.pid) return;
    termination = { reason, timestampUtc: new Date().toISOString(), processGroup: child.pid };
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch (error) {
      if (error.code !== "ESRCH") termination.signalError = error.message;
    }
    escalation = setTimeout(() => {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch (error) {
        if (error.code !== "ESRCH") termination.escalationError = error.message;
      }
    }, 5000);
  };
  const started = performance.now();
  const sample = () => {
    try {
      const rows = execFileSync("ps", ["-axo", "pid=,ppid=,pgid=,rss="], {
        encoding: "utf8",
        timeout: 5000,
        maxBuffer: 2 * 1024 ** 2,
      })
        .trim()
        .split("\n")
        .map((line) => line.trim().split(/\s+/).map(Number));
      // PGID is assigned to this new detached child. Unrelated user processes
      // cannot be descendants of this owned launch or share its live group.
      const owned = rows.filter((row) => row[2] === child.pid);
      const childBytes = owned.reduce((sum, row) => sum + row[3] * 1024, 0);
      const controllerBytes = process.memoryUsage().rss;
      const bytes = childBytes + controllerBytes;
      peakBytes = Math.max(peakBytes, bytes);
      childPeakBytes = Math.max(childPeakBytes, childBytes);
      controllerPeakBytes = Math.max(controllerPeakBytes, controllerBytes);
      samples.push({
        elapsedMs: performance.now() - started,
        bytes,
        childBytes,
        controllerBytes,
        processes: owned.map((row) => ({
          pid: row[0],
          parentPid: row[1],
          rssBytes: row[3] * 1024,
        })),
      });
      if (bytes > memoryBytes) stopOwned("SAMPLED_ADAPTER_MEMORY_BUDGET_EXCEEDED");
    } catch (error) {
      samples.push({ elapsedMs: performance.now() - started, observationError: error.message });
      stopOwned("MEMORY_OBSERVATION_FAILED");
    }
  };
  const timer = setInterval(sample, sampleEveryMs);
  const deadline = options.timeoutMs
    ? setTimeout(() => stopOwned("OWNED_CHILD_DEADLINE_EXCEEDED"), options.timeoutMs)
    : null;
  const exit = await new Promise((resolve) => {
    child.once("error", (error) =>
      resolve({ code: null, signal: null, spawnError: error.message }),
    );
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
  clearInterval(timer);
  if (deadline) clearTimeout(deadline);
  if (escalation) clearTimeout(escalation);
  return {
    exit,
    elapsedMs: performance.now() - started,
    sampledPeakBytes: peakBytes,
    childPeakBytes,
    controllerPeakBytes,
    memoryBudgetBytes: memoryBytes,
    sampleEveryMs,
    samples,
    termination,
    limitation:
      "Sampled sum of the owned child process group and this controller RSS; shared pages count repeatedly and peaks can be missed. Other independently launched agent clients are not included. Not a physical containment guarantee.",
  };
};
