import { measuredWriterG1 } from "../jvm1/launch.mjs";

const serial = ["-XX:+UseSerialGC"];
// [DX-TAIL1] Why: keep heap, storage and the other JVMs matched under the same offers.
// Rejected: changing the transactor collector or enlarging the ZGC container.
export const arms = Object.freeze({
  serial: { flags: serial, collector: "Serial", allocation: false },
  g1: { flags: measuredWriterG1, collector: "G1", allocation: false },
  "g1-2core": { flags: measuredWriterG1, collector: "G1", allocation: false, writerCores: 2 },
  zgc: {
    flags: ["-XX:+UseZGC", "-XX:+ZGenerational", "-XX:ConcGCThreads=1"],
    collector: "ZGC",
    allocation: false,
  },
  allocation: { flags: serial, collector: "Serial", allocation: true },
});
