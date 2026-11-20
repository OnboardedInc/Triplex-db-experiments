import { mkdirSync, writeFileSync, readFileSync, rmdirSync, unlinkSync } from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
export async function measured<T>(fn: () => Promise<T>): Promise<T> {
  const dir = process.env.DELTA_MEASURE_LOCK;
  if (!dir) {
    assert(process.platform === "linux", "local timing requires the shared measurement lock");
    return fn();
  }
  const inherited = process.env.DELTA_MEASURE_OWNER;
  if (inherited) {
    const [pid, nonce] = inherited.split("/");
    assert(
      Number(pid) === process.ppid &&
        /^[a-f0-9-]{36}$/.test(nonce!) &&
        readFileSync(path.join(dir, "delta-" + pid), "utf8") === nonce,
      "invalid inherited measurement owner",
    );
    return fn();
  }
  for (;;) {
    try {
      mkdirSync(dir);
      break;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      await delay(5000);
    }
  }
  const nonce = randomUUID(),
    owner = path.join(dir, "delta-" + process.pid);
  writeFileSync(owner, nonce, { flag: "wx" });
  process.env.DELTA_MEASURE_OWNER = process.pid + "/" + nonce;
  const release = () => {
    assert.equal(readFileSync(owner, "utf8"), nonce);
    delete process.env.DELTA_MEASURE_OWNER;
    unlinkSync(owner);
    rmdirSync(dir);
  };
  process.once("exit", release);
  const timer = setTimeout(() => {
    process.stderr.write("measurement exceeded fifteen minutes\n");
    process.exit(1);
  }, 899000);
  try {
    return await fn();
  } finally {
    clearTimeout(timer);
    process.off("exit", release);
    release();
  }
}
