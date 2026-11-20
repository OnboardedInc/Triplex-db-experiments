import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import type { DeepIdentity } from "../../../bench/lib/deep-profile.ts";
import { R, type ReadRecord } from "../../../bench/lib/observe.ts";
import { RECORD_EVERY } from "./bounded-readers.ts";

// [DX-SCALE1] Why: persist every error and every hundredth judged observation after the complete in-memory comparison. Rejected: sampling before correctness, or certifying the write buffer without reading back the file.
export class BoundedReadEvidence {
  private fd?: number;
  private lines: string[] = [];
  private total = 0;
  private regular = 0;
  private errors = 0;
  private mismatches = 0;
  private bytes = 0;
  private hash = createHash("sha256");
  readonly file: string;
  constructor(file: string, identity: DeepIdentity) {
    this.file = file;
    this.fd = fs.openSync(file, "wx");
    this.lines.push(
      JSON.stringify({ format: "triplex.bounded-observations/1", identity, every: RECORD_EVERY }),
    );
  }
  private flush() {
    if (!this.lines.length) return;
    const data = Buffer.from(this.lines.join("\n") + "\n");
    for (let offset = 0; offset < data.length; ) {
      const written = fs.writeSync(this.fd!, data, offset, data.length - offset);
      assert(written > 0);
      offset += written;
    }
    this.bytes += data.length;
    this.hash.update(data);
    this.lines = [];
  }
  observe(index: number, observed: ReadRecord, kind: string) {
    assert.equal(this.total++, index);
    const selected = index % RECORD_EVERY === 0;
    if (kind === "error") {
      assert(observed[R.error]);
      this.errors++;
    } else if (kind !== "correct") this.mismatches++;
    if (selected) this.regular++;
    if (selected || kind !== "correct") {
      this.lines.push(JSON.stringify({ index, kind, observed }));
      if (this.lines.length >= 8192) this.flush();
    }
  }
  seal(judged: number) {
    assert.equal(judged, this.total);
    assert.equal(this.regular, Math.ceil(judged / RECORD_EVERY));
    this.flush();
    fs.fsyncSync(this.fd!);
    this.close();
    const sha256 = this.hash.digest("hex");
    const readback = createHash("sha256"),
      fd = fs.openSync(this.file, "r");
    const buffer = Buffer.allocUnsafe(1024 * 1024);
    let bytes = 0;
    try {
      for (let count; (count = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0; ) {
        readback.update(buffer.subarray(0, count));
        bytes += count;
      }
    } finally {
      fs.closeSync(fd);
    }
    assert(bytes === this.bytes && readback.digest("hex") === sha256);
    return {
      judged,
      regular: this.regular,
      errors: this.errors,
      mismatches: this.mismatches,
      bytes,
      sha256,
    };
  }
  close() {
    if (this.fd !== undefined) {
      fs.closeSync(this.fd);
      this.fd = undefined;
    }
  }
}
