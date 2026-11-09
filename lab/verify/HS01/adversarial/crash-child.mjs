// [CX-VHS01] Why: stop the entire process at a proved SQL mutation boundary. Rejected: a timed kill that might occur before the transaction starts.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { Worker, MessageChannel } from "node:worker_threads";
const [dir, mode, input] = process.argv.slice(2);
const rowText = fs.readFileSync("packages/qlever/src/broker/row-codec.ts", "utf8");
const codec = new Function(
  rowText.replace("export const rowCodec", "const rowCodec") + "\nreturn rowCodec",
)();
const workerText = fs.readFileSync("packages/qlever/src/broker/sqlite-worker.ts", "utf8");
const source = new Function(
  "rowCodec",
  workerText
    .replace(/import \{ rowCodec \} from "\.\/row-codec.js";/, "")
    .replace("export const sqliteWorker", "const sqliteWorker") + "\nreturn sqliteWorker",
)(codec);
const hooks = {
  dictionary: "q('INSERT OR IGNORE INTO '+t+' VALUES(?,?)').run(id,textKey(v));",
  group:
    "q('INSERT INTO operations VALUES(?,?)').run(member.operationId,JSON.stringify({lsn:a.lsn,epoch:a.epoch,positions:member.positions}));",
  purge: "q('DELETE FROM frames WHERE lsn<=?').run(last.lsn);",
};
let instrumented = source;
if (mode !== "committed") {
  const needle = hooks[mode];
  if (!needle || source.split(needle).length !== 2) throw Error("unexpected source hook");
  instrumented = source.replace(
    needle,
    needle +
      "{fs.writeFileSync(path.join(path.dirname(file),'reached'),workerData.barrierMode);Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0);}",
  );
}
const hash = (s) => createHash("sha256").update(s).digest("hex");
fs.writeFileSync(
  path.join(dir, "instrumentation.json"),
  JSON.stringify({
    mode,
    original: hash(source),
    instrumented: hash(instrumented),
    hook: hooks[mode] ?? "after append result",
  }),
);
const driver = createRequire(
  new URL("../../../../packages/qlever/package.json", import.meta.url),
).resolve("better-sqlite3");
const w = new Worker(instrumented, {
  eval: true,
  workerData: {
    file: path.join(dir, "broker.db"),
    role: "writer",
    driver,
    seed: 0,
    gateBuffer: new SharedArrayBuffer(12),
    barrierMode: mode,
  },
});
const call = (op, args) =>
  new Promise((resolve, reject) => {
    const { port1, port2 } = new MessageChannel();
    port1.once("message", (x) => {
      port1.close();
      if (x.error) reject(Error(x.error));
      else resolve(x.result);
    });
    w.postMessage({ op, args, response: port2 }, [port2]);
  });
await call("init");
if (mode === "purge") await call("purgeFrames", 1);
else {
  const a = JSON.parse(fs.readFileSync(input, "utf8"));
  a.payload = Buffer.from(a.payload.data);
  await call("append", a);
  if (mode === "committed") {
    fs.writeFileSync(path.join(dir, "reached"), mode);
    await new Promise(() => {});
  }
}
throw Error("expected barrier was not reached");
