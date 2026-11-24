import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

export const roles = /** @type {const} */ (["tx", "gw-w", "gw-r"]);
/** @typedef {(typeof roles)[number]} Role */
export const part2Arms = ["j21-g1-writer2", "j25-g1", "j25-zgc", "j25-g1-zgc-memory"];

// [DX-JVM1] Why: use the exact TAIL1 young generation and region settings for the measured writer control.
// Rejected: duplicating the treatment in each launcher and allowing silent flag drift.
export const measuredWriterG1 = Object.freeze([
  "-XX:+UseG1GC",
  "-XX:MaxGCPauseMillis=25",
  "-XX:G1HeapRegionSize=2m",
  "-XX:+UnlockExperimentalVMOptions",
  "-XX:G1NewSizePercent=5",
  "-XX:G1MaxNewSizePercent=25",
  "-XX:ConcGCThreads=1",
]);

const baseline = {
  tx: ["-XX:+UseG1GC", "-XX:MaxGCPauseMillis=50"],
  "gw-w": measuredWriterG1,
  "gw-r": ["-XX:+UseG1GC", "-XX:MaxGCPauseMillis=50"],
};
const pooledPeer = [
  "-Xms64m", "-Xmx384m", "-Ddatomic.objectCacheMax=32m",
  "-XX:MinHeapFreeRatio=15", "-XX:MaxHeapFreeRatio=30",
];
// [DX-JVM1] Why: give TAIL1 and INT1 the same collector and writer placement while keeping the pooled memory limits.
// Rejected: applying the four-GiB peer heaps from the separate full-memory physical comparison to INT1.
export const pooledWriterCpus = "2,5";
export const pooledJvmOptions = Object.freeze({
  tx: Object.freeze(["-Xms256m", "-Xmx5g", ...baseline.tx]),
  "gw-w": Object.freeze([...pooledPeer, ...measuredWriterG1]),
  "gw-r": Object.freeze([...pooledPeer, ...baseline["gw-r"]]),
});
const general = [
  "-XX:+ExitOnOutOfMemoryError", "-XX:-AlwaysPreTouch", "-XX:-UseLargePages",
  "-XX:-UseTransparentHugePages", "-Xshare:auto", "-XX:+TieredCompilation",
  "-XX:CICompilerCount=2", "-XX:CompileThresholdScaling=1", "-Ddatomic.txTimeoutMsec=10000",
];
/** @param {string} option */
const optionKey = (option) => option.match(/^-XX:[+-]?(\w+)(?:=|$)|^(-Xms|-Xmx|-Xshare:)|^(-D[^=]+)=/)?.slice(1).find(Boolean) ?? option;

// [DX-JVM1] Why: one role policy completes the explicitly chosen flags, preserving deliberate arm overrides.
// Rejected: duplicated fallbacks in the Mac and physical launchers or relying on a processor-dependent collector.
/** @param {Role} role @param {number} coreCount @param {string} options @param {string} [control] */
export function launchOptions(role, coreCount, options, control = "default") {
  assert(roles.includes(role) && Number.isInteger(coreCount) && coreCount > 0);
  assert(control === "default" || (role === "gw-w" && control === "serial"));
  const flags = options.trim().split(/\s+/).filter(Boolean);
  const keys = new Set(flags.map(optionKey));
  const collectors = flags.filter((flag) => /^-XX:\+Use(Serial|Parallel|G1|Z|Shenandoah|Epsilon)GC$/.test(flag));
  assert(collectors.length <= 1, "Select exactly one JVM collector");
  const collectorDefaults = control === "serial" ? ["-XX:+UseSerialGC"] : baseline[role];
  const collector = collectors[0] ?? collectorDefaults[0];
  assert(!flags.includes(collector.replace("+", "-")), "Selected JVM collector was disabled");
  const specified = collector === "-XX:+UseG1GC" ? [
    ...(collectors.length ? [`-XX:MaxGCPauseMillis=${role === "gw-w" ? 25 : 50}`] : collectorDefaults),
    "-XX:ParallelGCThreads=" + coreCount, "-XX:ConcGCThreads=1", "-XX:+UseDynamicNumberOfGCThreads",
  ] : collectors.length ? [] : [collector];
  const heap = flags.findLast((flag) => /^-Xmx\d+[kmg]?$/i.test(flag))?.slice(4) ?? "1g";
  const defaults = [
    "-Xms256m", "-Xmx" + heap, "-XX:MaxDirectMemorySize=" + heap,
    "-XX:ActiveProcessorCount=" + coreCount, ...specified, ...general,
  ];
  for (const flag of defaults) {
    const key = optionKey(flag);
    if (keys.has(key)) continue;
    flags.push(flag);
    keys.add(key);
  }
  return flags.join(" ");
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const [, , role, cpus, options, control] = process.argv;
  assert(role === "tx" || role === "gw-w" || role === "gw-r");
  const ids = new Set();
  for (const part of cpus.split(",")) {
    assert(/^\d+(?:-\d+)?$/.test(part));
    const [first, last = first] = part.split("-").map(Number);
    assert(first <= last && last < 4096);
    for (let i = first; i <= last; i++) ids.add(i);
  }
  console.log(launchOptions(role, ids.size, options, control));
}

/** @param {string} major @param {string} collector @param {Role} role @param {number} cores */
export function collectorOptions(major, collector, role, cores) {
  assert(roles.includes(role) && Number.isInteger(cores) && cores > 0);
  if (collector === "ZGC") {
    assert.equal(major, "25");
    return [
      "-XX:+UseZGC",
      "-XX:ConcGCThreads=" + (role === "gw-w" ? 1 : 2),
      "-XX:ParallelGCThreads=" + cores,
      "-XX:+UseDynamicNumberOfGCThreads",
      "-XX:+ZUncommit",
      "-XX:ZUncommitDelay=300",
      "-XX:ZAllocationSpikeTolerance=2",
    ];
  }
  assert.equal(collector, "G1");
  const g1 = role === "gw-w" ? measuredWriterG1 : [
    "-XX:+UseG1GC",
    "-XX:MaxGCPauseMillis=50",
    "-XX:+UnlockExperimentalVMOptions",
    "-XX:G1NewSizePercent=5",
    "-XX:G1MaxNewSizePercent=60",
    "-XX:ConcGCThreads=1",
  ];
  return [
    ...g1,
    "-XX:ParallelGCThreads=" + cores,
    "-XX:+UseDynamicNumberOfGCThreads",
    "-XX:G1ReservePercent=10",
    "-XX:InitiatingHeapOccupancyPercent=45",
    "-XX:+G1UseAdaptiveIHOP",
  ];
}

export const jvmProfiles = /** @type {const} */ (["j21-g1", "j25-g1", "j25-zgc"]);
/** @typedef {(typeof jvmProfiles)[number]} JvmProfile */
export const defaultJvm = /** @type {const} */ ("j21-g1");
export const creditModes = /** @type {const} */ (["barrier6", "rolling6", "rolling8", "rolling12", "rolling16"]);
/** @typedef {(typeof creditModes)[number]} CreditMode */
export const defaultCreditMode = /** @type {const} */ ("barrier6");
export const durablePostgres = Object.freeze({ fsync: "on", synchronous_commit: "on", full_page_writes: "on" });
export const startupFlags = ["-XX:+PrintFlagsFinal", "-Xlog:gc+init=info,cds=info:stdout:uptimemillis,level,tags"];

// [DX-INT1] Why: check what HotSpot applied in the actual process, including flags interpreted by the vendor launcher.
// Rejected: using the desired environment variables as a startup witness.
/** @param {ReturnType<typeof launchProfile>["tx"]} expected @param {string} log */
export function checkProfileFlags(expected, log) {
  const values = new Map([...log.matchAll(/^\s*\w+\s+(\w+)\s+=\s+(\S+)\s+\{/gm)]
    .map((match) => [match[1], match[2]]));
  for (const flag of expected.flags) {
    if (!flag.startsWith("-XX:") && !/^-Xm[sx]/.test(flag)) continue;
    const [, key, value] = flag.match(/^-XX:([\w]+)=(.+)$/) ??
      flag.match(/^-(Xms|Xmx)(.+)$/) ??
      [null, flag.slice(5), flag[4] === "+" ? "true" : "false"];
    const expectedKey = key === "Xms" ? "InitialHeapSize" : key === "Xmx" ? "MaxHeapSize" : key;
    const size = value.match(/^(\d+)([kmg])$/i);
    const wanted = size ? String(Number(size[1]) * 1024 ** ("kmg".indexOf(size[2].toLowerCase()) + 1)) : value;
    const actual = values.get(expectedKey);
    assert(actual !== undefined, "Missing final JVM flag " + expectedKey);
    assert(actual === wanted || (Number.isFinite(Number(wanted)) && Number(actual) === Number(wanted)),
      `JVM ${expectedKey} expected ${wanted}, observed ${actual}`);
  }
  const enabled = [...values].filter(([key, value]) => /^Use(Serial|Parallel|G1|Z|Shenandoah|Epsilon)GC$/.test(key) && value === "true");
  assert.equal(enabled.length, 1, "Expected exactly one active collector");
  assert.match(log, new RegExp(`\\[gc,init\\s*\\].*Version: ${expected.major}\\.`));
  if (expected.flags.includes("-Xshare:on")) assert.match(log, /\[cds\s*\].*Mapped static\s+region #0/);
}

const laptop = {
  tx: { memory: 1280, initial: 128, heap: 640, direct: 128, metaspace: 160, cache: 64, cores: 2 },
  "gw-w": { memory: 640, initial: 64, heap: 352, direct: 352, cache: 32, cores: 2 },
  "gw-r": { memory: 640, initial: 64, heap: 352, direct: 352, cache: 32, cores: 2 },
};
const server = {
  tx: { memory: 30720, initial: 1024, heap: 24576, direct: 24576, cache: 16384, cpus: "0,7,8", cores: 3 },
  "gw-w": { memory: 6144, initial: 512, heap: 4096, direct: 4096, cache: null, cpus: "2,3,4,5", cores: 4 },
  "gw-r": { memory: 5120, initial: 256, heap: 3072, direct: 3072, cache: 1536, cpus: "6", cores: 1 },
};
const startupTuning = {
  tx: { initial: 4096, compilers: 2, threshold: "0.75", code: 32 },
  "gw-w": { initial: 1024, compilers: 3, threshold: "0.65", code: 32 },
  "gw-r": { initial: 512, compilers: 2, threshold: "1", code: 16 },
};
// [DX-JVM1] Why: record compilation and code-cache pressure while normal requests supply the workload.
// Rejected: a boot script that submits transactions or trains profiles before traffic.
export const coldStartLog = "-Xlog:gc*,safepoint,jit+compilation=debug,codecache=debug:file=/trace/%p-startup.log:utctime,uptimemillis,level,tags:filecount=4,filesize=32m";
export const laptopCaps = Object.freeze({ pg: 256, tx: laptop.tx.memory, write: laptop["gw-w"].memory, read: laptop["gw-r"].memory });
// [DX-INT1] Why: name PREP1's measured 32 GiB transactor cache arm as a server profile beside today's server profile.
// Rejected: changing the server profile before the owner decides, or a free-form cache size on the scorecard.
export const serverProfiles = /** @type {const} */ (["server", "server-32"]);
/** @typedef {(typeof serverProfiles)[number]} ServerProfile */
// Switching the scorecard and server runners to the larger profile is this one line.
export const defaultServerProfile = /** @type {ServerProfile} */ ("server");
// [DX-INT1] Why: the same guard as PREP1's cache32 arm: role caps plus 10 GiB for the host within 89 GiB MemTotal.
// Rejected: treating the advertised 96 GB as usable memory or budgeting only the Java heaps.
export const hostHeadroomMiB = 10 * 1024;
export const server32HostMiB = 89 * 1024;
/** @param {{ tx: { memoryMiB: number }, "gw-w": { memoryMiB: number }, "gw-r": { memoryMiB: number }, pg: { memoryMiB: number } }} policy */
export const roleMemoryMiB = (policy) => policy.tx.memoryMiB + policy["gw-w"].memoryMiB + policy["gw-r"].memoryMiB + policy.pg.memoryMiB;

// [DX-INT1] Why: keep the portable limits and the full-size treatment in one launch policy.
// Rejected: scaling all roles together or interpreting the reduced startup as physical placement evidence.
/** @param {"laptop" | ServerProfile} profile
 * @param {{ jvm?: JvmProfile, txJvm?: JvmProfile, writeJvm?: JvmProfile, readJvm?: JvmProfile, readTuned?: boolean, readCacheMiB?: 32 | 1536 | 3072, txCacheMiB?: 32768, creditMode?: CreditMode, reduced?: boolean, scale?: number, startup?: "today" | "tuned" }} [options] */
export function launchProfile(profile, { jvm = defaultJvm, txJvm = jvm, writeJvm = jvm,
  readJvm = jvm, readTuned = false, readCacheMiB, txCacheMiB, creditMode = defaultCreditMode, reduced = false, scale = 1, startup = "today" } = {}) {
  assert(profile === "laptop" || serverProfiles.includes(profile));
  assert([jvm, txJvm, writeJvm, readJvm].every((v) => jvmProfiles.includes(v)));
  // [DX-INT1] Why: server-32 is exactly PREP1's cache32 transactor: 48 GiB Java 25 ZGC heap, 32 GiB cache, 8 GiB direct, 60 GiB cap.
  // Rejected: a G1 transactor with this heap, which no full-size run has measured.
  const server32 = profile === "server-32";
  assert(!server32 || (txJvm === "j25-zgc" && (txCacheMiB === undefined || txCacheMiB === 32768)),
    "server-32 runs the transactor on Java 25 ZGC with its own 32 GiB cache");
  if (server32) txCacheMiB = 32768;
  assert(creditModes.includes(creditMode), "Unknown credit mode");
  assert(profile !== "laptop" ? scale === 1 : !reduced && [1, 2, 4].includes(scale));
  const portable = profile === "laptop" || reduced;
  assert(startup === "today" || (startup === "tuned" && profile !== "laptop"));
  assert(!readTuned || !portable);
  assert(readCacheMiB === undefined || [32, 1536, 3072].includes(readCacheMiB));
  assert(!portable || readCacheMiB === undefined || readCacheMiB === 32);
  // [DX-INT1] Why: give a selected 3 GiB cache the measured heap headroom.
  // Rejected: making cache capacity alter core placement or making the tuned treatment implicit.
  // [DX-JVM1] Why: the start-up read arms reuse PREP1's measured 32 GiB transactor cache: 48 GiB heap, 8 GiB direct, 60 GiB cap.
  // Rejected: a larger cache, which does not fit beside the other role caps on a 96 GB host.
  assert(txCacheMiB === undefined || (txCacheMiB === 32768 && profile !== "laptop" && !reduced));
  const largeRead = readTuned || readCacheMiB === 3072;
  // [DX-CARD2] Why: the 32 GiB transactor and the tuned reader together need 4 GiB less in role caps than their two
  // separate measured launches. Measured peaks: the transactor's cgroup reached 53.11 GiB (48.07 GiB ZGC heap, 4.83 GiB
  // other) of 60 in PREP1's cache32 arm at 1 billion (1,380 one-second samples, worst-case tape at 394 and 620 saves/s);
  // the tuned reader reached 6.70 GiB (6 GiB heap fully committed) of 9 at its windows' ends in the three 1 billion
  // reader arms. So the transactor's container is cut from 60 to 57 GiB and the reader's from 9 to 8 GiB, heaps,
  // caches and direct limits unchanged, only when both are selected. Rejected: a smaller transactor heap (it holds the
  // 32 GiB cache that sets P2 at 1 billion), cutting the writer (4.35 GiB peak of 6) or PostgreSQL (its page cache
  // fills its 8 GiB and serves the random reads), and the 10 GiB host reserve (the driver's peak is not measured).
  const combined = readTuned && txCacheMiB !== undefined;
  const readMemory = largeRead ? { memory: combined ? 8192 : 9216, heap: 6144, direct: 1024 } : {};
  const bigTx = txCacheMiB ? { tx: { ...server.tx, memory: combined ? 58368 : 61440, heap: 49152, direct: 8192, cache: txCacheMiB } } : {};
  // [DX-RD1] Why: leave two client cores available and give the read peer three physical cores.
  // Rejected: sharing the new read cores with the transmitter or verifier.
  const placementServer = readTuned ? { ...server,
    "gw-w": { ...server["gw-w"], cpus: "2,3,4", cores: 3 },
    "gw-r": { ...server["gw-r"], cpus: "5,6,11", cores: 3, ...readMemory, cache: 3072 }, ...bigTx,
  } : { ...server, "gw-r": { ...server["gw-r"], ...readMemory }, ...bigTx };
  /** @param {Role} role */
  const settings = (role) => {
    const placement = profile === "laptop" ? laptop[role] : placementServer[role];
    const limits = portable ? laptop[role] : placementServer[role];
    const selected = role === "tx" ? txJvm : role === "gw-w" ? writeJvm : readJvm;
    const major = selected === "j21-g1" ? "21" : "25";
    const collector = selected === "j25-zgc" ? "ZGC" :
      profile === "laptop" && limits.memory * scale < 1792 && selected === "j21-g1" ? "Serial" : "G1";
    const cache = role === "gw-r" ? readCacheMiB ?? limits.cache : limits.cache;
    const tuning = startup === "tuned" ? startupTuning[role] : undefined;
    const opts = [
      "-Xms" + (portable ? limits.initial : tuning?.initial ?? limits.initial) + "m",
      "-Xmx" + limits.heap * scale + "m",
      // [DX-JVM1] Why: budget compilation on the CPU each role already owns and keep full-tier code.
      // Rejected: forcing all methods through a single tier or giving the one-core reader more compiler threads.
      ...(tuning ? [
        "-Xshare:on", "-XX:TieredStopAtLevel=4", "-XX:CICompilerCount=" + tuning.compilers,
        "-XX:CompileThresholdScaling=" + tuning.threshold,
        "-XX:InitialCodeCacheSize=" + tuning.code + "m", "-XX:ReservedCodeCacheSize=240m",
      ] : []),
      "-XX:MaxDirectMemorySize=" + (role === "tx" || (largeRead && role === "gw-r") ? limits.direct : limits.heap * scale) + "m",
      ...(portable && role === "tx" ? ["-XX:MaxMetaspaceSize=160m"] : []),
      ...(cache !== null ? ["-Ddatomic.objectCacheMax=" + cache + "m"] : []),
      ...(!portable && role === "tx" ? ["-Ddatomic.prefetchProbes=true"] : []),
      ...(collector === "ZGC" ? collectorOptions(major, collector, role, placement.cores)
        : ["-XX:+Use" + collector + "GC"]),
    ];
    return {
      major, collector, cores: placement.cores,
      cpus: "cpus" in placement ? placement.cpus : null,
      memoryMiB: limits.memory * scale, cacheMiB: cache,
      flags: launchOptions(role, placement.cores, opts.join(" ")).split(" "),
    };
  };
  const pgSettings = {
    ...durablePostgres,
    ...(!portable ? {
      shared_buffers: "2GB", wal_sync_method: "fdatasync", checkpoint_timeout: "5min",
      checkpoint_completion_target: "0.9", checkpoint_flush_after: "256kB",
      // [DX-JVM1] Why: allow more WAL before a volume-requested checkpoint without changing durability.
      // Rejected: altering background flush timing and durability at the same time.
      min_wal_size: startup === "tuned" ? "512MB" : "80MB",
      max_wal_size: startup === "tuned" ? "4GB" : "1GB", log_checkpoints: "on", log_timezone: "UTC",
      track_io_timing: "on", track_wal_io_timing: "on",
    } : {}),
  };
  const policy = {
    profile, reduced, creditMode, tx: settings("tx"), "gw-w": settings("gw-w"), "gw-r": settings("gw-r"),
    pg: { memoryMiB: portable ? laptopCaps.pg * scale : 8192, cpus: "1", settings: pgSettings },
    index: { threshold: portable ? "8m" : "256m", max: portable ? "32m" : "1g" },
    clients: { senders: "9", readers: readTuned ? "10" : "10,11" },
  };
  assert(!server32 || roleMemoryMiB(policy) + hostHeadroomMiB <= server32HostMiB,
    "server-32 role caps and host headroom exceed a 96 GB machine");
  return policy;
}

// [DX-JVM1] Why: hold cores, durability and Datomic parameters fixed during the Java comparison.
// Rejected: treating extra heap as a collector gain. The fourth arm matches ZGC's allocation budget.
/** @param {string} arm */
export function part2Policy(arm) {
  assert(part2Arms.includes(arm));
  const javaMajor = arm === "j21-g1-writer2" ? "21" : "25";
  const collector = arm === "j25-zgc" ? "ZGC" : "G1";
  const large = arm === "j25-zgc" || arm === "j25-g1-zgc-memory";
  const cpus = { tx: "0,9,10", pg: "1", "gw-w": pooledWriterCpus, "gw-r": "4,8,11", sender: "3,6,7" };
  const memory = large
    ? { pg: 6144, tx: 14336, "gw-w": 8192, "gw-r": 9216 }
    : { pg: 6144, tx: 6144, "gw-w": 6144, "gw-r": 6144 };
  const maxHeap = large
    ? { tx: 10240, "gw-w": 6144, "gw-r": 7168 }
    : { tx: 5120, "gw-w": 4096, "gw-r": 4096 };
  const initialHeap = { tx: 256, "gw-w": 256, "gw-r": 256 };
  const softHeap = { tx: 8192, "gw-w": 4096, "gw-r": 5120 };
  const peers = { "gw-w": 1536, "gw-r": 1536 };
  const opts = Object.fromEntries(roles.map((role) => {
    const cores = cpus[role].split(",").length;
    return [role, [
      "-Xms" + initialHeap[role] + "m", "-Xmx" + maxHeap[role] + "m",
      "-XX:ActiveProcessorCount=" + cores,
      ...collectorOptions(javaMajor, collector, role, cores),
      ...(collector === "ZGC" ? ["-XX:SoftMaxHeapSize=" + softHeap[role] + "m"] : []),
      "-XX:MaxDirectMemorySize=256m",
      ...general,
      ...(role === "tx" ? [] : [
        "-Ddatomic.objectCacheMax=" + peers[role] + "m",
        "-Ddatomic.readConcurrency=8",
        "-Ddatomic.prefetchConcurrency=1",
        "-Ddatomic.prefetchProbes=true",
      ]),
    ]];
  }));
  return { platform: "server", arm, javaMajor, collector, cpus, memory, initialHeap, maxHeap, opts, peers,
    indexThreshold: 128, indexMax: 512, txObjectCache: 2560,
    txProperties: { "write-concurrency": 4, "read-concurrency": 8, "index-parallelism": 1,
      "heartbeat-interval-msec": 5000, "prefetch-concurrency": 1, "prefetch-probes": false } };
}
