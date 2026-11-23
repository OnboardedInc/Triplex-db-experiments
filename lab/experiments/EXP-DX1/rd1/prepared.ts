import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { claimPgdata, inspectPgdata, pgdataTarget, preflightWal, sealedPgdata, type Directory } from "../v01/pgdata.ts";

// [DX-RD1] Why: the server holds the stopped full-size PostgreSQL directory, not the logical dump, and has room
// for one scratch copy beside it, so each reader ladder runs in its own invocation on its own private copy.
// Rejected: restoring the dump (over 76 minutes), copying inside the timed run, or two copies at once.
export const ladders = ["control", "tuned"] as const;
// [DX-INT1] The append-retirement pair runs its reference and append arms as the same two prepared invocations.
export const retirementLadders = ["reference", "append"] as const;
// [DX-RD2] The pinned short-cut pair runs the option off, then on, as the same two prepared invocations.
export const pinnedLadders = ["off", "on"] as const;
// [DX-RD2] The tuned pinned arm (both options, three reader cores, batches of eight) is one invocation in its own campaign (named apart from the read study's "tuned");
// "pinned-tuned-repeat" exists only so a second reading can follow the first on a new copy.
export const pinnedTunedLadders = ["pinned-tuned", "pinned-tuned-repeat"] as const;
// [DX-RD3] The pinned arm with saves (the tuned reader beside the card's 394 shape S cell) is one invocation too.
export const pinnedSavesLadders = ["pinned-saves", "pinned-saves-repeat"] as const;
export type Ladder = typeof ladders[number] | typeof retirementLadders[number] | typeof pinnedLadders[number] | typeof pinnedTunedLadders[number]
  | typeof pinnedSavesLadders[number];
type Kind = "read" | "retirement" | "pinned" | "pinned-tuned" | "pinned-saves";
const kinds = { read: { names: ladders }, retirement: { names: retirementLadders }, pinned: { names: pinnedLadders },
  "pinned-tuned": { names: pinnedTunedLadders }, "pinned-saves": { names: pinnedSavesLadders } } as const;
// [DX-INT1] Why: the retirement pair runs 394 and 620 on the fresh copy and 50 and 235 on the 1 billion copy.
// Rejected: one fixed rate list (the 1 billion arm's evidence would never seal).
const ratesOf = (kind: Kind, age: unknown) => kind === "read" || age === "1B" ? ["50", "235"] : ["394", "620"];
const dryRun = () => process.env.DX_DRY_RUN_FIRST_OFFER === "1";
const kindOf = (ladder: Ladder): Kind => (retirementLadders as readonly string[]).includes(ladder) ? "retirement"
  : (pinnedLadders as readonly string[]).includes(ladder) ? "pinned"
  : (pinnedTunedLadders as readonly string[]).includes(ladder) ? "pinned-tuned"
  : (pinnedSavesLadders as readonly string[]).includes(ladder) ? "pinned-saves" : "read";
export const ladderMinutes = 28;

const sha = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");
const read = <T>(file: string): T => JSON.parse(fs.readFileSync(file, "utf8"));
const write = (file: string, value: unknown) =>
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", { flag: "wx", mode: 0o600, flush: true });

export function ladderPaths(campaign: string, ladder: Ladder) {
  const folder = path.join(path.dirname(campaign), "ladders");
  return { folder, start: path.join(folder, `${ladder}-start.json`), end: path.join(folder, `${ladder}-complete.json`),
    input: path.join(campaign, "input.json"), arm: path.join(campaign, ladder) };
}

type Start = { inputSha256: string; ladder: Ladder; startedAt: number; sealed: Directory; copy: Directory };
type Complete = { startSha256: string; completedAt: number; slot: string; attempt: string; systemIdentifier: string;
  files: Record<string, string> };

export function completed(campaign: string, ladder: Ladder) {
  const loc = ladderPaths(campaign, ladder);
  assert(fs.existsSync(loc.end), `The ${ladder} ladder has not completed`);
  const startBytes = fs.readFileSync(loc.start), start: Start = JSON.parse(startBytes.toString());
  const end = read<Complete>(loc.end);
  assert.deepEqual([start.ladder, start.inputSha256, end.startSha256], [ladder, sha(fs.readFileSync(loc.input)), sha(startBytes)],
    `The ${ladder} ladder belongs to a different input or start record`);
  for (const [file, digest] of Object.entries(end.files))
    assert.equal(sha(fs.readFileSync(path.join(campaign, file))), digest, `Ladder evidence differs: ${file}`);
  const pgdata = read<{ slot: string; attempt: string; copy: Directory; systemIdentifier: string }>(path.join(loc.arm, "pgdata.json"));
  assert.deepEqual([pgdata.slot, pgdata.attempt, pgdata.copy, pgdata.systemIdentifier],
    [end.slot, end.attempt, start.copy, end.systemIdentifier]);
  return { start, end };
}

// Opens one ladder of a prepared read study: control first, then tuned, each on a new private copy of one seal.
export function openPreparedLadder(input: { campaign: string; ladder: string; source: string; copy: string; wal?: string;
  record: Record<string, unknown>; kind?: Kind }) {
  const { campaign, source } = input;
  const kind = input.kind ?? "read";
  const [first, second] = kinds[kind].names;
  assert((kinds[kind].names as readonly string[]).includes(input.ladder), `Choose --ladder ${first} or --ladder ${second}`);
  const ladder = input.ladder as Ladder;
  const evidence = fs.realpathSync(path.dirname(campaign));
  const [copy] = inspectPgdata(source, [input.copy], evidence) as [Directory];
  const sealed = sealedPgdata(source);
  const wal = input.wal ? preflightWal(input.wal, [copy.dir]) : undefined;
  const record = JSON.parse(JSON.stringify({ ...input.record, pgdataSource: sealed, wal }));
  const loc = ladderPaths(campaign, ladder);
  let previous: ReturnType<typeof completed> | undefined;
  // [DX-INT1] Why: a first-offer dry run of the second arm must run every check of that arm before any run exists.
  // A dry run never offers or seals, so the second arm opens its own new campaign without the first arm's seal.
  // Rejected: dry-running only the first arm (the treatment arm's start-up and admission would first run for real).
  if (ladder === first || (dryRun() && !fs.existsSync(campaign))) {
    assert(!fs.existsSync(campaign) && !fs.existsSync(loc.folder), `Use a new output directory for the ${first} ladder`);
    fs.mkdirSync(campaign);
    fs.mkdirSync(loc.folder, { mode: 0o700 });
    write(loc.input, record);
  } else {
    // [DX-RD1] Why: the treatment must read the same seal, cut, source and launch settings as its control.
    // Rejected: accepting a tuned ladder whose control used a different copy, configuration or PostgreSQL cluster.
    assert.deepEqual(read(loc.input), record, "Read study source, seal, pins or launch configuration changed");
    previous = completed(campaign, first);
    assert(!fs.existsSync(loc.start) && !fs.existsSync(loc.end), `The ${second} ladder already started`);
  }
  assert.equal(copy.controlSha256, sealed.controlSha256);
  const startedAt = Date.now();
  if (previous) assert(startedAt >= previous.end.completedAt, "Ladders overlap");
  write(loc.start, { inputSha256: sha(fs.readFileSync(loc.input)), ladder, startedAt, sealed, copy } satisfies Start);
  return { ladder, loaded: ladder === second, copy, sealed, previous, source,
    env: { DX_V01_PGDATA: copy.dir, DX_V01_PGDATA_CONTROL_SHA: copy.controlSha256, DX_V01_PGDATA_FILE_ID: copy.device + ":" + copy.inode },
    claim(slot: string, attempt: string) {
      if (previous) assert(slot !== previous.end.slot && attempt !== previous.end.attempt, "Ladder slot or attempt reused");
      claimPgdata(copy, source, slot, attempt);
    },
    // Checks the running PostgreSQL is the admitted bind and the same cluster as the control ladder.
    live(out: string, slot: string, attempt: string, container: string) {
      const liveFileId = execFileSync("docker", ["exec", container, "stat", "-c", "%d:%i", pgdataTarget],
        { encoding: "utf8", timeout: 10000 }).trim();
      assert.equal(liveFileId, copy.device + ":" + copy.inode);
      const [dataDirectory, systemIdentifier] = execFileSync("docker", ["exec", container, "psql", "-XAtq", "-v", "ON_ERROR_STOP=1",
        "-U", "postgres", "-d", "datomic", "-c", "SELECT current_setting('data_directory'), system_identifier FROM pg_control_system()"],
      { encoding: "utf8", timeout: 10000 }).trim().split("|");
      assert.equal(dataDirectory, pgdataTarget);
      assert.match(systemIdentifier ?? "", /^[1-9][0-9]*$/);
      if (previous) assert.equal(systemIdentifier, previous.end.systemIdentifier, "Ladders must share the sealed PostgreSQL system identifier");
      fs.writeFileSync(path.join(out, "pgdata.json"), JSON.stringify({ source: input.record.source, slot, attempt, at: Date.now(),
        container, copy, sealed, liveFileId, systemIdentifier }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
      return systemIdentifier!;
    },
    // [DX-INT1] Why: an arm refused before its first save (or stopped by a first-offer dry run) has measured nothing,
    // so its records move aside and the same arm runs again on a new copy. The scorecard does the same (v01/sequential.ts).
    // Rejected: a new campaign for every refusal (a refused treatment arm would repeat the sealed reference arm).
    setAside(attempt: string) {
      assert(!fs.existsSync(loc.end), "A sealed arm cannot be set aside");
      const target = path.join(path.dirname(campaign), "set-aside", `${ladder}-${attempt}`);
      fs.mkdirSync(target, { recursive: true });
      if (!previous) {
        fs.renameSync(campaign, path.join(target, "campaign"));
        fs.renameSync(loc.folder, path.join(target, "ladders"));
      } else {
        fs.renameSync(loc.start, path.join(target, path.basename(loc.start)));
        if (fs.existsSync(loc.arm)) fs.renameSync(loc.arm, path.join(target, ladder));
      }
      return target;
    },
    complete(slot: string, attempt: string, systemIdentifier: string) {
      const files = Object.fromEntries(evidenceFiles(campaign, ladder).map((file) => [file, sha(fs.readFileSync(path.join(campaign, file)))]));
      write(loc.end, { startSha256: sha(fs.readFileSync(loc.start)), completedAt: Date.now(), slot, attempt, systemIdentifier, files } satisfies Complete);
      completed(campaign, ladder);
    },
  };
}

// [DX-INT1] Why: one arm of a prepared invocation is sealed only after its body returns and its cleanup has written
// the inventory, on every path out of the body. The body is a function, so a `continue` cannot skip the seal: at RD1
// ca93f5165 the reader branch ended in `continue` and no ladder was ever sealed.
// Rejected: sealing inside the body (cleanup evidence does not exist yet) or sealing after a failed body.
export async function sealedArm(prepared: PreparedLadder | undefined, slot: string, attempt: string,
  body: () => Promise<string>, cleanup: () => void, after?: () => void) {
  let systemIdentifier: string;
  try {
    systemIdentifier = await body();
  } finally {
    cleanup();
  }
  after?.();
  prepared?.complete(slot, attempt, systemIdentifier);
}
export type PreparedLadder = ReturnType<typeof openPreparedLadder>;

function evidenceFiles(campaign: string, ladder: Ladder) {
  const kind = kindOf(ladder);
  const files = ["input.json", `${ladder}/attempt.json`, `${ladder}/pgdata.json`, `${ladder}/cleanup/inventory.json`];
  if (kind === "retirement") files.push(`${ladder}/retirement-diagnostic.json`);
  if (kind === "pinned" || kind === "pinned-tuned") files.push(`${ladder}/pinned-ladder.json`);
  else if (kind === "pinned-saves") files.push(`${ladder}/pinned-saves.json`);
  else for (const rate of ratesOf(kind, read<{ age?: string }>(path.join(campaign, "input.json")).age)) for (const name of ["arm.json", "operations.json"]) files.push(`${ladder}/${rate}/${name}`);
  for (const file of files) assert(fs.existsSync(path.join(campaign, file)), `Missing ladder evidence ${file}`);
  return files;
}

// Both ladders of one prepared read study, checked together after the second invocation.
export function checkPreparedStudy(campaign: string, kind: Kind = "read") {
  const [control, tuned] = kinds[kind].names.map((ladder) => completed(campaign, ladder)) as [ReturnType<typeof completed>, ReturnType<typeof completed>];
  assert.equal(control.end.systemIdentifier, tuned.end.systemIdentifier);
  assert.deepEqual(control.start.sealed, tuned.start.sealed);
  assert.equal(control.start.copy.controlSha256, tuned.start.copy.controlSha256);
  assert.notEqual(control.end.slot, tuned.end.slot);
  assert(tuned.start.startedAt >= control.end.completedAt);
  return { control, tuned };
}
