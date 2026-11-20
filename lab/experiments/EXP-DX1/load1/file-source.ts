import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { bytes, fileSource, type Header, type Source } from "./export.ts";
import { sha, type Frame, type SnapshotData } from "./source.ts";

// [DX-LOAD1] Why: the export reader pins and hashes the actual SQLite snapshot. Each entity belongs to exactly one source group before parallel writes are allowed. Rejected: treating a mutable filename, a history export or a preflight on destination row counts as a disjointness proof.
export function sealedSnapshot(file: string, header: Header, namespace: string, width: number) {
  assert(header.mode === "snapshot" && /^acct\/[A-Za-z0-9_-]{1,64}\/$/.test(namespace));
  assert(Number.isSafeInteger(width) && width > 0 && width <= 2048);
  const { seal, ...meta } = header;
  assert.match(seal, /^[0-9a-f]{64}$/);
  const reader = fileSource(file, meta);
  try {
    assert.equal(reader.header.seal, seal, "Input export does not match expected seal");
    const owners = new DatabaseSync("");
    try {
      owners.exec("CREATE TABLE owners(e TEXT PRIMARY KEY); BEGIN");
      const put = owners.prepare("INSERT INTO owners VALUES(?)");
      for (let i = 0; i < header.groups; i++) {
        const { ops } = reader.group(i);
        assert(
          ops.length <= width && Buffer.byteLength(bytes(ops)) <= 2 * 2 ** 20,
          "Indivisible source group exceeds limit",
        );
        const entities = new Set<string>();
        for (const o of ops) {
          assert(o.op === "assert" && o.entityId.startsWith(namespace));
          entities.add(o.entityId);
        }
        for (const entity of entities) put.run(entity);
      }
      owners.exec("COMMIT");
    } finally {
      owners.close();
    }
    const data: SnapshotData = {
      seal: sha(bytes([reader.header, namespace, width])),
      groups: header.groups,
      namespace,
      validAt: header.validAt,
      batches: (first = 0) => batches(reader, width, first),
    };
    return { data, close: reader.close };
  } catch (e) {
    reader.close();
    throw e;
  }
}
function* batches(reader: Source, width: number, first: number): Generator<Frame, void> {
  let start = first,
    operations: Frame["operations"] = [],
    size = 0;
  for (let i = first; i < reader.header.groups; i++) {
    const group = reader.group(i),
      raw = group.ops.map((o) => {
        assert(o.op === "assert");
        const { ref, ...op } = o;
        return op;
      });
    const n = Buffer.byteLength(bytes(raw));
    if (operations.length && (operations.length + raw.length > width || size + n > 2 * 2 ** 20)) {
      yield { first: start, end: i, operations };
      operations = [];
      size = 0;
      start = i;
    }
    operations.push(...raw);
    size += n;
  }
  if (operations.length) yield { first: start, end: reader.header.groups, operations };
}
