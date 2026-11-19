import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { gzipSync } from "node:zlib";

// [DX-BM1] Why: hold at most one encoded row and the stream's write buffer.
// Rejected: stringify a complete export, or batch by row count when row sizes vary.
/** @param {string} destination @param {Iterable<string> | AsyncIterable<string>} chunks */
export async function writeStreamedFile(destination, chunks) {
  const temporary = destination + "." + randomUUID() + ".tmp";
  try {
    await pipeline(
      Readable.from(chunks, { objectMode: false }),
      fs.createWriteStream(temporary, { flags: "wx" }),
    );
    fs.renameSync(temporary, destination);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}

/** @param {string} destination @param {Iterable<unknown>} events @param {Record<string, unknown>} metadata */
export function writeChromeTrace(destination, events, metadata) {
  function* document() {
    yield '{"traceEvents":[';
    let separator = "";
    for (const event of events) {
      yield separator;
      yield JSON.stringify(event);
      separator = ",";
    }
    yield `],"displayTimeUnit":"ms","metadata":${JSON.stringify(metadata)}}\n`;
  }
  return writeStreamedFile(destination, document());
}

// [DX-BM1] Why: an offline browser can verify and decode only the selected trace's data.
// Rejected: embed one giant JSON value or unpack one whole HTML string before opening the viewer.
/** @param {number} card @param {Iterable<unknown>} records */
export function* timelineBlocks(card, records) {
  const limit = 64 * 1024;
  /** @type {Buffer[]} */
  let parts = [];
  let size = 0;
  function block() {
    const bytes = Buffer.concat(parts, size);
    const hash = createHash("sha256").update(bytes).digest("hex");
    const packed = gzipSync(bytes, { level: 3 }).toString("base64");
    parts = [];
    size = 0;
    return `<script type="application/octet-stream" data-card="${card}" data-sha256="${hash}">${packed}</script>\n`;
  }
  for (const record of records) {
    const bytes = Buffer.from(JSON.stringify(record) + "\n");
    if (size && size + bytes.length > limit) yield block();
    parts.push(bytes);
    size += bytes.length;
  }
  if (size) yield block();
}
