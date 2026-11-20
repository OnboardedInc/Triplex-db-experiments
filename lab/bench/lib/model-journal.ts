import fs from "node:fs";
import path from "node:path";
import { createGzip, createGunzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { Option } from "effect";
import { serialize, deserialize } from "node:v8";
import { createHash } from "node:crypto";
import { Model, type Commit } from "./model.ts";
import type { Receipt } from "./composition.ts";

export type JournalContext = Readonly<{
  run: string;
  source: string;
  slot: string;
  subjects: number;
}>;
export type JournalSeal = Readonly<{ frames: number; bytes: number; sha256: string }>;
export type JournalEntry =
  | { kind: "receipt"; operations: readonly any[]; receipt: Receipt; actor?: string }
  | { kind: "commit"; subject: number; commit: Commit };
const OPTION_FIELDS = [
  "validTo",
  "createdBy",
  "retractedAt",
  "entityType",
  "schemaVersion",
  "txId",
  "retractTxId",
] as const;
function receiptOptions(receipt: Receipt, restore: boolean): Receipt {
  // [DX-T1-7] Why: V8 preserves scalar/byte values but Effect Option tags live on prototypes, not own fields.
  // Rejected: naive serialize(receipt), which silently loses Some valid-time ends and actor metadata.
  return {
    ...receipt,
    triples: receipt.triples.map((t) => {
      const row: any = { ...t };
      for (const field of OPTION_FIELDS) {
        const option = row[field];
        if (option?._tag === "Some")
          row[field] = restore ? Option.some(option.value) : { _tag: "Some", value: option.value };
        else if (option?._tag === "None") row[field] = restore ? Option.none() : { _tag: "None" };
      }
      return row;
    }),
  };
}
const LIMIT = 128 * 1024 ** 2;

export function journalReceipt(
  operations: readonly any[],
  receipt: Receipt,
  actor?: string,
): JournalEntry {
  return { kind: "receipt", operations, receipt: receiptOptions(receipt, false), actor };
}

export function applyJournalEntry(model: Model, entry: JournalEntry) {
  if (entry.kind === "receipt") model.bindReceipt(entry.operations, receiptOptions(entry.receipt, true), entry.actor);
  else if (entry.kind === "commit") model.addCommit(entry.subject, entry.commit);
  else throw Error("Unknown model journal entry");
}

// [DX-T1-7] Why: the independent expectation model is read only after drain; keep its receipt graph off the timed writer heap.
// Rejected: dropping observations, judging early, changing the acknowledgement timestamp, or weakening full-row comparison.
export class ModelJournal {
  private fd: number | undefined;
  private frames = 0;
  private restored = false;
  private bytes = 0;
  private digest = createHash("sha256");
  private sealed: JournalSeal | undefined;
  readonly file: string;
  readonly context: JournalContext;
  constructor(file: string, context: JournalContext, seal?: JournalSeal) {
    if (
      !context.run ||
      !context.source ||
      !context.slot ||
      !Number.isSafeInteger(context.subjects) ||
      context.subjects < 1
    )
      throw Error("Invalid model journal identity");
    this.file = file;
    this.context = Object.freeze({ ...context });
    if (seal) this.sealed = seal;
    else {
      this.fd = fs.openSync(file, "wx");
      this.write({ schema: "triplex.expected-model/1", ...this.context });
    }
  }
  private write(value: unknown) {
    if (this.fd === undefined) throw Error("Model journal is closed");
    const body = serialize(value);
    if (body.length > LIMIT) throw Error("Model journal frame too large");
    const header = Buffer.allocUnsafe(4);
    header.writeUInt32LE(body.length);
    for (const bytes of [header, body]) {
      let offset = 0;
      while (offset < bytes.length) {
        const n = fs.writeSync(this.fd, bytes, offset, bytes.length - offset);
        if (n <= 0) throw Error("Model journal append made no progress");
        offset += n;
      }
      this.digest.update(bytes);
      this.bytes += bytes.length;
    }
  }
  bindReceipt(operations: readonly any[], receipt: Receipt, actor?: string) {
    this.append(journalReceipt(operations, receipt, actor));
  }
  addCommit(subject: number, commit: Commit) {
    this.append({ kind: "commit", subject, commit });
  }
  append(entry: JournalEntry) {
    if (this.sealed) throw Error("Model journal is sealed");
    this.write({ seq: this.frames, ...entry });
    this.frames++;
  }
  seal() {
    if (!this.sealed) {
      if (this.fd === undefined) throw Error("Model journal is closed");
      fs.fsyncSync(this.fd);
      fs.closeSync(this.fd);
      this.fd = undefined;
      // [DX-T1-7] Why: even a capture-manifest receipt must describe read-back bytes and immutable ownership.
      // Rejected: returning the hash of write buffers before checking the actual file content.
      const expected = this.digest.digest("hex"),
        observed = createHash("sha256");
      if (fs.statSync(this.file).size !== this.bytes)
        throw Error("Model journal seal length mismatch");
      const input = fs.openSync(this.file, "r"),
        block = Buffer.allocUnsafe(1024 * 1024);
      try {
        for (;;) {
          const count = fs.readSync(input, block, 0, block.length, null);
          if (!count) break;
          observed.update(block.subarray(0, count));
        }
      } finally {
        fs.closeSync(input);
      }
      if (observed.digest("hex") !== expected) throw Error("Model journal seal content mismatch");
      this.sealed = { frames: this.frames, bytes: this.bytes, sha256: expected };
      fs.writeFileSync(
        this.file + ".json",
        JSON.stringify({ ...this.context, ...this.sealed }) + "\n",
        { flag: "wx" },
      );
    }
    return { ...this.context, ...this.sealed, file: this.file };
  }
  async archive() {
    // [DX-T1-7] Why: retained journal bytes must stay recoverable without accumulating another full object-log copy per arm.
    // Rejected: deleting unchecked input or compressing on the measured acknowledgement path.
    if (!this.restored) throw Error("Verify model journal before archive");
    const seal = this.seal(),
      file = this.file + ".gz";
    await pipeline(
      fs.createReadStream(this.file),
      createGzip({ level: 9 }),
      fs.createWriteStream(file, { flags: "wx" }),
    );
    const hash = createHash("sha256");
    let bytes = 0;
    for await (const chunk of fs.createReadStream(file).pipe(createGunzip())) {
      hash.update(chunk);
      bytes += chunk.length;
    }
    if (hash.digest("hex") !== seal.sha256 || bytes !== seal.bytes)
      throw Error("Archived model journal content mismatch");
    const compressed = createHash("sha256");
    for await (const chunk of fs.createReadStream(file)) compressed.update(chunk);
    const archive = { file, bytes: fs.statSync(file).size, sha256: compressed.digest("hex") };
    const fd = fs.openSync(file, "r");
    try {
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    const metadata = this.file + ".archive.json";
    fs.writeFileSync(metadata, JSON.stringify({ ...seal, archive }) + "\n", { flag: "wx" });
    const meta = fs.openSync(metadata, "r");
    try {
      fs.fsyncSync(meta);
    } finally {
      fs.closeSync(meta);
    }
    const directory = fs.openSync(path.dirname(file), "r");
    try {
      fs.fsyncSync(directory);
      fs.unlinkSync(this.file);
      fs.fsyncSync(directory);
    } finally {
      fs.closeSync(directory);
    }
    return { ...seal, archive };
  }
  restore() {
    const seal = this.seal();
    const fd = fs.openSync(this.file, "r");
    const model = new Model(this.context.subjects),
      digest = createHash("sha256");
    let offset = 0,
      frames = 0;
    const read = (size: number) => {
      const b = Buffer.allocUnsafe(size);
      let used = 0;
      while (used < size) {
        const n = fs.readSync(fd, b, used, size - used, offset + used);
        if (!n) throw Error("Truncated model journal");
        used += n;
      }
      offset += size;
      digest.update(b);
      return b;
    };
    const frame = () => {
      const size = read(4).readUInt32LE();
      if (!size || size > LIMIT || offset + size > seal.bytes)
        throw Error("Invalid model journal frame");
      return deserialize(read(size));
    };
    try {
      if (fs.fstatSync(fd).size !== seal.bytes) throw Error("Model journal length mismatch");
      const header = frame();
      if (
        JSON.stringify(header) !==
        JSON.stringify({ schema: "triplex.expected-model/1", ...this.context })
      )
        throw Error("Model journal identity mismatch");
      while (offset < seal.bytes) {
        const row: JournalEntry & { seq: number } = frame();
        if (row.seq !== frames++) throw Error("Model journal sequence mismatch");
        applyJournalEntry(model, row);
      }
      if (frames !== seal.frames || digest.digest("hex") !== seal.sha256)
        throw Error("Model journal content mismatch");
      this.restored = true;
      return { model, receipt: seal };
    } finally {
      fs.closeSync(fd);
    }
  }
}
