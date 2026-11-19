import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileHash } from "./measurements.ts";

const done = (child: ReturnType<typeof spawn>) =>
  new Promise<void>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) =>
      code === 0 ? resolve() : reject(Error(`zstd exit ${code}/${signal}`)),
    );
  });
// [DX-SCALE1] Why: keep raw traces losslessly compressed after the exact stack has drained. Rejected: discarding a raw file on compressor exit alone or deleting the control's baseline inputs.
export async function compressTraces(directory: string) {
  const seals: {
    file: string;
    bytes: number;
    sha256: string;
    compressedBytes: number;
    compressedSha256: string;
  }[] = [];
  if (!fs.existsSync(directory)) return seals;
  for (const rel of fs.readdirSync(directory, { recursive: true, encoding: "utf8" }).sort()) {
    const file = path.join(directory, rel),
      before = fs.lstatSync(file);
    if (!before.isFile() || !/(\.jsonl|\.jfr|\.log)$/.test(file)) continue;
    const hash = await fileHash(file),
      target = file + ".zst",
      temporary = target + ".partial";
    assert(!fs.existsSync(target) && !fs.existsSync(temporary));
    const compression = spawn("zstd", ["-q", "-1", "-o", temporary, file], {
      stdio: ["ignore", "ignore", "inherit"],
    });
    await done(compression);
    const decoder = spawn("zstd", ["-qdc", temporary], { stdio: ["ignore", "pipe", "inherit"] });
    const end = done(decoder);
    void end.catch(() => {});
    let bytes = 0;
    const decoded = createHash("sha256");
    for await (const chunk of decoder.stdout) {
      bytes += chunk.length;
      decoded.update(chunk);
    }
    await end;
    assert.equal(bytes, before.size);
    assert.equal(decoded.digest("hex"), hash);
    const after = fs.lstatSync(file);
    assert(
      after.ino === before.ino &&
        after.dev === before.dev &&
        after.size === before.size &&
        after.mtimeMs === before.mtimeMs,
    );
    fs.renameSync(temporary, target);
    const fd = fs.openSync(target, "r");
    try {
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.unlinkSync(file);
    seals.push({
      file: rel,
      bytes,
      sha256: hash,
      compressedBytes: fs.statSync(target).size,
      compressedSha256: await fileHash(target),
    });
  }
  return seals;
}
