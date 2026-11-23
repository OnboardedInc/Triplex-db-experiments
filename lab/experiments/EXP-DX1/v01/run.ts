import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { timeBudget, defaultJvm, defaultWriter, isWriter, jvmProfiles, pairSeconds, physicalArms, serverStages, writeDiagnostics, type JvmProfile } from "./profile.ts";
import { defaultServerProfile, launchProfile, roleMemoryMiB, serverProfiles, type ServerProfile } from "../jvm1/launch.mjs";
import { cleanSource, verifyBuild } from "./source.ts";
import { pgdataArgs } from "./pgdata.ts";
import { parseCredits, parseWindow, serverRates, writerAdmission } from "./server-workload.ts";
import { assembleSequential, completeSequentialArm, existingSequence, sequenceProgress } from "./sequential.ts";

const { values } = parseArgs({
  options: {
    age: { type: "string" }, seed: { type: "string" }, "image-sha256": { type: "string" },
    "transfer-sha256": { type: "string" }, writer: { type: "string", default: defaultWriter },
    jvm: { type: "string", default: defaultJvm },
    "tx-jvm": { type: "string" }, "write-jvm": { type: "string" }, "wal-directory": { type: "string" },
    "aged-bundle": { type: "string" }, "aged-bundle-sha256": { type: "string" }, "aged-dump": { type: "string" },
    "aged-dump-sha256": { type: "string" }, out: { type: "string" }, commit: { type: "string" },
    pgdata: { type: "string", multiple: true }, "pgdata-source": { type: "string" },
    "window-seconds": { type: "string" }, "credit-mode": { type: "string" },
    arm: { type: "string" }, assemble: { type: "boolean" },
    "hourly-usd": { type: "string", default: "1.09" }, help: { type: "boolean" }, plan: { type: "boolean" },
    profile: { type: "string", default: defaultServerProfile },
  },
});
if (values.help) {
  console.log("scorecard.mjs --age fresh|1B|realistic --seed SCALE1_DIRECTORY --image-sha256 SHA --transfer-sha256 SHA --commit COMMIT --out NEW_DIRECTORY [--writer per-person-ordered] [--jvm j21-g1|j25-g1|j25-zgc] [--tx-jvm j21-g1|j25-g1|j25-zgc] [--write-jvm j21-g1|j25-g1|j25-zgc] [--wal-directory DIR] [--window-seconds 90|300] [--credit-mode barrier6|rolling6|rolling8|rolling12|rolling16] [--profile server|server-32]\nFor prepared PostgreSQL use --pgdata-source SEALED_PGDATA with --pgdata COPY once per arm (headline zero, headline loaded, barrier6).\nFor 1B also provide --aged-bundle FILE --aged-bundle-sha256 SHA. Without prepared directories, also provide --aged-dump FILE --aged-dump-sha256 SHA for 1B.\nscorecard.mjs --plan");
  console.log("For sequential staging, run --arm 1 through --arm 3 in order with one --pgdata per invocation and the same --out. Then run --assemble --commit COMMIT --out DIRECTORY.");
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
assert(values.arm === undefined || /^[1-3]$/.test(values.arm), "Choose arm 1, 2 or 3");
const arm = values.arm === undefined ? undefined : Number(values.arm);
const price = Number(values["hourly-usd"]);
assert(/^\d+(?:\.\d+)?$/.test(values["hourly-usd"]!) && Number.isFinite(price) && price > 0);
assert(isWriter(values.writer) && values.writer === defaultWriter, "The lean server card uses the ordered per-person writer");
assert(jvmProfiles.includes(values.jvm as JvmProfile), "Unknown scorecard JVM profile");
const jvm = values.jvm as JvmProfile;
const txJvm = (values["tx-jvm"] ?? "j25-zgc") as JvmProfile;
const writeJvm = (values["write-jvm"] ?? jvm) as JvmProfile;
const windowSeconds = parseWindow(values["window-seconds"]);
const creditMode = parseCredits(values["credit-mode"] ?? process.env.DX_V01_CREDIT_MODE);
assert(serverProfiles.includes(values.profile as ServerProfile), "Choose --profile server or server-32");
const profile = values.profile as ServerProfile;
const headline = launchProfile(profile, { jvm, txJvm, writeJvm, creditMode });
const diagnostics = writeDiagnostics(values.writer, process.env);
const pgdata = pgdataArgs(values.pgdata ?? [], values["pgdata-source"], arm).map((dir) => path.resolve(dir));
const wal = values["wal-directory"] ? path.resolve(values["wal-directory"]) : "";
// [DX-INT1] Why: every measured 32 GiB arm kept the write log on the second NVMe, as the headline does.
assert(profile !== "server-32" || wal || values.plan, "server-32 runs with the write log on the second NVMe: pass --wal-directory");
assert(!wal || arm !== undefined || pgdata.length === physicalArms + 1, "Separate WAL needs prepared scorecard copies");
const { budget, ceiling: minutes } = timeBudget(windowSeconds, values.age === "realistic");
const mix = values.age === "realistic" ? " Busy mix 80% deep, 15% thin, 5% small plus the quiet deep account." : "";
const plan = `Headline zero/readers use ${creditMode}. Barrier6 repeats P2 and P6 on the identical stack. The P1–P4 pair uses ${pairSeconds / 60} minutes of matched offers.`;
const storage = values.age === "realistic" ? "One sealed and hashed prepared copy per arm." : pgdata.length ? "Starts from prepared PGDATA copies. File-level preparation, build and AGE1 provisioning are separate."
  : "Without prepared PGDATA, this command uses logical dumps. Build and AGE1 provisioning are separate.";
const forecast = `Budget ${minutes} minutes including cleanup, up to USD ${(minutes / 60 * price).toFixed(2)} per age. ${plan} ${profile === "server" ? "Server profile" : `Profile ${profile} (transactor ${headline.tx.memoryMiB / 1024} GiB cap, ${headline.tx.cacheMiB! / 1024} GiB object cache; role caps ${roleMemoryMiB(headline) / 1024} GiB)`} with read gateway JVM ${jvm}, write gateway JVM ${writeJvm}, headline transactor ${txJvm}, and ${wal ? "separate WAL" : "WAL on PGDATA"}. P2 and P6 offered rates ${serverRates.join(", ")} saves/s for ${windowSeconds} seconds per cell. Credit selection ${creditMode}. ${storage}${mix}`;
if (values.plan) {
  console.log(forecast);
  console.log("Writer admission and diagnostics " + JSON.stringify({ admission: writerAdmission(creditMode), diagnostics }));
  console.log(JSON.stringify(serverStages(headline, !!wal), null, 2));
  process.exit(0);
}
assert(values.age === "fresh" || values.age === "1B" || values.age === "realistic");
if (values.age === "realistic") assert(arm !== undefined && pgdata.length === 2 && windowSeconds === 300,
  "Realistic requires one prepared PGDATA copy per arm, five-minute windows, and --assemble");
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
  if (arm === 1 && !sequence) {
    if (fs.existsSync(out)) assert(fs.readdirSync(out).every(name => /^arm-1-[a-f0-9-]{36}\.log$/.test(name)),
      "Use a new output directory for sequential staging");
    else fs.mkdirSync(out, { mode: 0o700 });
  }
} else fs.mkdirSync(out, { mode: 0o700 });
console.log(forecast);
// [DX-V01] Why: retain early preflight refusals while allowing a retry before the server claimed the arm.
// Rejected: reusing a log or requiring a new campaign after a busy queue refusal.
const log = path.join(out, arm === undefined ? "campaign.log" : `arm-${arm}-${randomUUID()}.log`);
const activeMs = (minutes - budget.cleanup) * 60_000 - spent;
assert(activeMs > 0, "No active time remains for a sequential arm");
const fd = fs.openSync(log, "wx", 0o600);
const startedAt = Date.now();
const child = spawn("timeout", ["--kill-after=" + budget.cleanup + "m", String(activeMs / 1000) + "s", "bash",
  "lab/experiments/EXP-DX1/v01/adopted-server.sh", source, campaign, String(startedAt + activeMs),
  path.resolve(values.seed), values["image-sha256"], values["transfer-sha256"], values.age, values.writer, jvm,
  ...aged.map((v) => v ?? ""), txJvm, wal, values.arm ?? "", String(startedAt), forecast, String(windowSeconds), creditMode, writeJvm, ...pgdata], {
  stdio: ["ignore", fd, fd],
  env: Object.fromEntries([...["PATH", "LANG", "LC_ALL", "HOME", "DX_V01_BUILD_RECEIPT", "AGE_JAVA", "AGE_DATOMIC_HOME", "DX_W1_SERIAL_APPLY", "PREP1_LOOKUP_EVERY", "DX_DRY_RUN_FIRST_OFFER"]
    .flatMap((name) => process.env[name] ? [[name, process.env[name]]] : []), ["DX_V01_PROFILE", profile]]),
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
writeAdoptedCard({ source, age: values.age, writer: values.writer, profile, jvm, txJvm, writeJvm, diagnostics, separateWal: !!wal, toy: false, out, campaign, forecast, windowSeconds, creditMode, prepared: pgdata.length > 0,
  failure: exit ? "The adopted campaign stopped. See [campaign.log](campaign.log)." : undefined });
console.log(path.join(out, "SCORECARD-v0.1.md"));
if (exit) {
  const early = fs.readFileSync(log, "utf8").split("\n")
    .find(line => line.startsWith("[DX-V01] Early launch check stopped before offers."));
  if (early) console.error(early);
  process.exitCode = 1;
}
