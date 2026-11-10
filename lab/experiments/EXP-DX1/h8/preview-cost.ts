import path from "node:path";
import { openComposition } from "../../../bench/lib/composition.ts";
import { runW0Sweep, subjectList } from "../../../bench/lib/sweep.ts";
import { startW0Live, matchW0Live } from "../../../bench/lib/w0-live.ts";
import { loadMemo, saveMemo } from "../../../bench/lib/w0-memo.ts";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
import { equalBytes } from "../../../bench/lib/w0-gates.ts";
// [DX-H8] Why: lower-priority preview measurements run after activation's ACK, oracle, G9 and resume results are saved.
// Rejected: spending its baseline window before the activation or losing verified activation results on a later timeout.
export async function previewCosts(report: any, dir: string, save: () => void) {
  const comp = await openComposition(report.composition, report.lane, report.scope);
  const memo = loadMemo(path.join(dir, "preview-memo.json"));
  if (!memo) throw Error("preview cost requires the actual stored B0 memo");
  const options = {
    comp,
    composition: report.composition,
    lane: report.lane,
    scope: report.scope,
    N: report.N,
    dir,
    seed: "DX-H2-frozen-v1",
    offsetS: 0,
    warmupMs: 15000,
  };
  let traffic: Awaited<ReturnType<typeof startW0Live>> | undefined;
  report.previewCosts = [];
  report.previewCostsPhase =
    "after activation ACK, every-subject oracle, G9 and completed-cursor resume";
  try {
    traffic = await startW0Live({ ...options, id: report.attempt + ":preview-baseline" });
    await new Promise((r) => setTimeout(r, 90000));
    const baseline = await traffic.stop();
    traffic = undefined;
    for (const workers of [2, 4]) {
      const captured: Record<string, any> = {};
      const result = await runW0Sweep({
        comp,
        composition: report.composition,
        lane: report.lane,
        scope: report.scope,
        subjects: subjectList(report.N),
        basis: memo.basis,
        sweepId: report.attempt + ":preview-cost:" + workers,
        cursor: path.join(dir, `preview-cost-cursor-${workers}.json`),
        workers,
        captureClosure: true,
        beforeTimedWindow: async () => {
          traffic = await startW0Live({
            ...options,
            id: report.attempt + ":preview-cost:" + workers,
          });
        },
        onPage: async (records) => {
          for (const r of records) {
            equalBytes(
              "H8 preview output",
              W0.outputJson(r.output),
              W0.outputJson(memo.entries[r.subject].output),
            );
            equalBytes(
              "H8 preview record",
              canonical(r.record),
              canonical(memo.entries[r.subject].record),
            );
            captured[r.subject] = { ...r, releaseHash: memo.releaseHash, basis: memo.basis };
          }
        },
      });
      if (Object.keys(captured).length !== report.N) throw Error("preview incomplete");
      const persistStarted = performance.now(),
        cpuStart = process.threadCpuUsage();
      saveMemo(path.join(dir, `preview-cost-${workers}.memo.json`), { ...memo, entries: captured });
      const cpu = process.threadCpuUsage(cpuStart);
      const durableAt = performance.timeOrigin + performance.now(),
        memoPersistMs = performance.now() - persistStarted;
      const live = await traffic!.stop();
      traffic = undefined;
      const observation = {
        workers,
        wallMs: durableAt - result.activationStartedAtEpochMs,
        evaluationWallMs: result.wallMs,
        memoPersistMs,
        memoPersistCpuMs: (cpu.user + cpu.system) / 1000,
        live,
        baseline,
        matched: matchW0Live(baseline, live),
        metrics: result.metrics,
      };
      report.previewCosts.push(observation);
      save();
      console.log("[H8 preview cost] " + JSON.stringify(observation));
    }
  } finally {
    if (traffic) await traffic.stop();
    await comp.close();
  }
}
