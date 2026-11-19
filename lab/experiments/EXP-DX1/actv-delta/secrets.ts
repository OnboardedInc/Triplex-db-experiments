import assert from "node:assert/strict";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  existsSync,
  openSync,
  closeSync,
  fsyncSync,
} from "node:fs";
import { join } from "node:path";
import { sha256 } from "../../../bench/lib/w0-world.ts";
import type { Body, Mask } from "./model.ts";
type Box = { cipher: string };
export class SourceKeys {
  readonly directory: string | undefined;
  readonly account: string;
  constructor(directory: string | undefined, account: string) {
    this.directory = directory;
    this.account = account;
  }
  private path(subject: string) {
    assert(this.directory, "protected source requires its durable key directory");
    return join(this.directory, sha256(this.account + "/" + subject));
  }
  private key(subject: string, create: boolean) {
    const p = this.path(subject);
    if (create && !existsSync(p)) {
      mkdirSync(this.directory!, { recursive: true, mode: 0o700 });
      try {
        writeFileSync(p, randomBytes(32), { mode: 0o600, flag: "wx", flush: true });
        this.sync();
      } catch (e: any) {
        if (e.code !== "EEXIST") throw e;
      }
    }
    return readFileSync(p);
  }
  private sync() {
    const fd = openSync(this.directory!, "r");
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  }
  forget(s: string, maskHash: string) {
    if (!this.directory) return;
    const p = this.path(s);
    mkdirSync(this.directory!, { recursive: true, mode: 0o700 });
    try {
      writeFileSync(p + ".erased", maskHash, { flag: "wx", flush: true, mode: 0o600 });
      this.sync();
    } catch (e: any) {
      if (e.code !== "EEXIST") throw e;
      assert.equal(readFileSync(p + ".erased", "utf8"), maskHash);
    }
    if (existsSync(p)) {
      unlinkSync(p);
      this.sync();
    }
  }
  convert(body: Body, mode: "read" | "write", mask?: Mask): Body {
    let key: Buffer | undefined;
    const transform = (v: any) => {
      if (mask) return { erasedAt: mask.from };
      if (typeof v === "string" && mode === "write") {
        key ??= this.key(body.subject, true);
        const iv = randomBytes(12),
          c = createCipheriv("aes-256-gcm", key, iv);
        c.setAAD(Buffer.from(this.account + "/" + body.subject));
        const data = Buffer.concat([c.update(v, "utf8"), c.final()]);
        return { cipher: Buffer.concat([iv, c.getAuthTag(), data]).toString("base64") };
      }
      if (v?.cipher && mode === "read") {
        assert(
          !existsSync(this.path(body.subject) + ".erased"),
          "erasure frontier ahead of restored account",
        );
        key ??= this.key(body.subject, false);
        const bytes = Buffer.from((v as Box).cipher, "base64"),
          c = createDecipheriv("aes-256-gcm", key, bytes.subarray(0, 12));
        c.setAuthTag(bytes.subarray(12, 28));
        c.setAAD(Buffer.from(this.account + "/" + body.subject));
        return Buffer.concat([c.update(bytes.subarray(28)), c.final()]).toString("utf8");
      }
      return v;
    };
    return {
      ...body,
      seed: body.seed.map((f) => (f.a === "ssn" ? { ...f, v: transform(f.v) } : f)),
      changes: body.changes.map((c) =>
        c.a === "ssn" ? { ...c, values: c.values.map(transform) } : c,
      ),
    };
  }
}
