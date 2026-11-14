import fs from "node:fs";
import { Option } from "effect";
import { serialize, deserialize } from "node:v8";
import { createHash } from "node:crypto";
import { Model, type Commit } from "./model.ts";
import type { Receipt } from "./composition.ts";

type Context = { run: string; source: string; slot: string; subjects: number };
type Entry =
  | { seq: number; kind: "receipt"; operations: readonly any[]; receipt: Receipt; actor?: string }
  | { seq: number; kind: "commit"; subject: number; commit: Commit };
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

// [DX-T1-7] Why: the independent expectation model is read only after drain; keep its receipt graph off the timed writer heap.
// Rejected: dropping observations, judging early, changing the acknowledgement timestamp, or weakening full-row comparison.
export class ModelJournal {
  private fd: number;
  private frames = 0;
  private bytes = 0;
  private digest = createHash("sha256");
  private sealed: { frames: number; bytes: number; sha256: string } | undefined;
  readonly file: string;
  readonly context: Context;
  constructor(file: string, context: Context) {
    if (
      !context.run ||
      !context.source ||
      !context.slot ||
      !Number.isSafeInteger(context.subjects) ||
      context.subjects < 1
    )
      throw Error("Invalid model journal identity");
    this.file = file;
    this.context = { ...context };
    this.fd = fs.openSync(file, "wx");
    this.write({ schema: "triplex.expected-model/1", ...this.context });
  }
  private write(value: unknown) {
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
    this.append({
      seq: this.frames,
      kind: "receipt",
      operations,
      receipt: receiptOptions(receipt, false),
      actor,
    });
  }
  addCommit(subject: number, commit: Commit) {
    this.append({ seq: this.frames, kind: "commit", subject, commit });
  }
  private append(entry: Entry) {
    if (this.sealed) throw Error("Model journal is sealed");
    this.write(entry);
    this.frames++;
  }
  seal() {
    if (!this.sealed) {
      fs.fsyncSync(this.fd);
      fs.closeSync(this.fd);
      this.sealed = { frames: this.frames, bytes: this.bytes, sha256: this.digest.digest("hex") };
      fs.writeFileSync(
        this.file + ".json",
        JSON.stringify({ ...this.context, ...this.sealed }) + "\n",
        { flag: "wx" },
      );
    }
    return { ...this.context, ...this.sealed, file: this.file };
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
        const row: Entry = frame();
        if (row.seq !== frames++) throw Error("Model journal sequence mismatch");
        if (row.kind === "receipt")
          model.bindReceipt(row.operations, receiptOptions(row.receipt, true), row.actor);
        else if (row.kind === "commit") model.addCommit(row.subject, row.commit);
        else throw Error("Unknown model journal entry");
      }
      if (frames !== seal.frames || digest.digest("hex") !== seal.sha256)
        throw Error("Model journal content mismatch");
      return { model, receipt: seal };
    } finally {
      fs.closeSync(fd);
    }
  }
}
