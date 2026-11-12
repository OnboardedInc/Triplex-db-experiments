import type { TripleValue } from "@triplex-build/triplex";
import type { SweepRow } from "../sweepRows.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
export const REPLICA_ROW_WIDTH = 56;
const WIDTH = REPLICA_ROW_WIDTH;
export interface ReplicaRow extends SweepRow {
  readonly publicMetadata?: {
    recordedAt: number;
    createdBy: string | null;
    entityType: string | null;
    schemaVersion: number | null;
    txId: string | null;
  };
}
// [DX-R1] Why: a tagged JSON tree preserves signed zero without colliding with user object keys.
// Rejected: JSON.stringify alone (silently canonicalizes -0).
const tag = (v: any): any =>
  typeof v === "number"
    ? ["n", Object.is(v, -0) ? "-0" : String(v)]
    : Array.isArray(v)
      ? ["a", v.map(tag)]
      : v !== null && typeof v === "object"
        ? ["o", Object.entries(v).map(([k, x]) => [k, tag(x)])]
        : ["v", v];
const untag = ([t, v]: any): any =>
  t === "n"
    ? Number(v)
    : t === "a"
      ? v.map(untag)
      : t === "o"
        ? Object.fromEntries(v.map(([k, x]: any) => [k, untag(x)]))
        : v;

export interface PackedEntity {
  readonly revision: number;
  readonly buffer: SharedArrayBuffer;
  readonly offset?: number;
  readonly byteLength?: number;
}
export function packEntity(revision: number, rows: readonly ReplicaRow[]): PackedEntity {
  const dictionary: string[] = [],
    ids = new Map<string, number>();
  const intern = (s: string) => {
    let n = ids.get(s);
    if (n === undefined) {
      n = dictionary.length;
      ids.set(s, n);
      dictionary.push(s);
    }
    return n;
  };
  const values = rows.map((r) => {
    const v = r.value;
    return [
      intern(r.id),
      intern(r.attribute),
      intern(v.type),
      v.type === "blob"
        ? intern(JSON.stringify(tag(v)))
        : v.type === "json"
          ? intern(JSON.stringify(tag(v.value)))
          : typeof v.value === "string"
            ? intern(v.value)
            : 0,
      // [DX-R3] Why: fixed metadata slots avoid repeating field names and object tags in every entity dictionary.
      // Rejected: tagged metadata objects (almost doubled the recorded copy's packed bytes).
      intern(
        JSON.stringify(
          r.publicMetadata
            ? [
                tag(r.publicMetadata.recordedAt),
                r.publicMetadata.createdBy,
                r.publicMetadata.entityType,
                r.publicMetadata.schemaVersion === null
                  ? null
                  : tag(r.publicMetadata.schemaVersion),
                r.publicMetadata.txId,
              ]
            : null,
        ),
      ),
    ];
  });
  // [DX-R1] Why: UTF-8 JSON dictionary preserves lone UTF-16 surrogates as escapes and interns repeated attributes.
  // Rejected: raw UTF-8 strings (replace lone surrogates), objects per retained row (heap expansion).
  const bytes = encoder.encode(JSON.stringify(dictionary));
  const start = Math.ceil((8 + bytes.length) / 8) * 8;
  const buffer = new SharedArrayBuffer(start + rows.length * WIDTH),
    view = new DataView(buffer);
  view.setUint32(0, bytes.length, true);
  view.setUint32(4, rows.length, true);
  new Uint8Array(buffer, 8, bytes.length).set(bytes);
  rows.forEach((r, i) => {
    const o = start + i * WIDTH;
    values[i]!.slice(0, 4).forEach((n, j) => view.setUint32(o + j * 4, n, true));
    view.setUint32(o + 48, values[i]![4]!, true);
    view.setFloat64(o + 16, r.position, true);
    view.setFloat64(o + 24, r.validFrom, true);
    view.setFloat64(o + 32, r.validTo ?? Infinity, true);
    view.setFloat64(
      o + 40,
      typeof r.value.value === "number" ? r.value.value : r.value.value === true ? 1 : 0,
      true,
    );
  });
  return { revision, buffer };
}
export function unpackEntity(
  entityId: string,
  packed: PackedEntity,
  validAt: number,
  includeMetadata = false,
  includeInvisible = false,
  memo?: Map<string, ReplicaRow>,
): ReplicaRow[] {
  const view = new DataView(packed.buffer, packed.offset ?? 0, packed.byteLength),
    length = view.getUint32(0, true);
  const dictionary: string[] = JSON.parse(
    decoder.decode(new Uint8Array(packed.buffer, (packed.offset ?? 0) + 8, length)),
  );
  const start = Math.ceil((8 + length) / 8) * 8,
    rows: ReplicaRow[] = [];
  for (let i = 0; i < view.getUint32(4, true); i++) {
    const o = start + i * WIDTH,
      from = view.getFloat64(o + 24, true),
      to = view.getFloat64(o + 32, true);
    if (!includeInvisible && (from > validAt || to <= validAt)) continue;
    const type = dictionary[view.getUint32(o + 8, true)]!;
    const text = dictionary[view.getUint32(o + 12, true)]!;
    const numeric = view.getFloat64(o + 40, true);
    // [DX-R3-P8] Why: reuse only when every encoded input to the decoded row is byte-identical.
    // Rejected: assertion IDs/revisions or ordinary numeric JSON keys (miss metadata edits and signed zero).
    const key = memo ? JSON.stringify([includeMetadata, entityId,
      dictionary[view.getUint32(o, true)], dictionary[view.getUint32(o + 4, true)], type,
      type === "number" || type === "datetime" || type === "boolean" ? null : text,
      ...[16, 24, 32, 40].map(offset => view.getBigUint64(o + offset, true).toString(16)),
      dictionary[view.getUint32(o + 48, true)]]) : undefined;
    const remembered = key === undefined ? undefined : memo!.get(key);
    if (remembered) { rows.push(remembered); continue; }
    const value =
      type === "blob"
        ? (untag(JSON.parse(text)) as TripleValue)
        : ({
            type,
            value:
              type === "json"
                ? untag(JSON.parse(text))
                : type === "number" || type === "datetime"
                  ? numeric
                  : type === "boolean"
                    ? numeric === 1
                    : text,
          } as TripleValue);
    const metadata = JSON.parse(dictionary[view.getUint32(o + 48, true)]!);
    const publicMetadata =
      metadata === null
        ? null
        : {
            recordedAt: untag(metadata[0]),
            createdBy: metadata[1],
            entityType: metadata[2],
            schemaVersion: metadata[3] === null ? null : untag(metadata[3]),
            txId: metadata[4],
          };
    const row: ReplicaRow = {
      ...(!includeMetadata || publicMetadata === null ? {} : { publicMetadata }),
      id: dictionary[view.getUint32(o, true)]!,
      entityId,
      attribute: dictionary[view.getUint32(o + 4, true)]!,
      value,
      position: view.getFloat64(o + 16, true),
      validFrom: from,
      ...(to === Infinity ? {} : { validTo: to }),
    };
    rows.push(row);
    if (key !== undefined) memo!.set(key, row);
  }
  return rows;
}
