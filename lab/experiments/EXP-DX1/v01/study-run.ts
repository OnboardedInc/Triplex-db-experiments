import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { defaultJvm, defaultWriter, jvmProfiles, writeDiagnostics, type JvmProfile, type Writer } from "./profile.ts";

// [DX-THIN1] Why: scorecard.mjs sends --read-study here; the card itself runs through run.ts and adopted-server.ts.
// Rejected: folding the reader diagnostic into the realistic card's staged three-arm command line.
import { cleanSource, verifyBuild } from "./source.ts";
import { defaultCreditMode, launchProfile, type CreditMode } from "../jvm1/launch.mjs";
import { ladderMinutes } from "../rd1/prepared.ts";

const { values } = parseArgs({
  options: {
    age: { type: "string" }, seed: { type: "string" }, "image-sha256": { type: "string" },
    "transfer-sha256": { type: "string" }, writer: { type: "string", default: defaultWriter },
    jvm: { type: "string", default: defaultJvm },
    "tx-jvm": { type: "string" }, "write-jvm": { type: "string" },
    "read-cache-mib": { type: "string" }, "read-study": { type: "boolean" }, "read-study-jvm": { type: "string" },
    "credit-mode": { type: "string", default: process.env.DX_V01_CREDIT_MODE ?? defaultCreditMode },
    "wal-directory": { type: "string" },
    "pgdata-source": { type: "string" }, pgdata: { type: "string" }, ladder: { type: "string" },
    "aged-bundle": { type: "string" }, "aged-bundle-sha256": { type: "string" }, "aged-dump": { type: "string" },
    "aged-dump-sha256": { type: "string" }, out: { type: "string" }, commit: { type: "string" },
    "hourly-usd": { type: "string", default: "1.09" }, help: { type: "boolean" }, plan: { type: "boolean" },
  },
});
if (values.help) {
  console.log("scorecard.mjs --age fresh|1B --seed SCALE1_DIRECTORY --image-sha256 SHA --transfer-sha256 SHA --commit COMMIT --out NEW_DIRECTORY [--writer grouped|subject] [--jvm j21-g1|j25-g1|j25-zgc] [--tx-jvm PROFILE] [--write-jvm PROFILE] [--credit-mode barrier6|rolling6|rolling8|rolling12|rolling16] [--read-cache-mib 32|1536|3072] [--wal-directory DIR]\nFor 1B add --aged-bundle FILE --aged-bundle-sha256 SHA --aged-dump FILE --aged-dump-sha256 SHA.\nFor the fresh reader diagnostic use --read-study [--read-study-jvm PROFILE].\nscorecard.mjs --plan [--read-study]");
  console.log("From a prepared PostgreSQL copy, run the reader diagnostic twice with the same --out: --read-study --ladder control, then --ladder tuned, each with --pgdata-source SEALED_PGDATA and a new --pgdata COPY.");
  process.exit(0);
}
const price = Number(values["hourly-usd"]);
assert(/^\d+(?:\.\d+)?$/.test(values["hourly-usd"]!) && Number.isFinite(price) && price > 0);
assert(values["read-study"] === true, "Run the scorecard through scorecard.mjs without --read-study");
assert(["grouped", "subject", "per-person-ordered"].includes(values.writer ?? ""));
const writer: Writer = values.writer === "grouped" ? "grouped" : "per-person-ordered";
assert(jvmProfiles.includes(values.jvm as JvmProfile), "Unknown scorecard JVM profile");
const txJvm = (values["tx-jvm"] ?? values.jvm) as JvmProfile;
const writeJvm = (values["write-jvm"] ?? values.jvm) as JvmProfile;
const creditMode = values["credit-mode"] as CreditMode;
const readCache = values["read-cache-mib"];
assert(readCache === undefined || ["32", "1536", "3072"].includes(readCache), "Unknown read cache capacity");
const readCacheMiB = readCache === undefined ? undefined : Number(readCache) as 32 | 1536 | 3072;
const launchOptions = { jvm: values.jvm as JvmProfile, txJvm, writeJvm, creditMode, readCacheMiB };
const launch = launchProfile("server", launchOptions);
const study = values["read-study"] === true;
assert(study || !values["read-study-jvm"]);
const readJvm = (values["read-study-jvm"] ?? values.jvm) as JvmProfile;
const treatment = study ? launchProfile("server", { ...launchOptions, readJvm, readTuned: true }) : undefined;
const studyForecast = "Reader diagnostic with a 56-minute wall-clock cutoff and 90 seconds for termination.";
const diagnostics = writeDiagnostics(writer, process.env);
if (values.plan) {
  console.log(studyForecast + ` Writer ${values.writer}, server profile, credits ${creditMode}. JVM ${values.jvm}, transactor JVM ${txJvm}, write gateway JVM ${writeJvm}.`);
  console.log(JSON.stringify({ ...launch, ...diagnostics }, null, 2));
  if (study) console.log(JSON.stringify({ treatment, cutoffMinutes: 56, batch: 8, rates: [50, 235], seats: [1, 4, 16, 64, 256, 1024] }, null, 2));
  process.exit(0);
}
assert(values.age === "fresh" || values.age === "1B");
assert(!study || values.age === "fresh", "The short reader study requires the fresh prepared copy");
assert(values.commit && values.out && values.seed && values["image-sha256"] && values["transfer-sha256"]);
const aged = [values["aged-bundle"], values["aged-bundle-sha256"], values["aged-dump"], values["aged-dump-sha256"]];
assert(values.age === "1B" ? aged.every(Boolean) : aged.every((v) => !v));
assert(process.platform === "linux" && process.getuid?.() === 0);
// [DX-V01] Why: systemd reports "none" with exit 1 on bare metal.
// Rejected: treating its successful bare-metal detection as an execution error.
const host = spawnSync("systemd-detect-virt", [], { encoding: "utf8", timeout: 5000 });
assert(!host.error && host.status === 1 && host.stdout.trim() === "none", "Scorecard requires a bare-metal Linux host");
const source = cleanSource(values.commit);
verifyBuild(source, process.env.DX_V01_BUILD_RECEIPT);
const out = path.resolve(values.out), campaign = path.join(out, "campaign");
// [DX-RD1] Why: start each reader ladder from its own private copy of the held PostgreSQL directory.
// Rejected: requiring the logical dump on a server that holds only the prepared copy.
const ladder = values.ladder;
const preparedArgs = [values["pgdata-source"], values.pgdata, ladder];
assert(preparedArgs.every((v) => v === undefined) || (study && preparedArgs.every(Boolean)),
  "A prepared read study needs --read-study --ladder control|tuned --pgdata-source SEALED --pgdata COPY");
assert(ladder === undefined || ladder === "control" || ladder === "tuned", "Choose --ladder control or --ladder tuned");
if (ladder === "tuned") assert(fs.statSync(out).isDirectory(), "Run the tuned ladder in the control ladder's --out");
else fs.mkdirSync(out, { mode: 0o700 });
const prepared = ladder ? { DX_RD1_LADDER: ladder, DX_RD1_PGDATA_SOURCE: path.resolve(values["pgdata-source"]!),
  DX_RD1_PGDATA: path.resolve(values.pgdata!) } : {};
const minutes = ladder ? ladderMinutes : 56;
console.log(ladder ? `Reader ${ladder} ladder from a prepared copy with a ${ladderMinutes}-minute wall-clock cutoff and 90 seconds for termination.`
  : studyForecast);
const log = path.join(out, ladder ? ladder + ".log" : "campaign.log");
const fd = fs.openSync(log, "wx", 0o600);
const child = spawn("timeout", ["--kill-after=90s", String(minutes) + "m", "bash",
  "lab/experiments/EXP-DX1/v01/study-server.sh", source, campaign, String(Date.now() + (ladder ? ladderMinutes - 3 : 53) * 60_000),
  path.resolve(values.seed), values["image-sha256"], values["transfer-sha256"], values.age, values.writer, values.jvm!,
  ...aged.map((v) => v ?? ""), txJvm, values["wal-directory"] ? path.resolve(values["wal-directory"]) : "", writeJvm, creditMode,
  study ? readJvm : "", readCache ?? ""], {
  stdio: ["ignore", fd, fd],
  env: Object.fromEntries(["PATH", "LANG", "LC_ALL", "HOME", "DX_V01_BUILD_RECEIPT", "AGE_JAVA", "AGE_DATOMIC_HOME", "DX_W1_SERIAL_APPLY", "PREP1_LOOKUP_EVERY", "DX_DRY_RUN_FIRST_OFFER"]
    .flatMap((name) => process.env[name] ? [[name, process.env[name]]] : []).concat(Object.entries(prepared))),
});
fs.closeSync(fd);
const stop = () => child.kill("SIGTERM");
process.once("SIGINT", stop); process.once("SIGTERM", stop);
const exit = await new Promise<string>((done) => {
  child.once("error", (e) => done(e.message));
  child.once("close", (code, signal) => done(code === 0 ? "" : String(code ?? signal)));
});
process.removeListener("SIGINT", stop); process.removeListener("SIGTERM", stop);
if (ladder === "tuned" && !exit) {
  const { checkPreparedStudy } = await import("../rd1/prepared.ts");
  const { control, tuned: checked } = checkPreparedStudy(campaign);
  console.log(`Both ladders complete on PostgreSQL system ${control.end.systemIdentifier} (${control.end.slot}, ${checked.end.slot}).`);
}
console.log(log);
// [DX-INT1] Why: report a ladder complete only from its seal; at RD1 ca93f5165 the control child exited 0 with no seal.
// Rejected: trusting the child's exit status alone.
if (ladder && !exit) {
  const { completed } = await import("../rd1/prepared.ts");
  completed(campaign, ladder);
  console.log(`The ${ladder} ladder is complete. Its scratch PGDATA and WAL subdirectory may be removed.`);
}
if (exit) process.exitCode = 1;
