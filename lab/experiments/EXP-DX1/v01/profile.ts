import { replaySeconds, serverCells, type WindowSeconds } from "./server-workload.ts";
import { defaultCreditMode, launchProfile } from "../jvm1/launch.mjs";
export { defaultJvm, jvmProfiles, type JvmProfile } from "../jvm1/launch.mjs";

export const writers = ["per-person-ordered", "grouped"] as const;
export type Writer = (typeof writers)[number];
export function isWriter(value: unknown): value is Writer {
  return writers.some((writer) => writer === value);
}
export const writerIntegration = "f25a46e02591a1c6b6a9495f7f2cce20249571f0";
export const launchIntegration = "5f62059b1fc03e8fffca0441f14ff4ddd4d7e734";
export const defaultWriter: Writer = "per-person-ordered";
export type Age = "fresh" | "1B" | "realistic";
export function timeBudget(seconds: WindowSeconds, realistic = false) {
  const extra = serverCells.length * (seconds - replaySeconds) / 60;
  const budget = { adoptionAndP1to4: realistic ? 109 : 89, P6: (realistic ? 30 : 25) + extra, P7: realistic ? 25 : 10, P8: 25, comparison: (realistic ? 70 : 60) + extra, cleanup: 15 };
  return { budget, ceiling: Object.values(budget).reduce((a, b) => a + b, 0), comparisonMinutes: budget.comparison };
}
export const { budget } = timeBudget(replaySeconds);
export const ladder = [1, 4, 16, 64, 256, 1024];
// [DX-V01] Why: freeze a bounded replica of the existing SCALE1 fixed field tape for both reader arms.
// Rejected: extending the tape on the faster side or judging short samples as the full P1/P2 qualification.
export const phaseSeconds = 60;
export const pairSeconds = 2 * phaseSeconds * ladder.length;
export function selectedWriter(writer: Writer) {
  const grouped = writer === "grouped";
  return {
    writer,
    layout: "lean",
    journal: grouped ? "K" : "native rows",
    TX2_PREDECESSOR_LOOKUP: "1",
    TX2_SMALL_ROWS: grouped ? "1" : "0",
    TX2_SAVE_LEDGER: grouped ? "1" : "0",
    TX2_PACKED_JOURNAL: "0",
    TX2_GROUP_FAST_REPLY: "1",
    TX2_LEAN_NATIVE_QUERY: "1",
    TX2_LEAN_NATIVE_LOG: "1",
    TX2_GROUP_COMMIT: grouped ? "1" : "0",
    TX2_GROUP_REUSE_PREPARED: grouped ? "1" : "0",
    TX2_SUBJECT_SAVE: grouped ? "0" : "1",
    TX2_SUBJECT_NUMERIC_OWNER: grouped ? "0" : "1",
    TX2_SUBJECT_ORDERED_IDS: grouped ? "0" : "1",
    TX2_SUBJECT_PREFETCH: "0",
    TX2_GROUP_MAX_MEMBERS: "32",
    TX2_GROUP_STAGE_CLOCK: "1",
    TX2_GROUP_QUEUE_CLOCK: "0",
    TX2_LIVE_PRIORITY: grouped ? "1" : "0",
    TX2_LOAD1_PRIORITY: writer === "grouped" ? "1" : "0",
    TX2_LOAD2_TIMING: "1",
    TX2_FIELD_COALESCE: "0",
    TX2_COMMIT_HINTS: "false",
    TRIPLEX_DATOMIC_FAST_PATHS: "save-wire",
  } as const;
}

export const physicalArms = 3;
export const barrierRoot = "barrier6/campaign/";

export function serverStages(headline: ReturnType<typeof launchProfile>, separateWal: boolean) {
  return [
    { root: "", loaded: false, comparison: false, name: "headline", policy: headline, separateWal },
    { root: "", loaded: true, comparison: false, name: "headline", policy: headline, separateWal },
    { root: barrierRoot, loaded: true, comparison: true, name: "barrier6",
      policy: { ...headline, creditMode: defaultCreditMode }, separateWal },
  ] as const;
}

export function writeDiagnostics(writer: Writer, env: NodeJS.ProcessEnv = {}) {
  const serial = env.DX_W1_SERIAL_APPLY ?? "0", lookup = env.PREP1_LOOKUP_EVERY ?? "0";
  if (!/^[01]$/.test(serial) || (serial === "1" && writer !== defaultWriter))
    throw new RangeError("DX_W1_SERIAL_APPLY=1 requires the ordered subject writer");
  if (!/^(0|[1-9][0-9]{0,3})$/.test(lookup) || Number(lookup) > 4096)
    throw new RangeError("PREP1_LOOKUP_EVERY must be between 0 and 4096");
  return { serialApply: serial === "1", lookupEvery: Number(lookup) };
}

export function stackOptions(writer: Writer, attempt: string, diagnostics = writeDiagnostics(writer)) {
  const settings = selectedWriter(writer);
  return {
    DX_GROUP_COMMIT: settings.TX2_GROUP_COMMIT,
    DX_GROUP_STAGE_CLOCK: "1", DX_W1_EXTRA: "1",
    DX_SMALL_ROWS: settings.TX2_SMALL_ROWS, DX_GROUP_REUSE_PREPARED: settings.TX2_GROUP_REUSE_PREPARED,
    DX_PREDECESSOR_LOOKUP: "1", DX_W1_LEDGER: settings.TX2_SAVE_LEDGER, DX_W1_PACKED_JOURNAL: "0",
    DX_W1_FAST_REPLY: "1", DX_W1_JOURNAL_QUERY: "1", DX_GROUP_MAX_MEMBERS: "32",
    DX_LIVE_PRIORITY: settings.TX2_LIVE_PRIORITY, DX_FIELD_COALESCE: "0", DX_COMMIT_HINTS: "false",
    DX_PREP1_SERVER: "1", DX_V01_ADOPTED_STACK: "1", DX_PREP1_SUBJECT: settings.TX2_SUBJECT_SAVE,
    TX2_SUBJECT_NUMERIC_OWNER: settings.TX2_SUBJECT_NUMERIC_OWNER, TX2_SUBJECT_ORDERED_IDS: settings.TX2_SUBJECT_ORDERED_IDS,
    TX2_SUBJECT_PREFETCH: settings.TX2_SUBJECT_PREFETCH,
    TX2_SUBJECT_NARROW_REVISION: diagnostics.serialApply ? "1" : "0",
    TX2_SUBJECT_REUSE_PREDECESSOR: diagnostics.serialApply ? "1" : "0",
    PREP1_LOOKUP_EVERY: String(diagnostics.lookupEvery),
    DX_WRITE_OPTIONS_ATTEMPT: attempt, DX_V01_IMPORT_TIMING: "1",
  };
}
