import { expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
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
