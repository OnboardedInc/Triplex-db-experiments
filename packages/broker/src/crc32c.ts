/**
 * CRC32C (Castagnoli), slicing-by-8, seedable for chaining.
 *
 * Why not `zlib.crc32`: Node 22's built-in is CRC32 (IEEE), not CRC32C; R13 2.5 measured this JS
 * slicing-by-8 at about 1.2 GB/s, far above the few MB/s a QLever broker log carries.
 * Check value: crc32c("123456789") = 0xE3069283 (tested).
 */
const POLY = 0x82f63b78;
const TABLES = Array.from({ length: 8 }, () => new Uint32Array(256));
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ POLY : c >>> 1;
  TABLES[0]![n] = c >>> 0;
}
for (let n = 0; n < 256; n++) {
  let c = TABLES[0]![n]!;
  for (let k = 1; k < 8; k++) {
    c = TABLES[0]![c & 0xff]! ^ (c >>> 8);
    TABLES[k]![n] = c >>> 0;
  }
}

export const crc32c = (buf: Uint8Array, seed = 0, start = 0, end = buf.length): number => {
  const [t0, t1, t2, t3, t4, t5, t6, t7] = TABLES as [
    Uint32Array,
    Uint32Array,
    Uint32Array,
    Uint32Array,
    Uint32Array,
    Uint32Array,
    Uint32Array,
    Uint32Array,
  ];
  let c = ~seed >>> 0;
  let i = start;
  for (; i + 8 <= end; i += 8) {
    const lo = (buf[i]! | (buf[i + 1]! << 8) | (buf[i + 2]! << 16) | (buf[i + 3]! << 24)) ^ c;
    c =
      (t7[lo & 0xff]! ^
        t6[(lo >>> 8) & 0xff]! ^
        t5[(lo >>> 16) & 0xff]! ^
        t4[lo >>> 24]! ^
        t3[buf[i + 4]!]! ^
        t2[buf[i + 5]!]! ^
        t1[buf[i + 6]!]! ^
        t0[buf[i + 7]!]!) >>>
      0;
  }
  for (; i < end; i++) c = (t0[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8)) >>> 0;
  return ~c >>> 0;
};
