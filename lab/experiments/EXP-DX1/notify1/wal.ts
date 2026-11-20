import assert from "node:assert/strict";
import fs from "node:fs";
import { endianness } from "node:os";

function read(file: string, length: number, offset = 0) {
  const fd = fs.openSync(file, "r"),
    data = Buffer.alloc(length);
  try {
    assert.equal(fs.readSync(fd, data, 0, length, offset), length);
    return data;
  } finally {
    fs.closeSync(fd);
  }
}
export function walCut(file: string) {
  // [DX-STG1] Why: SQLite's WalIndexHdr names its last committed frame even when the WAL reuses space. Bind both header copies, salts, terminal checksum and the commit marker. Rejected: subtracting file lengths after an automatic checkpoint.
  const shm = read(file + "-shm", 96),
    big = endianness() === "BE";
  assert(shm.subarray(0, 48).equals(shm.subarray(48, 96)) && shm[12] === 1);
  const u32 = (i: number) => (big ? shm.readUInt32BE(i) : shm.readUInt32LE(i));
  assert.equal(u32(0), 3007000);
  const frames = u32(16),
    change = u32(8),
    salt = shm.subarray(32, 40).toString("hex");
  const hdr = read(file + "-wal", 32),
    page = hdr.readUInt32BE(8),
    size = page + 24;
  assert(
    [0x377f0682, 0x377f0683].includes(hdr.readUInt32BE(0)) &&
      page >= 512 &&
      page <= 65536 &&
      (page & (page - 1)) === 0,
  );
  assert(hdr.subarray(16, 24).equals(shm.subarray(32, 40)) && frames > 0);
  const end = read(file + "-wal", 24, 32 + (frames - 1) * size);
  assert(end.readUInt32BE(4) > 0 && end.subarray(8, 16).equals(shm.subarray(32, 40)));
  assert(end.readUInt32BE(16) === u32(24) && end.readUInt32BE(20) === u32(28));
  return { frames, change, salt, size };
}
export function appendedWal(before: ReturnType<typeof walCut>, after: ReturnType<typeof walCut>) {
  assert(
    before.size === after.size && (after.change - before.change) >>> 0 === 1,
    "Recipient had another SQLite writer",
  );
  const reset = before.salt !== after.salt;
  const frames = after.frames - (reset ? 0 : before.frames);
  assert(frames > 0);
  return { frames, bytes: frames * after.size + (reset ? 32 : 0), reset };
}
