import assert from "node:assert/strict";
import { parentPort, workerData } from "node:worker_threads";
import { W0 } from "../../../../bench/lib/w0-world.ts";
import { evaluateRows, type Work } from "./material.ts";

assert(parentPort);
const port = parentPort;
const next = W0.compileRelease(workerData.next),
  old = workerData.old ? W0.compileRelease(workerData.old) : undefined;
port.on("message", (input: Work) =>
  port.postMessage(evaluateRows(input, old, next, workerData.envelopes)),
);
