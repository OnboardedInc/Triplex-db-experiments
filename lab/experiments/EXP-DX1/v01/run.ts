import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { budget, ceiling, comparisonMinutes, defaultJvm, defaultWriter, isWriter, jvmProfiles, pairSeconds, serverStages, type JvmProfile } from "./profile.ts";
import { launchProfile } from "../jvm1/launch.mjs";
import { cleanSource, verifyBuild } from "./source.ts";
import { pgdataArgs } from "./pgdata.ts";
import { serverRates } from "./server-workload.ts";
import { assembleSequential, completeSequentialArm, existingSequence, sequenceProgress } from "./sequential.ts";

const { values } = parseArgs({
  options: {
    age: { type: "string" }, seed: { type: "string" }, "image-sha256": { type: "string" },
    "transfer-sha256": { type: "string" }, writer: { type: "string", default: defaultWriter },
    jvm: { type: "string", default: defaultJvm },
    "tx-jvm": { type: "string" }, "wal-directory": { type: "string" },
    "aged-bundle": { type: "string" }, "aged-bundle-sha256": { type: "string" }, "aged-dump": { type: "string" },
    "aged-dump-sha256": { type: "string" }, out: { type: "string" }, commit: { type: "string" },
    pgdata: { type: "string", multiple: true }, "pgdata-source": { type: "string" },
    arm: { type: "string" }, assemble: { type: "boolean" },
    "hourly-usd": { type: "string", default: "1.09" }, help: { type: "boolean" }, plan: { type: "boolean" },
  },
});
if (values.help) {
  console.log("scorecard.mjs --age fresh|1B --seed SCALE1_DIRECTORY --image-sha256 SHA --transfer-sha256 SHA --commit COMMIT --out NEW_DIRECTORY [--writer per-person-ordered|grouped] [--jvm j21-g1|j25-g1|j25-zgc] [--tx-jvm j21-g1|j25-g1|j25-zgc] [--wal-directory DIR]\nFor prepared PostgreSQL use --pgdata-source SEALED_PGDATA with --pgdata COPY once per arm (headline zero, headline loaded, ordered server default, grouped).\nFor 1B also provide --aged-bundle FILE --aged-bundle-sha256 SHA. Without prepared directories, also provide --aged-dump FILE --aged-dump-sha256 SHA for 1B.\nscorecard.mjs --plan");
  console.log("For sequential staging, run --arm 1 through --arm 4 in order with one --pgdata per invocation and the same --out. Then run --assemble --commit COMMIT --out DIRECTORY.");
  process.exit(0);
}
if (values.assemble) {
  assert(values.commit && values.out && !values.arm && !values.plan, "Use --assemble with --commit and --out");
  const source = cleanSource(values.commit), out = path.resolve(values.out), campaign = path.join(out, "campaign");
  assert(!fs.existsSync(path.join(out, "SCORECARD-v0.1.md")), "Campaign already assembled");
  const input = assembleSequential(campaign, source);
  const { writeAdoptedCard } = await import("./adopted-card.ts");
  writeAdoptedCard({ ...input, toy: false, prepared: true, out, campaign });
  console.log(path.join(out, "SCORECARD-v0.1.md"));
  process.exit(0);
}
assert(values.arm === undefined || /^[1-4]$/.test(values.arm), "Choose arm 1, 2, 3 or 4");
const arm = values.arm === undefined ? undefined : Number(values.arm);
const price = Number(values["hourly-usd"]);
assert(/^\d+(?:\.\d+)?$/.test(values["hourly-usd"]!) && Number.isFinite(price) && price > 0);
assert(isWriter(values.writer), "Choose per-person-ordered or grouped");
assert(jvmProfiles.includes(values.jvm as JvmProfile), "Unknown scorecard JVM profile");
const jvm = values.jvm as JvmProfile;
const txJvm = (values["tx-jvm"] ?? jvm) as JvmProfile;
assert(jvmProfiles.includes(txJvm), "Unknown transactor JVM profile");
const headline = launchProfile("server", { jvm, txJvm });
const pgdata = pgdataArgs(values.pgdata ?? [], values["pgdata-source"], values.writer === "grouped", arm).map((dir) => path.resolve(dir));
const wal = values["wal-directory"] ? path.resolve(values["wal-directory"]) : "";
assert(!wal || ((arm !== undefined || pgdata.length === 5) && values.writer === "per-person-ordered"),
  "Separate WAL needs prepared scorecard copies");
assert(values.writer !== "grouped" || (jvm === defaultJvm && txJvm === defaultJvm), "The grouped comparison uses the default server JVM");
const minutes = values.writer === "grouped" ? comparisonMinutes + budget.cleanup : ceiling;
const plan = values.writer === "grouped"
  ? "Grouped repeats P2 and P6 only."
  : `Per-person-ordered runs the full adopted workload, then default ordered and grouped each repeat P2 and P6. The P1–P4 pair uses ${pairSeconds / 60} minutes of matched offers.`;
const storage = pgdata.length ? "Starts from prepared PGDATA copies. File-level preparation, build and AGE1 provisioning are separate."
  : "Without prepared PGDATA, this command uses logical dumps. Build and AGE1 provisioning are separate.";
const forecast = `Budget ${minutes} minutes including cleanup, up to USD ${(minutes / 60 * price).toFixed(2)} per age. ${plan} Server profile with gateway JVM ${jvm}, headline transactor ${txJvm}, and ${wal ? "separate WAL" : "WAL on PGDATA"}. P2 and P6 offered rates ${serverRates.join(", ")} saves/s. ${storage}`;
if (values.plan) {
  console.log(forecast);
  console.log(JSON.stringify(serverStages(values.writer, headline, !!wal), null, 2));
  process.exit(0);
}
assert(values.age === "fresh" || values.age === "1B");
assert(values.commit && values.out && values.seed && values["image-sha256"] && values["transfer-sha256"]);
const aged = [values["aged-bundle"], values["aged-bundle-sha256"], values["aged-dump"], values["aged-dump-sha256"]];
assert(values.age === "1B" ? (pgdata.length ? aged.slice(0, 2).every(Boolean) && !aged[2] && !aged[3] : aged.every(Boolean))
  : aged.every((v) => !v), "Provide the required AGE1 identity and choose one PostgreSQL startup path");
assert(process.platform === "linux" && process.getuid?.() === 0);
// [DX-V01] Why: systemd reports "none" with exit 1 on bare metal.
// Rejected: treating its successful bare-metal detection as an execution error.
const host = spawnSync("systemd-detect-virt", [], { encoding: "utf8", timeout: 5000 });
assert(!host.error && host.status === 1 && host.stdout.trim() === "none", "Scorecard requires a bare-metal Linux host");
const source = cleanSource(values.commit);
verifyBuild(source, process.env.DX_V01_BUILD_RECEIPT);
const out = path.resolve(values.out), campaign = path.join(out, "campaign");
let spent = 0;
if (arm !== undefined) {
  const sequence = existingSequence(campaign);
  if (sequence) assert.equal(sequence.input.source, source, "Sequential campaign source changed");
  spent = sequenceProgress(campaign, sequence, arm).elapsed;
  if (arm === 1) fs.mkdirSync(out, { mode: 0o700 });
} else fs.mkdirSync(out, { mode: 0o700 });
console.log(forecast);
const log = path.join(out, arm === undefined ? "campaign.log" : `arm-${arm}.log`);
const activeMs = (minutes - budget.cleanup) * 60_000 - spent;
assert(activeMs > 0, "No active time remains for a sequential arm");
const fd = fs.openSync(log, "wx", 0o600);
const startedAt = Date.now();
const child = spawn("timeout", ["--kill-after=" + budget.cleanup + "m", String(activeMs / 1000) + "s", "bash",
  "lab/experiments/EXP-DX1/v01/adopted-server.sh", source, campaign, String(startedAt + activeMs),
  path.resolve(values.seed), values["image-sha256"], values["transfer-sha256"], values.age, values.writer, jvm,
  ...aged.map((v) => v ?? ""), txJvm, wal, values.arm ?? "", String(startedAt), forecast, ...pgdata], {
  stdio: ["ignore", fd, fd],
  env: Object.fromEntries(["PATH", "LANG", "LC_ALL", "HOME", "DX_V01_BUILD_RECEIPT", "AGE_JAVA", "AGE_DATOMIC_HOME"]
    .flatMap((name) => process.env[name] ? [[name, process.env[name]]] : [])),
});
fs.closeSync(fd);
const stop = () => child.kill("SIGTERM");
process.once("SIGINT", stop); process.once("SIGTERM", stop);
const exit = await new Promise<string>((done) => {
  child.once("error", (e) => done(e.message));
  child.once("close", (code, signal) => done(code === 0 ? "" : String(code ?? signal)));
});
process.removeListener("SIGINT", stop); process.removeListener("SIGTERM", stop);
if (arm !== undefined) {
  if (exit) {
    console.error(`Arm ${arm} stopped. See ${log}`);
    process.exit(1);
  }
  const sequence = existingSequence(campaign);
  assert(sequence && sequence.input.source === source);
  completeSequentialArm(campaign, sequence, arm);
  console.log(`Arm ${arm} complete. Its scratch PGDATA may be removed.`);
  process.exit(0);
}
const { writeAdoptedCard } = await import("./adopted-card.ts");
writeAdoptedCard({ source, age: values.age, writer: values.writer, jvm, txJvm, separateWal: !!wal, toy: false, out, campaign, forecast, prepared: pgdata.length > 0,
  failure: exit ? "The adopted campaign stopped. See [campaign.log](campaign.log)." : undefined });
console.log(path.join(out, "SCORECARD-v0.1.md"));
if (exit) {
  const early = fs.readFileSync(log, "utf8").split("\n")
    .find(line => line.startsWith("[DX-V01] Early launch check stopped before offers."));
  if (early) console.error(early);
  process.exitCode = 1;
}
