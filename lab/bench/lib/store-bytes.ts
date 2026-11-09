/** [EXP-P5B-R3] Why: HS01's G9 measure (logical bytes = page_count x page_size over submitted assertions) must be taken from the closed store, not from a manifest.
 * Rejected: du or file size alone (a WAL or a free list would hide or inflate the layout cost).
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(new URL("../../../packages/qlever/package.json", import.meta.url));
export function storeBytes(dir: string, assertions: number) {
  const file = path.join(dir, "broker.db"),
    size = (f: string) => (fs.existsSync(f) ? fs.statSync(f).size : 0);
  const D = require("better-sqlite3"),
    db = new D(file, { readonly: true, fileMustExist: true });
  try {
    const pageCount = db.pragma("page_count", { simple: true }) as number,
      pageSize = db.pragma("page_size", { simple: true }) as number,
      free = db.pragma("freelist_count", { simple: true }) as number;
    let byObject: Record<string, number> | null = null;
    try {
      byObject = Object.fromEntries(
        db
          .prepare("SELECT name, sum(pgsize) b FROM dbstat GROUP BY name ORDER BY b DESC")
          .all()
          .map((r: any) => [r.name, r.b]),
      );
    } catch {
      byObject = null;
    }
    const logical = pageCount * pageSize;
    return {
      dbFileBytes: size(file),
      walBytes: size(file + "-wal"),
      pageCount,
      pageSize,
      freePages: free,
      logicalBytes: logical,
      assertions,
      bytesPerFact: logical / assertions,
      byObject,
    };
  } finally {
    db.close();
  }
}
