// [EXP-P2B-R2] Why: retain all six matched placement/count cases without changing the offered trace.
// Rejected: compare a busy colocated run with an unbound low-load worker run.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const phase = process.argv[2];
if (!["before", "after"].includes(phase)) throw Error("Choose before or after");
const root = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2B/round2";
fs.mkdirSync(root, { recursive: true });
const results = [];
for (const placement of ["local", "worker"])
  for (const readers of [0, 16, 256]) {
    const disk = fs.statfsSync(root, { bigint: true });
    if (disk.bavail * disk.bsize < 5n * 1024n ** 3n) throw Error("Below 5 GiB disk floor");
    const log = path.join(root, `${phase}-${placement}-${readers}-${Date.now()}.log`),
      fd = fs.openSync(log, "wx");
    const args = [
      "lab/experiments/EXP-P2B/round2/case.mjs",
      "--phase",
      phase,
      "--placement",
      placement,
      "--readers",
      String(readers),
      "--per-band",
      "200",
      "--rate",
      "20",
    ];
    const exit = await new Promise((resolve) => {
      const child = spawn(process.execPath, args, { stdio: ["ignore", fd, fd] });
      child.on("close", resolve);
      child.on("error", (error) => {
        fs.writeSync(fd, String(error));
        resolve(127);
      });
    });
    fs.closeSync(fd);
    const last = fs.readFileSync(log, "utf8").trim().split("\n").at(-1);
    const result = {
      placement,
      readers,
      exit,
      log,
      ...(last.startsWith("{") ? JSON.parse(last) : { last }),
    };
    results.push(result);
    console.log(JSON.stringify(result));
    fs.writeFileSync(
      path.join(root, `matrix-${phase}.json`),
      JSON.stringify(results, null, 2) + "\n",
    );
    if (exit !== 0) {
      process.exitCode = 1;
      break;
    }
  }
