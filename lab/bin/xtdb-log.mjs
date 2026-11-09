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
// [EXP-K01-R5] Why: supported messages must decode under log.proto recursively, not just carry a family tag. Rejected: generic protobuf framing (accepts ignored cuts and malformed nested metadata).
const schemas = {
  FlushBlock: { 2: 'i64' }, TriesAdded: { 1: 'TrieDetails*', 2: 'i32', 3: 'i32', 4: 'i64' },
  TrieDetails: { 1: 'string', 2: 'string', 3: 'i64', 4: 'TrieMetadata', 5: 'state', 6: 'i64' },
  TrieMetadata: { 1: 'TemporalMetadata', 2: 'i64', 8: 'bytes' },
  TemporalMetadata: { 1: 'i64', 2: 'i64', 3: 'i64', 4: 'i64', 5: 'i64', 6: 'i64' },
  Tx: { 1: 'bytes', 2: 'i64', 3: 'string', 4: 'string', 5: 'bytes', 6: 'bytes' },
  AttachDatabase: { 1: 'string', 2: 'DatabaseConfig' }, DetachDatabase: { 1: 'string' },
  DatabaseConfig: { 1: 'InMemoryLog', 2: 'LocalLog', 3: 'Any', 4: 'InMemoryStorage', 5: 'LocalStorage', 6: 'RemoteStorage', 7: 'mode', 8: 'Any', 9: 'bool', 10: 'i32' },
  InMemoryLog: { 1: 'i32' }, LocalLog: { 1: 'string', 2: 'i32' }, InMemoryStorage: { 1: 'i32' }, LocalStorage: { 1: 'string', 2: 'i32' },
  RemoteStorage: { 1: 'Any', 2: 'i32' }, Any: { 1: 'string', 2: 'bytes' },
};
function validateBody(bytes, name) {
  const body = fields(bytes), seen = new Set();
  for (const f of body) {
    const declared = schemas[name][f.number], type = declared?.replace(/\*$/, '');
    if (!type || (seen.has(f.number) && !declared.endsWith('*'))) throw new Error(`unknown or duplicate ${name} field ${f.number}`);
    seen.add(f.number);
    const scalar = ['i64', 'i32', 'state', 'mode', 'bool'].includes(type);
    if (f.wire !== (scalar ? 0 : 2)) throw new Error(`invalid ${name} field wire type`);
    if (type === 'string') new TextDecoder('utf-8', { fatal: true }).decode(f.data);
    else if (type === 'state' && f.data > 2n || type === 'mode' && f.data > 1n || type === 'bool' && f.data > 1n) throw new Error(`unsupported ${name} enum/bool`);
    else if (type === 'i32' && f.data > 2147483647n && f.data < 18446744071562067968n) throw new Error(`out-of-range ${name} int32`);
    else if (!scalar && !['string', 'bytes'].includes(type)) validateBody(f.data, type);
  }
  if (name === 'FlushBlock' && !seen.has(2)) throw new Error('FlushBlock has no expected_block_idx');
  if (name === 'DatabaseConfig' && ([1,2,3].filter(n=>seen.has(n)).length > 1 || [4,5,6].filter(n=>seen.has(n)).length > 1)) throw new Error('ambiguous database config');
  return body;
}
function decodeSourceMessage(payload) {
  if (!payload.length) throw new Error('empty source message');
  // [EXP-K01-R5] Why: legacy transaction bodies are opaque application data and always refuse qualification. Rejected: relabeling an unsupported body as maintenance.
  if (payload[0] === 255) return { kind: 'Tx' };
  if (payload[0] !== 3) throw new Error('unknown source message header');
  const top = fields(payload.subarray(1));
  if (top.length !== 1 || top[0].wire !== 2) throw new Error('ambiguous source message');
  const item = top[0];
  const kind = new Map([[1, 'FlushBlock'], [2, 'TriesAdded'], [3, 'AttachDatabase'], [4, 'DetachDatabase'], [6, 'Tx']]).get(item.number);
  if (!kind) throw new Error('unknown source message kind');
  const body = validateBody(item.data, kind);
  const cutIndex = kind === 'FlushBlock' ? BigInt.asIntN(64, body.find(f=>f.number === 2).data) : undefined;
  if (cutIndex !== undefined && (cutIndex < 0n || cutIndex > BigInt(Number.MAX_SAFE_INTEGER))) throw new Error('invalid expected_block_idx');
  return { kind, ...(cutIndex === undefined ? {} : { cutIndex: Number(cutIndex) }) };
}
export const sourceMessageKind = payload => decodeSourceMessage(payload).kind;
// [EXP-K01-R6] Why: Missing frontiers are replaced only for destructuring into invalid values that immediately refuse; missing schema tags/types also refuse rather than inventing message content. Rejected: converting a failed observation into successful content.
export function verifyMaintenanceTail(bytes, frontiers, expectedCutIndex) {
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
    const payload = bytes.subarray(p + 13, end - 8), { kind, cutIndex } = decodeSourceMessage(payload);
    if (!frames.length && kind !== 'FlushBlock') throw new Error('F does not name the block cut');
    if (!frames.length && expectedCutIndex !== undefined && cutIndex !== expectedCutIndex) throw new Error('cut index differs from intended checkpoint');
    if (frames.length && kind !== 'TriesAdded') throw new Error(`non-maintenance ${kind} in (F,M]`);
    frames.push({ id, kind, ...(cutIndex === undefined ? {} : { cutIndex }), bytes: end - p, sha256: sha(payload) });
    p = end;
  }
  if (!frames.length || frames.at(-1).id !== M) throw new Error('stopped source tail does not end at M');
  return { ok: true, frontiers: { F, M, T }, sourceTailSha256: sha(bytes), bytes: bytes.length, maintenanceMessages: frames.length - 1, frames };
}
