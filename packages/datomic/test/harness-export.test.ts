import { expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { verifyHarnessExport } from "../../../lab/trace/harness-volume.mjs";
// [DX-T1-10] Why: transient guest data may be removed only after a complete byte-identical closed-world export.
// Rejected: a Docker cp success or matching file lengths as evidence that raw traces survived.
const fixture = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-export-")),
    b = Buffer.from("retained raw bytes\n");
  fs.writeFileSync(path.join(dir, "trace.gz"), b);
  return {
    dir,
    manifest: {
      files: [
        { path: "trace.gz", bytes: b.length, sha256: createHash("sha256").update(b).digest("hex") },
      ],
    },
  };
};
it("verifies the exact complete export and refuses changed content of equal length", async () => {
  const f = fixture();
  try {
    await verifyHarnessExport(f.manifest, f.dir);
    fs.writeFileSync(path.join(f.dir, "trace.gz"), "x".repeat(f.manifest.files[0]!.bytes));
    await expect(verifyHarnessExport(f.manifest, f.dir)).rejects.toThrow("bytes");
  } finally {
    fs.rmSync(f.dir, { recursive: true });
  }
});
it("refuses extra files, duplicate entries and escaping paths", async () => {
  const f = fixture();
  try {
    fs.writeFileSync(path.join(f.dir, "extra"), "not in source");
    await expect(verifyHarnessExport(f.manifest, f.dir)).rejects.toThrow("closed-world");
    fs.unlinkSync(path.join(f.dir, "extra"));
    await expect(
      verifyHarnessExport({ files: [...f.manifest.files, ...f.manifest.files] }, f.dir),
    ).rejects.toThrow("path");
    await expect(
      verifyHarnessExport({ files: [{ ...f.manifest.files[0], path: "../trace.gz" }] }, f.dir),
    ).rejects.toThrow("path");
  } finally {
    fs.rmSync(f.dir, { recursive: true });
  }
});
it("refuses symlinks in place of copied bytes", async () => {
  const f = fixture();
  try {
    fs.symlinkSync(path.join(f.dir, "trace.gz"), path.join(f.dir, "link"));
    await expect(verifyHarnessExport(f.manifest, f.dir)).rejects.toThrow("special");
  } finally {
    fs.rmSync(f.dir, { recursive: true });
  }
});
