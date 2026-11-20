// [DX-JVM1] Why: compare one configuration on one SQL database, with a single-factor index and JIT sensitivity.
// Rejected: comparing collector arms owned by DX-TAIL1 or choosing heap sizes from the cgroup alone.
export const serverArms = ["present", "candidate", "index-threshold", "compiler-default"];

export function jvmPolicy(platform, arm) {
  if (!["mac", "server"].includes(platform) || !serverArms.includes(arm))
    throw new Error("Unknown DX-JVM1 platform or arm");
  const mac = platform === "mac";
  const candidate = arm !== "present";
  const compile = candidate && arm !== "compiler-default" ? "0.1" : "1";
  const cpus = mac
    ? { tx: "0", pg: "0", "gw-w": "1", "gw-r": "2", sender: null }
    : candidate
      ? { tx: "0,9,10", pg: "1,11", "gw-w": "2", "gw-r": "4,5,8", sender: "3,6,7" }
      : { tx: "0", pg: "1", "gw-w": "2", "gw-r": "4,8", sender: "3,6,7" };
  const memory = mac
    ? { tx: 1056, pg: 320, "gw-w": 1408, "gw-r": 768 }
    : { tx: 6144, pg: 6144, "gw-w": 6144, "gw-r": 6144 };
  const maxHeap = mac
    ? candidate
      ? { tx: 704, "gw-w": 896, "gw-r": 480 }
      : { tx: 704, "gw-w": 896, "gw-r": 416 }
    : candidate
      ? { tx: 4608, "gw-w": 3328, "gw-r": 3584 }
      : { tx: 5120, "gw-w": 4096, "gw-r": 4096 };
  const initialHeap = candidate
    ? mac
      ? { tx: 384, "gw-w": 256, "gw-r": 256 }
      : { tx: 3072, "gw-w": 768, "gw-r": 1536 }
    : { tx: 256, "gw-w": 256, "gw-r": 256 };
  const peers = mac ? { "gw-w": 32, "gw-r": 32 }
    : candidate ? { "gw-w": 1024, "gw-r": 1536 } : { "gw-w": 1536, "gw-r": 1536 };

  const opts = Object.fromEntries(["tx", "gw-w", "gw-r"].map((role) => {
    const cpu = cpus[role].split(",").length;
    const serial = role === "gw-w";
    const flags = ["-Xms" + initialHeap[role] + "m", "-Xmx" + maxHeap[role] + "m",
      serial ? "-XX:+UseSerialGC" : "-XX:+UseG1GC"];
    if (!serial) {
      const pause = candidate ? 35 : role === "tx" && mac ? 50 : 200;
      flags.push("-XX:MaxGCPauseMillis=" + pause);
    }
    if (candidate) {
      flags.push(
        "-XX:ActiveProcessorCount=" + cpu,
        "-XX:MaxDirectMemorySize=" + (mac ? 96 : 256) + "m",
        "-XX:+ExitOnOutOfMemoryError",
        !mac && role === "tx" ? "-XX:+AlwaysPreTouch" : "-XX:-AlwaysPreTouch",
        "-XX:-UseLargePages",
        "-XX:-UseTransparentHugePages",
        "-Xshare:auto",
        "-XX:+TieredCompilation",
        "-XX:CICompilerCount=2",
        "-XX:CompileThresholdScaling=" + compile,
        "-Ddatomic.txTimeoutMsec=10000",
      );
      if (serial) flags.push("-XX:NewRatio=2");
      else flags.push("-XX:ParallelGCThreads=" + cpu, "-XX:ConcGCThreads=1");
      if (role !== "tx") flags.push(
        "-Ddatomic.readConcurrency=8",
        "-Ddatomic.prefetchConcurrency=1",
        "-Ddatomic.prefetchProbes=" + (cpu >= 2),
      );
    }
    if (role !== "tx") flags.push("-Ddatomic.objectCacheMax=" + peers[role] + "m");
    return [role, flags];
  }));
  return {
    platform, arm, cpus, memory, initialHeap, maxHeap, opts, peers,
    indexThreshold: candidate && arm !== "index-threshold" ? 32 : mac ? 48 : 128,
    indexMax: mac ? 128 : 512,
    txObjectCache: mac ? 160 : candidate ? 2048 : 2560,
    txProperties: candidate ? {
      "write-concurrency": 4,
      "read-concurrency": 8,
      "index-parallelism": 1,
      "heartbeat-interval-msec": 5000,
      "prefetch-concurrency": 1,
      "prefetch-probes": false,
    } : {},
  };
}
