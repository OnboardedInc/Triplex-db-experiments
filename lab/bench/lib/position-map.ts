/** [EXP-P5B-R2] Why: Q101a binds logical W0 prefixes to sparse physical receipt positions.
 * Rejected: subtracting a constant or interpolating gaps (group widths and restarts vary).
 */
import fs from "node:fs";
import { createHash } from "node:crypto";
import { canonical } from "./w0-world.ts";
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
export const EMPTY_MAP_HASH = digest("EXP-P5B-Q101a/1");
export type MapEntry = readonly [reference: number, native: number, contentSha256: string];
export class PositionMap {
  private entries: MapEntry[] = [];
  private inverse = new Map<number, number>();
  private hash = EMPTY_MAP_HASH;
  private prefixes: string[] = [];
  private seedHash: string | undefined;
  get size() {
    return this.entries.length;
  }
  get sha256() {
    return this.hash;
  }
  get binding() {
    return { mapHash: this.hash, seedMapHash: this.seedHash ?? null, references: this.size };
  }
  append(reference: number, native: number, submitted: unknown, observed: unknown) {
    const expected = canonical(submitted),
      actual = canonical(observed);
    if (expected !== actual) throw Error("position map command readback bytes differ");
    return this.appendDigest([reference, native, digest(expected)]);
  }
  private appendDigest(entry: MapEntry) {
    const [reference, native, hash] = entry;
    if (
      reference !== this.size + 1 ||
      !Number.isSafeInteger(native) ||
      native <= (this.entries.at(-1)?.[1] ?? 0) ||
      !/^[a-f0-9]{64}$/.test(hash)
    )
      throw Error(
        "position map reference gap, non-increasing native position or invalid content hash",
      );
    const frozen = Object.freeze([...entry]) as MapEntry;
    this.entries.push(frozen);
    this.inverse.set(native, reference);
    this.hash = digest(this.hash + "\n" + canonical(frozen));
    this.prefixes.push(this.hash);
    return this.binding;
  }
  prefixHash(reference: number) {
    this.native(reference);
    return reference === 0 ? EMPTY_MAP_HASH : this.prefixes[reference - 1]!;
  }
  verifyContent(reference: number, content: unknown) {
    this.native(reference);
    if (digest(canonical(content)) !== this.entries[reference - 1]![2])
      throw Error("position map command content changed");
  }
  native(reference: number): number {
    if (reference === 0) return 0;
    if (!Number.isSafeInteger(reference) || reference < 1 || reference > this.size)
      throw Error("unmapped reference position");
    return this.entries[reference - 1]![1];
  }
  reference(native: number): number {
    if (native === 0) return 0;
    const found = this.inverse.get(native);
    if (found === undefined) throw Error("unmapped native receipt position");
    return found;
  }
  /** Prefix cursors can land in a known native ordinal gap; assertions/receipts always use exact reference(). */
  referenceCut(native: number): number {
    if (!Number.isSafeInteger(native) || native < 0 || native > this.native(this.size))
      throw Error("unresolved native prefix");
    let lo = 0,
      hi = this.size;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (this.native(mid) <= native) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }
  sealSeed() {
    this.seedHash = this.hash;
    return this.binding;
  }
  save(file: string) {
    fs.writeFileSync(
      file,
      canonical({
        format: "EXP-P5B-Q101a/1",
        entries: this.entries,
        sha256: this.hash,
        seedMapHash: this.seedHash ?? null,
      }) + "\n",
      { flag: "wx" },
    );
    return this.hash;
  }
  static load(file: string, boundHash: string) {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    if (data.format !== "EXP-P5B-Q101a/1" || !Array.isArray(data.entries))
      throw Error("invalid position map file");
    const result = new PositionMap();
    for (const entry of data.entries) result.appendDigest(entry);
    if (
      result.sha256 !== boundHash ||
      data.sha256 !== boundHash ||
      (data.seedMapHash !== null && data.seedMapHash !== boundHash)
    )
      throw Error("position map hash mismatch");
    if (data.seedMapHash !== null) result.sealSeed();
    return result;
  }
}
