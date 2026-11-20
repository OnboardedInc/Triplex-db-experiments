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

// [DX-JVM1] Why: hold cores, durability and Datomic parameters fixed during the Java comparison.
// Rejected: treating extra heap as a collector gain. The fourth arm matches ZGC's allocation budget.
/** @param {string} arm */
export function part2Policy(arm) {
  assert(part2Arms.includes(arm));
  const javaMajor = arm === "j21-g1-writer2" ? "21" : "25";
  const collector = arm === "j25-zgc" ? "ZGC" : "G1";
  const large = arm === "j25-zgc" || arm === "j25-g1-zgc-memory";
  const cpus = { tx: "0,9,10", pg: "1", "gw-w": "2,5", "gw-r": "4,8,11", sender: "3,6,7" };
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
