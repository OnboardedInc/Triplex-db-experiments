// [EXP-K01-R4] Why: Q83e needs actual stopped LOG bytes between distinct F and M, not a gauge-based guess. Rejected: calling every post-cut message maintenance (can hide application transactions).
import { createHash } from 'node:crypto';
const sha = b => createHash('sha256').update(b).digest('hex');
function fields(bytes) {
  let p = 0;
  function varint() {
    let n = 0n;
    for (let i = 0; i < 10 && p < bytes.length; i++) {
      const b = bytes[p++]; if (i === 9 && b > 1) throw new Error('protobuf varint exceeds 64 bits'); n |= BigInt(b & 127) << BigInt(7 * i);
      if (!(b & 128)) return n;
    }
    throw new Error('truncated or oversized protobuf varint');
  }
  const result = [];
  while (p < bytes.length) {
    const tag = varint(), number = Number(tag >> 3n), wire = Number(tag & 7n);
    if (number < 1) throw new Error('invalid protobuf field');
    let data;
    if (wire === 0) data = varint();
    else if (wire === 2) { const length = Number(varint()); if (!Number.isSafeInteger(length) || length > bytes.length - p) throw new Error('truncated protobuf body'); data = bytes.subarray(p, p + length); p += length; }
    else if (wire === 1 || wire === 5) { const length = wire === 1 ? 8 : 4; if (p + length > bytes.length) throw new Error('truncated protobuf scalar'); data = bytes.subarray(p, p + length); p += length; }
    else throw new Error('unsupported protobuf wire type');
    result.push({ number, wire, data });
  }
  return result;
}
export function sourceMessageKind(payload) {
  if (!payload.length) throw new Error('empty source message');
  if (payload[0] === 255) return 'Tx';
  if (payload[0] !== 3) throw new Error('unknown source message header');
  const top = fields(payload.subarray(1));
  if (top.length !== 1 || top[0].wire !== 2) throw new Error('ambiguous source message');
  const item = top[0];
  const kind = new Map([[1, 'FlushBlock'], [2, 'TriesAdded'], [3, 'AttachDatabase'], [4, 'DetachDatabase'], [6, 'Tx']]).get(item.number);
  if (!kind) throw new Error('unknown source message kind');
  const body = fields(item.data);
  if (kind === 'TriesAdded') for (const f of body) {
    if (!((f.number === 1 && f.wire === 2) || ([2, 3, 4].includes(f.number) && f.wire === 0))) throw new Error('unknown TriesAdded field');
    if (f.number === 1) fields(f.data);
  }
  return kind;
}
export function verifyMaintenanceTail(bytes, frontiers) {
  const { F, M, T } = frontiers ?? {};
  if (![F, M, T].every(v => Number.isSafeInteger(v) && v >= 0) || F > M) throw new Error('invalid F/M/T frontiers');
  const epochSize = 2 ** 48, epoch = Math.floor(F / epochSize);
  if (Math.floor(M / epochSize) !== epoch) throw new Error('source epoch changed');
  if (bytes.length > 16 * 1024 ** 2) throw new Error('maintenance tail exceeds bound');
  const frames = [];
  let p = 0;
  while (p < bytes.length) {
    const offset = F % epochSize + p, id = epoch * epochSize + offset;
    if (bytes.length - p < 21 || bytes[p] !== 30) throw new Error('invalid LocalLog frame separator/header');
    const size = bytes.readInt32BE(p + 1), end = p + 13 + size + 8;
    if (size < 1 || end > bytes.length) throw new Error('truncated LocalLog frame');
    if (bytes.readBigInt64BE(end - 8) !== BigInt(offset)) throw new Error('LocalLog offset trailer mismatch');
    if (id > M) throw new Error('stopped source tail advanced beyond M');
    const payload = bytes.subarray(p + 13, end - 8), kind = sourceMessageKind(payload);
    if (!frames.length && kind !== 'FlushBlock') throw new Error('F does not name the block cut');
    if (frames.length && kind !== 'TriesAdded') throw new Error(`non-maintenance ${kind} in (F,M]`);
    frames.push({ id, kind, bytes: end - p, sha256: sha(payload) });
    p = end;
  }
  if (!frames.length || frames.at(-1).id !== M) throw new Error('stopped source tail does not end at M');
  return { ok: true, frontiers: { F, M, T }, sourceTailSha256: sha(bytes), bytes: bytes.length, maintenanceMessages: frames.length - 1, frames };
}
