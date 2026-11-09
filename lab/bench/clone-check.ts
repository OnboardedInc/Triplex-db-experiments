// [EXP-K01-R7] Why: finish-block and jobs waits are recipe/refusal steps, never admission. Rejected: F/M/T equality, stopped-tail decoding and C3-C8 transported verdicts.
import { spawnSync } from "node:child_process";
import { openG0, quietXtdb } from "./lib/g0-xtdb.ts";
const argv = process.argv.slice(2),
  opt = (k: string) => argv[argv.indexOf("--" + k) + 1];
const endpoint = opt("url"),
  container = opt("container");
const h = await openG0(endpoint);
try {
  if (argv[0] === "recipe") {
    for (let cut = 0; cut < 2; cut++) {
      const r = spawnSync(
        "docker",
        [
          "-H",
          "unix:///Users/sam/.colima/triplex2/docker.sock",
          "exec",
          container,
          "wget",
          "-q",
          "--post-data=",
          "-O",
          "-",
          "http://127.0.0.1:8080/system/finish-block",
        ],
        { encoding: "utf8", timeout: 30_000 },
      );
      if (r.status !== 0) throw Error("finish-block recipe failed");
      const until = Date.now() + 600_000;
      for (;;) {
        const jobs = await h.query(
          "SELECT value FROM xt.metrics_gauges WHERE name = 'compactor.jobs.available'",
        );
        if (jobs.length && jobs.every((r) => Number(r.value) === 0)) break;
        if (Date.now() > until) throw Error("recipe compaction deadline");
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
    console.log(JSON.stringify({ recipe: "two-cuts" }));
  } else if (argv[0] === "quiet") console.log(JSON.stringify(await quietXtdb(endpoint)));
  else
    console.log(
      JSON.stringify({
        diagnosticOnly: true,
        gauges: await h.query("SELECT name,value FROM xt.metrics_gauges"),
      }),
    );
} finally {
  await h.close();
}
