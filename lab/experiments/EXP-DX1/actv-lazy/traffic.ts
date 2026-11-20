import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { setTimeout as sleep } from "node:timers/promises";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { W0, sha256 } from "../../../bench/lib/w0-world.ts";
import { LazyReader } from "./read.ts";
import { demandRoute } from "./read-route.ts";
import { openStore } from "./store.ts";
import { valid } from "./fixture.ts";

export interface ReadTraffic {
  scope: string;
  n: number;
  readers: number;
  dir: string;
  tag: string;
  slot: string;
  nonce: string;
  duration: number;
}
export function readers(spec: ReadTraffic) {
  const child = fork(import.meta.filename, ["--child"], {
    stdio: ["ignore", "inherit", "inherit", "ipc"],
  });
  const ready = Promise.withResolvers<void>(),
    done = Promise.withResolvers<void>();
  let sealed = false;
  void done.promise.catch(() => {});
  void ready.promise.catch(() => {});
  child.on("message", (m: any) => {
    if (m.tag !== spec.tag || m.scope !== spec.scope || m.nonce !== spec.nonce) return;
    if (m.type === "ready") ready.resolve();
    if (m.type === "done") sealed = true;
  });
  child.once("error", (e) => {
    ready.reject(e);
    done.reject(e);
  });
  child.once("exit", (code) => {
    ready.reject(Error("Reader left before readiness"));
    if (code === 0 && sealed) done.resolve();
    else done.reject(Error("Incomplete reader worker " + spec.tag));
  });
  child.send(spec);
  return {
    ready: ready.promise,
    done: done.promise,
    start: (at: number) => child.send({ at, tag: spec.tag }),
    close: () => {
      if (child.connected) child.kill();
    },
  };
}
if (process.argv[2] === "--child") {
  const spec: ReadTraffic = await new Promise((r) => process.once("message", r));
  const db = new DatabaseSync(join(spec.dir, spec.tag + ".sqlite"));
  db.exec(
    "PRAGMA max_page_count=15360; CREATE TABLE samples(n INTEGER PRIMARY KEY, subject INTEGER,p INTEGER,ms REAL,off REAL,digest TEXT,route TEXT);BEGIN",
  );
  const insert = db.prepare(
    "INSERT INTO samples(subject,p,ms,off,digest,route) VALUES(?,?,?,?,?,?)",
  );
  let holdUntil = 0;
  const s = await openStore(spec.scope, "act2-deep"),
    held = await s.head(),
    route = demandRoute(s, process.env.DATOMIC_READ_URLS!.split(",")[0]!, () =>
      Date.now() < holdUntil ? held : Infinity,
    ),
    reader = new LazyReader(route.store, "act2-deep", 4 << 20, () => valid);
  const signal = await new Promise<{ at: number; tag: string }>((r) => {
    process.once("message", r);
    process.send!({ type: "ready", ...spec });
  });
  assert.equal(signal.tag, spec.tag);
  holdUntil = signal.at + Math.min(60000, spec.duration / 2);
  await sleep(Math.max(0, signal.at - Date.now()));
  let count = 0;
  try {
    await Promise.all(
      Array.from({ length: spec.readers }, async (_, i) => {
        let turn = 0;
        while (Date.now() < signal.at + spec.duration) {
          const off = Date.now() - signal.at;
          const ordinal = turn++ * spec.readers + i,
            available = spec.n - 100;
          const subject =
              off < spec.duration / 2 && ordinal % 5 !== 0
                ? (ordinal * 37) % Math.min(1000, available)
                : (ordinal * 37) % available,
            t = performance.now(),
            r = await reader.readAt(W0.placementId(subject));
          const ms = performance.now() - t;
          assert.equal(r.basis.validTime, valid);
          insert.run(subject, r.basis.tx, ms, off, sha256(r.json), r.route);
          if (++count % 2048 === 0) db.exec("COMMIT;BEGIN");
        }
      }),
    );
    assert(count > 0);
    db.exec("COMMIT");
    writeFileSync(
      join(spec.dir, spec.tag + "-routes.json"),
      JSON.stringify({
        nonce: spec.nonce,
        scope: spec.scope,
        heldThrough: held,
        holdUntil,
        rss: process.memoryUsage().rss,
        ...route.counts,
      }),
      { flag: "wx" },
    );
    process.send!({ type: "done", ...spec, count });
  } finally {
    db.close();
    route.close();
    await s.close();
    process.disconnect!();
  }
}
