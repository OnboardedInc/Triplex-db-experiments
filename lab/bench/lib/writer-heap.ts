import { Worker, isMainThread } from "node:worker_threads";
import { getHeapStatistics, setFlagsFromString } from "node:v8";

// [DX-T1-8] Why: startup flags constrain the existing writer heap; restore defaults before creating any worker isolate.
// Rejected: applying NODE_OPTIONS to every reader too (would confound a writer-only GC comparison).
export async function configureWriterHeap() {
  if (process.env.DX_WRITER_HEAP_TUNING !== "1") return undefined;
  if (!isMainThread) throw Error("Writer heap setup must precede worker creation");
  const integer = (name: string, fallback: number) => {
    const n = Number(process.env[name] ?? fallback);
    if (!Number.isSafeInteger(n) || n < 1 || n > 16384) throw Error("Invalid writer heap setting");
    return n;
  };
  const oldMiB = integer("DX_WRITER_OLD_MIB", 6144);
  const youngMiB = integer("DX_WRITER_YOUNG_MIB", 16);
  const workerOldMiB = integer("DX_WORKER_OLD_MIB", 6144);
  const workerYoungMiB = integer("DX_WORKER_YOUNG_MIB", 16);
  const options = [process.env.NODE_OPTIONS ?? "", ...process.execArgv].join(" ");
  if (
    !options.split(/\s+/).includes(`--max-old-space-size=${oldMiB}`) ||
    !options.split(/\s+/).includes(`--max-semi-space-size=${youngMiB}`)
  )
    throw Error("Writer startup heap flags absent");
  const heapLimit = getHeapStatistics().heap_size_limit;
  const fits = (bytes: number, old: number, young: number) =>
    bytes >= old * 1048576 && bytes <= (old + 4 * young) * 1048576;
  if (!fits(heapLimit, oldMiB, youngMiB))
    throw Error("Writer heap limit contradicts startup flags");
  const restored = `--max-old-space-size=${workerOldMiB} --max-semi-space-size=${workerYoungMiB}`;
  setFlagsFromString(restored);
  process.env.NODE_OPTIONS = restored;
  process.execArgv = process.execArgv.filter(
    (arg) => !/^--max-(old-space|semi-space)-size=/.test(arg),
  );
  if (getHeapStatistics().heap_size_limit !== heapLimit)
    throw Error("Restoring worker flags changed the writer heap");
  const workerLimit = await new Promise<number>((resolve, reject) => {
    const worker = new Worker(
      'require("node:worker_threads").parentPort.postMessage(require("node:v8").getHeapStatistics().heap_size_limit)',
      { eval: true, execArgv: [] },
    );
    let observed: number | undefined;
    worker.once("message", (value) => {
      observed = value;
    });
    worker.once("error", reject);
    worker.once("exit", (code) => {
      if (code || !Number.isSafeInteger(observed) || observed! <= 0)
        reject(Error("Worker heap probe failed"));
      else resolve(observed!);
    });
  });
  if (!fits(workerLimit, workerOldMiB, workerYoungMiB))
    throw Error("Worker heap flags were not restored");
  return {
    at: performance.timeOrigin + performance.now(),
    node: process.version,
    v8: process.versions.v8,
    writer: { oldMiB, youngMiB, heapLimit },
    workers: { oldMiB: workerOldMiB, youngMiB: workerYoungMiB, heapLimit: workerLimit },
  };
}
