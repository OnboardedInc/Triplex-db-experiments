import { Buffer } from "node:buffer";
import type { PackedEntity } from "./packed.js";
// [DX-R3-P8] Why: every worker validates every predecessor byte; native comparison avoids a JS callback per byte.
// Rejected: revision/identity-only admission (does not prove content), or copying slabs into new buffers.
export function equalPackedBytes(a: PackedEntity, b: PackedEntity): boolean {
  const x = slice(a),
    y = slice(b);
  return x.length === y.length && Buffer.compare(x, y) === 0;
}

function slice(entity: PackedEntity): Buffer {
  const offset = entity.offset ?? 0,
    length = entity.byteLength ?? entity.buffer.byteLength;
  // [DX-R3-P8] Why: Buffer.from clamps negative lengths, unlike a packed slice. Rejected: certifying malformed slices as empty.
  if (
    !Number.isSafeInteger(offset) ||
    !Number.isSafeInteger(length) ||
    offset < 0 ||
    length < 0 ||
    offset + length > entity.buffer.byteLength
  )
    throw new RangeError("Invalid packed predecessor slice");
  return Buffer.from(entity.buffer, offset, length);
}
