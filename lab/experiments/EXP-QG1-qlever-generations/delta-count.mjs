import fs from "node:fs";
// [EXP-QG1] Why: decode only the pinned v1 envelope to count inserted/deleted IDs,
// not local-vocab pointer values. Rejected: live COUNT minus base (misses tombstones).
// Source: QLever v0.6.0 util/Serializer/TripleSerializer.h:34-211, DeltaTriples.cpp:648-670.
export function deltaCount(file) {
  const b = Buffer.isBuffer(file) ? file : fs.readFileSync(file);
  let at = 0;
  const u64 = () => {
    if (at + 8 > b.length) throw Error("truncated u64");
    const n = Number(b.readBigUInt64LE(at));
    at += 8;
    if (!Number.isSafeInteger(n)) throw Error("unsafe length");
    return n;
  };
  const skip = (n) => {
    at += n;
    if (at > b.length) throw Error("truncated body");
  };
  if (b.subarray(0, 13).toString() !== "QLEVER.UPDATE" || b.readUInt16LE(13) !== 1)
    throw Error("unsupported envelope");
  at = 15;
  if (u64() !== 0) throw Error("blank-node blocks unsupported; refuse rather than guess layout");
  const words = u64();
  for (let i = 0; i < words; i++) {
    skip(8);
    const n = u64();
    skip(n);
  }
  if (u64() !== 2) throw Error("expected delete and insert vectors");
  const counts = [];
  for (let i = 0; i < 2; i++) {
    const n = u64();
    if (n % 4) throw Error("incomplete quad");
    counts.push(n / 4);
    skip(n * 8);
  }
  if (at !== b.length) throw Error("trailing bytes");
  return {
    deleted: counts[0],
    inserted: counts[1],
    total: counts[0] + counts[1],
    words,
    bytes: b.length,
  };
}
if (process.argv[1] === import.meta.filename)
  console.log(JSON.stringify(deltaCount(process.argv[2])));
