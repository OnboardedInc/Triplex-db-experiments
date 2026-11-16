// @ts-nocheck -- [DX-T1-12] Why: standalone probe wire records use runtime validation; checkjs still checks every binding. Rejected: omit tracked probes from the source inventory.
// [COLD-1] Why: the part 10 disk sentinel, as a stand-alone arm: a 4 KB durable write every INTERVAL ms on the same guest disk.
// usage: node sentinel-write.mjs FILE INTERVAL_MS
import fs from "node:fs";
const fd = fs.openSync(process.argv[2], "w"), every = Number(process.argv[3] ?? 10), block = Buffer.alloc(4096, 3);
const sab = new Int32Array(new SharedArrayBuffer(4));
let n = 0; process.on("SIGTERM", () => { console.log(JSON.stringify({ sentinel: "write", writes: n })); process.exit(0); });
for (;;) { fs.writeSync(fd, block, 0, 4096, (n % 256) * 4096); fs.fsyncSync(fd); n++; Atomics.wait(sab, 0, 0, every); }
