import { createHash } from "node:crypto";
import fs from "node:fs";

const outputFields = [
  "format", "oracle", "caseId", "caseSha256", "verdict", "divergedAtCommand",
  "receiptConsistency", "commandOutcomes", "state", "queries", "rulesInEffect",
] as const;
const comparisonFields = new Set([
  "format", "oracle", "caseId", "caseSha256", "verdict", "divergedAtCommand", "receiptConsistency", "queries",
]);
const maxComparisonBytes = 64 * 1024 ** 2;

function readAt(fd: number, buffer: Buffer, position: number) {
  let filled = 0;
  while (filled < buffer.length) {
    const n = fs.readSync(fd, buffer, filled, buffer.length - filled, position + filled);
    if (!n) throw Error("Truncated O-REPLAY output");
    filled += n;
  }
  return buffer;
}

// [DX-T1-15] Why: project the checked fields from the frozen one-space, ASCII oracle envelope.
// The full report is retained and its transferred bytes are verified by the bridge.
// Rejected: a JS string for the 1.4-GiB state, or trimming commands, receipts or queries in the independent oracle.
export function readBoundedOracleEnvelope(file: string) {
  const fd = fs.openSync(file, "r");
  try {
    const size = fs.fstatSync(fd).size;
    if (
      size < 4 || readAt(fd, Buffer.alloc(1), 0).toString() !== "{" ||
      readAt(fd, Buffer.alloc(3), size - 3).toString() !== "\n}\n"
    )
      throw Error("Unexpected O-REPLAY output framing");
    const stride = 1024 ** 2, lookahead = 80;
    const buffer = Buffer.allocUnsafe(stride + lookahead);
    const marker = Buffer.from('\n "');
    const located: { name: string; start: number; value: number }[] = [];
    for (let offset = 0; offset < size; offset += stride) {
      const block = readAt(fd, buffer.subarray(0, Math.min(buffer.length, size - offset)), offset);
      for (let i = block.indexOf(marker); i >= 0 && i < stride; i = block.indexOf(marker, i + 1)) {
        // Only outer object keys have one leading space in the pinned emitter.
        const key = /^\n "([A-Za-z][A-Za-z0-9]*)": /.exec(
          block.toString("ascii", i, Math.min(i + lookahead, block.length)),
        );
        if (!key || key[1] !== outputFields[located.length])
          throw Error("Unexpected O-REPLAY output field");
        located.push({ name: key[1], start: offset + i, value: offset + i + key[0].length });
      }
    }
    if (located.length !== outputFields.length || located[0]?.start !== 1)
      throw Error("Incomplete O-REPLAY output envelope");
    const out: Record<string, unknown> = {};
    let selected = 0;
    for (let i = 0; i < located.length; i++) {
      const field = located[i]!, next = located[i + 1];
      const end = next ? next.start - 1 : size - 3;
      const length = end - field.value;
      if (length < 1 || next && readAt(fd, Buffer.alloc(1), end).toString("ascii") !== ",")
        throw Error("Missing O-REPLAY output separator");
      if (comparisonFields.has(field.name)) {
        selected += length;
        if (selected > maxComparisonBytes) throw Error("O-REPLAY comparison fields exceed budget");
        out[field.name] = JSON.parse(readAt(fd, Buffer.allocUnsafe(length), field.value).toString("utf8"));
      } else {
        const edges = readAt(fd, Buffer.alloc(1), field.value).toString("ascii") +
          readAt(fd, Buffer.alloc(1), end - 1).toString("ascii");
        const expected = field.name === "commandOutcomes" || field.name === "state" ? "[]" : "{}";
        if (edges !== expected) throw Error("Unexpected O-REPLAY output value framing");
      }
    }
    if (fs.fstatSync(fd).size !== size) throw Error("O-REPLAY output changed during readback");
    return out;
  } finally {
    fs.closeSync(fd);
  }
}

export function readOracleOutput(file: string) {
  return fs.statSync(file).size <= 32 * 1024 ** 2 ?
    JSON.parse(fs.readFileSync(file, "utf8")) : readBoundedOracleEnvelope(file);
}

// [DX-R3-P8] Why: successful comparison needs this attempt's complete oracle query set and exact input preimage.
// Rejected: exit zero or an old expected file certifying missing, duplicated or differently bound queries.
export function requireOracleBinding(out: any, input: string, caseDoc: any) {
  if (
    out.format !== "triplex-db-2/o-replay-expected/1" ||
    out.caseId !== caseDoc.caseId ||
    out.caseSha256 !== createHash("sha256").update(input).digest("hex") ||
    !Array.isArray(out.queries)
  )
    throw Error("O-REPLAY output is not bound to this exact case");
  const wanted = new Map(caseDoc.queries.map((q: any) => [q.id, q.kind]));
  if (wanted.size !== caseDoc.queries.length || out.queries.length !== wanted.size)
    throw Error("O-REPLAY query coverage differs");
  for (const query of out.queries) {
    if (
      !wanted.has(query.id) ||
      wanted.get(query.id) !== query.kind ||
      !Array.isArray(query.result?.raw)
    )
      throw Error("O-REPLAY query identity, kind or rows differ");
    wanted.delete(query.id);
  }
  if (wanted.size) throw Error("O-REPLAY query coverage incomplete");
}
