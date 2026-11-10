import { Session } from "node:inspector";
import { parentPort, workerData } from "node:worker_threads";
import { startReader } from "../../../bench/reader-worker.ts";
// [DX-H7] Why: an inspector session inside the worker samples that isolate, not the parent.
// Rejected: parent --cpu-prof alone (cannot attribute reader hashing/decode).
const session = new Session();
session.connect();
const post = (name: string) =>
  new Promise<any>((resolve, reject) =>
    session.post(name as any, (e, r) => (e ? reject(e) : resolve(r))),
  );
await post("Profiler.enable");
parentPort!.on("message", async (m) => {
  if (m.type === "profile-start") await post("Profiler.start");
  if (m.type === "profile-stop") {
    const r = await post("Profiler.stop");
    parentPort!.postMessage({ type: "profile", profile: r.profile });
    session.disconnect();
  }
});
await startReader(parentPort, workerData);
