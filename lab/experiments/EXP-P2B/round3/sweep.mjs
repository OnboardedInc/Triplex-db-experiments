// [EXP-P2B-R3] Why: choose four or eight H1 reader workers from matched three-repeat goodput and tail measurements.
// Rejected: selecting worker count from core count alone while other agents share the host.
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
const root = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2B/round3",
  results = [];
for (let repeat = 1; repeat <= 3; repeat++)
  for (const readers of [64, 256])
    for (const workers of [1, 2, 4, 8]) {
      const snapshot = path.join(root, "snapshots", "step3-pool-40");
      const st = fs.statfsSync(root, { bigint: true });
      if (st.bavail * st.bsize < 5n * 1024n ** 3n) throw Error("Disk floor");
      const log = path.join(root, `sweep-${repeat}-${readers}-${workers}-${Date.now()}.log`),
        fd = fs.openSync(log, "wx");
      const exit = await new Promise((resolve) => {
        const c = spawn(
          process.execPath,
          [
            "lab/experiments/EXP-P2B/round3/case.mjs",
            "--phase",
            "step3-pool-40",
            "--readers",
            String(readers),
            "--workers",
            String(workers),
          ],
          { cwd: snapshot, stdio: ["ignore", fd, fd] },
        );
        c.on("exit", resolve);
        c.on("error", () => resolve(127));
      });
      fs.closeSync(fd);
      let child;
      try {
        child = JSON.parse(fs.readFileSync(log, "utf8").trim().split("\n").at(-1));
      } catch {
        child = {};
      }
      const row = { repeat, readers, workers, exit, log, ...child };
      results.push(row);
      fs.writeFileSync(
        path.join(root, "sweep-step3.json"),
        JSON.stringify(results, null, 2) + "\n",
      );
      console.log(JSON.stringify(row));
      if (exit !== 0) process.exit(exit ?? 1);
      const report = JSON.parse(fs.readFileSync(path.join(child.out, "report.json")));
      if (
        report.readers !== readers ||
        report.workerCount !== workers ||
        report.phase !== "step3-pool-40" ||
        !report.sourceUnchanged ||
        report.failures.length ||
        report.committed !== 3000
      )
        throw Error("Sweep content/binding mismatch");
      const archived = spawnSync(
        "/usr/bin/python3",
        ["lab/experiments/EXP-P2B/round3/archive.py", "--case", child.out],
        { stdio: "inherit" },
      );
      if (archived.status !== 0) process.exit(archived.status ?? 1);
    }
const scores = [4, 8].map((workers) => {
  const reports = results
    .filter((r) => r.workers === workers && r.readers === 256)
    .map((r) => JSON.parse(fs.readFileSync(path.join(r.out, "report.json"))));
  return {
    workers,
    goodput:
      reports.reduce((n, r) => n + (r.readerResult.reads / r.readerResult.wallMs) * 1000, 0) /
      reports.length,
    readP99: Math.max(...reports.map((r) => r.readerResult.latencyMs.p99)),
  };
});
scores.sort((a, b) => b.goodput - a.goodput || a.readP99 - b.readP99);
fs.writeFileSync(
  path.join(root, "selected-workers.json"),
  JSON.stringify(
    {
      rule: "highest mean correctness-checked goodput at 256 readers among 4/8 workers; read p99 breaks ties",
      selected: scores[0].workers,
      scores,
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify({ selection: scores[0].workers, scores }));
