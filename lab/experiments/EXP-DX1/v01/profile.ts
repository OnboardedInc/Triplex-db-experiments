import { launchOptions } from "../jvm1/launch.mjs";

export type Writer = "grouped" | "subject";
export type Age = "fresh" | "1B";
export const defaultWriter: Writer = "subject";
export const jvmProfiles = ["j21-g1", "j25-g1", "j25-zgc"] as const;
export type JvmProfile = (typeof jvmProfiles)[number];
export const defaultJvm: JvmProfile = "j21-g1";
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

export function physicalJvm(profile: JvmProfile = defaultJvm) {
  const major = profile === "j21-g1" ? "21" : "25";
  const selectedCollector = profile === "j25-zgc" ? "-XX:+UseZGC" : "-XX:+UseG1GC";
  const peer = "-Xms256m -Xmx3g -Ddatomic.objectCacheMax=1536m";
  const override = profile === "j25-zgc" ? " " + selectedCollector : "";
  // [DX-INT1] Why: apply the selected collector to all roles in the same prepared image family.
  // Rejected: selecting the Java version while silently retaining a different gateway collector.
  return {
    major, selectedCollector,
    tx: launchOptions("tx", 1, "-Xms256m -Xmx5g" + override),
    "gw-w": launchOptions("gw-w", 1, peer + override),
    "gw-r": launchOptions("gw-r", 2, peer + override),
  };
}

export function stackOptions(writer: Writer, attempt: string, profile: JvmProfile = defaultJvm) {
  const policy = selectedWriter(writer), jvm = physicalJvm(profile);
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
    DX_WRITE_OPTIONS_ATTEMPT: attempt,
    DX_JAVA: jvm.major, DX_TX_JAVA_OPTS: jvm.tx,
    DX_GW_WRITE_JAVA_OPTS: jvm["gw-w"], DX_GW_READ_JAVA_OPTS: jvm["gw-r"],
  };
}
