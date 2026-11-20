const serial = ["-XX:+UseSerialGC"];
const g1 = [
  "-XX:+UseG1GC",
  "-XX:MaxGCPauseMillis=25",
  "-XX:G1HeapRegionSize=2m",
  "-XX:+UnlockExperimentalVMOptions",
  "-XX:G1NewSizePercent=5",
  "-XX:G1MaxNewSizePercent=25",
  "-XX:ConcGCThreads=1",
];

// [DX-TAIL1] Why: keep heap, storage and the other JVMs matched under the same offers.
// Rejected: changing the transactor collector or enlarging the ZGC container.
export const arms = Object.freeze({
  serial: { flags: serial, collector: "Serial", allocation: false },
  g1: { flags: g1, collector: "G1", allocation: false },
  "g1-2core": { flags: g1, collector: "G1", allocation: false, writerCores: 2 },
  zgc: {
    flags: ["-XX:+UseZGC", "-XX:+ZGenerational", "-XX:ConcGCThreads=1"],
    collector: "ZGC",
    allocation: false,
  },
  allocation: { flags: serial, collector: "Serial", allocation: true },
});
