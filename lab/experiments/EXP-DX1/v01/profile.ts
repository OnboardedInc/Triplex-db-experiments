export { defaultJvm, jvmProfiles, type JvmProfile } from "../jvm1/launch.mjs";

export type Writer = "grouped" | "subject";
export type Age = "fresh" | "1B";
export const defaultWriter: Writer = "subject";
export const budget = { adoptionAndP1to4: 105, P5: 25, P6: 30, P7: 15, P8: 25, P9: 20, cleanup: 15 };
export const ceiling = Object.values(budget).reduce((a, b) => a + b, 0);
export const ladder = [1, 4, 16, 64, 256, 1024];
// [DX-V01] Why: freeze a bounded replica of the existing SCALE1 fixed field tape for both reader arms.
// Rejected: extending the tape on the faster side or judging short samples as the full P1/P2 qualification.
export const phaseSeconds = 60;
export const pairSeconds = 2 * phaseSeconds * ladder.length;
export function selectedWriter(writer: Writer) {
  const grouped = writer === "grouped";
  return {
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
    TX2_FIELD_COALESCE: "0",
    TX2_COMMIT_HINTS: "false",
    TRIPLEX_DATOMIC_FAST_PATHS: "save-wire",
  } as const;
}

export function writeDiagnostics(writer: Writer, env = process.env) {
  const serial = env.DX_W1_SERIAL_APPLY ?? "0";
  const lookup = env.PREP1_LOOKUP_EVERY ?? "0";
  if (!/^[01]$/.test(serial) || (serial === "1" && writer !== "subject"))
    throw new RangeError("DX_W1_SERIAL_APPLY=1 requires the ordered subject writer");
  if (!/^(0|[1-9][0-9]{0,3})$/.test(lookup) || Number(lookup) > 4096)
    throw new RangeError("PREP1_LOOKUP_EVERY must be between 0 and 4096");
  return { serialApply: serial === "1", lookupEvery: Number(lookup) };
}

export function stackOptions(writer: Writer, attempt: string, diagnostics = writeDiagnostics(writer, {})) {
  const policy = selectedWriter(writer);
  return {
    DX_GROUP_COMMIT: policy.TX2_GROUP_COMMIT,
    DX_GROUP_STAGE_CLOCK: "1", DX_W1_EXTRA: "1",
    DX_SMALL_ROWS: policy.TX2_SMALL_ROWS, DX_GROUP_REUSE_PREPARED: policy.TX2_GROUP_REUSE_PREPARED,
    DX_PREDECESSOR_LOOKUP: "1", DX_W1_LEDGER: policy.TX2_SAVE_LEDGER, DX_W1_PACKED_JOURNAL: "0",
    DX_W1_FAST_REPLY: "1", DX_W1_JOURNAL_QUERY: "1", DX_GROUP_MAX_MEMBERS: "32",
    DX_LIVE_PRIORITY: policy.TX2_LIVE_PRIORITY, DX_FIELD_COALESCE: "0", DX_COMMIT_HINTS: "false",
    DX_PREP1_SERVER: "1", DX_V01_ADOPTED_STACK: "1", DX_PREP1_SUBJECT: policy.TX2_SUBJECT_SAVE,
    TX2_SUBJECT_NUMERIC_OWNER: policy.TX2_SUBJECT_NUMERIC_OWNER,
    TX2_SUBJECT_ORDERED_IDS: policy.TX2_SUBJECT_ORDERED_IDS,
    TX2_SUBJECT_PREFETCH: policy.TX2_SUBJECT_PREFETCH,
    TX2_SUBJECT_NARROW_REVISION: diagnostics.serialApply ? "1" : "0",
    TX2_SUBJECT_REUSE_PREDECESSOR: diagnostics.serialApply ? "1" : "0",
    PREP1_LOOKUP_EVERY: String(diagnostics.lookupEvery),
    DX_WRITE_OPTIONS_ATTEMPT: attempt,
  };
}
