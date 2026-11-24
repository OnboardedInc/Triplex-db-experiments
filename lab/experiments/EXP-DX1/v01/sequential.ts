import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { physicalArms, timeBudget, type writeDiagnostics, type Age, type JvmProfile, type Writer, type serverStages } from "./profile.ts";
import { type Directory, type preflightWal } from "./pgdata.ts";
import { randomLineMinutes, type CardReader } from "./card-reader.ts";
import { cellPath, replaySeconds, serverCells, type WindowSeconds, type CreditMode } from "./server-workload.ts";

import type { RealisticBinding } from "./realistic.ts";
import type { ServerProfile } from "../jvm1/launch.mjs";

type CampaignInput = {
  source: string; age: Age; writer: Writer; jvm: JvmProfile; txJvm: JvmProfile; writeJvm: JvmProfile; diagnostics: ReturnType<typeof writeDiagnostics>;
  imagePin: string; transferPin: string; originalScope: { db: string; cut: number };
  separateWal: boolean; stages: ReturnType<typeof serverStages>; wal?: ReturnType<typeof preflightWal>;
  windowSeconds?: WindowSeconds; creditMode?: CreditMode;
  /** [DX-S1] Default-off writer options set for this campaign (v01/production-card.ts writerOptionNames). */
  writerOptions?: Record<string, string>;
  realistic?: RealisticBinding;
  agedBundle?: string; agedDump?: string;
  // [DX-INT1] Absent in campaigns started before server-32 existed; those ran the server profile.
  profile?: ServerProfile;
  // [DX-INT1] Absent for Saturday's tape; otherwise every loaded cell's tape and report digests (v01/production-card.ts).
  tape?: { name: string; paramsSha256: string; cells: { cell: string; tapeSha256: string; reportSha256: string }[] };
  // [DX-CARD2] Absent for the default reader; the tuned reader's setting (v01/card-reader.ts).
  reader?: CardReader;
};
export type SequenceConfig = {
  input: CampaignInput;
  sealed: Directory;
  cut: number;
  buildSha256: string;
  forecast: string;
};
type Sequence = SequenceConfig & { id: string };
type Invocation = { sequenceSha256: string; arm: number; startedAt: number; copy: Directory };
type Completed = {
  invocationSha256: string; completedAt: number; attempt: string; slot: string;
  systemIdentifier: string; files: Record<string, string>;
};

const seqFolder = (campaign: string) => path.join(path.dirname(campaign), "sequence");
const seqFile = (campaign: string) => path.join(seqFolder(campaign), "inputs.json");
const sha = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const read = <T>(file: string): T => JSON.parse(fs.readFileSync(file, "utf8"));
const write = (file: string, value: unknown) =>
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", { flag: "wx", mode: 0o600, flush: true });

export function existingSequence(campaign: string): Sequence | undefined {
  const file = seqFile(campaign);
  if (fs.existsSync(file)) return read<Sequence>(file);
}

// [DX-V01] Why: the driver can delete and recreate a scratch copy, but the campaign and each arm have a single identity.
// Rejected: inferring completion from an arm directory created before placement, offers or cleanup.
export function openSequence(campaign: string, config: SequenceConfig) {
  const existing = existingSequence(campaign);
  if (existing) {
    const { id, ...recorded } = existing;
    assert.deepEqual(JSON.parse(JSON.stringify(config)), recorded, "Sequential campaign source, seal, cut or launch configuration changed");
    return existing;
  }
  assert(!fs.existsSync(campaign), "Use a new output directory for sequential staging");
  fs.mkdirSync(seqFolder(campaign), { mode: 0o700 });
  const result = { id: randomUUID(), ...config };
  write(seqFile(campaign), result);
  fs.mkdirSync(campaign);
  return result;
}

function armPaths(campaign: string, arm: number) {
  assert(Number.isInteger(arm) && arm >= 1 && arm <= physicalArms, "Choose arm 1, 2 or 3");
  const folder = seqFolder(campaign);
  return { start: path.join(folder, `arm-${arm}-start.json`), end: path.join(folder, `arm-${arm}-complete.json`) };
}

function armEvidence(sequence: Sequence, arm: number) {
  const stage = sequence.input.stages[arm - 1]!;
  const anchor = stage.root + (stage.loaded ? "loaded" : "zero");
  const files = ["attempt.json", "arm.json", "operations.json", "launch-check.json", "pgdata.json", "cleanup/inventory.json"]
    .map(name => `${anchor}/${name}`);
  if (sequence.input.realistic) files.push(`${anchor}/realistic-live.json`);
  if (sequence.input.age === "1B") files.push(`${anchor}/aged-live-check.json`);
  if (stage.loaded) {
    for (const cell of serverCells) {
      files.push(stage.root + cellPath(cell) + "/arm.json", stage.root + cellPath(cell) + "/operations.json");
      if (sequence.input.windowSeconds) files.push(stage.root + cellPath(cell) + "/telemetry.json");
    }
    if (!stage.comparison) {
      if (!sequence.input.realistic) files.push(`${anchor}/p7-empty/residency.json`);
      files.push("p8/result.json", "p8/pace-32-fixed.offers.json");
    }
    if (!stage.comparison) files.push(stage.root + "mixed-ids.json");
  }
  return { anchor, files };
}

function checkAnchor(campaign: string, sequence: Sequence, invocation: Invocation, completedAt: number) {
  const { anchor } = armEvidence(sequence, invocation.arm);
  const readAnchor = <T>(file: string) => read<T>(path.join(campaign, anchor, file));
  const arm = readAnchor<{ source: string; slot: string; attempt: string; firstCut: number; startedAt: number; endedAt: number;
    seed: { database: string; originalCut: number; imageSha256: string; realistic?: RealisticBinding } }>("arm.json");
  assert.deepEqual([arm.source, arm.firstCut, arm.seed.database, arm.seed.originalCut, arm.seed.imageSha256],
    [sequence.input.source, sequence.cut, sequence.input.originalScope.db, sequence.input.originalScope.cut, sequence.input.realistic?.parent.imageSha ?? sequence.input.imagePin],
    "Arm source or sealed cut differs");
  assert(arm.startedAt >= invocation.startedAt && arm.endedAt >= arm.startedAt && arm.endedAt <= completedAt,
    "Arm evidence must come from the current invocation");
  const owned = readAnchor<{ source: string; slot: string; nonce: string }>("attempt.json");
  assert.deepEqual([owned.source, owned.slot, owned.nonce], [arm.source, arm.slot, arm.attempt]);
  const pgdata = readAnchor<{ source: string; slot: string; attempt: string; copy: Directory; systemIdentifier: string }>("pgdata.json");
  assert.deepEqual([pgdata.source, pgdata.slot, pgdata.attempt, pgdata.copy],
    [arm.source, arm.slot, arm.attempt, invocation.copy]);
  assert.match(pgdata.systemIdentifier, /^[1-9][0-9]*$/);
  if (sequence.input.realistic) {
    const seal = sequence.input.realistic;
    assert.deepEqual(arm.seed.realistic, seal);
    const live = readAnchor<{ source: string; slot: string; attempt: string; at: number; native: number[]; seal: RealisticBinding }>("realistic-live.json");
    assert.deepEqual([live.source, live.slot, live.attempt, live.seal, live.native],
      [arm.source, arm.slot, arm.attempt, seal, [seal.cut, seal.census.nativeT, seal.census.nativeRecords]]);
    assert(live.at >= invocation.startedAt && live.at <= arm.startedAt);
  }
  const cleanup = readAnchor<{ at: number; before: { containers: string[] }; after: unknown }>("cleanup/inventory.json");
  assert.deepEqual(cleanup.before.containers.toSorted(), ["gw-r", "gw-w", "pg", "tx"].map(role => `${arm.slot}-${role}`));
  assert.deepEqual(cleanup.after, { containers: [], volumes: [], networks: [] });
  assert(cleanup.at >= arm.endedAt && cleanup.at <= completedAt);
  return { attempt: arm.attempt, slot: arm.slot, systemIdentifier: pgdata.systemIdentifier };
}

function readCompleted(campaign: string, sequence: Sequence, arm: number, verifyFiles: boolean) {
  const loc = armPaths(campaign, arm);
  assert(fs.existsSync(loc.end), `Missing completed arm ${arm}`);
  const bytes = fs.readFileSync(loc.start), invocation: Invocation = JSON.parse(bytes.toString());
  const completed = read<Completed>(loc.end);
  assert.deepEqual([invocation.sequenceSha256, invocation.arm, invocation.copy.controlSha256, completed.invocationSha256],
    [sha(fs.readFileSync(seqFile(campaign))), arm, sequence.sealed.controlSha256, sha(bytes)],
    "Arm belongs to a different invocation or sealed source");
  assert(Number.isSafeInteger(invocation.startedAt) && Number.isSafeInteger(completed.completedAt) &&
    completed.completedAt >= invocation.startedAt);
  const anchor = checkAnchor(campaign, sequence, invocation, completed.completedAt);
  assert.deepEqual([completed.attempt, completed.slot, completed.systemIdentifier], [anchor.attempt, anchor.slot, anchor.systemIdentifier]);
  const { files } = armEvidence(sequence, arm);
  assert.deepEqual(Object.keys(completed.files), files, "Arm evidence inventory differs");
  if (verifyFiles) for (const file of files) {
    assert.equal(sha(fs.readFileSync(path.join(campaign, file))), completed.files[file], `Arm evidence differs: ${file}`);
  }
  return { ...invocation, ...completed };
}

// [DX-INT1] Why: the driver passes every part through its admission before the timed run, each in its own throwaway
// campaign, so a dry run of part 2 or 3 does not need the earlier parts to have run.
// Rejected: letting a dry run add to, or skip parts in, a real campaign (its records are set aside, see setAsideArm).
const dryRun = () => process.env.DX_DRY_RUN_FIRST_OFFER === "1";

export function sequenceProgress(campaign: string, sequence: Sequence | undefined, next?: number) {
  if (next !== undefined) armPaths(campaign, next);
  assert(sequence || next === 1 || (dryRun() && next !== undefined), "Start the sequential campaign with arm 1");
  const previous = dryRun() && next !== undefined ? [] : Array.from({ length: next === undefined ? physicalArms : next - 1 }, (_, i) =>
    readCompleted(campaign, sequence!, i + 1, next === undefined));
  assert.equal(new Set(previous.map(record => record.attempt)).size, previous.length, "Arm attempt was reused");
  assert.equal(new Set(previous.map(record => record.slot)).size, previous.length, "Arm slot was reused");
  for (const [i, record] of previous.entries()) {
    assert.equal(record.systemIdentifier, previous[0]!.systemIdentifier, "Prepared PostgreSQL system identifiers differ");
    if (i) assert(record.startedAt >= previous[i - 1]!.completedAt, "Sequential arms overlap");
  }
  if (next !== undefined) {
    const paths = armPaths(campaign, next);
    assert(!fs.existsSync(paths.start) && !fs.existsSync(paths.end), `Arm ${next} already started`);
  }
  const elapsed = previous.reduce((ms, step) => ms + step.completedAt - step.startedAt, 0);
  assert(elapsed <= timeBudget(sequence?.input.windowSeconds ?? replaySeconds, sequence?.input.age === "realistic", randomLineMinutes(sequence?.input.reader)).ceiling * 60_000, "Sequential campaign exceeded its active time budget");
  return { previous, elapsed };
}

export function startSequentialArm(campaign: string, sequence: Sequence, arm: number, copy: Directory, startedAt: number) {
  const progress = sequenceProgress(campaign, sequence, arm);
  assert(Number.isSafeInteger(startedAt) && startedAt >= (progress.previous.at(-1)?.completedAt ?? 0) &&
    startedAt <= Date.now(), "Sequential arm start is outside its invocation");
  assert.equal(copy.controlSha256, sequence.sealed.controlSha256);
  write(armPaths(campaign, arm).start,
    { sequenceSha256: sha(fs.readFileSync(seqFile(campaign))), arm, startedAt, copy } satisfies Invocation);
  return progress;
}

// [DX-INT1] Why: a part refused before its first offer (or stopped there by a dry run) must not consume the campaign.
// Its start record and its arm directory move to set-aside/ beside the campaign, so the same part can be claimed again
// on a fresh scratch copy; completed parts are untouched. A part stopped after an offer keeps its records and is not
// re-runnable in the same campaign.
// Rejected: deleting the refused records, or re-running completed parts.
export function setAsideArm(campaign: string, arm: number, armDirectory: string, attempt: string, reason: string) {
  const loc = armPaths(campaign, arm);
  assert(!fs.existsSync(loc.end), `Arm ${arm} already completed`);
  assert(path.resolve(armDirectory).startsWith(path.resolve(campaign) + path.sep));
  const destination = path.join(path.dirname(campaign), "set-aside", `arm-${arm}-${attempt}`);
  fs.mkdirSync(destination, { recursive: true, mode: 0o700 });
  if (fs.existsSync(loc.start)) fs.renameSync(loc.start, path.join(destination, path.basename(loc.start)));
  if (fs.existsSync(armDirectory)) fs.renameSync(armDirectory, path.join(destination, "arm"));
  write(path.join(destination, "set-aside.json"), { arm, attempt, reason, at: Date.now() });
  return destination;
}

export function completeSequentialArm(campaign: string, sequence: Sequence, arm: number) {
  const loc = armPaths(campaign, arm);
  const bytes = fs.readFileSync(loc.start), invocation: Invocation = JSON.parse(bytes.toString());
  assert.deepEqual([invocation.sequenceSha256, invocation.arm], [sha(fs.readFileSync(seqFile(campaign))), arm]);
  const files = Object.fromEntries(armEvidence(sequence, arm).files
    .map(file => [file, sha(fs.readFileSync(path.join(campaign, file)))]));
  const completedAt = Date.now();
  const anchor = checkAnchor(campaign, sequence, invocation, completedAt);
  const spent = Array.from({ length: arm - 1 }, (_, i) => readCompleted(campaign, sequence, i + 1, false))
    .reduce((ms, step) => ms + step.completedAt - step.startedAt, 0);
  assert(spent + completedAt - invocation.startedAt <= timeBudget(sequence?.input.windowSeconds ?? replaySeconds, sequence?.input.age === "realistic", randomLineMinutes(sequence?.input.reader)).ceiling * 60_000, "Sequential campaign exceeded its active time budget");
  write(loc.end, { invocationSha256: sha(bytes), completedAt, files, ...anchor } satisfies Completed);
}

export function assembleSequential(campaign: string, source: string) {
  const sequence = existingSequence(campaign);
  assert(sequence && sequence.input.source === source, "Assembly must use the campaign's source commit");
  const { previous } = sequenceProgress(campaign, sequence);
  const inventory = ["inputs.json", ...previous.flatMap((_, i) => Object.values(armPaths(campaign, i + 1)).map(file => path.basename(file)))];
  assert.deepEqual(fs.readdirSync(seqFolder(campaign)).sort(), inventory.sort(), "Unexpected or duplicate arm records");
  const input = { ...sequence.input, pgdata: previous.map(arm => arm.copy) };
  const manifest = path.join(campaign, "input.json");
  if (fs.existsSync(manifest)) assert.deepEqual(read(manifest), input, "Assembled manifest differs");
  else write(manifest, input);
  return { ...sequence.input, forecast: sequence.forecast };
}
