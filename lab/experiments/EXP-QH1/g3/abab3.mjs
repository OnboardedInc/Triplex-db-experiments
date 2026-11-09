// [EXP-QH1-R3] Why: ABAB across processes, order reversed every round, as in round 2; per-thread CPU in each arm process.
// usage: node abab3.mjs <outdir> <rounds> <armsCSV> <segments> <pullsPerSegment> <warm> [clients=1]
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
const [outdir, rounds, armsCsv, segments, pulls, warm, clients = "1"] = process.argv.slice(2);
if (!outdir || !rounds || !armsCsv)
  throw Error("usage: abab3.mjs outdir rounds arms segments pulls warm [clients]");
const arms = armsCsv.split(",");
const wt = path.resolve(import.meta.dirname, "../../../..");
fs.mkdirSync(outdir, { recursive: true });
const free = () => {
  const s = fs.statfsSync("/Users");
  return s.bavail * s.bsize;
};
if (free() < 5 * 1024 ** 3) throw Error("host free space below 5 GiB: no heavy run");
const log = [];
for (let r = 0; r < Number(rounds); r++) {
  const order = r % 2 ? [...arms].reverse() : arms;
  for (const arm of order) {
    const out = path.join(outdir, `r${r}-${arm}.json`);
    const t0 = Date.now(),
      load = os.loadavg();
    const res = spawnSync(
      path.join(wt, "node_modules/.bin/tsx"),
      [
        path.join(wt, "lab/experiments/EXP-QH1/g3/arm3.ts"),
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
    fs.writeFileSync(
      path.join(outdir, `r${r}-${arm}.log`),
      (res.stdout ?? "") + (res.stderr ?? ""),
    );
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
