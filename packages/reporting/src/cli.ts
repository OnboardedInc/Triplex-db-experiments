#!/usr/bin/env node
// [DX-RPT1] The projector as its own process. One JSON line per applied page on stdout.
//   triplex-reporting follow  --reader URL --database DB [--start N] [--page-limit N] [--wait-ms N] [--until-position N]
//   triplex-reporting rebuild --reader URL --database DB --account A
// The copy's PostgreSQL comes from RPT_PG_URL (never a command-line argument, so it stays out of process listings).
// Fault injection for the kill gate: RPT_DIE=after-fetch|mid-transaction|after-commit|random RPT_DIE_PAGE=N kills
// this process with SIGKILL at that point of page N (random: a point chosen from RPT_DIE_SEED).
import postgres from "postgres";
import { Projector, type FaultPoint } from "./projector.js";
import { StoreSource } from "./source.js";

const args = process.argv.slice(2);
const command = args[0];
const option = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const reader = option("reader"), database = option("database"), pgUrl = process.env["RPT_PG_URL"];
if (!command || !reader || !database || !pgUrl) {
  console.error("usage: triplex-reporting follow|rebuild --reader URL --database DB [options]; RPT_PG_URL names the copy");
  process.exit(2);
}
const points: FaultPoint[] = ["after-fetch", "mid-transaction", "after-commit"];
const die = process.env["RPT_DIE"], diePage = Number(process.env["RPT_DIE_PAGE"] ?? "0");
const diePoint = die === "random" ? points[Number(process.env["RPT_DIE_SEED"] ?? "0") % 3] : (die as FaultPoint | undefined);
const sql = postgres(pgUrl, { max: 2, onnotice: () => {}, idle_timeout: 0 });
const log = (kind: string, data: Record<string, unknown>) => console.log(JSON.stringify({ kind, at: Date.now(), ...data }));
const projector = new Projector({
  sql,
  source: new StoreSource(reader, database),
  pageLimit: Number(option("page-limit") ?? 200),
  waitMs: Number(option("wait-ms") ?? 1000),
  log,
  fault: (point, page) => {
    if (diePoint && point === diePoint && page === diePage) {
      log("die", { point, page });
      process.kill(process.pid, "SIGKILL");
    }
  },
});
try {
  await projector.install();
  if (command === "follow") {
    await projector.start(Number(option("start") ?? 0));
    await projector.refreshViews();
    const until = option("until-position") === undefined ? Infinity : Number(option("until-position"));
    const idleExit = option("exit-when-idle") === "1";
    let idle = false, mark = (await projector.watermark())!.after;
    await projector.follow(
      () => mark >= until || idle,
      (s) => {
        mark = s.next;
        if (idleExit && s.journals === 0 && s.next >= s.head) idle = true;
        if (s.journals) log("page", { ...s, cpu: process.cpuUsage() });
      },
    );
    log("done", { watermark: mark, requests: projector.source.requests, cpu: process.cpuUsage() });
  } else if (command === "rebuild") {
    const account = option("account");
    if (!account) throw new Error("rebuild needs --account");
    log("rebuilt", await projector.rebuildAccount(account));
  } else throw new Error(`unknown command ${command}`);
  await sql.end();
  process.exit(0);
} catch (error) {
  log("error", { message: String((error as Error).message), code: (error as any).code, detail: (error as any).detail });
  await sql.end({ timeout: 1 });
  process.exit(1);
}
