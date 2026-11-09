// [CX-VP2Q-4-R9] Why: verify retirement bytes really reached this attempt's log before calling unchanged pages a snapshot proof.
// Rejected: treating an ACK or unchanged result after a possible no-op as proof that masking was exercised.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const root = process.cwd(), base = path.join(root, "lab/verify/P2Q/evidence-round9"), started = Date.now();
const free = fs.statfsSync(root); assert(free.bavail * free.bsize >= 5 * 1024 ** 3);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const read = file => JSON.parse(fs.readFileSync(file, "utf8"));
const slot = () => {
  const locks = path.join(process.env.TX2_LOCKS_DIR ?? "/Users/sam/projects/triplex-db-2/lab/locks", "heavy");
  const owners = fs.readdirSync(locks).flatMap(index => {
    const file = path.join(locks, index, "owner.json"); if (!fs.existsSync(file)) return [];
    const bytes = fs.readFileSync(file), owner = JSON.parse(bytes);
    return owner.pid === process.ppid && owner.label === "CX-VP2Q-4-R9-log-readback" ? [{ file, owner, sha256: sha(bytes) }] : [];
  });
  assert.equal(owners.length, 1); return owners[0];
};
const owner = slot(), scriptSha256 = sha(fs.readFileSync(import.meta.filename));
const out = path.join(base, "retirement-readback"); fs.mkdirSync(out);
// [CX-VP2Q-4-R9] Why: parse the documented frame bytes without calling the product decoder; require the CRC chain and monotone LSNs.
// Rejected: searching a log for the retirement string (would accept torn or unrelated bytes).
const crc = (bytes, seed = 0) => {
  let value = (~seed) >>> 0;
  for (const byte of bytes) { value ^= byte; for (let bit = 0; bit < 8; bit++) value = ((value >>> 1) ^ ((value & 1) ? 0x82f63b78 : 0)) >>> 0; }
  return (~value) >>> 0;
};
assert.equal(crc(Buffer.from("123456789")), 0xe3069283);
const columns = ["id", "entity_id", "attribute", "value_type", "value_string", "value_number", "value_boolean", "value_datetime", "value_json", "recorded_at", "recorded_position", "valid_from", "valid_to", "created_by", "retracted_at", "retracted_position", "retract_tx_id", "entity_type", "schema_version", "tx_id"];
const parse = bytes => {
  assert.equal(bytes.subarray(0, 8).toString(), "TRPLXLG1"); assert.equal(bytes.readUInt32LE(8), 2);
  const header = Buffer.from(bytes.subarray(0, 32)), check = header.readUInt32LE(12); header.writeUInt32LE(0, 12);
  assert.equal(crc(header), check);
  let seed = crc(bytes.subarray(0, 32)), offset = 32, previous = Number(bytes.readBigUInt64LE(24)) - 1;
  const rows = [];
  while (offset < bytes.length) {
    if (bytes.subarray(offset).every(byte => byte === 0)) break;
    assert(offset + 36 <= bytes.length); assert.equal(bytes.readUInt32LE(offset), 0x464c5854);
    const length = bytes.readUInt32LE(offset + 4), lsn = Number(bytes.readBigUInt64LE(offset + 8)), end = offset + 32 + length;
    assert(lsn > previous); assert.equal(bytes.readUInt32LE(offset + 20), seed); assert(end + 4 <= bytes.length);
    const headerCrc = bytes.readUInt32LE(offset + 28); assert.equal(crc(bytes.subarray(offset, offset + 28), seed), headerCrc);
    const payload = bytes.subarray(offset + 32, end), tail = bytes.readUInt32LE(end); assert.equal(crc(payload, headerCrc), tail);
    if (bytes.readUInt16LE(offset + 24) === 1) for (const member of JSON.parse(payload).m) for (const cells of member.r) {
      assert.equal(cells.length, columns.length); rows.push({ lsn, row: Object.fromEntries(columns.map((key, index) => [key, cells[index]])) });
    }
    seed = tail; previous = lsn; offset = end + 4;
  }
  return rows;
};
const results = [];
for (const [kind, gate] of [["standard", "new-live-journal-retry"], ["fresh", "new-live"]]) {
  const receiptFile = path.join(base, gate, "receipt.json"), receipt = read(receiptFile);
  assert(receipt.fresh && receipt.sourceStillMatches && receipt.heavySlotStillMatches && receipt.finished <= started);
  assert.equal(sha(fs.readFileSync(path.join(base, gate, "command.log"))), receipt.logSha256);
  const vitestFile = path.join(base, gate, "vitest.json"), vitest = read(vitestFile);
  assert.equal(sha(fs.readFileSync(vitestFile)), receipt.resultSha256);
  assert(vitest.testResults.flatMap(suite => suite.assertionResults).some(test => test.status === "passed" && test.fullName.includes(`${kind} journal at an old cut`)));
  const caseFile = path.join(base, gate, "cases", `round8-${kind}-journal-immutable.json`), sample = read(caseFile);
  assert(fs.statSync(caseFile).mtimeMs >= receipt.started && fs.statSync(caseFile).mtimeMs <= receipt.finished);
  const before = JSON.parse(sample.before); assert.equal(before.transactions.length, 1); assert.equal(before.snapshotPosition, sample.first);
  for (const field of ["after", "transaction", "afterMetadata", "transactionAfterMetadata"]) assert.equal(sample[field], sample.before);
  const tx = before.transactions[0].txId, state = receipt.inputs.state; assert(state.endsWith(receipt.attempt));
  const matches = [];
  for (const entry of fs.readdirSync(state)) if (entry.startsWith("round8-journal-live-")) {
    const file = path.join(state, entry, "segment-000001.log"), bytes = fs.readFileSync(file), rows = parse(bytes).filter(item => item.row.entity_id === tx && item.row.attribute === ":_tx/position");
    if (rows.length) matches.push({ file, bytes, rows });
  }
  assert.equal(matches.length, 1); const { file, bytes, rows } = matches[0]; assert.equal(rows.length, 2);
  const [initial, retired] = rows; assert(initial.lsn < retired.lsn);
  for (const field of ["retracted_at", "retracted_position", "retract_tx_id"]) assert.equal(initial.row[field], null);
  assert.equal(initial.row.recorded_position, sample.first); assert.equal(initial.row.value_number, sample.first);
  assert.equal(retired.row.retract_tx_id, "internal-fixture-retirement"); assert(retired.row.retracted_at > initial.row.recorded_at);
  assert(retired.row.retracted_position > sample.first && retired.row.retracted_position >= retired.lsn * 1024 && retired.row.retracted_position < (retired.lsn + 1) * 1024);
  for (const field of columns.filter(key => !["retracted_at", "retracted_position", "retract_tx_id"].includes(key))) assert.deepEqual(retired.row[field], initial.row[field]);
  assert(fs.statSync(file).mtimeMs >= receipt.started && fs.statSync(file).mtimeMs <= receipt.finished);
  assert.equal(sha(fs.readFileSync(file)), sha(bytes)); fs.writeFileSync(path.join(out, `${kind}-segment.log`), bytes, { flag: "wx" });
  results.push({ kind, gate, producerAttempt: receipt.attempt, receiptSha256: sha(fs.readFileSync(receiptFile)), caseSha256: sha(fs.readFileSync(caseFile)), source: file, sourceSha256: sha(bytes), initial, retired, fullPagesIdentical: 4 });
}
assert.deepEqual(slot(), owner); assert.equal(sha(fs.readFileSync(import.meta.filename)), scriptSha256);
fs.writeFileSync(path.join(out, "readback.json"), JSON.stringify({ started, finished: Date.now(), heavySlot: owner, sourceScriptSha256: scriptSha256, results }, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ realRetirements: results.length, fullPagesIdentical: 8 }));
