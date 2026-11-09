// [EXP-P4N-R2] Why: ABAB across processes (one process per arm per round, order reversed every round) with raw 100-pull batches.
// Arm labels "<build>[+lever][@twin]"; "final" and "final@2" are the same retained build, run as two arms (in-run A/A).
// Levers are node flags on the serving process, recorded by arm4.ts: semi32/semi64/semi128 (--max-semi-space-size), stgc (--single-threaded-gc).
// usage: node abab4.mjs <outdir> <rounds> <armsCSV> <segments> <pullsPerSegment> <warm> [clients=1]
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
const [outdir, rounds, armsCsv, segments = "5", pulls = "1000", warm = "300", clients = "1"] =
  process.argv.slice(2);
if (!outdir || !rounds || !armsCsv)
  throw Error("usage: abab4.mjs outdir rounds arms segments pulls warm [clients]");
const arms = armsCsv.split(",");
const wt = path.resolve(import.meta.dirname, "../../../..");
fs.mkdirSync(outdir, { recursive: true });
const free = () => {
  const s = fs.statfsSync("/Users");
  return s.bavail * s.bsize;
};
if (free() < 5 * 1024 ** 3) throw Error("host free space below 5 GiB: no heavy run");
const flags = {
  semi32: "--max-semi-space-size=32",
  semi64: "--max-semi-space-size=64",
  semi128: "--max-semi-space-size=128",
  stgc: "--single-threaded-gc",
};
const flagsOf = (arm) =>
  arm
    .split("@")[0]
    .split("+")
    .slice(1)
    .map((l) => {
      if (!flags[l]) throw Error("unknown lever " + l);
      return flags[l];
    });
const log = [];
for (let r = 0; r < Number(rounds); r++) {
  const order = r % 2 ? [...arms].reverse() : arms;
  for (const arm of order) {
    const out = path.join(outdir, `r${r}-${arm.replace(/[@+]/g, "_")}.json`);
    const t0 = Date.now(),
      load = os.loadavg();
    const res = spawnSync(
      path.join(wt, "node_modules/.bin/tsx"),
      [
        ...flagsOf(arm),
        path.join(wt, "lab/experiments/EXP-P4N/g5/arm5.ts"),
        arm,
        out,
        segments,
        pulls,
        warm,
        String(1 + r),
        clients,
      ],
      { cwd: wt, encoding: "utf8", maxBuffer: 1 << 28 },
    );
    fs.writeFileSync(out.replace(/\.json$/, ".log"), (res.stdout ?? "") + (res.stderr ?? ""));
    log.push({
      round: r,
      arm,
      code: res.status,
      startedMs: t0,
      seconds: (Date.now() - t0) / 1000,
      loadBefore: load,
      freeBytes: free(),
    });
    console.log(JSON.stringify(log.at(-1)));
    if (res.status !== 0) {
      fs.writeFileSync(path.join(outdir, "schedule.json"), JSON.stringify(log, null, 2));
      throw Error(`${arm} failed in round ${r}`);
    }
  }
}
fs.writeFileSync(path.join(outdir, "schedule.json"), JSON.stringify(log, null, 2));
