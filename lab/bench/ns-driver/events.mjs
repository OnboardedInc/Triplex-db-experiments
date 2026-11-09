// [EXP-NSR] Why: only the driver owns HR output and run-key chunks; bind every chunk to the attempt and pins. Rejected: candidate-written summaries or overwriteable event files.
import fs from "node:fs";
import path from "node:path";
import { createHmac } from "node:crypto";
import { encode } from "./rpc.mjs";
import { clockDomain, now } from "./clock.mjs";
export class Events {
  constructor(dir, key, binding, chunkBytes = 65536) {
    if (
      !Buffer.isBuffer(key) ||
      key.length < 32 ||
      !binding.runId ||
      !binding.sourceSha256 ||
      !binding.inputsSha256 ||
      !binding.slot
    )
      throw Error("HR binding/key missing");
    // [EXP-NSR-R4] Why: the launcher checks freshness before granting write-only output. Rejected: making future output files readable by the driver.
    if (process.env.NSR_FRESH_OUTPUT !== dir || !process.permission) {
      fs.mkdirSync(dir, { recursive: true });
      if (fs.readdirSync(dir).length) throw Error("HR output not fresh");
    }
    this.dir = dir;
    this.key = key;
    this.binding = binding;
    this.limit = chunkBytes;
    this.domain = clockDomain();
    this.sequence = 0;
    this.previous = "0".repeat(64);
    this.rows = [];
    this.size = 0;
    this.closed = false;
  }
  write(kind, data) {
    if (this.closed) throw Error("HR sealed");
    const row = { kind, atNs: now(), domain: this.domain, data };
    const bytes = encode(row, 64 * 1024 * 1024);
    if (this.size + bytes.length > this.limit) this.flush();
    this.rows.push(row);
    this.size += bytes.length;
  }
  flush() {
    if (!this.rows.length) return;
    const body = {
      schema: "ns-hr/1",
      binding: this.binding,
      sequence: this.sequence,
      previous: this.previous,
      events: this.rows,
    };
    const hmac = createHmac("sha256", this.key).update(JSON.stringify(body)).digest("hex");
    fs.writeFileSync(
      path.join(this.dir, `${String(this.sequence).padStart(8, "0")}.json`),
      JSON.stringify({ ...body, hmac }) + "\n",
      { flag: "wx" },
    );
    this.previous = hmac;
    this.sequence++;
    this.rows = [];
    this.size = 0;
  }
  seal() {
    this.flush();
    this.closed = true;
    return { chunks: this.sequence, head: this.previous, binding: this.binding };
  }
}
