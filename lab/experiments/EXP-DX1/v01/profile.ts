import { launchOptions } from "../jvm1/launch.mjs";

export type Writer = "grouped" | "subject" | "subject-ordered";
export type Age = "fresh" | "1B";
export const budget = { adoptionAndP1to4: 105, P5: 25, P6: 30, P7: 15, P8: 25, P9: 20, cleanup: 15 };
export const ceiling = Object.values(budget).reduce((a, b) => a + b, 0);
export const ladder = [1, 4, 16, 64, 256, 1024];
// [DX-V01] Why: freeze a bounded replica of the existing SCALE1 fixed field tape for both reader arms.
// Rejected: extending the tape on the faster side or judging short samples as the full P1/P2 qualification.
export const phaseSeconds = 60;
export const pairSeconds = 2 * phaseSeconds * ladder.length;
export function selectedWriter(writer: Writer) {
  const ordered = writer === "subject-ordered" ? "1" : "0";
  const conventional = ordered === "1" ? "0" : "1";
  return {
    layout: "lean",
    journal: "K",
    TX2_PREDECESSOR_LOOKUP: "1",
    TX2_SMALL_ROWS: conventional,
    TX2_SAVE_LEDGER: conventional,
    TX2_PACKED_JOURNAL: "0",
    TX2_GROUP_FAST_REPLY: "1",
    TX2_LEAN_NATIVE_QUERY: "1",
    TX2_LEAN_NATIVE_LOG: "1",
    TX2_GROUP_COMMIT: writer === "grouped" ? "1" : "0",
    TX2_GROUP_REUSE_PREPARED: writer === "grouped" ? "1" : "0",
    TX2_SUBJECT_SAVE: writer === "grouped" ? "0" : "1",
    TX2_SUBJECT_NUMERIC_OWNER: ordered,
    TX2_SUBJECT_ORDERED_IDS: ordered,
    TX2_GROUP_MAX_MEMBERS: "32",
    TX2_GROUP_STAGE_CLOCK: "1",
    TX2_GROUP_QUEUE_CLOCK: "0",
    TX2_LIVE_PRIORITY: conventional,
    TX2_FIELD_COALESCE: "0",
    TX2_COMMIT_HINTS: "false",
    TRIPLEX_DATOMIC_FAST_PATHS: "save-wire",
  } as const;
}

export function physicalJvm() {
  return {
    major: 25,
    tx: launchOptions("tx", 1, "-Xms256m -Xmx5g -XX:+UseG1GC"),
    "gw-w": launchOptions("gw-w", 1, "-Xms256m -Xmx3g -Ddatomic.objectCacheMax=1536m"),
    "gw-r": launchOptions("gw-r", 2, "-Xms256m -Xmx3g -Ddatomic.objectCacheMax=1536m"),
  };
}

export function stackOptions(writer: Writer, attempt: string) {
  // [DX-PREP1] Why: the ordered treatment needs ordinary rows and no grouped admission fence.
  // Rejected: labeling a fallback write as ordered from the process setting alone.
  const flags = selectedWriter(writer);
  return {
    DX_GROUP_COMMIT: writer === "grouped" ? "1" : "0",
    DX_GROUP_STAGE_CLOCK: "1", DX_W1_EXTRA: "1",
    DX_SMALL_ROWS: flags.TX2_SMALL_ROWS, DX_GROUP_REUSE_PREPARED: flags.TX2_GROUP_REUSE_PREPARED,
    DX_PREDECESSOR_LOOKUP: "1", DX_W1_LEDGER: flags.TX2_SAVE_LEDGER, DX_W1_PACKED_JOURNAL: "0",
    DX_W1_FAST_REPLY: "1", DX_W1_JOURNAL_QUERY: "1", DX_GROUP_MAX_MEMBERS: "32",
    DX_LIVE_PRIORITY: flags.TX2_LIVE_PRIORITY, DX_FIELD_COALESCE: "0", DX_COMMIT_HINTS: "false",
    DX_PREP1_SERVER: "1", DX_V01_ADOPTED_STACK: "1", DX_PREP1_SUBJECT: flags.TX2_SUBJECT_SAVE,
    TX2_SUBJECT_NUMERIC_OWNER: flags.TX2_SUBJECT_NUMERIC_OWNER, TX2_SUBJECT_ORDERED_IDS: flags.TX2_SUBJECT_ORDERED_IDS,
    DX_WRITE_OPTIONS_ATTEMPT: attempt,
    DX_JAVA: "25",
    DX_GW_WRITE_JAVA_OPTS: physicalJvm()["gw-w"], DX_GW_READ_JAVA_OPTS: physicalJvm()["gw-r"],
  };
}
