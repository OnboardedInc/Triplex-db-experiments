import { expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { spawnSync } from "node:child_process";
import { publicationLagMs } from "@triplex-build/triplex/feed";
import {
  openHostFeedClock,
  captureFeedInstant,
  openPublicationWriter,
  openPublicationReader,
  readProducerPublication,
} from "@triplex-build/triplex-host/feed";

it("binds producer publication bytes, retries, source coordinates and host/boot origin", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "FD01-publication-"));
  const file = path.join(dir, "publication.db");
  const clock = openHostFeedClock();
  const key = { source: "source", stream: "s", epoch: "1", position: "1" };
  const writer = openPublicationWriter(file, key.source, key.stream, clock);
  const first = writer.publish(key, "source-log-1");
  const reader = openPublicationReader(file);
  try {
    await new Promise((r) => setTimeout(r, 10));
    const retry = writer.publish(key, "source-log-1");
    expect(retry).toEqual(first);
    expect(readProducerPublication(reader, key)).toEqual(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.domain)).toBe(true);
    const known = captureFeedInstant(openHostFeedClock(), key);
    expect(publicationLagMs(first, known, reader.get(key))).toBeGreaterThanOrEqual(10);
    expect(() => writer.publish(key, "ACK-1")).toThrow("different publication record");
    expect(() => writer.publish({ ...key, source: "foreign" }, "x")).toThrow("binding");
    expect(() => publicationLagMs({ ...first, atNs: known.atNs }, known, reader.get(key))).toThrow(
      "producer record",
    );
    expect(() =>
      publicationLagMs(
        first,
        { ...known, domain: { ...known.domain, boot: "f".repeat(64) } },
        first,
      ),
    ).toThrow("clock origin");
    expect(() =>
      publicationLagMs(
        first,
        { ...known, domain: { ...known.domain, host: "f".repeat(64) } },
        first,
      ),
    ).toThrow("clock origin");
    expect(() => publicationLagMs(first, known, undefined)).toThrow("Missing producer");
    expect(() => captureFeedInstant({ domain: clock.domain }, key)).toThrow("Unbound feed clock");
    expect(() => readProducerPublication({ get: () => first, close: () => {} }, key)).toThrow(
      "Unbound producer",
    );
    const db = new DatabaseSync(file);
    db.prepare("UPDATE publications SET body=?").run(
      JSON.stringify({ ...first, atNs: known.atNs }),
    );
    db.close();
    expect(() => reader.get(key)).toThrow("corrupt");
  } finally {
    reader.close();
    writer.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// [DX-T1-5] Why: independent writers must preserve the first durable timestamp and reject conflicting IDs after reopening.
// Rejected: testing only one cached writer handle (misses atomic insert conflicts and persisted bytes).
it("keeps the first publication across competing handles and reopen", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "publication-insert-")),
    file = path.join(dir, "publication.db");
  const clock = openHostFeedClock(),
    key = { source: "source", stream: "stream", epoch: "0", position: "17" };
  const a = openPublicationWriter(file, key.source, key.stream, clock),
    b = openPublicationWriter(file, key.source, key.stream, clock);
  let first;
  try {
    first = a.publish(key, "source-17");
    expect(b.publish(key, "source-17")).toEqual(first);
    expect(() => b.publish(key, "different")).toThrow("different publication");
  } finally {
    a.close();
    b.close();
  }
  const reader = openPublicationReader(file);
  try {
    expect(reader.get(key)).toEqual(first);
  } finally {
    reader.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// [DX-T1-5] Why: a delayed witness must retain the exact bound source event, with no receipt before persistence.
// Rejected: reconstructing the timestamp later or allowing a structural token from another writer.
it("persists only genuine bound captures and keeps their original event time", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "publication-capture-"));
  const file = path.join(dir, "publication.db"),
    clock = openHostFeedClock();
  const key = { source: "source", stream: "stream", epoch: "0", position: "1" };
  const a = openPublicationWriter(file, key.source, key.stream, clock);
  const b = openPublicationWriter(file, key.source, key.stream, clock);
  const reader = openPublicationReader(file);
  try {
    const mutable = { ...key };
    const token = a.capture(mutable, "operation-1");
    mutable.position = "foreign-after-capture";
    const afterCapture = captureFeedInstant(clock, key);
    expect(reader.get(key)).toBeUndefined();
    expect(() => a.persistCaptured({} as any)).toThrow("forged");
    expect(() => b.persistCaptured(token)).toThrow("Foreign");
    await new Promise((resolve) => setTimeout(resolve, 15));
    const persisted = a.persistCaptured(token);
    expect(BigInt(persisted.atNs)).toBeLessThanOrEqual(BigInt(afterCapture.atNs));
    expect(reader.get(key)).toEqual(persisted);
    expect(a.persistCaptured(token)).toEqual(persisted);
    expect(b.publish(key, "operation-1")).toEqual(persisted);
    expect(
      publicationLagMs(persisted, captureFeedInstant(clock, key), reader.get(key)),
    ).toBeGreaterThan(0);
  } finally {
    reader.close();
    a.close();
    b.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// [DX-T1-9] Why: a real SQLite lock must delay the worker's durable result while the producer isolate keeps running.
// Rejected: an async-shaped mock that still performs fsync on the writer, or a timestamp captured after storage.
it("persists original captures on another isolate and reads back the exact durable bytes", async () => {
  const { openAsyncPublicationWriter } = await import("@triplex-build/triplex-host/feed");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "publication-worker-"));
  const file = path.join(dir, "publication.db"),
    clock = openHostFeedClock();
  const key = { source: "source", stream: "stream", epoch: "0", position: "17" };
  const samples: { thread: number; start: number; end: number }[] = [];
  const writer = await openAsyncPublicationWriter(file, key.source, key.stream, clock, {
    onPersist: (sample) => samples.push(sample),
  });
  const reader = openPublicationReader(file),
    lock = new DatabaseSync(file);
  try {
    const token = writer.capture(key, "operation-17");
    const afterCapture = captureFeedInstant(clock, key);
    expect(reader.get(key)).toBeUndefined();
    await expect(writer.persistCaptured({} as any)).rejects.toThrow("forged");
    const foreign = openPublicationWriter(file, key.source, key.stream, clock);
    await expect(writer.persistCaptured(foreign.capture(key, "operation-17"))).rejects.toThrow(
      "Foreign",
    );
    foreign.close();
    lock.exec("BEGIN IMMEDIATE");
    let completed = false;
    const pending = writer.persistCaptured(token).then((value) => {
      completed = true;
      return value;
    });
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(completed).toBe(false);
    expect(reader.get(key)).toBeUndefined();
    lock.exec("ROLLBACK");
    const record = await pending;
    expect(BigInt(record.atNs)).toBeLessThanOrEqual(BigInt(afterCapture.atNs));
    expect(reader.get(key)).toEqual(record);
    expect(await writer.persistCaptured(token)).toEqual(record);
    await expect(writer.persistCaptured(writer.capture(key, "conflicting"))).rejects.toThrow(
      "binding",
    );
    expect(samples.every((sample) => sample.thread > 0 && sample.end >= sample.start)).toBe(true);
    await writer.close();
    const reopened = await openAsyncPublicationWriter(file, key.source, key.stream, clock);
    try {
      expect(await reopened.persistCaptured(reopened.capture(key, "operation-17"))).toEqual(record);
    } finally {
      await reopened.close();
    }
    await expect(writer.persistCaptured(token)).rejects.toThrow("closed");
  } finally {
    lock.close();
    reader.close();
    await writer.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

it("rejects publication worker startup failure without producing a receipt", async () => {
  const { openAsyncPublicationWriter } = await import("@triplex-build/triplex-host/feed");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "publication-worker-refused-"));
  try {
    await expect(openAsyncPublicationWriter(dir, "s", "s", openHostFeedClock())).rejects.toThrow();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// [DX-T1-9] Why: ordinary Node must execute the built public export; source aliases conceal bundler-renamed worker loaders.
// Rejected: another source-only fixture after the first VM smoke caught an unbound __require in the generated worker.
it("executes the built publication worker through the public package export", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "publication-worker-built-"));
  try {
    const script = `import {openAsyncPublicationWriter,openHostFeedClock,openPublicationReader} from "@triplex-build/triplex-host/feed";
      const key={source:"source",stream:"stream",epoch:"0",position:"1"};
      const w=await openAsyncPublicationWriter(process.argv[1],key.source,key.stream,openHostFeedClock());
      const r=await w.persistCaptured(w.capture(key,"operation"));
      const reader=openPublicationReader(process.argv[1]);
      if(JSON.stringify(reader.get(key))!==JSON.stringify(r))throw Error("durable bytes differ");
      reader.close();await w.close();console.log(r.publicationId);`;
    const result = spawnSync(
      process.execPath,
      ["--input-type=module", "-e", script, path.join(dir, "publication.db")],
      { cwd: new URL("../../", import.meta.url), encoding: "utf8" },
    );
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout.trim()).toBe("operation");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
