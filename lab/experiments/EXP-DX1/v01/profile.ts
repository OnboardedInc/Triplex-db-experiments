import { launchProfile } from "../jvm1/launch.mjs";
export { defaultJvm, jvmProfiles, type JvmProfile } from "../jvm1/launch.mjs";

export const writers = ["per-person-ordered", "grouped"] as const;
export type Writer = (typeof writers)[number];
export function isWriter(value: unknown): value is Writer {
  return writers.some((writer) => writer === value);
}
export const writerIntegration = "f25a46e02591a1c6b6a9495f7f2cce20249571f0";
export const launchIntegration = "57580241dc4020f9ab7590839c72c00356fcedee";
export const defaultWriter: Writer = "per-person-ordered";
export type Age = "fresh" | "1B";
export const budget = { adoptionAndP1to4: 105, P6: 25, P7: 10, P8: 25, comparison: 120, cleanup: 15 };
export const ceiling = Object.values(budget).reduce((a, b) => a + b, 0);
export const comparisonMinutes = budget.comparison / 2;
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

export function serverStages(writer: Writer, headline: ReturnType<typeof launchProfile>, separateWal: boolean) {
  const control = launchProfile("server");
  const grouped = { root: writer === "grouped" ? "" : "grouped/campaign/", writer: "grouped", loaded: true,
    comparison: true, name: "grouped", policy: control, separateWal: false } as const;
  if (writer === "grouped") return [grouped];
  return [
    { root: "", writer, loaded: false, comparison: false, name: "headline", policy: headline, separateWal },
    { root: "", writer, loaded: true, comparison: false, name: "headline", policy: headline, separateWal },
    { root: "server-default/campaign/", writer, loaded: true, comparison: true, name: "server-default", policy: control, separateWal: false },
    grouped,
  ] as const;
}

export function stackOptions(writer: Writer, attempt: string) {
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
    DX_WRITE_OPTIONS_ATTEMPT: attempt, DX_V01_IMPORT_TIMING: "1",
  };
}
