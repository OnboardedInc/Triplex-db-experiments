// [EXP-P2B-R3] Why: preserve three independent attempts per reader count after each ordered change.
// Rejected: replacing a noisy run with a favorable retry or undersampling a facts band.
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
const phase = process.argv[2];
if (!phase) throw Error("phase required");
// [EXP-P2B-R3] Why: each measured step runs frozen source/build bytes while later work proceeds.
// Rejected: allowing a queued run to adopt later implementation changes.
const snapshot = path.join(
  "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2B/round3/snapshots",
  phase,
);
if (fs.existsSync(snapshot)) process.chdir(snapshot);
const root = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2B/round3";
fs.mkdirSync(root, { recursive: true });
const result = [];
for (let repeat = 1; repeat <= 3; repeat++)
  for (const readers of (process.env.P2B_COUNTS ?? "0,64,256").split(",").map(Number)) {
    const st = fs.statfsSync(root, { bigint: true });
    if (st.bavail * st.bsize < 5n * 1024n ** 3n) throw Error("Below disk floor");
    const file = path.join(root, `${phase}-${repeat}-${readers}-${Date.now()}.log`),
      fd = fs.openSync(file, "wx");
    const args = [
      "lab/experiments/EXP-P2B/round3/case.mjs",
      "--phase",
      phase,
      "--readers",
      String(readers),
      "--per-band",
      "1000",
      "--rate",
      "40",
    ];
    if (process.env.P2B_WORKERS) args.push("--workers", process.env.P2B_WORKERS);
    if (process.env.P2B_MAINTENANCE) args.push("--maintenance", process.env.P2B_MAINTENANCE);
    const exit = await new Promise((r) => {
      const c = spawn(process.execPath, args, { stdio: ["ignore", fd, fd] });
      c.once("exit", r);
      c.once("error", () => r(127));
    });
    fs.closeSync(fd);
    let child;
    try {
      child = JSON.parse(fs.readFileSync(file, "utf8").trim().split("\n").at(-1));
    } catch {
      child = { error: "no summary" };
    }
    if (exit === 0) {
      const report = JSON.parse(fs.readFileSync(path.join(child.out, "report.json")));
      if (
        report.attempt !== child.attempt ||
        report.phase !== phase ||
        report.readers !== readers ||
        !report.sourceUnchanged ||
        report.failures.length ||
        report.committed !== 3000 ||
        report.perBandSummary.some((b) => b.stages.offerToAck.n < 1000)
      )
        throw Error("Child content or binding mismatch");
    }
    const row = { phase, repeat, readers, exit, file, ...child };
    result.push(row);
    console.log(JSON.stringify(row));
    fs.writeFileSync(
      path.join(root, `matrix-${phase}.json`),
      JSON.stringify(result, null, 2) + "\n",
    );
    if (exit !== 0) process.exit(exit ?? 1);
    const archived = spawnSync(
      "/usr/bin/python3",
      [
        path.join(
          process.env.P2B_WORKTREE ?? "/Users/sam/projects/triplex-db-2/.claude/worktrees/p2b",
          "lab/experiments/EXP-P2B/round3/archive.py",
        ),
        "--case",
        child.out,
      ],
      { stdio: "inherit" },
    );
    if (archived.status !== 0) process.exit(archived.status ?? 1);
  }
