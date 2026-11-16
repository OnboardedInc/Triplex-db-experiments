import fs from "node:fs";

// [DX-T1-12] Why: a lossless v3 observation log must fail before exhausting the host, including atomic-write scratch space.
// Rejected: dropping rows, deleting incomplete evidence, or treating the numeric tuple estimate as total disk use.
export class SpillBudget {
  private sizes = new Map<string, number>();
  private used = 0;
  peakBytes = 0;
  readonly maxBytes: number;
  constructor(maxBytes: number) {
    if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0)
      throw Error("Invalid observation spill byte limit");
    this.maxBytes = maxBytes;
  }
  get bytes() {
    return this.used;
  }
  private check(added: number) {
    const peak = this.used + added;
    if (peak > this.maxBytes)
      throw Error(
        `Lossless observation spill limit exceeded: ${peak} > ${this.maxBytes}; retained checkpoint is incomplete evidence, never a verdict`,
      );
    this.peakBytes = Math.max(this.peakBytes, peak);
  }
  replace(file: string, data: string | Uint8Array) {
    const size = typeof data === "string" ? Buffer.byteLength(data) : data.byteLength;
    this.check(size);
    fs.writeFileSync(file + ".tmp", data, { flag: "wx" });
    fs.renameSync(file + ".tmp", file);
    this.used += size - (this.sizes.get(file) ?? 0);
    this.sizes.set(file, size);
  }
  append(file: string, data: string) {
    const size = Buffer.byteLength(data);
    this.check(size);
    fs.writeFileSync(file, data, { flag: this.sizes.has(file) ? "a" : "wx" });
    this.used += size;
    this.sizes.set(file, (this.sizes.get(file) ?? 0) + size);
  }
}
